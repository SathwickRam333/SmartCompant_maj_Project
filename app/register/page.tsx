'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, UserCircle, Shield, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { registerUser } from '@/services/auth.service';
import { submitOfficerRequest } from '@/services/users.service';
import { DISTRICTS, DEPARTMENTS } from '@/lib/types';

// Citizen registration schema
const citizenSchema = z.object({
  role: z.literal('citizen'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number').optional().or(z.literal('')),
  district: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Officer registration schema
const officerSchema = z.object({
  role: z.literal('officer'),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  employeeId: z.string().min(3, 'Employee ID is required'),
  department: z.string().min(1, 'Department is required'),
  designation: z.string().min(2, 'Designation is required'),
  district: z.string().min(1, 'District is required'),
});

type CitizenFormData = z.infer<typeof citizenSchema>;
type OfficerFormData = z.infer<typeof officerSchema>;

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'citizen' | 'officer'>('citizen');
  const [officerSubmitted, setOfficerSubmitted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Citizen form
  const citizenForm = useForm<CitizenFormData>({
    resolver: zodResolver(citizenSchema),
    defaultValues: { role: 'citizen' },
  });

  // Officer form
  const officerForm = useForm<OfficerFormData>({
    resolver: zodResolver(officerSchema),
    defaultValues: { role: 'officer' },
  });

  const onCitizenSubmit = async (data: CitizenFormData) => {
    setIsLoading(true);
    try {
      const result = await registerUser(
        data.email,
        data.password,
        data.displayName,
        data.phone || undefined,
        data.district
      );
      
      if (result.success) {
        toast({
          title: 'Registration successful!',
          description: 'Your account has been created. Please login.',
          variant: 'success',
        });
        router.push('/login');
      } else {
        toast({
          title: 'Registration failed',
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

  const onOfficerSubmit = async (data: OfficerFormData) => {
    setIsLoading(true);
    try {
      const result = await submitOfficerRequest({
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        employeeId: data.employeeId,
        department: data.department,
        designation: data.designation,
        district: data.district,
      });
      
      if (result.success) {
        setOfficerSubmitted(true);
        toast({
          title: 'Request Submitted!',
          description: 'Your officer registration request has been submitted for admin approval.',
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

  // Officer submission success message
  if (officerSubmitted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-primary">Request Submitted!</h2>
              <p className="text-gray-600">
                Your officer registration request has been submitted successfully.
              </p>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>What happens next?</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                    <li>Admin will review your application</li>
                    <li>Upon approval, login credentials will be sent to your email</li>
                    <li>You can then access the Officer Dashboard</li>
                  </ul>
                </AlertDescription>
              </Alert>
              <Button onClick={() => router.push('/')} className="w-full mt-4">
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
          <CardDescription>
            Select your role and fill in the details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Role Selection */}
          <div className="mb-6">
            <Label className="mb-3 block">I want to register as:</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={(value: string) => setSelectedRole(value as 'citizen' | 'officer')}
              className="grid grid-cols-2 gap-4"
            >
              <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-all ${
                selectedRole === 'citizen' ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}>
                <RadioGroupItem value="citizen" id="citizen" />
                <Label htmlFor="citizen" className="flex items-center gap-2 cursor-pointer">
                  <UserCircle className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Citizen</p>
                    <p className="text-xs text-gray-500">File grievances</p>
                  </div>
                </Label>
              </div>
              <div className={`flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-all ${
                selectedRole === 'officer' ? 'border-primary bg-primary/5' : 'border-gray-200'
              }`}>
                <RadioGroupItem value="officer" id="officer" />
                <Label htmlFor="officer" className="flex items-center gap-2 cursor-pointer">
                  <Shield className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Officer</p>
                    <p className="text-xs text-gray-500">Handle complaints</p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator className="mb-6" />

          {/* Citizen Registration Form */}
          {selectedRole === 'citizen' && (
            <form onSubmit={citizenForm.handleSubmit(onCitizenSubmit)} className="space-y-4">
              <input type="hidden" {...citizenForm.register('role')} value="citizen" />
              
              <div className="space-y-2">
                <Label htmlFor="displayName">Full Name *</Label>
                <Input
                  id="displayName"
                  placeholder="Enter your full name"
                  {...citizenForm.register('displayName')}
                  disabled={isLoading}
                />
                {citizenForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">{citizenForm.formState.errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  {...citizenForm.register('email')}
                  disabled={isLoading}
                />
                {citizenForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{citizenForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (Optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  {...citizenForm.register('phone')}
                  disabled={isLoading}
                />
                {citizenForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{citizenForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="district">District (Optional)</Label>
                <Select onValueChange={(value) => citizenForm.setValue('district', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your district" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...citizenForm.register('password')}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {citizenForm.formState.errors.password && (
                  <p className="text-sm text-destructive">{citizenForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    {...citizenForm.register('confirmPassword')}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {citizenForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">{citizenForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          )}

          {/* Officer Registration Form */}
          {selectedRole === 'officer' && (
            <form onSubmit={officerForm.handleSubmit(onOfficerSubmit)} className="space-y-4">
              <input type="hidden" {...officerForm.register('role')} value="officer" />
              
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Officer registrations require admin approval. Once approved, login credentials will be sent to your email.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="officerName">Full Name *</Label>
                <Input
                  id="officerName"
                  placeholder="Enter your full name"
                  {...officerForm.register('displayName')}
                  disabled={isLoading}
                />
                {officerForm.formState.errors.displayName && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="officerEmail">Official Email *</Label>
                <Input
                  id="officerEmail"
                  type="email"
                  placeholder="your.name@gov.in"
                  {...officerForm.register('email')}
                  disabled={isLoading}
                />
                {officerForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="officerPhone">Phone Number *</Label>
                <Input
                  id="officerPhone"
                  type="tel"
                  placeholder="9876543210"
                  {...officerForm.register('phone')}
                  disabled={isLoading}
                />
                {officerForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID *</Label>
                <Input
                  id="employeeId"
                  placeholder="e.g., TS-GOV-12345"
                  {...officerForm.register('employeeId')}
                  disabled={isLoading}
                />
                {officerForm.formState.errors.employeeId && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.employeeId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select onValueChange={(value: string) => officerForm.setValue('department', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {officerForm.formState.errors.department && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.department.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="designation">Designation *</Label>
                <Input
                  id="designation"
                  placeholder="e.g., Assistant Engineer"
                  {...officerForm.register('designation')}
                  disabled={isLoading}
                />
                {officerForm.formState.errors.designation && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.designation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="officerDistrict">District *</Label>
                <Select onValueChange={(value) => officerForm.setValue('district', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your district" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRICTS.map((district) => (
                      <SelectItem key={district} value={district}>
                        {district}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {officerForm.formState.errors.district && (
                  <p className="text-sm text-destructive">{officerForm.formState.errors.district.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting request...
                  </>
                ) : (
                  'Submit Registration Request'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-xs text-center text-gray-500">
              By registering, you agree to our{' '}
              <Link href="/terms" className="text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
