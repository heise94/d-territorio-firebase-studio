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
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingConfigKeys.length > 0) {
    console.error(
      `Firebase configuration is incomplete. Missing NEXT_PUBLIC_FIREBASE_ environment variables for: ${missingConfigKeys.join(', ')}. ` +
      `Please set them up in your .env.local file.`
    );
  }
}

if (!getApps().length) {
  // Initialize only if all config values are present to prevent runtime errors with SDK
  if (Object.values(firebaseConfig).every(Boolean)) {
    try {
      app = initializeApp(firebaseConfig);
      authInstance = getAuth(app);
      dbInstance = getFirestore(app);
      // storageInstance = getStorage(app);
    } catch (e) {
      console.error("Error initializing Firebase", e);
      // Fallback to dummy objects if init fails, to prevent hard crashes during setup issues
      app = {} as FirebaseApp;
      authInstance = {} as Auth;
      dbInstance = {} as Firestore;
      // storageInstance = {} as FirebaseStorage;
    }
  } else {
    // If config is incomplete, set up dummy objects
    // This helps in environments where Firebase might not be fully configured yet (e.g. CI without env vars)
    // but functionalities depending on Firebase will not work.
    app = {} as FirebaseApp;
    authInstance = {} as Auth;
    dbInstance = {} as Firestore;
    // storageInstance = {} as FirebaseStorage;
  }
} else {
  app = getApp();
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  // storageInstance = getStorage(app);
}

export { app, authInstance as auth, dbInstance as db /*, storageInstance as storage */ };
