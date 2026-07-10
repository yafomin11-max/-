import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAhzYZRCOABlOOa4nYSw5E9vs4uHXx5xCM",
  authDomain: "paralelogram-d8a98.firebaseapp.com",
  databaseURL: "https://paralelogram-d8a98-default-rtdb.firebaseio.com",
  projectId: "paralelogram-d8a98",
  storageBucket: "paralelogram-d8a98.firebasestorage.app",
  messagingSenderId: "285119436308",
  appId: "1:285119436308:web:15a79b6857e298faee7901",
  measurementId: "G-Y8WVJHQWKQ",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
