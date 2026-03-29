// Server-side Firebase initialization (without Admin SDK)
// Uses the same Firebase client SDK but initialized for server context

import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize a separate app instance for server operations
let serverApp: any = null;

function getServerApp() {
  if (!serverApp) {
    // Create a new app instance for server-side operations
    const apps = getApps();
    if (apps.length > 0) {
      serverApp = apps[0];
    } else {
      serverApp = initializeApp(firebaseConfig, 'server-app');
    }
  }
  return serverApp;
}

// Get server-side Firestore instance
export function getServerFirestore() {
  const app = getServerApp();
  return getFirestore(app);
}

export const adminDb = getServerFirestore();

export default {
  getServerApp,
  getServerFirestore,
};
