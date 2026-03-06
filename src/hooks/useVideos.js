import { useState, useCallback, useRef } from "react";
import {
  loadVideos as loadVideosService,
  addVideo as addVideoService,
  updateVideo as updateVideoService,
  deleteVideo as deleteVideoService,
  bulkAddVideos as bulkAddVideosService,
  extractYouTubeId,
} from "../services/videoService";

export function useVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadVideos = useCallback(async () => {
    if (loadedRef.current) return;
    setLoading(true);
    try {
      const data = await loadVideosService();
      setVideos(data);
      loadedRef.current = true;
    } catch (err) {
      console.error("Failed to load videos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addVideo = useCallback(async (videoData) => {
    const docRef = await addVideoService(videoData);
    const now = new Date().toISOString();
    setVideos((prev) => [{
      id: docRef.id,
      ...videoData,
      youtubeVideoId: extractYouTubeId(videoData.youtubeUrl),
      createdAt: now,
      updatedAt: now,
    }, ...prev]);
  }, []);

  const updateVideo = useCallback(async (id, updates) => {
    await updateVideoService(id, updates);
    setVideos((prev) => prev.map((v) =>
      v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
    ));
  }, []);

  const deleteVideo = useCallback(async (id) => {
    await deleteVideoService(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const bulkAddVideos = useCallback(async (arr) => {
    await bulkAddVideosService(arr);
    // Re-fetch after bulk add since batch doesn't return individual doc IDs
    const data = await loadVideosService();
    setVideos(data);
    loadedRef.current = true;
  }, []);

  return { videos, loading, loadVideos, addVideo, updateVideo, deleteVideo, bulkAddVideos };
}
