import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

const ORG_ID = "trojan-debate";

function videosRef() {
  return collection(db, "organizations", ORG_ID, "videos");
}

export async function loadVideos() {
  const q = query(videosRef(), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeToVideos(callback, onError) {
  const q = query(videosRef(), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const videos = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(videos);
    },
    (err) => {
      console.error("Videos subscription error:", err);
      if (onError) onError(err);
    }
  );
}

export async function addVideo(videoData) {
  const now = new Date().toISOString();
  return addDoc(videosRef(), {
    title: videoData.title,
    description: videoData.description || "",
    youtubeUrl: videoData.youtubeUrl,
    youtubeVideoId: extractYouTubeId(videoData.youtubeUrl),
    createdBy: videoData.createdBy || "",
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateVideo(videoId, updates) {
  const ref = doc(db, "organizations", ORG_ID, "videos", videoId);
  const data = { ...updates, updatedAt: new Date().toISOString() };
  if (updates.youtubeUrl) {
    data.youtubeVideoId = extractYouTubeId(updates.youtubeUrl);
  }
  return updateDoc(ref, data);
}

export async function deleteVideo(videoId) {
  const ref = doc(db, "organizations", ORG_ID, "videos", videoId);
  return deleteDoc(ref);
}

export async function bulkAddVideos(videosArray) {
  const now = new Date().toISOString();
  // Firestore batches max 500 writes; 74 videos is well under
  const batch = writeBatch(db);
  videosArray.forEach((v) => {
    const ref = doc(videosRef());
    batch.set(ref, {
      title: v.title,
      description: v.description || "",
      youtubeUrl: v.youtubeUrl,
      youtubeVideoId: extractYouTubeId(v.youtubeUrl),
      year: v.year || "",
      tournament: v.tournament || "",
      winner: v.winner || "",
      createdBy: "CSV Import",
      createdAt: now,
      updatedAt: now,
    });
  });
  return batch.commit();
}

// Handles all common YouTube URL formats:
// - youtube.com/watch?v=ID (with extra params like &t=120, &list=...)
// - m.youtube.com/watch?v=ID (mobile share links)
// - youtu.be/ID
// - youtube.com/embed/ID
// - youtube.com/shorts/ID
// - youtube.com/live/ID
export function extractYouTubeId(url) {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com|m\.youtube\.com)\/watch\?.*v=([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com|m\.youtube\.com)\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com|m\.youtube\.com)\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com|m\.youtube\.com)\/live\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}
