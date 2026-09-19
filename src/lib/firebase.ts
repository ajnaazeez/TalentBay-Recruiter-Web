import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

/**
 * Firebase Client Configuration
 * Safe for client-side inclusion (Values are public identifiers for Firebase client SDK).
 * Real private secrets (Gemini API, Razorpay secrets, Admin keys) MUST NEVER be placed here.
 */
export const firebaseConfig = {
  apiKey: import.meta?.env?.VITE_FIREBASE_API_KEY || 'AIzaSyAarMLucoV5VLTK-2_d1P7oBr3xldejylQ',
  authDomain: import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN || 'talent-bay-d0b92.firebaseapp.com',
  projectId: import.meta?.env?.VITE_FIREBASE_PROJECT_ID || 'talent-bay-d0b92',
  storageBucket: import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET || 'talent-bay-d0b92.firebasestorage.app',
  messagingSenderId: import.meta?.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || '615421954739',
  appId: import.meta?.env?.VITE_FIREBASE_APP_ID || '1:615421954739:web:9c042c9634ddf543627ec6',
  measurementId: import.meta?.env?.VITE_FIREBASE_MEASUREMENT_ID || 'G-Z7EDND64B4',
};

// Centralized Firebase App instance
export const app: FirebaseApp = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

// Firebase Services
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const functions: Functions = getFunctions(app, 'us-central1');


// Safe initialization for Firebase Cloud Messaging (Web Push)
let messagingInstance: Messaging | null = null;

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (messagingInstance) {
    return messagingInstance;
  }

  try {
    const supported = await isSupported();
    if (supported) {
      messagingInstance = getMessaging(app);
      return messagingInstance;
    }
  } catch (error) {
    console.warn('[Firebase Messaging] Not supported in this browser/environment:', error);
  }

  return null;
}

export default app;
