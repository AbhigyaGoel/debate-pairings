import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

const ORG_ID = "trojan-debate";

function resourcesRef() {
  return collection(db, "organizations", ORG_ID, "resources");
}

export async function loadResources() {
  const q = query(resourcesRef(), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeToResources(callback, onError) {
  const q = query(resourcesRef(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const resources = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(resources);
    },
    (err) => {
      console.error("Resources subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function addResource(resourceData) {
  const now = new Date().toISOString();
  return addDoc(resourcesRef(), {
    title: resourceData.title,
    description: resourceData.description || "",
    url: resourceData.url,
    createdBy: resourceData.createdBy || "",
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateResource(resourceId, updates) {
  const ref = doc(db, "organizations", ORG_ID, "resources", resourceId);
  return updateDoc(ref, { ...updates, updatedAt: new Date().toISOString() });
}

export async function bulkAddResources(resourcesArray) {
  const now = new Date().toISOString();
  const batch = writeBatch(db);
  resourcesArray.forEach((r) => {
    const ref = doc(resourcesRef());
    batch.set(ref, {
      title: r.title,
      description: r.description || "",
      url: r.url,
      category: r.category || "",
      createdBy: "File Import",
      createdAt: now,
      updatedAt: now,
    });
  });
  return batch.commit();
}

export async function deleteResource(resourceId) {
  const ref = doc(db, "organizations", ORG_ID, "resources", resourceId);
  return deleteDoc(ref);
}
