import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBOLANELfTIo68wMahGDbXuKo3Ovq7AgA4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "eduphoenix-log-in-out.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "eduphoenix-log-in-out",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "eduphoenix-log-in-out.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "981350153438",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:981350153438:web:c8f3dca50f34b4841cd64f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
