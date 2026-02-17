import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
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
  console.log("Signed in anonymously");

  const sessionsCol = collection(db, "organizations", ORG_ID, "sessions");
  const snap = await getDocs(query(sessionsCol, where("status", "==", "closed")));

  let updated = 0;
  for (const d of snap.docs) {
    const data = d.data();
    const date = data.date || "";
    const name = data.name || "";
    const createdAt = data.createdAt || "";

    if (!date.startsWith("2025-")) continue;

    const newDate = date.replace("2025-", "2026-");
    const newName = name.replace("2025", "2026");
    const newCreatedAt = createdAt.replace("2025-", "2026-");

    const ref = doc(db, "organizations", ORG_ID, "sessions", d.id);
    await updateDoc(ref, {
      date: newDate,
      name: newName,
      createdAt: newCreatedAt,
    });

    console.log(`  ${date} → ${newDate}  (${d.id})`);
    updated++;
  }

  console.log(`\nDone — updated ${updated} sessions from 2025 to 2026.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
