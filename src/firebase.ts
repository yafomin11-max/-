import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy-auth-domain",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "dummy-database-url",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "dummy-sender-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "dummy-app-id",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "dummy-measurement-id",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
