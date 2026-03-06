import { useState, useCallback, useRef } from "react";
import { loadClosedSessions } from "../services/sessionService";

// TODO: Add pagination/limit to loadClosedSessions when session count grows across semesters
export function useMotions() {
  const [motions, setMotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadMotions = useCallback(async () => {
    if (loadedRef.current) return; // Already loaded, skip re-fetch
    setLoading(true);
    try {
      const sessions = await loadClosedSessions();
      const withMotions = sessions
        .filter((s) => s.motion)
        .map((s) => ({
          id: s.id,
          motion: s.motion,
          infoslide: s.infoslide || "",
          sessionName: s.name || `Session - ${s.date}`,
          date: s.date,
        }));
      setMotions(withMotions);
      loadedRef.current = true;
    } catch (err) {
      console.error("Failed to load motions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { motions, loading, loadMotions };
}
