import { useState, useCallback } from "react";
import {
  loadClosedSessions,
  loadSessionCheckins,
  updateSessionName,
  deleteSession,
  updateSessionDate,
  updateSessionPairings,
  removeCheckIn,
} from "../services/sessionService";
import { removePersonFromPairings } from "../utils/helpers";

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
    await deleteSession(sessionId);
    setClosedSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setCheckinCache((prev) => {
      const next = { ...prev };
      delete next[sessionId];
      return next;
    });
    if (expandedSessionId === sessionId) setExpandedSessionId(null);
  }, [expandedSessionId]);

  const changeSessionDate = useCallback(async (sessionId, newDate) => {
    try {
      await updateSessionDate(sessionId, newDate);
      setClosedSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, date: newDate } : s))
      );
    } catch (err) {
      console.error("Failed to update session date:", err);
    }
  }, []);

  const removePersonFromSessionPairings = useCallback(async (sessionId, personName) => {
    try {
      const session = closedSessions.find((s) => s.id === sessionId);
      if (!session) return;
      const chambers = session.chambers || [];
      const spectators = session.spectators || [];
      const result = removePersonFromPairings(personName, chambers, spectators);
      await updateSessionPairings(sessionId, result.chambers, result.spectators);
      setClosedSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, chambers: result.chambers, spectators: result.spectators }
            : s
        )
      );
    } catch (err) {
      console.error("Failed to remove person from session pairings:", err);
    }
  }, [closedSessions]);

  const removeSessionCheckin = useCallback(async (sessionId, checkinId) => {
    try {
      await removeCheckIn(sessionId, checkinId);
      setCheckinCache((prev) => {
        const list = prev[sessionId];
        if (!list) return prev;
        return { ...prev, [sessionId]: list.filter((c) => c.id !== checkinId) };
      });
    } catch (err) {
      console.error("Failed to remove checkin:", err);
    }
  }, []);

  return {
    closedSessions,
    expandedSessionId,
    checkinCache,
    loading,
    loadSessions,
    expandSession,
    renameSession,
    deleteSessionFull,
    changeSessionDate,
    removePersonFromSessionPairings,
    removeSessionCheckin,
  };
}
