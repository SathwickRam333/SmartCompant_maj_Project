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
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { UserRole } from '@/lib/types';

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
