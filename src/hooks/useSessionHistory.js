import { useState, useCallback } from "react";
import {
  loadClosedSessions,
  loadSessionCheckins,
  updateSessionName,
  deleteSession,
  subtractSessionPositionsFromOrg,
} from "../services/sessionService";

export function useSessionHistory() {
  const [closedSessions, setClosedSessions] = useState([]);
  const [expandedSessionId, setExpandedSessionId] = useState(null);
  const [checkinCache, setCheckinCache] = useState({});
  const [loading, setLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const sessions = await loadClosedSessions();
      setClosedSessions(sessions);

      // Load checkins for sessions missing attendanceCount so counts show immediately
      const missing = sessions.filter((s) => s.attendanceCount == null);
      if (missing.length > 0) {
        const results = await Promise.allSettled(
          missing.map((s) => loadSessionCheckins(s.id))
        );
        const cache = {};
        missing.forEach((s, i) => {
          if (results[i].status === "fulfilled") {
            cache[s.id] = results[i].value;
          }
        });
        setCheckinCache((prev) => ({ ...prev, ...cache }));
      }
    } catch (err) {
      console.error("Failed to load closed sessions:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const expandSession = useCallback(async (sessionId) => {
    if (expandedSessionId === sessionId) {
      setExpandedSessionId(null);
      return;
    }
    setExpandedSessionId(sessionId);
    if (!checkinCache[sessionId]) {
      try {
        const checkins = await loadSessionCheckins(sessionId);
        setCheckinCache((prev) => ({ ...prev, [sessionId]: checkins }));
      } catch (err) {
        console.error("Failed to load checkins for session:", err);
      }
    }
  }, [expandedSessionId, checkinCache]);

  const renameSession = useCallback(async (sessionId, newName) => {
    try {
      await updateSessionName(sessionId, newName);
      setClosedSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, name: newName } : s))
      );
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  }, []);

  const deleteSessionFull = useCallback(async (sessionId) => {
    const session = closedSessions.find((s) => s.id === sessionId);
    let updatedHistory = null;

    if (session?.sessionPositions && Object.keys(session.sessionPositions).length > 0) {
      updatedHistory = await subtractSessionPositionsFromOrg(session.sessionPositions);
    }

    await deleteSession(sessionId);
    setClosedSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setCheckinCache((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    if (expandedSessionId === sessionId) setExpandedSessionId(null);

    return updatedHistory;
  }, [closedSessions, expandedSessionId]);

  return {
    closedSessions,
    expandedSessionId,
    checkinCache,
    loading,
    loadSessions,
    expandSession,
    renameSession,
    deleteSessionFull,
  };
}
