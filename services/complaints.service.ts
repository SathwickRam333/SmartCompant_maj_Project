import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  DocumentSnapshot,
  onSnapshot,
  QueryConstraint,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import {
  Complaint,
  ComplaintStatus,
  Priority,
  ComplaintUpdate,
  ComplaintFormData,
  Attachment,
  GeoLocation,
  ComplaintFeedback,
} from '@/lib/types';
import { generateTrackingId, calculateSLADeadline } from '@/lib/utils';
import { classifyComplaint } from './ai.service';

function normalizeDepartmentName(value?: string): string {
  const raw = (value || '').toLowerCase().trim();
  if (!raw) return '';

  if (raw === 'municipal administration' || raw === 'it & communications') {
    return 'municipal';
  }
  if (raw === 'roads and buildings') {
    return 'roads & buildings';
  }

  return raw;
}

function mapCategoryToDepartment(category?: string): string {
  const key = (category || '').toLowerCase().trim();
  const categoryMap: Record<string, string> = {
    road: 'Roads & Buildings',
    water: 'Water Supply',
    electricity: 'Electricity',
    sanitation: 'Sanitation',
    healthcare: 'Healthcare',
    education: 'Education',
    revenue: 'Revenue',
    police: 'Police',
    transport: 'Transport',
    welfare: 'Social Welfare',
    corruption: 'Police',
    other: 'Municipal',
  };

  return categoryMap[key] || 'Municipal';
}

