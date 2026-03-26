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
import { getAllUsers, getUserCounts, updateUserRole, updateUserActiveStatus } from '@/services/users.service';
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

  const router = useRouter();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

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
      const [complaintsData, statsData, usersData, userCounts] = await Promise.all([
        getAllComplaints(),
        getDashboardStats(),
        getAllUsers(),
        getUserCounts(),
      ]);
      setComplaints(complaintsData.complaints);
      setStats({
        ...statsData,
        totalUsers: userCounts.total,
        activeOfficers: userCounts.activeOfficers,
      });
      setUsers(usersData as UserType[]);
    } catch (error) {
      console.error('Error fetching data:', error);
      setComplaints([]);
      setStats(null);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
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

  // Dynamic department stats computed from actual data
  const departmentStats = stats?.byDepartment
    ? Object.entries(stats.byDepartment)
        .map(([name, total]) => ({
          name: name.length > 15 ? name.slice(0, 12) + '...' : name,
          total: total as number,
          resolved: complaints.filter(c => c.department === name && (c.status === 'resolved' || c.status === 'closed')).length,
          pending: complaints.filter(c => c.department === name && !['resolved', 'closed', 'rejected'].includes(c.status)).length,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
    : [];

  // Dynamic status distribution computed from actual data
  const statusDistribution = stats?.byStatus
    ? [
        { name: 'Submitted', value: stats.byStatus.submitted || 0, color: '#3b82f6' },
        { name: 'Under Review', value: stats.byStatus.under_review || 0, color: '#f59e0b' },
        { name: 'In Progress', value: stats.byStatus.in_progress || 0, color: '#f97316' },
        { name: 'Resolved', value: stats.byStatus.resolved || 0, color: '#22c55e' },
        { name: 'Closed', value: stats.byStatus.closed || 0, color: '#6b7280' },
      ]
    : [];

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
                    {stats ? Math.round((stats.resolvedComplaints / stats.totalComplaints) * 100) : 0}%
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <Progress
                value={stats ? (stats.resolvedComplaints / stats.totalComplaints) * 100 : 0}
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
          <TabsList className="grid w-full grid-cols-4 max-w-lg mb-6">
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
                      <LineChart data={stats?.monthlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="complaints"
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
                            <Button variant="ghost" size="sm">
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
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500">
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
                      <Input type="number" defaultValue={1} className="w-16" />
                      <span className="text-sm text-gray-500">day(s)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-yellow-600">Medium Priority</p>
                      <p className="text-sm text-gray-500">Standard issues</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue={3} className="w-16" />
                      <span className="text-sm text-gray-500">day(s)</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-green-600">Low Priority</p>
                      <p className="text-sm text-gray-500">Minor issues</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" defaultValue={7} className="w-16" />
                      <span className="text-sm text-gray-500">day(s)</span>
                    </div>
                  </div>
                  <Button className="w-full">Save SLA Settings</Button>
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
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">SLA Breach Alerts</p>
                      <p className="text-sm text-gray-500">Email on overdue complaints</p>
                    </div>
                    <input type="checkbox" defaultChecked className="h-4 w-4" />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Daily Summary</p>
                      <p className="text-sm text-gray-500">Daily digest email</p>
                    </div>
                    <input type="checkbox" className="h-4 w-4" />
                  </div>
                  <Button className="w-full">Save Notification Settings</Button>
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
                <Input placeholder="Enter full name" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" placeholder="officer@telangana.gov.in" />
              </div>
              <div>
                <Label>Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>District</Label>
                <Select>
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
              <Button onClick={() => {
                toast({ title: 'Officer Added', description: 'New officer account created' });
                setIsUserDialogOpen(false);
              }}>
                Add Officer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
