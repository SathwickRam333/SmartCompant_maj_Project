import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';

const users = [
  {
    email: 'admin@telangana.gov.in',
    password: 'Admin@123',
    displayName: 'System Administrator',
    role: 'admin',
    department: 'IT & Communications',
    district: 'Hyderabad',
    phone: '9876543210',
  },
  {
    email: 'officer@telangana.gov.in',
    password: 'Officer@123',
    displayName: 'District Officer',
    role: 'officer',
    department: 'Municipal Administration',
    district: 'Hyderabad',
    phone: '9876543211',
  },
];

export async function GET(request: NextRequest) {
  const results = [];

  for (const user of users) {
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        user.email,
        user.password
      );

      // Create Firestore document
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        department: user.department,
        district: user.district,
        phone: user.phone,
        isActive: true,
        createdAt: new Date(),
      });

      results.push({ email: user.email, status: 'created', role: user.role });
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        results.push({ email: user.email, status: 'already exists', role: user.role });
      } else {
        results.push({ email: user.email, status: 'error', error: error.message });
      }
    }
  }

  return NextResponse.json({
    message: 'Seed completed',
    results,
    credentials: {
      admin: { email: 'admin@telangana.gov.in', password: 'Admin@123' },
      officer: { email: 'officer@telangana.gov.in', password: 'Officer@123' },
    },
  });
}
