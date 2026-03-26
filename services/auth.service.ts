import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { User, UserRole } from '@/lib/types';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

// Register a new user
export async function registerUser(
  email: string,
  password: string,
  displayName: string,
  phone?: string,
  district?: string,
  role: UserRole = 'citizen'
): Promise<AuthResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const { user: firebaseUser } = userCredential;

    // Update display name
    await updateProfile(firebaseUser, { displayName });

    // Create user document in Firestore
    const userData: Omit<User, 'uid'> = {
      email,
      displayName,
      phone,
      role,
      district,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      language: 'en',
    };

    await setDoc(doc(db, 'users', firebaseUser.uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      user: { uid: firebaseUser.uid, ...userData },
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
}

// Sign in user
export async function signInUser(email: string, password: string): Promise<AuthResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const { user: firebaseUser } = userCredential;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      return {
        success: false,
        error: 'User account not found. Please contact support.',
      };
    }

    const userData = userDoc.data() as Omit<User, 'uid'>;

    if (!userData.isActive) {
      await signOut(auth);
      return {
        success: false,
        error: 'Your account has been deactivated. Please contact support.',
      };
    }

    // Update last login
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      lastLogin: serverTimestamp(),
    });

    return {
      success: true,
      user: { uid: firebaseUser.uid, ...userData },
    };
  } catch (error: any) {
    console.error('Sign in error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
}

// Sign out user
export async function signOutUser(): Promise<{ success: boolean; error?: string }> {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign out error:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    return {
      success: false,
      error: getAuthErrorMessage(error.code),
    };
  }
}

// Get current user data
export async function getCurrentUser(): Promise<User | null> {
  const firebaseUser = auth.currentUser;
  
  if (!firebaseUser) {
    return null;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    
    if (!userDoc.exists()) {
      return null;
    }

    const userData = userDoc.data() as Omit<User, 'uid'>;
    return { uid: firebaseUser.uid, ...userData };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Update user profile
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<User, 'displayName' | 'phone' | 'district' | 'language'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // Update Firebase Auth display name if provided
    if (updates.displayName && auth.currentUser) {
      await updateProfile(auth.currentUser, { displayName: updates.displayName });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Profile update error:', error);
    return { success: false, error: error.message };
  }
}

// Subscribe to auth state changes
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Helper function to get user-friendly error messages
function getAuthErrorMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    'auth/email-already-in-use': 'This email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/operation-not-allowed': 'Email/password accounts are not enabled.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/invalid-credential': 'Invalid email or password.',
  };

  return errorMessages[errorCode] || 'An error occurred. Please try again.';
}
