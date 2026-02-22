import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { normalizeRole, normalizeName, getLocalDateStr } from "../utils/helpers";

const ORG_ID = "trojan-debate";

function sessionsRef() {
  return collection(db, "organizations", ORG_ID, "sessions");
}

function checkinsRef(sessionId) {
  return collection(db, "organizations", ORG_ID, "sessions", sessionId, "checkins");
}

function generateJoinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// --- Session CRUD ---

export async function createSession(adminName) {
  const now = new Date();
  const dateStr = getLocalDateStr(now);
  const formatted = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const docRef = await addDoc(sessionsRef(), {
    date: dateStr,
    name: `Session - ${formatted}`,
    status: "open",
    joinCode: generateJoinCode(),
    createdBy: adminName,
    createdAt: now.toISOString(),
  });
  return docRef.id;
}

export async function endSession(sessionId, attendanceCount) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  const updates = { status: "closed" };
  if (attendanceCount != null) updates.attendanceCount = attendanceCount;
  return updateDoc(ref, updates);
}

export async function updateSessionStatus(sessionId, status) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  return updateDoc(ref, { status });
}

// Subscribe to all closed sessions (for real-time attendance sync)
export function subscribeToClosedSessions(callback, onError) {
  const q = query(sessionsRef(), where("status", "==", "closed"));
  return onSnapshot(
    q,
    (snapshot) => {
      const sessions = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      callback(sessions);
    },
    (err) => {
      console.error("Closed sessions subscription error:", err);
      if (onError) onError(err);
    }
  );
}

// Subscribe to the most recent open or paired session
export function subscribeToActiveSession(callback, onError) {
  const q = query(
    sessionsRef(),
    where("status", "in", ["open", "paired"])
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
      } else {
        // Sort client-side to avoid requiring a composite index
        const sorted = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        callback(sorted[0]);
      }
    },
    (err) => {
      console.error("Session subscription error:", err);
      if (onError) onError(err);
    }
  );
}

// --- Checkin operations ---

export function subscribeToCheckins(sessionId, callback, onError) {
  const q = query(checkinsRef(sessionId));
  return onSnapshot(
    q,
    (snapshot) => {
      const checkins = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.checkedInAt || "").localeCompare(b.checkedInAt || ""));
      callback(checkins);
    },
    (err) => {
      console.error("Checkins subscription error:", err);
      if (onError) onError(err);
    }
  );
}

function buildCheckinData(memberData) {
  const data = {
    memberId: memberData.id || "",
    name: memberData.name,
    experience: memberData.experience || "General",
    role: normalizeRole(memberData.defaultRole || memberData.role),
    partner: memberData.partner || "",
    preference: memberData.preference || "No Preference",
    halfRound: memberData.halfRound || "",
    checkedInAt: new Date().toISOString(),
  };
  if (memberData.status) data.status = memberData.status;
  return data;
}

// Save generated pairings so all clients can see them
export async function saveSessionPairings(sessionId, chambers, spectators) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  // JSON round-trip strips undefined values that Firestore rejects
  const clean = JSON.parse(JSON.stringify({ chambers, spectators }));
  return updateDoc(ref, clean);
}

// Save current session's positions to session doc (for hydration on refresh)
export async function saveSessionPositions(sessionId, sessionPositions) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  const clean = JSON.parse(JSON.stringify({ sessionPositions }));
  return updateDoc(ref, clean);
}

// Load org-level position history (accumulated from all previous sessions)
export async function loadOrgPositionHistory() {
  const ref = doc(db, "organizations", ORG_ID);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data().positionHistory || {}) : {};
}

// Save org-level position history
export async function saveOrgPositionHistory(positionHistory) {
  const ref = doc(db, "organizations", ORG_ID);
  return setDoc(ref, { positionHistory }, { merge: true });
}

// Debater self-check-in (uses their anonymous UID as doc ID for idempotency)
export async function checkIn(sessionId, uid, memberData) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId, "checkins", uid);
  return setDoc(ref, {
    uid,
    ...buildCheckinData(memberData),
  });
}

// Admin adds member to session (no user UID needed)
export async function adminAddCheckIn(sessionId, memberData) {
  return addDoc(checkinsRef(sessionId), {
    uid: "admin-added",
    ...buildCheckinData(memberData),
  });
}

// Update own check-in (partner, role, preference)
export async function updateCheckIn(sessionId, checkinId, updates) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId, "checkins", checkinId);
  return updateDoc(ref, updates);
}

// Admin removes a check-in
export async function removeCheckIn(sessionId, checkinId) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId, "checkins", checkinId);
  return deleteDoc(ref);
}

// --- Session History ---

export async function loadClosedSessions() {
  const q = query(sessionsRef(), where("status", "==", "closed"));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function loadSessionCheckins(sessionId) {
  const snapshot = await getDocs(checkinsRef(sessionId));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.checkedInAt || "").localeCompare(b.checkedInAt || ""));
}

export async function updateSessionName(sessionId, name) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  return updateDoc(ref, { name });
}

export async function deleteSession(sessionId) {
  // Delete all checkins in batches of 500
  const checkinSnap = await getDocs(checkinsRef(sessionId));
  const docs = checkinSnap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  // Delete the session doc
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  return deleteDoc(ref);
}

export async function subtractSessionPositionsFromOrg(sessionPositions) {
  const ref = doc(db, "organizations", ORG_ID);
  const snap = await getDoc(ref);
  const history = snap.exists() ? { ...(snap.data().positionHistory || {}) } : {};

  Object.entries(sessionPositions).forEach(([name, positions]) => {
    if (!history[name]) return;
    const arr = [...history[name]];
    // Remove each position from the end (chronological order)
    [...positions].reverse().forEach((pos) => {
      const idx = arr.lastIndexOf(pos);
      if (idx !== -1) arr.splice(idx, 1);
    });
    if (arr.length === 0) {
      delete history[name];
    } else {
      history[name] = arr;
    }
  });

  await setDoc(ref, { positionHistory: history }, { merge: true });
  return history;
}

// --- Attendance Management ---

export async function deleteAttendanceForMember(memberName) {
  const q = query(sessionsRef(), where("status", "==", "closed"));
  const sessionSnap = await getDocs(q);
  const norm = normalizeName(memberName);
  const deleteOps = [];

  for (const sessionDoc of sessionSnap.docs) {
    const checkinSnap = await getDocs(checkinsRef(sessionDoc.id));
    for (const checkinDoc of checkinSnap.docs) {
      if (normalizeName(checkinDoc.data().name) === norm) {
        deleteOps.push(deleteDoc(checkinDoc.ref));
      }
    }
  }

  await Promise.all(deleteOps);
}

export async function updateSessionDate(sessionId, newDate) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  return updateDoc(ref, { date: newDate });
}

// --- Motion Drop ---

export async function saveMotionDrop(sessionId, motion, infoslide) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  return updateDoc(ref, {
    motion,
    infoslide: infoslide || null,
    motionDroppedAt: new Date().toISOString(),
  });
}

export async function clearMotionDrop(sessionId) {
  const ref = doc(db, "organizations", ORG_ID, "sessions", sessionId);
  return updateDoc(ref, { motion: null, infoslide: null, motionDroppedAt: null });
}