// Helper to safely convert Timestamp/Date to valid Date object
function toSafeDate(value: any): Date {
  if (!value) return new Date();
  
  try {
    // Handle Firestore Timestamp
    if (value?.toDate && typeof value.toDate === 'function') {
      const date = value.toDate();
      return isNaN(date.getTime()) ? new Date() : date;
    }
    
    // Handle Date object
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? new Date() : value;
    }
    
    // Handle string or number
    const date = new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

// Create a new complaint
export async function createComplaint(
  formData: ComplaintFormData,
  citizenId: string,
  citizenName: string,
  citizenEmail: string,
  citizenPhone?: string
): Promise<{ success: boolean; trackingId?: string; error?: string }> {
  try {
    const trackingId = generateTrackingId();
    
    // Get AI classification
    const classification = await classifyComplaint(formData.title, formData.description);
    const fallbackDepartment = mapCategoryToDepartment(formData.category);
    const selectedDepartment = (formData.department || '').trim();
    const finalDepartment = selectedDepartment || fallbackDepartment || classification.department;
    
    // Determine priority based on classification
    const priority: Priority = classification.priority || 'medium';
    
    // Calculate SLA deadline
    const slaDeadline = calculateSLADeadline(priority);
    
    // Upload attachments
    const attachments: Attachment[] = [];
    for (const file of formData.attachments) {
      const attachment = await uploadFile(file, trackingId);
      if (attachment) {
        attachments.push(attachment);
      }
    }

    const complaintData: Omit<Complaint, 'id'> = {
      trackingId,
      citizenId,
      citizenName,
      citizenEmail,
      citizenPhone,
      title: formData.title,
      description: formData.description,
      category: formData.category,
      department: finalDepartment,
      inputType: formData.inputType,
      location: formData.location,
      attachments,
      status: 'submitted',
      priority,
      slaDeadline,
      isOverdue: false,
      escalationLevel: 0,
      aiClassification: {
        department: classification.department || fallbackDepartment,
        confidence: classification.confidence,
        keywords: classification.keywords || [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await addDoc(collection(db, 'complaints'), {
      ...complaintData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      slaDeadline: Timestamp.fromDate(slaDeadline),
    });

    // Update stats
    await updateStats('submitted', complaintData.department);

    return { success: true, trackingId };
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    return { success: false, error: error.message };
  }
}

// Get complaint by tracking ID
export async function getComplaintByTrackingId(trackingId: string): Promise<Complaint | null> {
  try {
    const q = query(
      collection(db, 'complaints'),
      where('trackingId', '==', trackingId),
      limit(1)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return parseComplaintDoc(doc);
  } catch (error) {
    console.error('Error getting complaint:', error);
    return null;
  }
}

// Get complaint by ID
export async function getComplaintById(id: string): Promise<Complaint | null> {
  try {
    const docRef = doc(db, 'complaints', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }

    return parseComplaintDoc(docSnap);
  } catch (error) {
    console.error('Error getting complaint:', error);
    return null;
  }
}

// Get complaints for citizen
export async function getCitizenComplaints(
  citizenId: string,
  lastDoc?: DocumentSnapshot,
  pageSize: number = 10
): Promise<{ complaints: Complaint[]; lastDoc: DocumentSnapshot | null }> {
  try {
    const constraints: QueryConstraint[] = [
      where('citizenId', '==', citizenId),
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, 'complaints'), ...constraints);
    const snapshot = await getDocs(q);

    const complaints = snapshot.docs.map(parseComplaintDoc);
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { complaints, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error getting citizen complaints:', error);
    return { complaints: [], lastDoc: null };
  }
}

// Get complaints for officer (both assigned and unassigned for officer to pick up)
export async function getOfficerComplaints(
  officerId: string,
  status?: ComplaintStatus,
  lastDoc?: DocumentSnapshot,
  pageSize: number = 50
): Promise<{ complaints: Complaint[]; lastDoc: DocumentSnapshot | null }> {
  try {
    console.log('🔍 Getting complaints for officer:', officerId);
    
    if (!officerId) {
      console.error('❌ No officer ID provided');
      return { complaints: [], lastDoc: null };
    }
    
    // Get officer's user document to find their department
    const userDoc = await getDoc(doc(db, 'users', officerId));
    const officerDepartment = userDoc.exists() ? userDoc.data()?.department : null;
    const officerDistrict = userDoc.exists() ? userDoc.data()?.district : null;
    const normalizedOfficerDepartment = normalizeDepartmentName(officerDepartment || '');
    const normalizedOfficerDistrict = (officerDistrict || '').toLowerCase().trim();
    
    console.log('👮 Officer department:', officerDepartment);
    console.log('📍 Officer district:', officerDistrict);
    
    // Get ALL complaints and filter in memory (simpler, no index required)
    const complaintsRef = collection(db, 'complaints');
    const allComplaintsQuery = query(
      complaintsRef,
      orderBy('createdAt', 'desc'),
      limit(100) // Get last 100 complaints
    );

    const snapshot = await getDocs(allComplaintsQuery);
    console.log('📊 Total complaints fetched:', snapshot.size);

    // Parse all complaints
    const allComplaints = snapshot.docs.map(doc => parseComplaintDoc(doc));
    
    // Filter for officer: assigned to them OR (unassigned with relevant status AND matching department)
    const relevantComplaints = allComplaints.filter(complaint => {
      // Show if assigned to this officer
      if (complaint.assignedOfficerId === officerId) {
        console.log('✅ Complaint assigned to officer:', complaint.id);
        return true;
      }
      
        // Show if:
        // - Unassigned
        // - In actionable status
        // - Matches officer's department (if officer has department assigned)
        // - Matches officer's district (if officer has district assigned)
      if (!complaint.assignedOfficerId && 
          ['submitted', 'under_review', 'in_progress'].includes(complaint.status)) {
        
        // If officer has a department, only show complaints from that department
        if (normalizedOfficerDepartment) {
          const normalizedComplaintDepartment = normalizeDepartmentName(complaint.department);
          const departmentMatches = normalizedComplaintDepartment === normalizedOfficerDepartment;
          
          // Note: District filtering removed - officers see ALL complaints from their department
          // regardless of which district the complaint is from
          
          return departmentMatches;
        }
        
        // If officer has no department (maybe admin), show all unassigned
        console.log('✅ Unassigned complaint (no dept filter):', complaint.id);
        return true;
      }
      
      return false;
    });

    console.log('📋 Relevant complaints for officer:', relevantComplaints.length);

    // Apply status filter if provided
    let complaints = status 
      ? relevantComplaints.filter(c => c.status === status)
      : relevantComplaints;

    // Apply pagination
    complaints = complaints.slice(0, pageSize);

    return { complaints, lastDoc: null };
  } catch (error) {
    console.error('❌ Error getting officer complaints:', error);
    return { complaints: [], lastDoc: null };
  }
}

// Get all complaints (admin)
export async function getAllComplaints(
  filters?: {
    status?: ComplaintStatus;
    department?: string;
    district?: string;
    priority?: Priority;
    startDate?: Date;
    endDate?: Date;
  },
  lastDoc?: DocumentSnapshot,
  pageSize: number = 20
): Promise<{ complaints: Complaint[]; lastDoc: DocumentSnapshot | null }> {
  try {
    const constraints: QueryConstraint[] = [
      orderBy('createdAt', 'desc'),
      limit(pageSize),
    ];

    if (filters?.status) {
      constraints.unshift(where('status', '==', filters.status));
    }
    if (filters?.department) {
      constraints.unshift(where('department', '==', filters.department));
    }
    if (filters?.priority) {
      constraints.unshift(where('priority', '==', filters.priority));
    }

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const q = query(collection(db, 'complaints'), ...constraints);
    const snapshot = await getDocs(q);

    const complaints = snapshot.docs.map(parseComplaintDoc);
    const newLastDoc = snapshot.docs[snapshot.docs.length - 1] || null;

    return { complaints, lastDoc: newLastDoc };
  } catch (error) {
    console.error('Error getting all complaints:', error);
    return { complaints: [], lastDoc: null };
  }
}

// Update complaint status
export async function updateComplaintStatus(
  complaintId: string,
  status: ComplaintStatus,
  officerId: string,
  officerName: string,
  comment: string,
  attachments?: File[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const uploadedAttachments: Attachment[] = [];
    
    if (attachments) {
      for (const file of attachments) {
        const attachment = await uploadFile(file, complaintId);
        if (attachment) {
          uploadedAttachments.push(attachment);
        }
      }
    }

    // Create update record
    const updateData: Omit<ComplaintUpdate, 'id'> = {
      complaintId,
      officerId,
      officerName,
      status,
      comment,
      attachments: uploadedAttachments,
      createdAt: new Date(),
    };

    await addDoc(collection(db, 'updates'), {
      ...updateData,
      createdAt: serverTimestamp(),
    });

    // Update complaint
    const updates: Record<string, any> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === 'resolved' || status === 'closed') {
      updates.resolvedAt = serverTimestamp();
    }

    await updateDoc(doc(db, 'complaints', complaintId), updates);

    return { success: true };
  } catch (error: any) {
    console.error('Error updating complaint status:', error);
    return { success: false, error: error.message };
  }
}

// Add resolution to complaint
export async function addResolution(
  complaintId: string,
  resolution: string,
  afterImages?: File[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const uploadedImages: string[] = [];
    
    if (afterImages) {
      for (const file of afterImages) {
        const attachment = await uploadFile(file, complaintId);
        if (attachment) {
          uploadedImages.push(attachment.url);
        }
      }
    }

    await updateDoc(doc(db, 'complaints', complaintId), {
      resolution,
      afterImages: uploadedImages,
      status: 'resolved',
      resolvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error adding resolution:', error);
    return { success: false, error: error.message };
  }
}

// Assign complaint to officer
export async function assignComplaintToOfficer(
  complaintId: string,
  officerId: string,
  officerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'complaints', complaintId), {
      assignedOfficerId: officerId,
      assignedOfficerName: officerName,
      status: 'in_progress',
      updatedAt: serverTimestamp(),
    });

    // Add update record
    await addDoc(collection(db, 'updates'), {
      complaintId,
      officerId,
      officerName,
      status: 'in_progress',
      comment: `Complaint assigned to ${officerName}`,
      attachments: [],
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error assigning complaint:', error);
    return { success: false, error: error.message };
  }
}

// Submit feedback
export async function submitFeedback(
  complaintId: string,
  rating: number,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const feedback: ComplaintFeedback = {
      rating,
      comment,
      createdAt: new Date(),
    };

    await updateDoc(doc(db, 'complaints', complaintId), {
      feedback,
      updatedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    return { success: false, error: error.message };
  }
}

// Get complaint updates
export async function getComplaintUpdates(complaintId: string): Promise<ComplaintUpdate[]> {
  try {
    const q = query(
      collection(db, 'updates'),
      where('complaintId', '==', complaintId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: toSafeDate(doc.data().createdAt),
    })) as ComplaintUpdate[];
  } catch (error) {
    console.error('Error getting complaint updates:', error);
    return [];
  }
}

// Subscribe to complaint updates
export function subscribeToComplaint(
  complaintId: string,
  callback: (complaint: Complaint | null) => void
) {
  return onSnapshot(doc(db, 'complaints', complaintId), (doc) => {
    if (doc.exists()) {
      callback(parseComplaintDoc(doc));
    } else {
      callback(null);
    }
  });
}

// Upload file
async function uploadFile(file: File, trackingId: string): Promise<Attachment | null> {
  try {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `complaints/${trackingId}/${fileName}`);
    
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    
    const fileType = file.type.startsWith('image/') 
      ? 'image' 
      : file.type.startsWith('audio/') 
        ? 'audio' 
        : 'document';

    return {
      id: fileName,
      url,
      type: fileType,
      name: file.name,
      size: file.size,
      uploadedAt: new Date(),
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
}

// Update stats
async function updateStats(status: ComplaintStatus, department: string): Promise<void> {
  try {
    const statsRef = doc(db, 'stats', 'global');
    const statsDoc = await getDoc(statsRef);
    
    if (statsDoc.exists()) {
      const data = statsDoc.data();
      await updateDoc(statsRef, {
        totalComplaints: (data.totalComplaints || 0) + 1,
        [`byDepartment.${department}`]: (data.byDepartment?.[department] || 0) + 1,
        [`byStatus.${status}`]: (data.byStatus?.[status] || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

// Parse complaint document
function parseComplaintDoc(doc: DocumentSnapshot): Complaint {
  const data = doc.data()!;
  
  // Helper to safely convert any date format to string ISO
  const toDateString = (value: any): string => {
    if (!value) return new Date().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (value?.toDate) return value.toDate().toISOString(); // Firestore Timestamp
    return new Date().toISOString();
  };
  
  return {
    id: doc.id,
    ...data,
    createdAt: toDateString(data.createdAt),
    updatedAt: toDateString(data.updatedAt),
    slaDeadline: toDateString(data.slaDeadline),
    resolvedAt: data.resolvedAt ? toDateString(data.resolvedAt) : undefined,
  } as Complaint;
}

// Check for duplicate complaints
export async function checkDuplicateComplaints(
  title: string,
  description: string,
  location?: GeoLocation
): Promise<{ isDuplicate: boolean; similarComplaints: Complaint[] }> {
  try {
    // Get recent complaints (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const complaintsQuery = query(
      collection(db, 'complaints'),
      where('createdAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
      where('status', 'in', ['submitted', 'under_review', 'in_progress']),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(complaintsQuery);
    const complaints = snapshot.docs.map(parseComplaintDoc);

    // Simple keyword-based similarity check
    const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const descWords = description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const searchWords = Array.from(new Set([...titleWords, ...descWords]));

    const similarComplaints = complaints.filter(c => {
      const complaintWords = `${c.title} ${c.description}`.toLowerCase().split(/\s+/);
      const matchCount = searchWords.filter(w => complaintWords.some(cw => cw.includes(w))).length;
      const similarity = searchWords.length > 0 ? matchCount / searchWords.length : 0;

      // Check location proximity if available
      let isNearby = false;
      if (location && c.location) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          c.location.latitude,
          c.location.longitude
        );
        isNearby = distance < 1; // Within 1 km
      }

      // Consider duplicate if >60% word match OR (>40% match AND nearby location)
      return similarity > 0.6 || (similarity > 0.4 && isNearby);
    });

    return {
      isDuplicate: similarComplaints.length > 0,
      similarComplaints: similarComplaints.slice(0, 5), // Return top 5 similar
    };
  } catch (error) {
    console.error('Error checking duplicates:', error);
    return { isDuplicate: false, similarComplaints: [] };
  }
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Get similar complaints for suggestion
export async function getSimilarComplaints(
  category: string,
  department: string,
  location?: GeoLocation
): Promise<Complaint[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('department', '==', department),
      where('status', '==', 'resolved'),
      orderBy('createdAt', 'desc'),
      limit(10),
    ];

    const complaintsQuery = query(collection(db, 'complaints'), ...constraints);
    const snapshot = await getDocs(complaintsQuery);
    
    let complaints = snapshot.docs.map(parseComplaintDoc);

    // Sort by location proximity if available
    if (location) {
      complaints = complaints.sort((a, b) => {
        if (!a.location || !b.location) return 0;
        const distA = calculateDistance(location.latitude, location.longitude, a.location.latitude, a.location.longitude);
        const distB = calculateDistance(location.latitude, location.longitude, b.location.latitude, b.location.longitude);
        return distA - distB;
      });
    }

    return complaints.slice(0, 5);
  } catch (error) {
    console.error('Error getting similar complaints:', error);
    return [];
  }
}
