import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  addDoc,
  limit,
  Timestamp,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, auth } from '@/firebase/config';
import { UserRole } from '@/lib/types';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  department?: string;
  district?: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
  language?: string;
}

export interface OfficerRequest {
  id: string;
  displayName: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  designation: string;
  district: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

// Get all users
export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName,
        role: data.role || 'citizen',
        department: data.department,
        district: data.district,
        phone: data.phone,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.(),
        language: data.language || 'en',
      } as UserData;
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Get users by role
export async function getUsersByRole(role: UserRole): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', role));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        district: data.district,
        phone: data.phone,
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.(),
        language: data.language || 'en',
      } as UserData;
    });
  } catch (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }
}

// Get active officers
export async function getActiveOfficers(): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef, 
      where('role', '==', 'officer'),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        district: data.district,
        phone: data.phone,
        isActive: true,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.(),
        language: data.language || 'en',
      } as UserData;
    });
  } catch (error) {
    console.error('Error fetching active officers:', error);
    return [];
  }
}

// Get user count by role
export async function getUserCounts(): Promise<{ total: number; citizens: number; officers: number; admins: number; activeOfficers: number }> {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    let citizens = 0;
    let officers = 0;
    let admins = 0;
    let activeOfficers = 0;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      switch (data.role) {
        case 'citizen':
          citizens++;
          break;
        case 'officer':
          officers++;
          if (data.isActive !== false) activeOfficers++;
          break;
        case 'admin':
          admins++;
          break;
      }
    });
    
    return {
      total: snapshot.size,
      citizens,
      officers,
      admins,
      activeOfficers,
    };
  } catch (error) {
    console.error('Error fetching user counts:', error);
    return { total: 0, citizens: 0, officers: 0, admins: 0, activeOfficers: 0 };
  }
}

// Update user role
export async function updateUserRole(uid: string, role: UserRole): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      role,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    return false;
  }
}

// Update user active status
export async function updateUserActiveStatus(uid: string, isActive: boolean): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isActive,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error updating user status:', error);
    return false;
  }
}

// Update user department
export async function updateUserDepartment(uid: string, department: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      department,
      updatedAt: Timestamp.now(),
    });
    return true;
  } catch (error) {
    console.error('Error updating user department:', error);
    return false;
  }
}

// Get officers by department
export async function getOfficersByDepartment(department: string): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('role', '==', 'officer'),
      where('department', '==', department),
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName,
        role: data.role,
        department: data.department,
        district: data.district,
        phone: data.phone,
        isActive: true,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        language: data.language || 'en',
      } as UserData;
    });
  } catch (error) {
    console.error('Error fetching officers by department:', error);
    return [];
  }
}

// Submit officer registration request
export async function submitOfficerRequest(data: {
  displayName: string;
  email: string;
  phone: string;
  employeeId: string;
  department: string;
  designation: string;
  district: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if email already exists in users or pending requests
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', data.email));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      return { success: false, error: 'An account with this email already exists' };
    }

    const requestsRef = collection(db, 'pending_officer_requests');
    const requestQuery = query(requestsRef, where('email', '==', data.email));
    const requestSnapshot = await getDocs(requestQuery);
    
    if (!requestSnapshot.empty) {
      return { success: false, error: 'A pending request with this email already exists' };
    }

    // Create new officer request
    await addDoc(requestsRef, {
      ...data,
      status: 'pending',
      submittedAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error submitting officer request:', error);
    return { success: false, error: error.message };
  }
}

// Get pending officer requests
export async function getPendingOfficerRequests(): Promise<OfficerRequest[]> {
  try {
    const requestsRef = collection(db, 'pending_officer_requests');
    const q = query(requestsRef, where('status', '==', 'pending'), orderBy('submittedAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        employeeId: data.employeeId,
        department: data.department,
        designation: data.designation,
        district: data.district,
        status: data.status,
        submittedAt: data.submittedAt?.toDate?.() || new Date(),
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt?.toDate?.(),
        rejectedBy: data.rejectedBy,
        rejectedAt: data.rejectedAt?.toDate?.(),
        rejectionReason: data.rejectionReason,
      } as OfficerRequest;
    });
  } catch (error) {
    console.error('Error fetching pending officer requests:', error);
    return [];
  }
}

// Approve officer request
export async function approveOfficerRequest(
  requestId: string,
  approvedByUid: string
): Promise<{ success: boolean; error?: string; generatedPassword?: string }> {
  try {
    const requestRef = doc(db, 'pending_officer_requests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'Request not found' };
    }

    const requestData = requestSnap.data();
    
    // Generate random password
    const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2);
    
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      requestData.email,
      generatedPassword
    );
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: requestData.email,
      displayName: requestData.displayName,
      phone: requestData.phone,
      role: 'officer',
      department: requestData.department,
      district: requestData.district,
      employeeId: requestData.employeeId,
      designation: requestData.designation,
      isActive: true,
      createdAt: serverTimestamp(),
      approvedBy: approvedByUid,
      language: 'en',
    });

    // Update request status
    await updateDoc(requestRef, {
      status: 'approved',
      approvedBy: approvedByUid,
      approvedAt: serverTimestamp(),
      generatedUid: userCredential.user.uid,
    });

    // TODO: Send email with credentials
    // This should be done via Firebase Cloud Function to send email securely

    return { success: true, generatedPassword };
  } catch (error: any) {
    console.error('Error approving officer request:', error);
    return { success: false, error: error.message };
  }
}

// Reject officer request
export async function rejectOfficerRequest(
  requestId: string,
  rejectedByUid: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const requestRef = doc(db, 'pending_officer_requests', requestId);
    await updateDoc(requestRef, {
      status: 'rejected',
      rejectedBy: rejectedByUid,
      rejectedAt: serverTimestamp(),
      rejectionReason,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error rejecting officer request:', error);
    return { success: false, error: error.message };
  }
}
