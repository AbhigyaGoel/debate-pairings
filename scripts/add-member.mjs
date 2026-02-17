import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, writeBatch } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBeZ9VcpPKPQzTkSZeQ2law2yZczoebbUI",
  authDomain: "debate-pairings-system.firebaseapp.com",
  projectId: "debate-pairings-system",
  storageBucket: "debate-pairings-system.firebasestorage.app",
  messagingSenderId: "316236474525",
  appId: "1:316236474525:web:444db450fefd277d728c74",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const ORG_ID = "trojan-debate";

async function main() {
  await signInAnonymously(auth);
  const membersCol = collection(db, "organizations", ORG_ID, "members");
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  const ref = doc(membersCol);
  batch.set(ref, {
    name: "Athea Roque",
    experience: "General",
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  await batch.commit();
  console.log("Added Athea Roque (General)");
  process.exit(0);
}

main().catch((err) => { console.error(err); process.exit(1); });
