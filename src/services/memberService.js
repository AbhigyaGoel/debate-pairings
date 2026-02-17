import {
  collection,
  doc,
  addDoc,
  updateDoc,
  writeBatch,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

const ORG_ID = "trojan-debate";

function membersRef() {
  return collection(db, "organizations", ORG_ID, "members");
}

export function subscribeToMembers(callback, onError) {
  const q = query(membersRef(), where("active", "==", true));
  return onSnapshot(
    q,
    (snapshot) => {
      const members = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));
      callback(members);
    },
    (err) => {
      console.error("Members subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function addMember(memberData) {
  return addDoc(membersRef(), {
    name: memberData.name,
    experience: memberData.experience || "General",
    active: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

export async function updateMember(memberId, updates) {
  const ref = doc(db, "organizations", ORG_ID, "members", memberId);
  return updateDoc(ref, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function removeMember(memberId) {
  return updateMember(memberId, { active: false });
}

export async function clearAllMembers(currentMembers) {
  const batch = writeBatch(db);
  currentMembers.forEach((member) => {
    const ref = doc(db, "organizations", ORG_ID, "members", member.id);
    batch.update(ref, { active: false });
  });
  return batch.commit();
}

export async function importMembersFromCSV(parsedRows) {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  parsedRows.forEach((row) => {
    const ref = doc(membersRef());
    batch.set(ref, {
      name: row.name,
      experience: row.experience || "General",
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  });

  return batch.commit();
}
