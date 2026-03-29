import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  AggregateField,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { DashboardStats, MonthlyTrend, ComplaintStatus, Priority } from '@/lib/types';
import { subMonths, format, startOfMonth, endOfMonth } from 'date-fns';

// Helper to safely convert Timestamp/Date to valid Date object
function toSafeDate(value: any): Date | null {
  if (!value) return null;
  
  try {
    // Handle Firestore Timestamp
    if (value?.toDate && typeof value.toDate === 'function') {
      const date = value.toDate();
      return isNaN(date.getTime()) ? null : date;
    }
    
    // Handle Date object
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    
    // Handle string or number
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Get dashboard statistics
export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    // Always calculate from live complaints first to avoid stale/incorrect cached values.
    const liveStats = await calculateStats();

    // If live stats contain any data, trust them.
    if (liveStats.totalComplaints > 0) {
      return liveStats;
    }

    // Fallback to cached stats document only when there are no complaints.
    const statsRef = doc(db, 'stats', 'global');
    const statsDoc = await getDoc(statsRef);
    if (statsDoc.exists()) {
      const data = statsDoc.data();
      return {
        totalComplaints: data.totalComplaints || 0,
        pendingComplaints: data.pendingComplaints || 0,
        resolvedComplaints: data.resolvedComplaints || 0,
        closedComplaints: data.closedComplaints || 0,
        escalatedComplaints: data.escalatedComplaints || 0,
        overdueComplaints: data.overdueComplaints || 0,
        avgResolutionTime: data.avgResolutionTime || 0,
        byDepartment: data.byDepartment || {},
        byDistrict: data.byDistrict || {},
        byStatus: data.byStatus || {},
        byPriority: data.byPriority || {},
        monthlyTrends: data.monthlyTrends || [],
      };
    }

    return liveStats;
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return getEmptyStats();
  }
}

// Calculate stats from complaints collection
async function calculateStats(): Promise<DashboardStats> {
  const complaintsRef = collection(db, 'complaints');
  
  // Get all complaints for calculation
  const snapshot = await getDocs(complaintsRef);
  
  const stats: DashboardStats = {
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    closedComplaints: 0,
    escalatedComplaints: 0,
    overdueComplaints: 0,
    avgResolutionTime: 0,
    byDepartment: {},
    byDistrict: {},
    byStatus: {},
    byPriority: {},
    monthlyTrends: [],
  };

  const resolutionTimes: number[] = [];
  const monthlyData: Record<string, { total: number; resolved: number; pending: number }> = {};
  const now = new Date();

  snapshot.forEach((doc) => {
    const data = doc.data();
    stats.totalComplaints++;

    // Status counts
    const status = data.status as ComplaintStatus;
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    if (status === 'submitted' || status === 'under_review' || status === 'in_progress') {
      stats.pendingComplaints++;
    } else if (status === 'resolved') {
      stats.resolvedComplaints++;
      
      // Calculate resolution time
      if (data.resolvedAt && data.createdAt) {
        const createdAt = toSafeDate(data.createdAt);
        const resolvedAt = toSafeDate(data.resolvedAt);
        if (createdAt && resolvedAt) {
          const days = Math.ceil((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          resolutionTimes.push(days);
        }
      }
    } else if (status === 'closed') {
      stats.closedComplaints++;
    } else if (status === 'escalated') {
      stats.escalatedComplaints++;
    }
    
    // Check for overdue complaints
    if (data.slaDeadline && status !== 'resolved' && status !== 'closed' && status !== 'rejected') {
      const slaDeadline = toSafeDate(data.slaDeadline);
      if (slaDeadline && slaDeadline < now) {
        stats.overdueComplaints++;
      }
    }

    // Department counts
    const dept = data.department as string;
    stats.byDepartment[dept] = (stats.byDepartment[dept] || 0) + 1;

    // District counts
    const district = data.location?.district as string;
    if (district) {
      stats.byDistrict[district] = (stats.byDistrict[district] || 0) + 1;
    }

    // Priority counts
    const priority = data.priority as Priority;
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

    // Monthly trends
    if (data.createdAt) {
      const createdAt = toSafeDate(data.createdAt);
      if (createdAt) {
        const monthKey = format(createdAt, 'yyyy-MM');
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { total: 0, resolved: 0, pending: 0 };
        }
        monthlyData[monthKey].total++;
        
        if (status === 'resolved' || status === 'closed') {
          monthlyData[monthKey].resolved++;
        } else {
          monthlyData[monthKey].pending++;
        }
      }
    }
  });

  // Calculate average resolution time
  if (resolutionTimes.length > 0) {
    stats.avgResolutionTime = resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length;
  }

  // Format monthly trends
  const sortedMonths = Object.keys(monthlyData).sort();
  stats.monthlyTrends = sortedMonths.slice(-12).map(month => ({
    month: format(new Date(month + '-01'), 'MMM yyyy'),
    total: monthlyData[month].total,
    resolved: monthlyData[month].resolved,
    pending: monthlyData[month].pending,
  }));

  return stats;
}

// Get complaint counts by status
export async function getComplaintCountsByStatus(): Promise<Record<ComplaintStatus, number>> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const statuses: ComplaintStatus[] = [
      'submitted', 'under_review', 'in_progress', 
      'resolved', 'closed', 'escalated', 'rejected'
    ];
    
    const counts: Record<ComplaintStatus, number> = {} as Record<ComplaintStatus, number>;

    for (const status of statuses) {
      const q = query(complaintsRef, where('status', '==', status));
      const snapshot = await getCountFromServer(q);
      counts[status] = snapshot.data().count;
    }

    return counts;
  } catch (error) {
    console.error('Error getting status counts:', error);
    return {} as Record<ComplaintStatus, number>;
  }
}

