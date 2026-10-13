import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ضع بيانات مشروع Firebase هنا بعد إنشائه من console.firebase.google.com
const firebaseConfig = {
  apiKey: "ADD_FIREBASE_API_KEY",
  authDomain: "ADD_PROJECT_ID.firebaseapp.com",
  projectId: "ADD_PROJECT_ID",
  storageBucket: "ADD_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "ADD_SENDER_ID",
  appId: "ADD_APP_ID"
};

const configured = !Object.values(firebaseConfig).some(v => String(v).startsWith("ADD_"));
const app = configured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
export const firebaseConfigured = configured;