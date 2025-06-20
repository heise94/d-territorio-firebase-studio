
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
// import { getStorage, FirebaseStorage } from 'firebase/storage'; // Uncomment if storage is needed

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
// let storageInstance: FirebaseStorage;

// Check for config completeness only on client-side during development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const missingConfigKeys = Object.entries(firebaseConfig)
    .filter(([, value]) => !value) // Checks for undefined, null, empty string, 0, false
    .map(([key]) => key);

  if (missingConfigKeys.length > 0) {
    console.error(
      `FIREBASE CONFIG ERROR: Firebase configuration is incomplete. Missing NEXT_PUBLIC_FIREBASE_ environment variables for: ${missingConfigKeys.join(', ')}. ` +
      `Please ensure all required Firebase environment variables are correctly set in your .env.local file.`
    );
  }
}

const isFirebaseConfigComplete = Object.values(firebaseConfig).every(
  (value) => typeof value === 'string' && value.length > 0
);

if (!getApps().length) {
  if (isFirebaseConfigComplete) {
    try {
      app = initializeApp(firebaseConfig);
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      // storageInstance = getStorage(app);
    } catch (e) {
      console.error("Error initializing Firebase with (seemingly) complete config:", e);
      // Fallback to dummy objects if init fails even with perceived complete config
      app = {} as FirebaseApp;
      authInstance = {} as Auth;
      dbInstance = {} as Firestore;
      // storageInstance = {} as FirebaseStorage;
    }
  } else {
    console.warn(
      "FIREBASE WARNING: Firebase configuration in .env.local is incomplete (some NEXT_PUBLIC_FIREBASE_ variables are missing, null, or empty). " +
      "Firebase client SDKs (Auth, Firestore) are using DUMMY objects. " +
      "Authentication and database features WILL NOT WORK correctly. " +
      "Please ensure all NEXT_PUBLIC_FIREBASE_ variables are correctly set in your .env.local file."
    );
    app = {} as FirebaseApp;
    authInstance = {} as Auth;
    dbInstance = {} as Firestore;
    // storageInstance = {} as FirebaseStorage;
  }
} else {
  app = getApp();
  // Ensure instances are correctly re-assigned if app already exists
  // This is especially important in HMR scenarios
  // And also if the first initialization (isFirebaseConfigComplete=false) resulted in dummy objects.
  if (isFirebaseConfigComplete) { // Only try to get services if config is complete
    try {
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      // storageInstance = getStorage(app);
    } catch (e) {
      console.error("Error getting Firebase services from existing app:", e);
      authInstance = {} as Auth; // Fallback
      dbInstance = {} as Firestore; // Fallback
      // storageInstance = {} as FirebaseStorage; // Fallback
    }
  } else { // If config is not complete, ensure instances are dummies
    authInstance = {} as Auth;
    dbInstance = {} as Firestore;
    // storageInstance = {} as FirebaseStorage;
  }
}

export { app, authInstance as auth, dbInstance as db /*, storageInstance as storage */ };

