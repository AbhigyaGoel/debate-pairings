import { useState, useEffect, useCallback, useMemo } from "react";
import {
  subscribeToActiveSession,
  subscribeToCheckins,
  createSession as createSessionService,
  endSession as endSessionService,
  updateSessionStatus,
  checkIn as checkInService,
  adminAddCheckIn as adminAddCheckInService,
  updateCheckIn as updateCheckInService,
  removeCheckIn as removeCheckInService,
  saveSessionPairings as saveSessionPairingsService,
  saveSessionPositions as saveSessionPositionsService,
} from "../services/sessionService";

export function useSession(user) {
  const [session, setSession] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [sessionLoading, setSessionLoading] = useState(true);

  // Subscribe to active session (wait for auth so Firestore rules pass)
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToActiveSession(
      (activeSession) => {
        setSession(activeSession);
        setSessionLoading(false);
      },
      () => setSessionLoading(false)
    );
    return () => unsubscribe();
  }, [user]);

  // Subscribe to checkins when session exists
  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId) {
      setCheckins([]);
      return;
    }
    const unsubscribe = subscribeToCheckins(sessionId, setCheckins);
    return () => unsubscribe();
  }, [sessionId]);

  // Find current user's check-in (by anonymous UID)
  const myCheckIn = useMemo(() => {
    if (!user) return null;
    return checkins.find((c) => c.uid === user.uid) || null;
  }, [checkins, user]);

  const startSession = useCallback(async (adminName) => {
    return createSessionService(adminName);
  }, []);

  const endSession = useCallback(async () => {
    if (!session) return;
    return endSessionService(session.id, checkins.length);
  }, [session, checkins.length]);

  const markPaired = useCallback(async () => {
    if (!session) return;
    return updateSessionStatus(session.id, "paired");
  }, [session]);

  // Debater self-check-in (requires user UID)
  const checkIn = useCallback(
    async (memberData) => {
      if (!session) throw new Error("No active session");
      if (!user) throw new Error("Not authenticated");
      return checkInService(session.id, user.uid, memberData);
    },
    [session, user]
  );

  // Admin adds member to session (no user UID needed)
  const adminCheckIn = useCallback(
    async (memberData) => {
      if (!session) throw new Error("No active session");
      return adminAddCheckInService(session.id, memberData);
    },
    [session]
  );

  const updateCheckIn = useCallback(
    async (checkinId, updates) => {
      if (!session) return;
      return updateCheckInService(session.id, checkinId, updates);
    },
    [session]
  );

  const removeCheckIn = useCallback(
    async (checkinId) => {
      if (!session) return;
      return removeCheckInService(session.id, checkinId);
    },
    [session]
  );

  const savePairings = useCallback(
    async (chambers, spectators) => {
      if (!session) return;
      return saveSessionPairingsService(session.id, chambers, spectators);
    },
    [session]
  );

  const saveSessionPositions = useCallback(
    async (sessionPositions) => {
      if (!session) return;
      return saveSessionPositionsService(session.id, sessionPositions);
    },
    [session]
  );

  return {
    session,
    sessionLoading,
    checkins,
    myCheckIn,
    startSession,
    endSession,
    markPaired,
    checkIn,
    adminCheckIn,
    updateCheckIn,
    removeCheckIn,
    savePairings,
    saveSessionPositions,
  };
}
