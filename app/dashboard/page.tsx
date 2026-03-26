'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building2,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  getDashboardStats,
  getComplaintCountsByStatus,
  getDepartmentPerformance,
  getRecentActivity,
} from '@/services/stats.service';
import { DashboardStats, DEPARTMENTS, DISTRICTS } from '@/lib/types';
import { formatDate } from '@/lib/utils';

// Dynamically import map to avoid SSR issues
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] flex items-center justify-center bg-gray-100 rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

const COLORS = ['#1a472a', '#d4a012', '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4'];

const statusColors = {
  submitted: '#3b82f6',
  assigned: '#f59e0b',
  'in-progress': '#f97316',
  resolved: '#22c55e',
  closed: '#6b7280',
  rejected: '#ef4444',
};

export default function PublicDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  useEffect(() => {
    fetchDashboardData();
  }, [selectedDistrict, selectedPeriod]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, deptData, recentData] = await Promise.all([
        getDashboardStats(),
        getDepartmentPerformance(),
        getRecentActivity(10),
      ]);
      setStats(statsData);
      setDepartmentData(deptData);
      setRecentComplaints(recentData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Dynamic status data from stats.byStatus
  const statusData = stats ? [
    { name: 'Submitted', value: stats.byStatus?.submitted || 0, color: statusColors.submitted },
    { name: 'Under Review', value: stats.byStatus?.under_review || 0, color: statusColors.assigned },
    { name: 'In Progress', value: stats.byStatus?.in_progress || stats.pendingComplaints, color: statusColors['in-progress'] },
    { name: 'Resolved', value: stats.byStatus?.resolved || stats.resolvedComplaints, color: statusColors.resolved },
    { name: 'Closed', value: stats.byStatus?.closed || stats.closedComplaints, color: statusColors.closed },
  ] : [];

  const monthlyTrends = stats?.monthlyTrends || [
    { month: 'Jan', complaints: 120, resolved: 100 },
    { month: 'Feb', complaints: 150, resolved: 130 },
    { month: 'Mar', complaints: 180, resolved: 160 },
    { month: 'Apr', complaints: 200, resolved: 180 },
    { month: 'May', complaints: 170, resolved: 165 },
    { month: 'Jun', complaints: 190, resolved: 175 },
  ];

  // Dynamic category data from stats.byDepartment or departmentData
  const categoryData = stats?.byDepartment 
    ? Object.entries(stats.byDepartment)
        .map(([name, count]) => ({ name, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    : departmentData.length > 0
      ? departmentData.map(d => ({ name: d.name, count: d.total })).slice(0, 6)
      : [
          { name: 'Roads & Infrastructure', count: 0 },
          { name: 'Water Supply', count: 0 },
          { name: 'Electricity', count: 0 },
          { name: 'Sanitation', count: 0 },
          { name: 'Public Safety', count: 0 },
          { name: 'Others', count: 0 },
        ];

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary">Public Dashboard</h1>
            <p className="text-gray-600">
              Real-time transparency in grievance resolution
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {DISTRICTS.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchDashboardData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Complaints</p>
                  <p className="text-3xl font-bold text-primary">
                    {stats?.totalComplaints.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500 font-medium">+12%</span>
                <span className="text-gray-500 ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Resolved</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats?.resolvedComplaints.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Progress
                  value={stats ? (stats.resolvedComplaints / stats.totalComplaints) * 100 : 0}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {stats ? Math.round((stats.resolvedComplaints / stats.totalComplaints) * 100) : 0}% resolution rate
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-3xl font-bold text-orange-500">
                    {stats?.pendingComplaints.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Avg. resolution time: <span className="font-medium">{stats?.avgResolutionTime || '0'} days</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Overdue</p>
                  <p className="text-3xl font-bold text-red-500">
                    {stats?.overdueComplaints.toLocaleString() || '0'}
                  </p>
                </div>
                <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-4">
                Requires immediate attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="map">Map View</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Complaint Status Distribution</CardTitle>
                  <CardDescription>Current status of all complaints</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {statusData.map((entry, index) => (
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
                  <CardDescription>Complaints filed vs resolved</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyTrends}>
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

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Complaints by Category</CardTitle>
                <CardDescription>Distribution across different complaint categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="name" width={150} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#1a472a" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Departments Tab */}
          <TabsContent value="departments" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {departmentData.slice(0, 6).map((dept, index) => (
                <Card key={dept.department || index}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      {dept.department?.length > 20 ? dept.department.slice(0, 20) + '...' : dept.department}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Total Complaints</span>
                        <span className="font-semibold">{dept.total || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Resolution Rate</span>
                        <span className="font-semibold text-green-600">
                          {dept.total > 0 ? Math.round((dept.resolved / dept.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Avg. Time</span>
                        <span className="font-semibold">
                          {dept.avgResolutionDays || 0} days
                        </span>
                      </div>
                      <Progress value={dept.total > 0 ? (dept.resolved / dept.total) * 100 : 0} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {departmentData.length === 0 && !isLoading && (
              <Card>
                <CardContent className="py-8 text-center text-gray-500">
                  <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No department data available yet</p>
                </CardContent>
              </Card>
            )}

            {/* Department Performance Chart */}
            {departmentData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Department Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={departmentData.slice(0, 8).map((dept) => ({
                        name: dept.department?.length > 15 ? dept.department.slice(0, 15) + '...' : dept.department,
                        complaints: dept.total || 0,
                        resolved: dept.resolved || 0,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="complaints" fill="#1a472a" name="Total" />
                      <Bar dataKey="resolved" fill="#22c55e" name="Resolved" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            )}
          </TabsContent>

          {/* Map Tab */}
          <TabsContent value="map">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Complaint Hotspots
                </CardTitle>
                <CardDescription>
                  Geographic distribution of complaints across Telangana
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MapView />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Tab */}
          <TabsContent value="recent">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Latest complaints and updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentComplaints.length > 0 ? (
                    recentComplaints.map((complaint, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-800 truncate">
                                {complaint.title}
                              </p>
                              <p className="text-sm text-gray-500">
                                {complaint.trackingId} • {complaint.department}
                              </p>
                            </div>
                            <Badge
                              variant="secondary"
                              className={`${
                                complaint.status === 'resolved'
                                  ? 'bg-green-100 text-green-700'
                                  : complaint.status === 'in-progress'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {complaint.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDate(complaint.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
