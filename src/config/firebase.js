import { initializeApp, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyCqbwD68lUXlxmSfbYQV7nrMWL7ClVj1lw",
  authDomain: "crmapp-e6c3c.firebaseapp.com",
  projectId: "crmapp-e6c3c",
  storageBucket: "crmapp-e6c3c.firebasestorage.app",
  messagingSenderId: "195182215133",
  appId: "1:195182215133:web:83d51a8228e45ef7eb4034"
};

// Initialize Firebase only if it hasn't been initialized
let app;
let auth;
let db;

try {
  app = getApp();
  // If we got here, app is already initialized
  auth = getAuth(app);
} catch (error) {
  // Initialize the app for the first time
  app = initializeApp(firebaseConfig);
  
  // Initialize Auth with AsyncStorage persistence
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

// Initialize Firestore
db = getFirestore(app);

// Enable offline persistence (only if not already enabled)
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });
} catch (error) {
  console.warn('Persistence may already be enabled:', error);
}

export { auth, db };
export default app; 