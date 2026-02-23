import { useState, useCallback, useMemo, useRef } from "react";
import {
  subscribeToClosedSessions,
  subscribeToCheckins,
  adminAddCheckIn,
  updateCheckIn,
  removeCheckIn,
  deleteAttendanceForMember,
  updateSessionDate,
} from "../services/sessionService";
import { normalizeName } from "../utils/helpers";

export function useAttendance(members, activeCheckins, activeSessionDate) {
  // Raw session→checkins data from real-time listeners
  const [sessionCheckinMap, setSessionCheckinMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });

  // Subscription management
  const unsubsRef = useRef({ sessions: null, checkins: [] });
  const sessionDataRef = useRef({});
  const loadedCountRef = useRef(0);

  // Subscribe to all closed sessions and their checkins for real-time sync
  const loadAttendance = useCallback(() => {
    // Already subscribed — nothing to do
    if (unsubsRef.current.sessions) return;

    setLoading(true);
    setProgress({ loaded: 0, total: 0 });

    unsubsRef.current.sessions = subscribeToClosedSessions((sessions) => {
      // Tear down old checkin listeners (sessions list changed)
      unsubsRef.current.checkins.forEach((fn) => fn());
      unsubsRef.current.checkins = [];
      sessionDataRef.current = {};
      loadedCountRef.current = 0;

      setProgress({ loaded: 0, total: sessions.length });

      if (sessions.length === 0) {
        setSessionCheckinMap({});
        setLoading(false);
        return;
      }

      const total = sessions.length;

      sessions.forEach((session) => {
        const unsub = subscribeToCheckins(session.id, (checkins) => {
          const isFirstLoad = !sessionDataRef.current[session.id];
          sessionDataRef.current[session.id] = { session, checkins };

          if (isFirstLoad) {
            loadedCountRef.current++;
            setProgress({ loaded: loadedCountRef.current, total });
          }

          // Any change triggers a recompute
          setSessionCheckinMap({ ...sessionDataRef.current });

          if (loadedCountRef.current >= total) {
            setLoading(false);
          }
        });
        unsubsRef.current.checkins.push(unsub);
      });
    });
  }, []);

  // Tear down all listeners and clear data
  const invalidateCache = useCallback(() => {
    unsubsRef.current.sessions?.();
    unsubsRef.current.checkins.forEach((fn) => fn());
    unsubsRef.current = { sessions: null, checkins: [] };
    sessionDataRef.current = {};
    loadedCountRef.current = 0;
    setSessionCheckinMap(null);
  }, []);

  // Toggle attendance — just writes to Firestore; onSnapshot handles the rest.
  // Also consolidates duplicate checkins across same-date sessions.
  const toggleAttendance = useCallback(
    async (memberName, date, targetState) => {
      const data = sessionDataRef.current;
      if (!data || Object.keys(data).length === 0) return;

      const norm = normalizeName(memberName);

      // Find ALL existing checkin docs for this person on this date (across sessions)
      const existing = [];
      let anySessionId = null;
      for (const { session, checkins } of Object.values(data)) {
        if (session.date !== date) continue;
        if (!anySessionId) anySessionId = session.id;
        for (const c of checkins) {
          if (normalizeName(c.name) === norm) {
            existing.push({ sessionId: session.id, checkin: c });
          }
        }
      }

      if (!anySessionId) return; // no sessions on this date

      if (targetState === "na") {
        // Delete all checkins for this person on this date
        if (existing.length === 0) return;
        await Promise.all(
          existing.map(({ sessionId, checkin }) =>
            removeCheckIn(sessionId, checkin.id)
          )
        );
      } else if (existing.length > 0) {
        // Update the first doc, delete duplicates (consolidate)
        const status = targetState === "present" ? "" : targetState;
        const [first, ...rest] = existing;
        await Promise.all([
          updateCheckIn(first.sessionId, first.checkin.id, { status }),
          ...rest.map(({ sessionId, checkin }) =>
            removeCheckIn(sessionId, checkin.id)
          ),
        ]);
      } else {
        // No doc exists — create one
        const member = members.find((m) => normalizeName(m.name) === norm);
        const experience = member?.experience || "General";
        const memberData = { name: memberName, experience, role: "Debate" };
        if (targetState !== "present") memberData.status = targetState;
        await adminAddCheckIn(anySessionId, memberData);
      }
      // No local cache update needed — onSnapshot fires automatically
    },
    [members]
  );

  const deleteAttendanceMember = useCallback(async (memberName) => {
    try {
      await deleteAttendanceForMember(memberName);
      // Tear down subscriptions and reload so deleted records disappear cleanly
      invalidateCache();
      loadAttendance();
    } catch (err) {
      console.error("Failed to delete attendance for member:", err);
      alert("Failed to delete attendance records. Please try again.");
    }
  }, [invalidateCache, loadAttendance]);

  const editSessionDate = useCallback(async (oldDate, newDate) => {
    const data = sessionDataRef.current;
    if (!data) return;
    const updates = [];
    for (const { session } of Object.values(data)) {
      if (session.date === oldDate) {
        updates.push(updateSessionDate(session.id, newDate));
      }
    }
    await Promise.all(updates);
  }, []);

  // Build the attendance matrix from raw session data
  const computed = useMemo(() => {
    if (!sessionCheckinMap) {
      return {
        dates: [],
        memberRows: [],
        summary: { totalDates: 0, avgAttendance: 0, memberCount: 0 },
      };
    }

    const dateMap = {};
    const dateAbsentMap = {};
    const dateExcusedMap = {};
    const dateExperienceMap = {};

    // Build per-date state sets from all sessions
    for (const { session, checkins } of Object.values(sessionCheckinMap)) {
      const date = session.date;
      if (!date) continue;

      if (!dateMap[date]) dateMap[date] = new Set();
      if (!dateAbsentMap[date]) dateAbsentMap[date] = new Set();
      if (!dateExcusedMap[date]) dateExcusedMap[date] = new Set();
      if (!dateExperienceMap[date]) dateExperienceMap[date] = {};

      for (const c of checkins) {
        const norm = normalizeName(c.name);
        // Clear from all sets first to prevent same-date cross-session conflicts
        dateMap[date].delete(norm);
        dateAbsentMap[date].delete(norm);
        dateExcusedMap[date].delete(norm);
        // Then add to the correct set (last session processed wins)
        if (c.status === "absent") {
          dateAbsentMap[date].add(norm);
        } else if (c.status === "excused") {
          dateExcusedMap[date].add(norm);
        } else {
          dateMap[date].add(norm);
        }
        dateExperienceMap[date][norm] = c.experience || "General";
      }
    }

    // Merge active session checkins (read-only — active session is edited via SessionTab)
    if (activeSessionDate && activeCheckins?.length > 0) {
      if (!dateMap[activeSessionDate]) dateMap[activeSessionDate] = new Set();
      else dateMap[activeSessionDate] = new Set(dateMap[activeSessionDate]);

      if (!dateExperienceMap[activeSessionDate])
        dateExperienceMap[activeSessionDate] = {};
      else
        dateExperienceMap[activeSessionDate] = {
          ...dateExperienceMap[activeSessionDate],
        };

      for (const c of activeCheckins) {
        const norm = normalizeName(c.name);
        dateMap[activeSessionDate].add(norm);
        dateExperienceMap[activeSessionDate][norm] = c.experience || "General";
      }
    }

    // Collect all date keys (union of present, absent, and excused maps)
    const allDateKeys = new Set([
      ...Object.keys(dateMap),
      ...Object.keys(dateAbsentMap),
      ...Object.keys(dateExcusedMap),
    ]);

    // Remove dates with zero attendees and zero absent/excused markers
    for (const date of allDateKeys) {
      const presentSize = dateMap[date]?.size || 0;
      const absentSize = dateAbsentMap[date]?.size || 0;
      const excusedSize = dateExcusedMap[date]?.size || 0;
      if (presentSize === 0 && absentSize === 0 && excusedSize === 0) {
        delete dateMap[date];
        delete dateAbsentMap[date];
        delete dateExcusedMap[date];
        delete dateExperienceMap[date];
        allDateKeys.delete(date);
      }
    }

    const dates = [...allDateKeys].sort();
    if (dates.length === 0) {
      return {
        dates: [],
        memberRows: [],
        summary: { totalDates: 0, avgAttendance: 0, memberCount: 0 },
      };
    }

    // Collect all known names
    const nameInfoMap = {};

    for (const m of members) {
      const norm = normalizeName(m.name);
      nameInfoMap[norm] = {
        displayName: m.name,
        experience: m.experience || "General",
      };
    }

    for (const date of dates) {
      const addName = (norm) => {
        if (!nameInfoMap[norm]) {
          const exp = dateExperienceMap[date]?.[norm] || "General";
          const display = norm
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          nameInfoMap[norm] = { displayName: display, experience: exp };
        }
      };
      if (dateMap[date]) for (const norm of dateMap[date]) addName(norm);
      if (dateAbsentMap[date])
        for (const norm of dateAbsentMap[date]) addName(norm);
      if (dateExcusedMap[date])
        for (const norm of dateExcusedMap[date]) addName(norm);
    }

    // Build member rows with quad-state attendance
    const memberRows = Object.entries(nameInfoMap).map(([norm, info]) => {
      let totalAttended = 0;
      let firstSeen = null;
      let firstPresent = null;
      let lastSeen = null;

      // First pass: find firstSeen/lastSeen/firstPresent
      for (const date of dates) {
        if (dateMap[date]?.has(norm)) {
          totalAttended++;
          if (!firstPresent) firstPresent = date;
          if (!firstSeen) firstSeen = date;
          lastSeen = date;
        } else if (
          dateAbsentMap[date]?.has(norm) ||
          dateExcusedMap[date]?.has(norm)
        ) {
          if (!firstSeen) firstSeen = date;
        }
      }

      // Second pass: build raw quad-state map
      const attendanceByDate = {};
      for (const date of dates) {
        if (dateMap[date]?.has(norm)) {
          attendanceByDate[date] = "present";
        } else if (dateAbsentMap[date]?.has(norm)) {
          attendanceByDate[date] = "absent";
        } else if (dateExcusedMap[date]?.has(norm)) {
          attendanceByDate[date] = "excused";
        } else {
          attendanceByDate[date] = "na";
        }
      }

      const rate = dates.length > 0 ? totalAttended / dates.length : 0;

      let sinceJoinedRate = 0;
      if (firstSeen) {
        const firstIdx = dates.indexOf(firstSeen);
        const datesSinceJoined = dates.length - firstIdx;
        sinceJoinedRate =
          datesSinceJoined > 0 ? totalAttended / datesSinceJoined : 0;
      }

      let streak = 0;
      for (let i = dates.length - 1; i >= 0; i--) {
        if (attendanceByDate[dates[i]] === "present") streak++;
        else break;
      }

      // Inactive: attended at least once, but missed the last 3+ sessions since joining
      let missedTail = 0;
      for (let i = dates.length - 1; i >= 0; i--) {
        const s = attendanceByDate[dates[i]];
        if (s === "present") break;
        const afterFirst = firstPresent && dates[i] >= firstPresent;
        if (s === "na" && !afterFirst) break;
        missedTail++;
      }
      const inactive = firstSeen && missedTail >= 3;

      return {
        name: info.displayName,
        experience: info.experience,
        attendanceByDate,
        rate,
        sinceJoinedRate,
        totalAttended,
        streak,
        firstSeen,
        firstPresent,
        lastSeen,
        inactive,
      };
    });

    const totalAttendances = dates.map((d) => dateMap[d]?.size || 0);
    const avgAttendance =
      totalAttendances.length > 0
        ? totalAttendances.reduce((a, b) => a + b, 0) / totalAttendances.length
        : 0;

    return {
      dates,
      memberRows,
      summary: {
        totalDates: dates.length,
        avgAttendance: Math.round(avgAttendance * 10) / 10,
        memberCount: memberRows.length,
      },
    };
  }, [sessionCheckinMap, members, activeCheckins, activeSessionDate]);

  return {
    ...computed,
    loading,
    progress,
    loadAttendance,
    invalidateCache,
    toggleAttendance,
    deleteAttendanceMember,
    editSessionDate,
  };
}
