'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/config';
import { onAuthStateChange, getCurrentUser, signOutUser } from '@/services/auth.service';
import { User } from '@/lib/types';

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

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  firebaseUser: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user data from Firestore
  const fetchUserData = async (fbUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          uid: fbUser.uid,
          email: userData.email,
          displayName: userData.displayName,
          phone: userData.phone,
          role: userData.role,
          department: userData.department,
          district: userData.district,
          createdAt: toSafeDate(userData.createdAt),
          updatedAt: toSafeDate(userData.updatedAt),
          isActive: userData.isActive,
          language: userData.language || 'en',
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        const userData = await fetchUserData(fbUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setFirebaseUser(null);
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser);
      setUser(userData);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        loading,
        signOut: handleSignOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
