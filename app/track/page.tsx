'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  MapPin,
  Calendar,
  Building2,
  User,
  FileText,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { getComplaintByTrackingId } from '@/services/complaints.service';
import { Complaint, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types';
import { formatDate, isOverdue, formatRelativeTime } from '@/lib/utils';

const statusSteps = [
  { status: 'submitted', label: 'Submitted', icon: FileText },
  { status: 'assigned', label: 'Assigned', icon: User },
  { status: 'in-progress', label: 'In Progress', icon: AlertCircle },
  { status: 'resolved', label: 'Resolved', icon: CheckCircle2 },
];

const statusColors: Record<string, string> = {
  submitted: 'bg-blue-500',
  assigned: 'bg-yellow-500',
  'in-progress': 'bg-orange-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
  rejected: 'bg-red-500',
};

function TrackPageContent() {
  const searchParams = useSearchParams();
  const [trackingId, setTrackingId] = useState(searchParams.get('id') || '');
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setTrackingId(id);
      handleSearch(id);
    }
  }, [searchParams]);

  const handleSearch = async (id?: string) => {
    const searchId = id || trackingId.trim();
    if (!searchId) {
      toast({
        title: 'Enter Tracking ID',
        description: 'Please enter a valid tracking ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setSearched(true);

    try {
      const result = await getComplaintByTrackingId(searchId);
      if (result) {
        setComplaint(result);
      } else {
        setComplaint(null);
        toast({
          title: 'Not Found',
          description: 'No complaint found with this tracking ID',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch complaint details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusProgress = (status: string): number => {
    const progressMap: Record<string, number> = {
      submitted: 25,
      assigned: 50,
      'in-progress': 75,
      resolved: 100,
      closed: 100,
      rejected: 100,
    };
    return progressMap[status] || 0;
  };

  const getCurrentStepIndex = (status: string): number => {
    const indexMap: Record<string, number> = {
      submitted: 0,
      assigned: 1,
      'in-progress': 2,
      resolved: 3,
      closed: 3,
    };
    return indexMap[status] || 0;
  };

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary mb-2">Track Your Complaint</h1>
          <p className="text-gray-600">
            Enter your tracking ID to view the status of your complaint
          </p>
        </div>

        {/* Search Box */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Enter Tracking ID (e.g., TS-GRV-2026-XXXXXX)"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="text-lg h-12"
                />
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={isLoading}
                className="h-12 px-8"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Search className="mr-2 h-5 w-5" />
                    Track
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        )}

        {/* No Results */}
        {searched && !isLoading && !complaint && (
          <Card className="text-center py-12">
            <CardContent>
              <XCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Complaint Not Found
              </h3>
              <p className="text-gray-500">
                Please check the tracking ID and try again
              </p>
            </CardContent>
          </Card>
        )}

        {/* Complaint Details */}
        {complaint && !isLoading && (
          <div className="space-y-6">
            {/* Status Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-primary mb-1">
                      {complaint.trackingId}
                    </h2>
                    <p className="text-gray-600">{complaint.title}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      variant="secondary"
                      className={`${statusColors[complaint.status]} text-white`}
                    >
                      {STATUS_LABELS[complaint.status].en}
                    </Badge>
                    <Badge variant="outline">
                      {PRIORITY_LABELS[complaint.priority].en} Priority
                    </Badge>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-500 mb-2">
                    <span>Progress</span>
                    <span>{getStatusProgress(complaint.status)}%</span>
                  </div>
                  <Progress value={getStatusProgress(complaint.status)} className="h-2" />
                </div>

                {/* Status Timeline */}
                <div className="flex justify-between items-center">
                  {statusSteps.map((step, index) => {
                    const currentIndex = getCurrentStepIndex(complaint.status);
                    const isActive = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    const Icon = step.icon;

                    return (
                      <React.Fragment key={step.status}>
                        <div className="flex flex-col items-center">
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              isActive
                                ? isCurrent
                                  ? 'bg-primary text-white'
                                  : 'bg-green-500 text-white'
                                : 'bg-gray-200 text-gray-400'
                            }`}
                          >
                            {isActive && !isCurrent ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>
                          <span
                            className={`text-xs mt-2 ${
                              isActive ? 'text-primary font-medium' : 'text-gray-400'
                            }`}
                          >
                            {step.label}
                          </span>
                        </div>
                        {index < statusSteps.length - 1 && (
                          <div
                            className={`flex-1 h-1 mx-2 rounded ${
                              index < currentIndex ? 'bg-green-500' : 'bg-gray-200'
                            }`}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* SLA Warning */}
                {isOverdue(complaint.slaDeadline) && complaint.status !== 'resolved' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-5 w-5" />
                    <span className="text-sm">
                      This complaint has exceeded its SLA deadline. Escalation initiated.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Complaint Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Complaint Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Description</p>
                      <p className="text-gray-700">{complaint.description}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Department</p>
                      <p className="text-gray-700">{complaint.department}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="text-gray-700">
                        {complaint.location.address}, {complaint.location.district}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Filed On</p>
                        <p className="text-gray-700">{formatDate(complaint.createdAt)}</p>
                      </div>
                    </div>
                    <Separator />
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">SLA Deadline</p>
                        <p className={`${isOverdue(complaint.slaDeadline) ? 'text-red-600' : 'text-gray-700'}`}>
                          {formatDate(complaint.slaDeadline)}
                          <span className="text-sm ml-2">
                            ({formatRelativeTime(complaint.slaDeadline)})
                          </span>
                        </p>
                      </div>
                    </div>
                    {complaint.resolvedAt && (
                      <>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Resolved On</p>
                            <p className="text-gray-700">{formatDate(complaint.resolvedAt)}</p>
                          </div>
                        </div>
                      </>
                    )}
                    {complaint.assignedOfficer && (
                      <>
                        <Separator />
                        <div className="flex items-start gap-3">
                          <User className="h-5 w-5 text-primary mt-0.5" />
                          <div>
                            <p className="text-sm text-gray-500">Assigned Officer</p>
                            <p className="text-gray-700">{complaint.assignedOfficer.name}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Updates History */}
            {complaint.updates && complaint.updates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {complaint.updates.map((update, index) => (
                      <div key={index} className="flex gap-4">
                        <div className="relative">
                          <div className="h-3 w-3 rounded-full bg-primary" />
                          {index !== complaint.updates!.length - 1 && (
                            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-full bg-gray-200" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800">{update.message}</p>
                              <p className="text-sm text-gray-500">by {update.updatedBy}</p>
                            </div>
                            <span className="text-xs text-gray-400">
                              {formatDate(update.timestamp)}
                            </span>
                          </div>
                          {update.previousStatus && update.newStatus && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                              <Badge variant="outline" className="text-xs">
                                {STATUS_LABELS[update.previousStatus].en}
                              </Badge>
                              <ArrowRight className="h-3 w-3" />
                              <Badge variant="outline" className="text-xs">
                                {STATUS_LABELS[update.newStatus].en}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resolution Details */}
            {complaint.resolution && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Resolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 mb-4">
                    {typeof complaint.resolution === 'string' 
                      ? complaint.resolution 
                      : complaint.resolution.description}
                  </p>
                  {typeof complaint.resolution === 'object' && 
                   complaint.resolution.afterImages && 
                   complaint.resolution.afterImages.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">After Images</p>
                      <div className="flex gap-2 overflow-x-auto">
                        {complaint.resolution.afterImages.map((img: string, index: number) => (
                          <img
                            key={index}
                            src={img}
                            alt={`After ${index + 1}`}
                            className="h-24 w-24 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Feedback Card */}
            {complaint.status === 'resolved' && !complaint.feedback && (
              <Card className="border-accent bg-accent/10">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        Help us improve!
                      </h3>
                      <p className="text-sm text-gray-600">
                        Please provide feedback on the resolution
                      </p>
                    </div>
                    <Button>Submit Feedback</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <TrackPageContent />
    </Suspense>
  );
}
