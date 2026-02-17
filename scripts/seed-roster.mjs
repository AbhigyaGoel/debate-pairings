import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, query, where, writeBatch, setDoc } from "firebase/firestore";
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

const newMembers = [
  { name: "Maya Din", experience: "Competitive" },
  { name: "Charlotte Dekle", experience: "Competitive" },
  { name: "Kayte Chan", experience: "Competitive" },
  { name: "Christie Hemingway", experience: "General" },
  { name: "Bella Zhao", experience: "Competitive" },
  { name: "Aj Hernandez Paredes", experience: "Competitive" },
  { name: "Gina Hu", experience: "Competitive" },
  { name: "Alinna Liu", experience: "Competitive" },
  { name: "Ben Shepherd", experience: "General" },
  { name: "Cat-Tam Huynh", experience: "Competitive" },
  { name: "Máximo Gomez", experience: "Competitive" },
  { name: "Krish Shah", experience: "Competitive" },
  { name: "Aster Urbano", experience: "General" },
  { name: "Cameron Coolidge", experience: "Competitive" },
  { name: "Arjun Sen", experience: "Competitive" },
  { name: "Chris Yang", experience: "General" },
  { name: "Yiyi Xu", experience: "Competitive" },
  { name: "Andy Zhang", experience: "Competitive" },
  { name: "Katie Jack", experience: "Competitive" },
  { name: "Larissa Ribeiro", experience: "General" },
  { name: "Olivia Cha", experience: "Competitive" },
  { name: "Nancy Gao", experience: "Competitive" },
  { name: "Ruba Ahmed", experience: "General" },
  { name: "Ryan Buckner", experience: "Competitive" },
  { name: "Shengjun (Michael) Sun", experience: "General" },
  { name: "Akshay Vora", experience: "Competitive" },
  { name: "Abhimanyu Wadhwa", experience: "Competitive" },
  { name: "John Peng", experience: "General" },
  { name: "Michael Fayer", experience: "General" },
  { name: "Ryan Ait", experience: "General" },
  { name: "Emily Zhao", experience: "Competitive" },
  { name: "Bakhtawar Parvez", experience: "General" },
  { name: "Abhigya Goel", experience: "Competitive" },
  { name: "Angel Rodriguez", experience: "Competitive" },
  { name: "Rachit Kumar", experience: "General" },
  { name: "Piper Kujawa", experience: "General" },
  { name: "Tanisha Saraff", experience: "General" },
  { name: "Tommy Shu", experience: "Competitive" },
  { name: "Maria Barajas", experience: "General" },
  { name: "Franco Rodriguez", experience: "General" },
  { name: "Raghav Sinha", experience: "General" },
  { name: "Sonali Gupta", experience: "General" },
  { name: "Nicholas Schoentag", experience: "Competitive" },
  { name: "Morgan Mecklenburg", experience: "General" },
  { name: "Sam Pizzati", experience: "General" },
  { name: "Yubing Jin", experience: "General" },
];

async function main() {
  await signInAnonymously(auth);
  console.log("Signed in anonymously");

  const membersCol = collection(db, "organizations", ORG_ID, "members");

  // 1. Deactivate all existing active members
  const activeQuery = query(membersCol, where("active", "==", true));
  const snapshot = await getDocs(activeQuery);

  if (snapshot.size > 0) {
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => {
      batch.update(doc(db, "organizations", ORG_ID, "members", d.id), { active: false });
    });
    await batch.commit();
    console.log(`Deactivated ${snapshot.size} existing members`);
  } else {
    console.log("No active members to deactivate");
  }

  // 2. Close any open/paired sessions
  const sessionsCol = collection(db, "organizations", ORG_ID, "sessions");
  const openQuery = query(sessionsCol, where("status", "in", ["open", "paired"]));
  const sessSnap = await getDocs(openQuery);

  if (sessSnap.size > 0) {
    const batch = writeBatch(db);
    sessSnap.docs.forEach((d) => {
      batch.update(doc(db, "organizations", ORG_ID, "sessions", d.id), { status: "closed" });
    });
    await batch.commit();
    console.log(`Closed ${sessSnap.size} open sessions`);
  } else {
    console.log("No open sessions to close");
  }

  // 3. Clear org-level position history
  const orgRef = doc(db, "organizations", ORG_ID);
  await setDoc(orgRef, { positionHistory: {} }, { merge: true });
  console.log("Cleared org-level position history");

  // 4. Add new members
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  newMembers.forEach((m) => {
    const ref = doc(membersCol);
    batch.set(ref, {
      name: m.name,
      experience: m.experience,
      defaultRole: "Debate",
      preference: "No Preference",
      halfRound: "",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  });
  await batch.commit();
  console.log(`Added ${newMembers.length} new members`);

  console.log("\nDone! Summary:");
  console.log(`  Competitive: ${newMembers.filter(m => m.experience === "Competitive").length}`);
  console.log(`  General: ${newMembers.filter(m => m.experience === "General").length}`);
  console.log(`  Total: ${newMembers.length}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
