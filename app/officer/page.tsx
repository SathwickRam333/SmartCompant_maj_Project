'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  MapPin,
  Eye,
  MessageSquare,
  Camera,
  Upload,
  Loader2,
  Filter,
  Search,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getOfficerComplaints, updateComplaintStatus, addResolution } from '@/services/complaints.service';
import { Complaint, STATUS_LABELS, PRIORITY_LABELS, ComplaintStatus } from '@/lib/types';
import { formatDate, formatRelativeTime, isOverdue } from '@/lib/utils';

export default function OfficerDashboard() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filteredComplaints, setFilteredComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolution, setResolution] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'officer' && user.role !== 'admin') {
      router.push('/');
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page',
        variant: 'destructive',
      });
    } else if (user) {
      fetchComplaints();
    }
  }, [user, authLoading]);

  useEffect(() => {
    applyFilters();
  }, [complaints, filterStatus, filterPriority, searchQuery]);

  const fetchComplaints = async () => {
    setIsLoading(true);
    try {
      // Fetch complaints assigned to this officer or all complaints for admin
      const data = await getOfficerComplaints(user?.uid || '');
      setComplaints(data.complaints);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...complaints];

    if (filterStatus !== 'all') {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter((c) => c.priority === filterPriority);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.trackingId.toLowerCase().includes(query) ||
          c.title.toLowerCase().includes(query) ||
          c.citizenName.toLowerCase().includes(query)
      );
    }

    setFilteredComplaints(filtered);
  };

  const handleStatusUpdate = async (complaintId: string, newStatus: ComplaintStatus) => {
    try {
      await updateComplaintStatus(
        complaintId,
        newStatus,
        user?.uid || '',
        user?.displayName || 'Officer',
        `Status updated to ${STATUS_LABELS[newStatus].en}`
      );
      toast({
        title: 'Status Updated',
        description: `Complaint status changed to ${STATUS_LABELS[newStatus].en}`,
      });
      fetchComplaints();
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Could not update complaint status',
        variant: 'destructive',
      });
    }
  };

  const handleResolve = async () => {
    if (!selectedComplaint || !resolution.trim()) return;

    setIsSubmitting(true);
    try {
      await addResolution(selectedComplaint.id, resolution);
      toast({
        title: 'Complaint Resolved',
        description: 'Resolution has been submitted successfully',
      });
      setIsResolveOpen(false);
      setResolution('');
      fetchComplaints();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Could not submit resolution',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stats = {
    total: filteredComplaints.length,
    pending: filteredComplaints.filter((c) => ['under_review', 'in_progress'].includes(c.status)).length,
    overdue: filteredComplaints.filter((c) => isOverdue(c.slaDeadline) && c.status !== 'resolved').length,
    resolved: filteredComplaints.filter((c) => c.status === 'resolved').length,
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Officer Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user?.displayName || 'Officer'}
            </p>
          </div>
          <Button onClick={fetchComplaints} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Assigned</p>
                  <p className="text-3xl font-bold">{stats.total}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-3xl font-bold text-orange-500">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className={stats.overdue > 0 ? 'border-red-200 bg-red-50' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-3xl font-bold text-red-500">{stats.overdue}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-3xl font-bold text-green-500">{stats.resolved}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by Tracking ID, Title, or Citizen Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Complaints List */}
        <Card>
          <CardHeader>
            <CardTitle>Assigned Complaints</CardTitle>
            <CardDescription>
              {filteredComplaints.length} complaint(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredComplaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No complaints found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredComplaints.map((complaint) => (
                  <div
                    key={complaint.id}
                    className={`border rounded-lg p-4 hover:shadow-md transition-shadow ${
                      isOverdue(complaint.slaDeadline) && complaint.status !== 'resolved'
                        ? 'border-red-200 bg-red-50/50'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {complaint.citizenName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-gray-800">
                                {complaint.title}
                              </h3>
                              {isOverdue(complaint.slaDeadline) && complaint.status !== 'resolved' && (
                                <Badge variant="destructive" className="text-xs">
                                  SLA Breached
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {complaint.trackingId} • {complaint.citizenName}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              <Badge
                                variant="secondary"
                                className={`${
                                  complaint.status === 'resolved'
                                    ? 'bg-green-100 text-green-700'
                                    : complaint.status === 'in_progress'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                {STATUS_LABELS[complaint.status].en}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={`${
                                  complaint.priority === 'high'
                                    ? 'border-red-300 text-red-600'
                                    : complaint.priority === 'medium'
                                    ? 'border-yellow-300 text-yellow-600'
                                    : 'border-green-300 text-green-600'
                                }`}
                              >
                                {PRIORITY_LABELS[complaint.priority].en}
                              </Badge>
                              <Badge variant="outline">{complaint.department}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(complaint.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {complaint.location.district}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            SLA: {formatRelativeTime(complaint.slaDeadline)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 md:items-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        {complaint.status !== 'resolved' && (
                          <div className="flex gap-2">
                            {complaint.status === 'under_review' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleStatusUpdate(complaint.id, 'in_progress')}
                              >
                                Start Work
                              </Button>
                            )}
                            {complaint.status === 'in_progress' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedComplaint(complaint);
                                  setIsResolveOpen(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Resolve
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedComplaint && (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedComplaint.title}</DialogTitle>
                  <DialogDescription>
                    {selectedComplaint.trackingId}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Badge>{STATUS_LABELS[selectedComplaint.status].en}</Badge>
                    <Badge variant="outline">
                      {PRIORITY_LABELS[selectedComplaint.priority].en} Priority
                    </Badge>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-2">Description</h4>
                    <p className="text-gray-600">{selectedComplaint.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Citizen Details</h4>
                      <p className="text-sm text-gray-600">
                        <User className="inline h-4 w-4 mr-1" />
                        {selectedComplaint.citizenName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedComplaint.citizenEmail}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Location</h4>
                      <p className="text-sm text-gray-600">
                        <MapPin className="inline h-4 w-4 mr-1" />
                        {selectedComplaint.location.address}
                      </p>
                      <p className="text-sm text-gray-600">
                        {selectedComplaint.location.district}, {selectedComplaint.location.pincode}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Filed On</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(selectedComplaint.createdAt)}
                      </p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">SLA Deadline</h4>
                      <p className={`text-sm ${
                        isOverdue(selectedComplaint.slaDeadline)
                          ? 'text-red-600 font-semibold'
                          : 'text-gray-600'
                      }`}>
                        {formatDate(selectedComplaint.slaDeadline)}
                        {isOverdue(selectedComplaint.slaDeadline) && ' (OVERDUE)'}
                      </p>
                    </div>
                  </div>

                  {selectedComplaint.aiClassification && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-semibold mb-2">AI Classification</h4>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>Confidence: {(selectedComplaint.aiClassification.confidence * 100).toFixed(0)}%</p>
                        <p>Keywords: {selectedComplaint.aiClassification.keywords?.join(', ')}</p>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Resolve Dialog */}
        <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Complaint</DialogTitle>
              <DialogDescription>
                Provide resolution details for {selectedComplaint?.trackingId}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="resolution">Resolution Description *</Label>
                <Textarea
                  id="resolution"
                  placeholder="Describe how the complaint was resolved..."
                  rows={4}
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
              </div>
              <div>
                <Label>Upload After Images (Optional)</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50">
                  <Camera className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">Click to upload images</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsResolveOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleResolve} disabled={isSubmitting || !resolution.trim()}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Submit Resolution
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
