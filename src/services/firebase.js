import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBeZ9VcpPKPQzTkSZeQ2law2yZczoebbUI",
  authDomain: "debate-pairings-system.firebaseapp.com",
  projectId: "debate-pairings-system",
  storageBucket: "debate-pairings-system.firebasestorage.app",
  messagingSenderId: "316236474525",
  appId: "1:316236474525:web:444db450fefd277d728c74",
  measurementId: "G-JBFHSC6809",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
