'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Mic,
  Image as ImageIcon,
  MapPin,
  Upload,
  Loader2,
  X,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { createComplaint } from '@/services/complaints.service';
import { CATEGORIES, DEPARTMENTS, DISTRICTS, InputType } from '@/lib/types';

const complaintSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters'),
  description: z.string().min(50, 'Description must be at least 50 characters'),
  category: z.string().min(1, 'Please select a category'),
  department: z.string().optional(),
  address: z.string().min(10, 'Please provide a valid address'),
  district: z.string().min(1, 'Please select your district'),
  pincode: z.string().regex(/^\d{6}$/, 'Invalid pincode').optional().or(z.literal('')),
});

type ComplaintFormData = z.infer<typeof complaintSchema>;

export default function NewComplaintPage() {
  const [inputType, setInputType] = useState<InputType>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [trackingId, setTrackingId] = useState('');
  const [transcribedText, setTranscribedText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('en-IN');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ComplaintFormData>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      district: user?.district || '',
    },
  });

  // Auto-get GPS location
  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationLoading(false);
          toast({
            title: 'Location captured',
            description: `Coordinates: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationLoading(false);
          let errorMessage = 'Please enter your address manually';
          if (error.code === 1) {
            errorMessage = 'Location access was denied. Please allow location in browser settings.';
          } else if (error.code === 2) {
            errorMessage = 'Location unavailable. Please check your GPS or enter address manually.';
          } else if (error.code === 3) {
            errorMessage = 'Location request timed out. Please try again.';
          }
          toast({
            title: 'Location access failed',
            description: errorMessage,
            variant: 'destructive',
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    } else {
      setLocationLoading(false);
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support GPS. Please enter address manually.',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const validFiles = selectedFiles.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type === 'application/pdf';
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== selectedFiles.length) {
      toast({
        title: 'Invalid files',
        description: 'Only images and PDFs under 5MB are allowed',
        variant: 'destructive',
      });
    }

    setFiles(prev => [...prev, ...validFiles].slice(0, 5)); // Max 5 files
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startVoiceRecording = async () => {
    try {
      // Check if browser supports Speech Recognition
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        toast({
          title: 'Not supported',
          description: 'Speech recognition is not supported in this browser. Please use Chrome or Edge.',
          variant: 'destructive',
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      // Configure recognition
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguage;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onstart = () => {
        setIsRecording(true);
        toast({
          title: 'Recording started',
          description: `Speak in ${getLanguageName(selectedLanguage)}. Click Stop when done.`,
        });
      };

      recognition.onresult = (event: any) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        const fullText = finalTranscript + interimTranscript;
        setTranscribedText(fullText);
        
        // Auto-populate description field
        if (fullText.length > 10) {
          setValue('description', fullText);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        
        let errorMessage = 'An error occurred while recording';
        if (event.error === 'no-speech') {
          errorMessage = 'No speech detected. Please try again.';
        } else if (event.error === 'audio-capture') {
          errorMessage = 'Microphone not accessible. Please check permissions.';
        } else if (event.error === 'not-allowed') {
          errorMessage = 'Microphone access denied. Please allow microphone access.';
        } else if (event.error === 'network') {
          errorMessage = 'Network error. Speech recognition requires internet connection.';
        }
        
        toast({
          title: 'Recording failed',
          description: errorMessage,
          variant: 'destructive',
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
        if (finalTranscript.length > 0) {
          toast({
            title: 'Recording stopped',
            description: `Transcribed ${finalTranscript.split(' ').length} words`,
          });
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Error starting voice recording:', error);
      setIsRecording(false);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access or type your complaint',
        variant: 'destructive',
      });
    }
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
      'en-IN': 'English',
      'te-IN': 'Telugu',
      'hi-IN': 'Hindi',
      'ur-IN': 'Urdu',
      'ta-IN': 'Tamil',
      'kn-IN': 'Kannada',
      'ml-IN': 'Malayalam',
      'mr-IN': 'Marathi',
    };
    return languages[code] || 'English';
  };

  const onSubmit = async (data: ComplaintFormData) => {
    if (!user) {
      toast({
        title: 'Please login',
        description: 'You need to be logged in to file a complaint',
        variant: 'destructive',
      });
      router.push('/login');
      return;
    }

    setIsLoading(true);
    try {
      const formData = {
        title: data.title,
        description: data.description,
        category: data.category,
        department: data.department,
        inputType,
        location: {
          latitude: location?.latitude || 0,
          longitude: location?.longitude || 0,
          address: data.address,
          district: data.district,
          pincode: data.pincode,
        },
        attachments: files,
      };

      const result = await createComplaint(
        formData,
        user.uid,
        user.displayName,
        user.email,
        user.phone
      );

      if (result.success && result.trackingId) {
        setTrackingId(result.trackingId);
        setSubmitted(true);
        toast({
          title: 'Complaint submitted!',
          description: `Your tracking ID is: ${result.trackingId}`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Submission failed',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-10 pb-8">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Complaint Submitted Successfully!
            </h2>
            <p className="text-gray-600 mb-6">
              Your complaint has been registered and assigned to the relevant department.
            </p>
            <div className="bg-primary/5 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-1">Your Tracking ID</p>
              <p className="text-2xl font-bold text-primary">{trackingId}</p>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Please save this tracking ID to track your complaint status.
              You will also receive updates via email.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => router.push(`/track?id=${trackingId}`)}>
                Track Complaint
              </Button>
              <Button variant="outline" onClick={() => router.push('/')}>
                Go to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">File a Complaint</h1>
          <p className="text-gray-600">
            Submit your grievance to the Government of Telangana
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Complaint Details</CardTitle>
            <CardDescription>
              Please provide accurate information to help us resolve your issue quickly
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Input Type Selection */}
              <div className="space-y-3">
                <Label>Input Method</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={inputType === 'text' ? 'default' : 'outline'}
                    onClick={() => setInputType('text')}
                    className="flex-1"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Text
                  </Button>
                  <Button
                    type="button"
                    variant={inputType === 'voice' ? 'default' : 'outline'}
                    onClick={() => setInputType('voice')}
                    className="flex-1"
                  >
                    <Mic className="mr-2 h-4 w-4" />
                    Voice
                  </Button>
                  <Button
                    type="button"
                    variant={inputType === 'image' ? 'default' : 'outline'}
                    onClick={() => setInputType('image')}
                    className="flex-1"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Image
                  </Button>
                </div>
              </div>

              {/* Language and Voice Recording (shown when voice is selected) */}
              {inputType === 'voice' && (
                <div className="space-y-3 p-4 border rounded-lg bg-blue-50/50">
                  <div className="space-y-2">
                    <Label htmlFor="language">Select Language</Label>
                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-IN">English</SelectItem>
                        <SelectItem value="te-IN">తెలుగు (Telugu)</SelectItem>
                        <SelectItem value="hi-IN">हिंदी (Hindi)</SelectItem>
                        <SelectItem value="ur-IN">اردو (Urdu)</SelectItem>
                        <SelectItem value="ta-IN">தமிழ் (Tamil)</SelectItem>
                        <SelectItem value="kn-IN">ಕನ್ನಡ (Kannada)</SelectItem>
                        <SelectItem value="ml-IN">മലയാളം (Malayalam)</SelectItem>
                        <SelectItem value="mr-IN">मराठी (Marathi)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex gap-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        onClick={startVoiceRecording}
                        className="flex-1"
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={stopVoiceRecording}
                        variant="destructive"
                        className="flex-1"
                      >
                        <div className="mr-2 h-4 w-4 rounded-full bg-white animate-pulse" />
                        Stop Recording
                      </Button>
                    )}
                  </div>
                  
                  {transcribedText && (
                    <div className="mt-2 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-600 mb-1">Transcribed Text:</p>
                      <p className="text-sm">{transcribedText}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Complaint Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief summary of your complaint"
                  {...register('title')}
                  disabled={isLoading}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Provide detailed information about your complaint..."
                  rows={5}
                  {...register('description')}
                  disabled={isLoading}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Category and Department */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category *</Label>
                  <Select onValueChange={(value) => setValue('category', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-destructive">{errors.category.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Department (Optional)</Label>
                  <Select onValueChange={(value) => setValue('department', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-assigned by AI" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave empty for AI to assign the right department
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Location</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getLocation}
                    disabled={locationLoading}
                  >
                    {locationLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <MapPin className="h-4 w-4 mr-1" />
                        Get GPS Location
                      </>
                    )}
                  </Button>
                </div>
                
                {location && (
                  <div className="text-sm text-green-600 bg-green-50 p-2 rounded-md">
                    <MapPin className="inline h-4 w-4 mr-1" /> 
                    GPS location captured: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                  </div>
                )}
                
                {!location && !locationLoading && (
                  <p className="text-sm text-amber-600">
                    <MapPin className="inline h-4 w-4" /> Click &quot;Get GPS Location&quot; or enter address manually
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="address">Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter complete address with landmarks"
                    rows={2}
                    {...register('address')}
                    disabled={isLoading}
                  />
                  {errors.address && (
                    <p className="text-sm text-destructive">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>District *</Label>
                    <Select onValueChange={(value) => setValue('district', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISTRICTS.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.district && (
                      <p className="text-sm text-destructive">{errors.district.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input
                      id="pincode"
                      placeholder="6-digit pincode"
                      maxLength={6}
                      {...register('pincode')}
                      disabled={isLoading}
                    />
                    {errors.pincode && (
                      <p className="text-sm text-destructive">{errors.pincode.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-3">
                <Label>Attachments (Optional)</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    Click to upload images or documents
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Max 5 files, up to 5MB each (Images, PDF)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {files.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-100 rounded-md p-2 text-sm"
                      >
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="text-gray-500 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Complaint'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
