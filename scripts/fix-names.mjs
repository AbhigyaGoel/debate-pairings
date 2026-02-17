import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
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

const NAME_FIXES = {
  "Drishti": "Drishti Baid",
  "Shivali": "Shivali Sharma",
};

async function main() {
  await signInAnonymously(auth);
  console.log("Signed in anonymously");

  // Get all closed sessions
  const sessionsCol = collection(db, "organizations", ORG_ID, "sessions");
  const sessionsSnap = await getDocs(query(sessionsCol, where("status", "==", "closed")));
  console.log(`Found ${sessionsSnap.docs.length} closed sessions`);

  let totalFixed = 0;

  for (const sessionDoc of sessionsSnap.docs) {
    const checkinsCol = collection(db, "organizations", ORG_ID, "sessions", sessionDoc.id, "checkins");
    const checkinsSnap = await getDocs(checkinsCol);

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const checkinDoc of checkinsSnap.docs) {
      const data = checkinDoc.data();
      const newName = NAME_FIXES[data.name];
      if (newName) {
        const ref = doc(db, "organizations", ORG_ID, "sessions", sessionDoc.id, "checkins", checkinDoc.id);
        batch.update(ref, { name: newName });
        batchCount++;
        console.log(`  ${sessionDoc.data().date}: "${data.name}" → "${newName}"`);
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      totalFixed += batchCount;
    }
  }

  console.log(`\nDone! Fixed ${totalFixed} checkin records.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
