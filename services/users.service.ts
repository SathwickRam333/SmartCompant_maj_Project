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
import firebaseApp, { db } from '@/firebase/config';
import { UserRole } from '@/lib/types';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  getAuth,
  signOut,
} from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';

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

// Update user profile fields (admin)
export async function updateUserDetails(
  uid: string,
  updates: {
    displayName?: string;
    role?: UserRole;
    department?: string;
    district?: string;
    phone?: string;
    isActive?: boolean;
  }
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    const payload: Record<string, any> = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    // Avoid writing undefined fields
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    await updateDoc(userRef, payload);
    return true;
  } catch (error) {
    console.error('Error updating user details:', error);
    return false;
  }
}

// Delete user Firestore record (admin)
// Note: This removes the profile document only; Auth account removal must be done via Admin SDK/Cloud Function.
export async function deleteUserRecord(uid: string): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    console.error('Error deleting user record:', error);
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
    const normalizedEmail = data.email.trim().toLowerCase();
    const payload = {
      ...data,
      email: normalizedEmail,
    };

    console.log('📝 Submitting officer request:', payload);
    
    // Check if email already exists in users or pending requests
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', normalizedEmail));
    const userSnapshot = await getDocs(userQuery);
    
    if (!userSnapshot.empty) {
      console.warn('⚠️ Email already exists in users');
      return { success: false, error: 'An account with this email already exists' };
    }

    const requestsRef = collection(db, 'pending_officer_requests');
    const requestQuery = query(
      requestsRef,
      where('email', '==', normalizedEmail),
      where('status', '==', 'pending')
    );
    const requestSnapshot = await getDocs(requestQuery);
    
    if (!requestSnapshot.empty) {
      console.warn('⚠️ Email already exists in pending requests');
      return { success: false, error: 'A pending request with this email already exists' };
    }

    // Create new officer request
    const docRef = await addDoc(requestsRef, {
      ...payload,
      status: 'pending',
      submittedAt: serverTimestamp(),
    });

    console.log('✅ Officer request created successfully:', docRef.id);
    console.log('📍 Document path: pending_officer_requests/' + docRef.id);
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error submitting officer request:', error);
    console.error('Error details:', error.message);
    return { success: false, error: error.message };
  }
}

// Get pending officer requests
export async function getPendingOfficerRequests(): Promise<OfficerRequest[]> {
  try {
    console.log('🔍 Fetching pending officer requests...');
    
    const requestsRef = collection(db, 'pending_officer_requests');
    // Query without orderBy first (no index needed), then sort on client
    const q = query(requestsRef, where('status', '==', 'pending'));
    const snapshot = await getDocs(q);
    
    console.log(`✅ Found ${snapshot.size} pending requests`);
    
    const requests = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('📋 Request:', doc.id, data);
      
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
    
    // Sort by submittedAt in descending order (newest first)
    return requests.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  } catch (error) {
    console.error('❌ Error fetching pending officer requests:', error);
    return [];
  }
}

// Approve officer request
export async function approveOfficerRequest(
  requestId: string,
  approvedByUid: string
): Promise<{ success: boolean; error?: string; generatedPassword?: string }> {
  let secondaryApp: ReturnType<typeof initializeApp> | null = null;

  try {
    const requestRef = doc(db, 'pending_officer_requests', requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      return { success: false, error: 'Request not found' };
    }

    const requestData = requestSnap.data();
    
    // Generate random password
    const generatedPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).toUpperCase().slice(-2);

    // Create the Auth user in an isolated secondary app so current admin session is not replaced.
    secondaryApp = initializeApp(firebaseApp.options, `officer-create-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    // Pre-check Auth to provide a clearer error before creation attempt.
    const existingSignInMethods = await fetchSignInMethodsForEmail(secondaryAuth, requestData.email);
    if (existingSignInMethods.length > 0) {
      await updateDoc(requestRef, {
        status: 'rejected',
        rejectedBy: approvedByUid,
        rejectedAt: serverTimestamp(),
        rejectionReason:
          'Email already exists in Firebase Auth. Use Forgot Password for this account or submit request with a different email.',
      });

      await signOut(secondaryAuth);
      await deleteApp(secondaryApp);
      secondaryApp = null;

      return {
        success: false,
        error:
          'This email already exists in Authentication. The request was auto-rejected. Use Forgot Password for this email or submit a new request with a different email.',
      };
    }

    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth,
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

    await signOut(secondaryAuth);
    await deleteApp(secondaryApp);
    secondaryApp = null;

    return { success: true, generatedPassword };
  } catch (error: any) {
    console.error('Error approving officer request:', error);

    if (error?.code === 'auth/email-already-in-use') {
      try {
        const requestRef = doc(db, 'pending_officer_requests', requestId);
        await updateDoc(requestRef, {
          status: 'rejected',
          rejectedBy: approvedByUid,
          rejectedAt: serverTimestamp(),
          rejectionReason:
            'Email already exists in Firebase Auth. Use Forgot Password for this account or submit request with a different email.',
        });
      } catch (updateError) {
        console.error('Failed to update request status after email conflict:', updateError);
      }

      return {
        success: false,
        error:
          'This email already exists in Authentication. The request was auto-rejected. Use Forgot Password for this email or submit a new request with a different email.',
      };
    }

    return { success: false, error: error.message };
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // Ignore cleanup errors
      }
    }
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
