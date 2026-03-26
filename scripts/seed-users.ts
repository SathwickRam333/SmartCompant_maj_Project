// Seed script to create admin and officer users
// Run with: npx ts-node scripts/seed-users.ts

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const users = [
  {
    email: 'admin@telangana.gov.in',
    password: 'Admin@123',
    displayName: 'System Administrator',
    role: 'admin',
    department: 'IT & Communications',
    district: 'Hyderabad',
    phone: '9876543210',
    isActive: true,
  },
  {
    email: 'officer@telangana.gov.in',
    password: 'Officer@123',
    displayName: 'District Officer',
    role: 'officer',
    department: 'Municipal Administration',
    district: 'Hyderabad',
    phone: '9876543211',
    isActive: true,
  },
];

async function seedUsers() {
  console.log('Creating users...\n');

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
        isActive: user.isActive,
        createdAt: new Date(),
      });

      console.log(`✓ Created ${user.role}: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`- User already exists: ${user.email}`);
      } else {
        console.error(`✗ Error creating ${user.email}:`, error.message);
      }
    }
  }

  console.log('\n=== Login Credentials ===');
  console.log('ADMIN:');
  console.log('  Email: admin@telangana.gov.in');
  console.log('  Password: Admin@123');
  console.log('\nOFFICER:');
  console.log('  Email: officer@telangana.gov.in');
  console.log('  Password: Officer@123');
  console.log('\n');

  process.exit(0);
}

seedUsers();
