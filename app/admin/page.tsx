'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Users,
  FileText,
  Building2,
  TrendingUp,
  Download,
  RefreshCw,
  Settings,
  Shield,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Loader2,
  UserPlus,
  Filter,
  Copy,
  Check,
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
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getAllComplaints } from '@/services/complaints.service';
import { getDashboardStats, getDepartmentPerformance } from '@/services/stats.service';
import {
  getAllUsers,
  getUserCounts,
  updateUserRole,
  updateUserActiveStatus,
  updateUserDetails,
  deleteUserRecord,
  getPendingOfficerRequests,
  OfficerRequest,
  approveOfficerRequest,
  rejectOfficerRequest,
  submitOfficerRequest,
} from '@/services/users.service';
import { getSystemSettings, saveSystemSettings } from '@/services/settings.service';
import { Complaint, User as UserType, DEPARTMENTS, DISTRICTS, STATUS_LABELS, PRIORITY_LABELS } from '@/lib/types';
import { formatDate, exportToCSV } from '@/lib/utils';

const COLORS = ['#1a472a', '#d4a012', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function AdminPanel() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [pendingOfficerRequests, setPendingOfficerRequests] = useState<OfficerRequest[]>([]);
  const [isProcessingRequest, setIsProcessingRequest] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isComplaintDetailOpen, setIsComplaintDetailOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState<string | null>(null);

  const [officerName, setOfficerName] = useState('');
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerDepartment, setOfficerDepartment] = useState('');
  const [officerDistrict, setOfficerDistrict] = useState('');

  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'citizen' | 'officer' | 'admin'>('citizen');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editActive, setEditActive] = useState(true);

  const [slaHigh, setSlaHigh] = useState(1);
  const [slaMedium, setSlaMedium] = useState(3);
  const [slaLow, setSlaLow] = useState(7);
  const [notifyNewComplaint, setNotifyNewComplaint] = useState(true);
  const [notifySlaBreach, setNotifySlaBreach] = useState(true);
  const [notifyDailySummary, setNotifyDailySummary] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [latestApprovedCredentials, setLatestApprovedCredentials] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const handleCopyPassword = async () => {
    if (!latestApprovedCredentials?.password) return;

    try {
      await navigator.clipboard.writeText(latestApprovedCredentials.password);
      setPasswordCopied(true);
      toast({
        title: 'Copied',
        description: 'Password copied to clipboard',
      });

      setTimeout(() => setPasswordCopied(false), 1500);
    } catch {
      toast({
        title: 'Copy Failed',
        description: 'Could not copy password. Please copy it manually.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (user && user.role !== 'admin') {
      router.push('/');
      toast({
        title: 'Access Denied',
        description: 'Admin access required',
        variant: 'destructive',
      });
    } else if (user) {
      fetchData();
    }
  }, [user, authLoading]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Admin: Starting data fetch...');
      const [complaintsData, statsData, usersData, userCounts, pendingRequests, systemSettings] = await Promise.all([
        getAllComplaints(),
        getDashboardStats(),
        getAllUsers(),
        getUserCounts(),
        getPendingOfficerRequests(),
        getSystemSettings(),
      ]);

      console.log('📊 Admin: Fetched complaints:', complaintsData.complaints.length);
      console.log('📊 Admin: Stats data:', statsData);
      console.log('👥 Admin: User counts:', userCounts);

      // Set complaints first
      setComplaints(complaintsData.complaints);

      // Calculate fresh stats from actual complaints data
      const complaintStatuses: Record<string, number> = {};
      const complaintDepartments: Record<string, number> = {};
      let resolvedCount = 0;
      let overdueCount = 0;
      const now = new Date();

      complaintsData.complaints.forEach((c) => {
        // Count by status
        complaintStatuses[c.status] = (complaintStatuses[c.status] || 0) + 1;

        // Count by department
        complaintDepartments[c.department] = (complaintDepartments[c.department] || 0) + 1;

        // Count resolved
        if (c.status === 'resolved' || c.status === 'closed') {
          resolvedCount++;
        }

        // Count overdue
        const deadline = new Date(c.slaDeadline as any);
        if (!Number.isNaN(deadline.getTime()) && deadline < now && !['resolved', 'closed', 'rejected'].includes(c.status)) {
          overdueCount++;
        }
      });

      const calculatedStats = {
        totalComplaints: complaintsData.complaints.length,
        pendingComplaints:
          (complaintStatuses['submitted'] || 0) +
          (complaintStatuses['under_review'] || 0) +
          (complaintStatuses['in_progress'] || 0),
        resolvedComplaints: resolvedCount,
        closedComplaints: complaintStatuses['closed'] || 0,
        escalatedComplaints: complaintStatuses['escalated'] || 0,
        overdueComplaints: overdueCount,
        avgResolutionTime: statsData.avgResolutionTime || 0,
        byDepartment: complaintDepartments,
        byStatus: complaintStatuses,
        byDistrict: statsData.byDistrict || {},
        byPriority: statsData.byPriority || {},
        monthlyTrends: statsData.monthlyTrends || [],
        totalUsers: userCounts.total,
        activeOfficers: userCounts.activeOfficers,
      };

      console.log('✅ Admin: Calculated stats:', calculatedStats);
      setStats(calculatedStats);

      setUsers(usersData as UserType[]);
      setPendingOfficerRequests(pendingRequests);

      setSlaHigh(systemSettings.slaDays.high);
      setSlaMedium(systemSettings.slaDays.medium);
      setSlaLow(systemSettings.slaDays.low);
      setNotifyNewComplaint(systemSettings.notifications.newComplaintAlerts);
      setNotifySlaBreach(systemSettings.notifications.slaBreachAlerts);
      setNotifyDailySummary(systemSettings.notifications.dailySummary);
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setComplaints([]);
      setStats(null);
      setUsers([]);
      setPendingOfficerRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenEditUser = (u: UserType) => {
    setSelectedUser(u);
    setEditName(u.displayName || '');
    setEditRole(u.role);
    setEditDepartment(u.department || '');
    setEditDistrict(u.district || '');
    setEditActive(u.isActive !== false);
    setIsEditUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    setIsSavingUser(true);
    const ok = await updateUserDetails(selectedUser.uid, {
      displayName: editName,
      role: editRole,
      department: editDepartment || undefined,
      district: editDistrict || undefined,
      isActive: editActive,
    });

    setIsSavingUser(false);

    if (!ok) {
      toast({
        title: 'Update failed',
        description: 'Unable to update user details',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'User updated',
      description: 'User details were saved successfully',
    });
    setIsEditUserDialogOpen(false);
    fetchData();
  };

  const handleDeleteUser = async (u: UserType) => {
    if (u.uid === user?.uid) {
      toast({
        title: 'Action blocked',
        description: 'You cannot delete your own admin account',
        variant: 'destructive',
      });
      return;
    }

    const confirmed = window.confirm(`Delete user ${u.displayName || u.email}?`);
    if (!confirmed) return;

    setIsDeletingUser(u.uid);
    const ok = await deleteUserRecord(u.uid);
    setIsDeletingUser(null);

    if (!ok) {
      toast({
        title: 'Delete failed',
        description: 'Could not delete user record',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'User deleted',
      description: 'User record removed from Firestore',
    });
    fetchData();
  };

  const handleCreateOfficer = async () => {
    if (!officerName || !officerEmail || !officerDepartment || !officerDistrict) {
      toast({
        title: 'Missing fields',
        description: 'Fill name, email, department and district',
        variant: 'destructive',
      });
      return;
    }

    const result = await submitOfficerRequest({
      displayName: officerName,
      email: officerEmail,
      phone: '',
      employeeId: `ADM-${Date.now().toString().slice(-6)}`,
      department: officerDepartment,
      designation: 'District Officer',
      district: officerDistrict,
    });

    if (!result.success) {
      toast({
        title: 'Failed to create request',
        description: result.error || 'Unable to create officer request',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Officer request created',
      description: 'Review and approve it in the Requests tab',
    });

    setOfficerName('');
    setOfficerEmail('');
    setOfficerDepartment('');
    setOfficerDistrict('');
    setIsUserDialogOpen(false);
    fetchData();
  };

  const handleSaveSlaSettings = async () => {
    setIsSavingSettings(true);
    const ok = await saveSystemSettings(
      {
        slaDays: {
          high: Math.max(1, slaHigh),
          medium: Math.max(1, slaMedium),
          low: Math.max(1, slaLow),
        },
        notifications: {
          newComplaintAlerts: notifyNewComplaint,
          slaBreachAlerts: notifySlaBreach,
          dailySummary: notifyDailySummary,
        },
      },
      user?.uid
    );

    setIsSavingSettings(false);
    if (!ok) {
      toast({
        title: 'Save failed',
        description: 'Could not save SLA settings',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Settings saved',
      description: 'SLA configuration updated successfully',
    });
  };

  const handleSaveNotificationSettings = async () => {
    setIsSavingSettings(true);
    const ok = await saveSystemSettings(
      {
        slaDays: {
          high: Math.max(1, slaHigh),
          medium: Math.max(1, slaMedium),
          low: Math.max(1, slaLow),
        },
        notifications: {
          newComplaintAlerts: notifyNewComplaint,
          slaBreachAlerts: notifySlaBreach,
          dailySummary: notifyDailySummary,
        },
      },
      user?.uid
    );

    setIsSavingSettings(false);
    if (!ok) {
      toast({
        title: 'Save failed',
        description: 'Could not save notification settings',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Settings saved',
      description: 'Notification settings updated successfully',
    });
  };

  const handleExport = () => {
    const exportData = complaints.map((c) => ({
      'Tracking ID': c.trackingId,
      Title: c.title,
      Status: STATUS_LABELS[c.status].en,
      Priority: PRIORITY_LABELS[c.priority].en,
      Department: c.department,
      District: c.location.district,
      'Citizen Name': c.citizenName,
      'Created At': formatDate(c.createdAt),
      'SLA Deadline': formatDate(c.slaDeadline),
    }));
    exportToCSV(exportData, 'complaints-export');
    toast({
      title: 'Export Successful',
      description: 'Complaints data has been exported to CSV',
    });
  };

  const complaintsByDepartment = complaints.reduce<Record<string, number>>((acc, c) => {
    const key = c.department || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const departmentSource =
    stats?.byDepartment && Object.keys(stats.byDepartment).length > 0
      ? stats.byDepartment
      : complaintsByDepartment;

  // Dynamic department stats computed from stats or fallback complaint data
  const departmentStats = Object.entries(departmentSource)
    .map(([name, total]) => ({
      name: name.length > 15 ? name.slice(0, 12) + '...' : name,
      total: total as number,
      resolved: complaints.filter(
        (c) => c.department === name && (c.status === 'resolved' || c.status === 'closed')
      ).length,
      pending: complaints.filter(
        (c) => c.department === name && !['resolved', 'closed', 'rejected'].includes(c.status)
      ).length,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  const complaintStatusCounts = complaints.reduce(
    (acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const statusSource =
    stats?.byStatus && Object.keys(stats.byStatus).length > 0 ? stats.byStatus : complaintStatusCounts;

  // Dynamic status distribution computed from stats or complaint fallback
  const statusDistribution = [
    { name: 'Submitted', value: statusSource.submitted || 0, color: '#3b82f6' },
    { name: 'Under Review', value: statusSource.under_review || 0, color: '#f59e0b' },
    { name: 'In Progress', value: statusSource.in_progress || 0, color: '#f97316' },
    { name: 'Resolved', value: statusSource.resolved || 0, color: '#22c55e' },
    { name: 'Closed', value: statusSource.closed || 0, color: '#6b7280' },
  ];

  const monthlyTrendData =
    stats?.monthlyTrends && stats.monthlyTrends.length > 0
      ? stats.monthlyTrends.map((m: any) => ({
          month: m.month,
          total: m.total ?? m.complaints ?? 0,
          resolved: m.resolved ?? 0,
        }))
      : (() => {
          const monthMap: Record<string, { monthDate: Date; total: number; resolved: number }> = {};
          complaints.forEach((c) => {
            const created = new Date(c.createdAt as any);
            if (Number.isNaN(created.getTime())) return;
            const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
            if (!monthMap[key]) {
              monthMap[key] = {
                monthDate: new Date(created.getFullYear(), created.getMonth(), 1),
                total: 0,
                resolved: 0,
              };
            }
            monthMap[key].total += 1;
            if (c.status === 'resolved' || c.status === 'closed') {
              monthMap[key].resolved += 1;
            }
          });

          return Object.values(monthMap)
            .sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime())
            .slice(-12)
            .map((m) => ({
              month: m.monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              total: m.total,
              resolved: m.resolved,
            }));
        })();

  const filteredComplaints = complaints.filter(
    (c) =>
      c.trackingId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.citizenName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredUsers = users.filter(
    (u) =>
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
              <Shield className="h-8 w-8" />
              Admin Panel
            </h1>
            <p className="text-gray-600">
              System administration and analytics
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Complaints</p>
                  <p className="text-3xl font-bold text-primary">
                    {stats?.totalComplaints?.toLocaleString() || '0'}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <div className="mt-2 flex items-center text-sm text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                +12% this month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolution Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats && stats.totalComplaints > 0
                      ? Math.round((stats.resolvedComplaints / stats.totalComplaints) * 100)
                      : 0}
                    %
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <Progress
                value={
                  stats && stats.totalComplaints > 0
                    ? (stats.resolvedComplaints / stats.totalComplaints) * 100
                    : 0
                }
                className="h-2 mt-3"
              />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Registered Users</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats?.totalUsers?.toLocaleString() || '0'}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {stats?.activeOfficers || 0} active officers
              </p>
            </CardContent>
          </Card>

          <Card className={stats?.overdueComplaints > 0 ? 'border-red-200' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-3xl font-bold text-red-500">
                    {stats?.overdueComplaints || 0}
                  </p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-sm text-red-500 mt-2">Requires escalation</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 max-w-2xl mb-6">
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="complaints">
              <FileText className="h-4 w-4 mr-2" />
              Complaints
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Shield className="h-4 w-4 mr-2" />
              Requests {pendingOfficerRequests.length > 0 && (
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">
                  {pendingOfficerRequests.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Complaint Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="total"
                          stroke="#1a472a"
                          strokeWidth={2}
                          name="Filed"
                        />
                        <Line
                          type="monotone"
                          dataKey="resolved"
                          stroke="#22c55e"
                          strokeWidth={2}
                          name="Resolved"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Department Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Department Performance</CardTitle>
                <CardDescription>Complaints by department</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentStats} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="resolved" fill="#22c55e" name="Resolved" stackId="a" />
                      <Bar dataKey="pending" fill="#f97316" name="Pending" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Complaints Tab */}
          <TabsContent value="complaints" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <CardTitle>All Complaints</CardTitle>
                  <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search complaints..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button variant="outline" size="icon">
                      <Filter className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Tracking ID</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Title</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Status</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Priority</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Department</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Date</th>
                        <th className="text-left p-3 text-sm font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map((complaint) => (
                        <tr key={complaint.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm font-mono">{complaint.trackingId}</td>
                          <td className="p-3 text-sm max-w-[200px] truncate">{complaint.title}</td>
                          <td className="p-3">
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
                          </td>
                          <td className="p-3">
                            <Badge variant="outline">{PRIORITY_LABELS[complaint.priority].en}</Badge>
                          </td>
                          <td className="p-3 text-sm">{complaint.department}</td>
                          <td className="p-3 text-sm text-gray-500">{formatDate(complaint.createdAt)}</td>
                          <td className="p-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                setSelectedComplaint(complaint);
                                setIsComplaintDetailOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Button onClick={() => setIsUserDialogOpen(true)}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Officer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredUsers.map((u) => (
                    <div
                      key={u.uid}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {u.displayName?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.displayName}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                            {u.role}
                          </Badge>
                          {u.department && (
                            <p className="text-xs text-gray-500 mt-1">{u.department}</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditUser(u)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            disabled={isDeletingUser === u.uid}
                            onClick={() => handleDeleteUser(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Officer Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Pending Officer Registration Requests
                </CardTitle>
                <CardDescription>
                  Review and approve officer registration requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {latestApprovedCredentials && (
                  <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-green-800">Latest Approved Credentials</p>
                        <p className="text-sm text-green-700 mt-1">Email: {latestApprovedCredentials.email}</p>
                        <p className="text-sm text-green-700">Password: {latestApprovedCredentials.password}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-800 hover:bg-green-100"
                        onClick={handleCopyPassword}
                        title="Copy password"
                      >
                        {passwordCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {pendingOfficerRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingOfficerRequests.map((request) => (
                      <div
                        key={request.id}
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {request.displayName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{request.displayName}</h3>
                                <p className="text-sm text-gray-500">{request.email}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3 text-sm">
                              <div>
                                <span className="text-gray-500">Employee ID:</span>
                                <p className="font-medium">{request.employeeId}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Department:</span>
                                <p className="font-medium">{request.department}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Designation:</span>
                                <p className="font-medium">{request.designation}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">District:</span>
                                <p className="font-medium">{request.district}</p>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                              <Clock className="inline h-3 w-3 mr-1" />
                              Submitted: {formatDate(request.submittedAt)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              disabled={isProcessingRequest === request.id}
                              onClick={async () => {
                                setIsProcessingRequest(request.id);
                                try {
                                  const result = await approveOfficerRequest(request.id, user?.uid || '');
                                  if (result.success) {
                                    setLatestApprovedCredentials({
                                      email: request.email,
                                      password: result.generatedPassword || '',
                                    });
                                    setPasswordCopied(false);
                                    toast({
                                      title: 'Request Approved',
                                      description: `Officer account created for ${request.email}. Password: ${result.generatedPassword}`,
                                    });
                                  } else {
                                    toast({
                                      title: 'Error',
                                      description: result.error || 'Failed to approve request',
                                      variant: 'destructive',
                                    });
                                  }
                                } finally {
                                  await fetchData();
                                  setIsProcessingRequest(null);
                                }
                              }}
                            >
                              {isProcessingRequest === request.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isProcessingRequest === request.id}
                              onClick={async () => {
                                setIsProcessingRequest(request.id);
                                try {
                                  const result = await rejectOfficerRequest(request.id, user?.uid || '', 'Rejected by admin');
                                  if (result.success) {
                                    toast({
                                      title: 'Request Rejected',
                                      description: 'Officer registration request has been rejected',
                                    });
                                  } else {
                                    toast({
                                      title: 'Error',
                                      description: result.error || 'Failed to reject request',
                                      variant: 'destructive',
                                    });
                                  }
                                } finally {
                                  await fetchData();
                                  setIsProcessingRequest(null);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>SLA Configuration</CardTitle>
                  <CardDescription>Set resolution time limits</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-red-600">High Priority</p>
                      <p className="text-sm text-gray-500">Emergency issues</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={slaHigh}
                        onChange={(e) => setSlaHigh(Number(e.target.value) || 1)}
                        className="w-16"
                      />
                      <span className="text-sm text-gray-500">day(s)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-600">Medium Priority</p>
                      <p className="text-sm text-gray-500">Standard issues</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={slaMedium}
                        onChange={(e) => setSlaMedium(Number(e.target.value) || 1)}
                        className="w-16"
                      />
                      <span className="text-sm text-gray-500">day(s)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-600">Low Priority</p>
                      <p className="text-sm text-gray-500">Minor issues</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={slaLow}
                        onChange={(e) => setSlaLow(Number(e.target.value) || 1)}
                        className="w-16"
                      />
                      <span className="text-sm text-gray-500">day(s)</span>
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleSaveSlaSettings} disabled={isSavingSettings}>
                    {isSavingSettings ? 'Saving...' : 'Save SLA Settings'}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Notification Settings</CardTitle>
                  <CardDescription>Configure email notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">New Complaint Alerts</p>
                      <p className="text-sm text-gray-500">Email on new submissions</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyNewComplaint}
                      onChange={(e) => setNotifyNewComplaint(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">SLA Breach Alerts</p>
                      <p className="text-sm text-gray-500">Email on overdue complaints</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifySlaBreach}
                      onChange={(e) => setNotifySlaBreach(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Daily Summary</p>
                      <p className="text-sm text-gray-500">Daily digest email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={notifyDailySummary}
                      onChange={(e) => setNotifyDailySummary(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSaveNotificationSettings}
                    disabled={isSavingSettings}
                  >
                    {isSavingSettings ? 'Saving...' : 'Save Notification Settings'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Officer Dialog */}
        <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Officer</DialogTitle>
              <DialogDescription>
                Create a new officer account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  placeholder="Enter full name"
                  value={officerName}
                  onChange={(e) => setOfficerName(e.target.value)}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="officer@telangana.gov.in"
                  value={officerEmail}
                  onChange={(e) => setOfficerEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={officerDepartment} onValueChange={setOfficerDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>District</Label>
                <Select value={officerDistrict} onValueChange={setOfficerDistrict}>
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
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateOfficer}>
                Add Officer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update role, status, and profile fields</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={editRole} onValueChange={(v) => setEditRole(v as 'citizen' | 'officer' | 'admin')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="citizen">citizen</SelectItem>
                    <SelectItem value="officer">officer</SelectItem>
                    <SelectItem value="admin">admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={editDepartment} onValueChange={setEditDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>District</Label>
                <Select value={editDistrict} onValueChange={setEditDistrict}>
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
              </div>
              <div className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <p className="font-medium">Active Account</p>
                  <p className="text-sm text-gray-500">Disable to block user access</p>
                </div>
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                  className="h-4 w-4"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveUser} disabled={isSavingUser}>
                {isSavingUser ? 'Saving...' : 'Save User'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complaint Detail Dialog */}
        <Dialog open={isComplaintDetailOpen} onOpenChange={setIsComplaintDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Complaint Details</DialogTitle>
              <DialogDescription>{selectedComplaint?.trackingId}</DialogDescription>
            </DialogHeader>
            {selectedComplaint && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Status</Label>
                    <div className="mt-1">
                      <Badge variant="secondary">{STATUS_LABELS[selectedComplaint.status].en}</Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-500">Priority</Label>
                    <div className="mt-1">
                      <Badge variant="outline">{PRIORITY_LABELS[selectedComplaint.priority].en}</Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Title</Label>
                  <p className="mt-1 font-medium">{selectedComplaint.title}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Description</Label>
                  <p className="mt-1 text-sm text-gray-700">{selectedComplaint.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Department</Label>
                    <p className="mt-1">{selectedComplaint.department}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">District</Label>
                    <p className="mt-1">{selectedComplaint.location?.district || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">Citizen</Label>
                    <p className="mt-1">{selectedComplaint.citizenName}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">Created At</Label>
                    <p className="mt-1">{formatDate(selectedComplaint.createdAt)}</p>
                  </div>
                </div>
                {selectedComplaint.assignedOfficerName && (
                  <div>
                    <Label className="text-gray-500">Assigned Officer</Label>
                    <p className="mt-1">{selectedComplaint.assignedOfficerName}</p>
                  </div>
                )}
                {selectedComplaint.resolution && (
                  <div>
                    <Label className="text-gray-500">Resolution</Label>
                    <p className="mt-1 text-sm text-gray-700">
                      {typeof selectedComplaint.resolution === 'string'
                        ? selectedComplaint.resolution
                        : selectedComplaint.resolution.description}
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComplaintDetailOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
