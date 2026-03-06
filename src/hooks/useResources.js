import { useState, useCallback, useRef } from "react";
import {
  loadResources as loadResourcesService,
  addResource as addResourceService,
  updateResource as updateResourceService,
  deleteResource as deleteResourceService,
  bulkAddResources as bulkAddResourcesService,
} from "../services/resourceService";

export function useResources() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadResources = useCallback(async () => {
    if (loadedRef.current) return;
    setLoading(true);
    try {
      const data = await loadResourcesService();
      setResources(data);
      loadedRef.current = true;
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addResource = useCallback(async (data) => {
    const docRef = await addResourceService(data);
    const now = new Date().toISOString();
    setResources((prev) => [{
      id: docRef.id,
      ...data,
      createdAt: now,
      updatedAt: now,
    }, ...prev]);
  }, []);

  const updateResource = useCallback(async (id, updates) => {
    await updateResourceService(id, updates);
    setResources((prev) => prev.map((r) =>
      r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
    ));
  }, []);

  const deleteResource = useCallback(async (id) => {
    await deleteResourceService(id);
    setResources((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const bulkAddResources = useCallback(async (arr) => {
    await bulkAddResourcesService(arr);
    const data = await loadResourcesService();
    setResources(data);
    loadedRef.current = true;
  }, []);

  return { resources, loading, loadResources, addResource, updateResource, deleteResource, bulkAddResources };
}