// Get complaints by location for map
export async function getComplaintLocations(): Promise<Array<{
  id: string;
  trackingId: string;
  title: string;
  status: ComplaintStatus;
  priority: Priority;
  latitude: number;
  longitude: number;
  department: string;
  address?: string;
  district?: string;
}>> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const q = query(
      complaintsRef,
      where('status', 'in', ['submitted', 'under_review', 'in_progress', 'escalated']),
      limit(500)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        trackingId: data.trackingId,
        title: data.title,
        status: data.status,
        priority: data.priority || 'medium',
        latitude: data.location?.latitude,
        longitude: data.location?.longitude,
        department: data.department,
        address: data.location?.address,
        district: data.location?.district,
      };
    }).filter(c => c.latitude && c.longitude);
  } catch (error) {
    console.error('Error getting complaint locations:', error);
    return [];
  }
}

// Get department performance metrics
export async function getDepartmentPerformance(): Promise<Array<{
  department: string;
  total: number;
  resolved: number;
  pending: number;
  avgResolutionDays: number;
  onTimeRate: number;
}>> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const snapshot = await getDocs(complaintsRef);
    
    const deptData: Record<string, {
      total: number;
      resolved: number;
      pending: number;
      resolutionTimes: number[];
      onTime: number;
    }> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const dept = data.department as string;
      
      if (!deptData[dept]) {
        deptData[dept] = { total: 0, resolved: 0, pending: 0, resolutionTimes: [], onTime: 0 };
      }
      
      deptData[dept].total++;
      
      const status = data.status as ComplaintStatus;
      if (status === 'resolved' || status === 'closed') {
        deptData[dept].resolved++;
        
        if (data.resolvedAt && data.createdAt && data.slaDeadline) {
          const resolvedAt = toSafeDate(data.resolvedAt);
          const createdAt = toSafeDate(data.createdAt);
          const deadline = toSafeDate(data.slaDeadline);
          
          if (resolvedAt && createdAt && deadline) {
            const days = Math.ceil((resolvedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            deptData[dept].resolutionTimes.push(days);
            
            if (resolvedAt <= deadline) {
              deptData[dept].onTime++;
            }
          }
        }
      } else if (status !== 'rejected') {
        deptData[dept].pending++;
      }
    });

    return Object.entries(deptData).map(([department, data]) => ({
      department,
      total: data.total,
      resolved: data.resolved,
      pending: data.pending,
      avgResolutionDays: data.resolutionTimes.length > 0
        ? Math.round(data.resolutionTimes.reduce((a, b) => a + b, 0) / data.resolutionTimes.length * 10) / 10
        : 0,
      onTimeRate: data.resolved > 0
        ? Math.round((data.onTime / data.resolved) * 100)
        : 0,
    })).sort((a, b) => b.total - a.total);
  } catch (error) {
    console.error('Error getting department performance:', error);
    return [];
  }
}

// Get recent activity
export async function getRecentActivity(
  limitCount: number = 10
): Promise<Array<{
  id: string;
  trackingId: string;
  title: string;
  status: ComplaintStatus;
  department: string;
  updatedAt: Date;
}>> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const q = query(
      complaintsRef,
      orderBy('updatedAt', 'desc'),
      limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        trackingId: data.trackingId,
        title: data.title,
        status: data.status,
        department: data.department,
        updatedAt: toSafeDate(data.updatedAt) || new Date(),
      };
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    return [];
  }
}

// Empty stats for error fallback
function getEmptyStats(): DashboardStats {
  return {
    totalComplaints: 0,
    pendingComplaints: 0,
    resolvedComplaints: 0,
    closedComplaints: 0,
    escalatedComplaints: 0,
    overdueComplaints: 0,
    avgResolutionTime: 0,
    byDepartment: {},
    byDistrict: {},
    byStatus: {},
    byPriority: {},
    monthlyTrends: [],
  };
}
