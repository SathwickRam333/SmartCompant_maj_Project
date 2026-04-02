import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { Complaint, Priority, SLA_RULES } from '@/lib/types';

interface EscalationResult {
  checked: number;
  escalated: number;
  details: Array<{
    trackingId: string;
    title: string;
    assignedOfficer: string;
    daysOverdue: number;
  }>;
}

/**
 * Check all assigned complaints and auto-escalate overdue ones
 * This should be run periodically (e.g., hourly or daily)
 */
export async function checkAndEscalateOverdueComplaints(): Promise<EscalationResult> {
  try {
    const complaintsRef = collection(db, 'complaints');
    
    // Query complaints that are assigned and not yet resolved
    const q = query(
      complaintsRef,
      where('status', 'in', ['under_review', 'in_progress'])
    );
    
    const snapshot = await getDocs(q);
    const now = new Date();
    
    let checked = 0;
    let escalated = 0;
    const details: Array<{
      trackingId: string;
      title: string;
      assignedOfficer: string;
      daysOverdue: number;
    }> = [];

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as Complaint;
      
      // Skip if not assigned to an officer
      if (!data.assignedOfficerId) {
        continue;
      }
      
      checked++;
      
      // Check if overdue based on SLA
      const slaDeadline = data.slaDeadline 
        ? (typeof data.slaDeadline === 'string' 
            ? new Date(data.slaDeadline) 
            : data.slaDeadline instanceof Date 
              ? data.slaDeadline 
              : (data.slaDeadline as any).toDate())
        : null;
      
      if (!slaDeadline) continue;
      
      const isOverdue = slaDeadline < now;
      
      if (isOverdue) {
        // Calculate days overdue
        const daysOverdue = Math.ceil((now.getTime() - slaDeadline.getTime()) / (1000 * 60 * 60 * 24));
        
        // Get current escalation level
        const currentLevel = data.escalationLevel || 0;
        
        // Escalate the complaint
        await updateDoc(doc(db, 'complaints', docSnap.id), {
          status: 'escalated',
          escalationLevel: currentLevel + 1,
          isOverdue: true,
          updatedAt: serverTimestamp(),
        });
        
        // Add escalation note to complaint history
        await addDoc(collection(db, 'complaints', docSnap.id, 'updates'), {
          type: 'system_escalation',
          message: `Complaint automatically escalated to admin after ${daysOverdue} days overdue. Originally assigned to ${data.assignedOfficerName || 'officer'}.`,
          previousStatus: data.status,
          newStatus: 'escalated',
          previousAssignee: data.assignedOfficerName,
          escalationLevel: currentLevel + 1,
          createdAt: serverTimestamp(),
        });
        
        // Log the escalation
        console.log(`Escalated: ${data.trackingId} - ${daysOverdue} days overdue`);
        
        escalated++;
        details.push({
          trackingId: data.trackingId,
          title: data.title,
          assignedOfficer: data.assignedOfficerName || 'Unknown',
          daysOverdue,
        });
      }
    }
    
    return {
      checked,
      escalated,
      details,
    };
  } catch (error) {
    console.error('Error checking overdue complaints:', error);
    throw error;
  }
}

/**
 * Get statistics about overdue complaints
 */
export async function getOverdueStatistics(): Promise<{
  totalOverdue: number;
  byPriority: Record<Priority, number>;
  byOfficer: Record<string, number>;
}> {
  try {
    const complaintsRef = collection(db, 'complaints');
    const q = query(
      complaintsRef,
      where('status', 'in', ['under_review', 'in_progress']),
      where('isOverdue', '==', true)
    );
    
    const snapshot = await getDocs(q);
    const now = new Date();
    
    const stats = {
      totalOverdue: 0,
      byPriority: { high: 0, medium: 0, low: 0 } as Record<Priority, number>,
      byOfficer: {} as Record<string, number>,
    };
    
    snapshot.forEach((doc) => {
      const data = doc.data() as Complaint;
      
      stats.totalOverdue++;
      
      // Count by priority
      if (data.priority) {
        stats.byPriority[data.priority]++;
      }
      
      // Count by officer
      if (data.assignedOfficerName) {
        stats.byOfficer[data.assignedOfficerName] = 
          (stats.byOfficer[data.assignedOfficerName] || 0) + 1;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting overdue statistics:', error);
    return {
      totalOverdue: 0,
      byPriority: { high: 0, medium: 0, low: 0 },
      byOfficer: {},
    };
  }
}

/**
 * Check if a specific complaint should be escalated
 */
export function shouldEscalateComplaint(
  complaint: Complaint,
  currentDate: Date = new Date()
): { shouldEscalate: boolean; daysOverdue: number } {
  // Don't escalate if already resolved or not assigned
  if (!complaint.assignedOfficerId || 
      complaint.status === 'resolved' || 
      complaint.status === 'closed' ||
      complaint.status === 'rejected' ||
      complaint.status === 'escalated') {
    return { shouldEscalate: false, daysOverdue: 0 };
  }
  
  // Check SLA deadline
  const slaDeadline = complaint.slaDeadline 
    ? (typeof complaint.slaDeadline === 'string' 
        ? new Date(complaint.slaDeadline) 
        : complaint.slaDeadline instanceof Date 
          ? complaint.slaDeadline 
          : (complaint.slaDeadline as any).toDate())
    : null;
  
  if (!slaDeadline) {
    return { shouldEscalate: false, daysOverdue: 0 };
  }
  
  const daysOverdue = Math.ceil((currentDate.getTime() - slaDeadline.getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    shouldEscalate: daysOverdue > 0,
    daysOverdue: Math.max(0, daysOverdue),
  };
}

/**
 * Manually escalate a complaint (for admin use)
 */
export async function manuallyEscalateComplaint(
  complaintId: string,
  reason: string,
  adminName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const complaintRef = doc(db, 'complaints', complaintId);
    
    // Get current complaint data
    const complaintSnap = await getDocs(query(collection(db, 'complaints'), where('__name__', '==', complaintId)));
    
    if (complaintSnap.empty) {
      return { success: false, error: 'Complaint not found' };
    }
    
    const data = complaintSnap.docs[0].data() as Complaint;
    const currentLevel = data.escalationLevel || 0;
    
    // Update complaint status
    await updateDoc(complaintRef, {
      status: 'escalated',
      escalationLevel: currentLevel + 1,
      updatedAt: serverTimestamp(),
    });
    
    // Add escalation note
    await addDoc(collection(db, 'complaints', complaintId, 'updates'), {
      type: 'manual_escalation',
      message: `Complaint manually escalated by ${adminName}. Reason: ${reason}`,
      previousStatus: data.status,
      newStatus: 'escalated',
      escalationLevel: currentLevel + 1,
      escalatedBy: adminName,
      createdAt: serverTimestamp(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error manually escalating complaint:', error);
    return { success: false, error: error.message };
  }
}
