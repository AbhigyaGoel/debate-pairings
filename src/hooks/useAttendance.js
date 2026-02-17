import { useState, useCallback, useMemo, useRef } from "react";
import {
  loadClosedSessions,
  loadSessionCheckins,
  adminAddCheckIn,
  updateCheckIn,
  removeCheckIn,
} from "../services/sessionService";
import { normalizeName } from "../utils/helpers";

export function useAttendance(members, activeCheckins, activeSessionDate) {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ loaded: 0, total: 0 });
  const cacheRef = useRef(null);

  const loadAttendance = useCallback(async () => {
    if (cacheRef.current) {
      setAttendanceData(cacheRef.current);
      return;
    }

    setLoading(true);
    setProgress({ loaded: 0, total: 0 });

    try {
      const sessions = await loadClosedSessions();
      setProgress({ loaded: 0, total: sessions.length });

      const results = await Promise.allSettled(
        sessions.map(async (session) => {
          const checkins = await loadSessionCheckins(session.id);
          setProgress((prev) => ({ ...prev, loaded: prev.loaded + 1 }));
          return { session, checkins };
        })
      );

      const dateMap = {};           // present people per date
      const dateAbsentMap = {};     // explicitly absent-marked people per date
      const dateExperienceMap = {};
      // Store ALL session IDs per date (multiple sessions on same day)
      const dateToSessionIds = {};
      // Store checkin doc IDs keyed by { date: { normalizedName: { sessionId, checkinId } } }
      const dateCheckinIdMap = {};

      for (const result of results) {
        if (result.status !== "fulfilled") continue;
        const { session, checkins } = result.value;
        const date = session.date;
        if (!date) continue;

        if (!dateToSessionIds[date]) dateToSessionIds[date] = [];
        if (!dateToSessionIds[date].includes(session.id)) {
          dateToSessionIds[date].push(session.id);
        }
        if (!dateMap[date]) dateMap[date] = new Set();
        if (!dateAbsentMap[date]) dateAbsentMap[date] = new Set();
        if (!dateExperienceMap[date]) dateExperienceMap[date] = {};
        if (!dateCheckinIdMap[date]) dateCheckinIdMap[date] = {};

        for (const c of checkins) {
          const norm = normalizeName(c.name);
          if (c.status === "absent") {
            dateAbsentMap[date].add(norm);
          } else {
            dateMap[date].add(norm);
          }
          dateExperienceMap[date][norm] = c.experience || "General";
          // Track per-person: which session & checkin doc (use first found)
          if (!dateCheckinIdMap[date][norm]) {
            dateCheckinIdMap[date][norm] = { sessionId: session.id, checkinId: c.id };
          }
        }
      }

      // Remove dates with zero attendees and zero absent markers
      for (const date of Object.keys(dateMap)) {
        if (dateMap[date].size === 0 && (!dateAbsentMap[date] || dateAbsentMap[date].size === 0)) {
          delete dateMap[date];
          delete dateAbsentMap[date];
          delete dateExperienceMap[date];
          delete dateToSessionIds[date];
          delete dateCheckinIdMap[date];
        }
      }

      const data = { dateMap, dateAbsentMap, dateExperienceMap, dateToSessionIds, dateCheckinIdMap };
      cacheRef.current = data;
      setAttendanceData(data);
    } catch (err) {
      console.error("Failed to load attendance data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const invalidateCache = useCallback(() => {
    cacheRef.current = null;
    setAttendanceData(null);
  }, []);

  // Toggle attendance to any target state — handles all transitions including inferred-absent
  const toggleAttendance = useCallback(async (memberName, date, targetState) => {
    const cache = cacheRef.current;
    if (!cache) return;

    const norm = normalizeName(memberName);
    const sessionIds = cache.dateToSessionIds[date];
    if (!sessionIds || sessionIds.length === 0) return;

    const hasDoc = !!cache.dateCheckinIdMap[date]?.[norm];
    const isPresent = cache.dateMap[date]?.has(norm);
    const isExplicitAbsent = cache.dateAbsentMap?.[date]?.has(norm);

    if (targetState === "present") {
      if (isPresent) return; // already present
      if (hasDoc) {
        // Doc exists (explicit absent) → update to present
        const ref = cache.dateCheckinIdMap[date][norm];
        await updateCheckIn(ref.sessionId, ref.checkinId, { status: "" });
      } else {
        // No doc (na or inferred absent) → create one
        const sessionId = sessionIds[0];
        const member = members.find((m) => normalizeName(m.name) === norm);
        const experience = member?.experience || cache.dateExperienceMap[date]?.[norm] || "General";
        const docRef = await adminAddCheckIn(sessionId, {
          name: memberName,
          experience,
          role: "Debate",
        });
        if (!cache.dateCheckinIdMap[date]) cache.dateCheckinIdMap[date] = {};
        cache.dateCheckinIdMap[date][norm] = { sessionId, checkinId: docRef.id };
        if (!cache.dateExperienceMap[date]) cache.dateExperienceMap[date] = {};
        cache.dateExperienceMap[date][norm] = experience;
      }
      // Update cache sets
      const newPresent = new Set(cache.dateMap[date] || []);
      newPresent.add(norm);
      cache.dateMap[date] = newPresent;
      if (!cache.dateAbsentMap) cache.dateAbsentMap = {};
      const newAbsent = new Set(cache.dateAbsentMap[date] || []);
      newAbsent.delete(norm);
      cache.dateAbsentMap[date] = newAbsent;

    } else if (targetState === "absent") {
      if (isExplicitAbsent) return; // already explicitly absent
      if (hasDoc) {
        // Doc exists (present) → mark absent
        const ref = cache.dateCheckinIdMap[date][norm];
        await updateCheckIn(ref.sessionId, ref.checkinId, { status: "absent" });
      } else {
        // No doc (na or inferred absent) → create absent doc
        const sessionId = sessionIds[0];
        const member = members.find((m) => normalizeName(m.name) === norm);
        const experience = member?.experience || cache.dateExperienceMap[date]?.[norm] || "General";
        const docRef = await adminAddCheckIn(sessionId, {
          name: memberName,
          experience,
          role: "Debate",
          status: "absent",
        });
        if (!cache.dateCheckinIdMap[date]) cache.dateCheckinIdMap[date] = {};
        cache.dateCheckinIdMap[date][norm] = { sessionId, checkinId: docRef.id };
      }
      // Update cache sets
      const newPresent = new Set(cache.dateMap[date] || []);
      newPresent.delete(norm);
      cache.dateMap[date] = newPresent;
      if (!cache.dateAbsentMap) cache.dateAbsentMap = {};
      const newAbsent = new Set(cache.dateAbsentMap[date] || []);
      newAbsent.add(norm);
      cache.dateAbsentMap[date] = newAbsent;

    } else if (targetState === "na") {
      if (!hasDoc) return; // already no doc
      // Delete the checkin doc
      const ref = cache.dateCheckinIdMap[date][norm];
      await removeCheckIn(ref.sessionId, ref.checkinId);
      // Update cache sets
      const newPresent = new Set(cache.dateMap[date] || []);
      newPresent.delete(norm);
      cache.dateMap[date] = newPresent;
      if (!cache.dateAbsentMap) cache.dateAbsentMap = {};
      const newAbsent = new Set(cache.dateAbsentMap[date] || []);
      newAbsent.delete(norm);
      cache.dateAbsentMap[date] = newAbsent;
      const newIdMap = { ...cache.dateCheckinIdMap[date] };
      delete newIdMap[norm];
      cache.dateCheckinIdMap[date] = newIdMap;
    }

    // Trigger recompute with new reference
    setAttendanceData({ ...cache });
  }, [members]);

  const computed = useMemo(() => {
    const dateMap = attendanceData?.dateMap
      ? { ...attendanceData.dateMap }
      : {};
    const dateAbsentMap = attendanceData?.dateAbsentMap
      ? { ...attendanceData.dateAbsentMap }
      : {};
    const dateExperienceMap = attendanceData?.dateExperienceMap
      ? { ...attendanceData.dateExperienceMap }
      : {};

    // Merge active session checkins (read-only — active session is edited via SessionTab)
    if (activeSessionDate && activeCheckins?.length > 0) {
      if (!dateMap[activeSessionDate]) dateMap[activeSessionDate] = new Set();
      else dateMap[activeSessionDate] = new Set(dateMap[activeSessionDate]);

      if (!dateExperienceMap[activeSessionDate]) dateExperienceMap[activeSessionDate] = {};
      else dateExperienceMap[activeSessionDate] = { ...dateExperienceMap[activeSessionDate] };

      for (const c of activeCheckins) {
        const norm = normalizeName(c.name);
        dateMap[activeSessionDate].add(norm);
        dateExperienceMap[activeSessionDate][norm] = c.experience || "General";
      }
    }

    // Collect all date keys (union of present and absent maps)
    const allDateKeys = new Set([...Object.keys(dateMap), ...Object.keys(dateAbsentMap)]);

    // Remove dates with zero attendees and zero absent markers after merging
    for (const date of allDateKeys) {
      const presentSize = dateMap[date]?.size || 0;
      const absentSize = dateAbsentMap[date]?.size || 0;
      if (presentSize === 0 && absentSize === 0) {
        delete dateMap[date];
        delete dateAbsentMap[date];
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

    // Collect all known names — everyone is a member (no guest concept)
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
          const display = norm.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          nameInfoMap[norm] = { displayName: display, experience: exp };
        }
      };
      if (dateMap[date]) for (const norm of dateMap[date]) addName(norm);
      if (dateAbsentMap[date]) for (const norm of dateAbsentMap[date]) addName(norm);
    }

    // Build member rows with tri-state attendance
    const memberRows = Object.entries(nameInfoMap).map(([norm, info]) => {
      let totalAttended = 0;
      let firstSeen = null;
      let lastSeen = null;

      // First pass: find firstSeen/lastSeen (present OR explicitly absent counts as "seen")
      for (const date of dates) {
        if (dateMap[date]?.has(norm)) {
          totalAttended++;
          if (!firstSeen) firstSeen = date;
          lastSeen = date;
        } else if (dateAbsentMap[date]?.has(norm)) {
          // Explicitly absent — they were a member but missed it
          if (!firstSeen) firstSeen = date;
        }
      }

      // Second pass: build tri-state map — purely explicit, no inference
      // "present" = has present doc, "absent" = has absent doc, "na" = no doc
      const attendanceByDate = {};
      for (const date of dates) {
        if (dateMap[date]?.has(norm)) {
          attendanceByDate[date] = "present";
        } else if (dateAbsentMap[date]?.has(norm)) {
          attendanceByDate[date] = "absent";
        } else {
          attendanceByDate[date] = "na";
        }
      }

      const rate = dates.length > 0 ? totalAttended / dates.length : 0;

      let sinceJoinedRate = 0;
      if (firstSeen) {
        const firstIdx = dates.indexOf(firstSeen);
        const datesSinceJoined = dates.length - firstIdx;
        sinceJoinedRate = datesSinceJoined > 0 ? totalAttended / datesSinceJoined : 0;
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
        if (s === "present" || s === "na") break;
        if (s === "absent") missedTail++;
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
  }, [attendanceData, members, activeCheckins, activeSessionDate]);

  return {
    ...computed,
    loading,
    progress,
    loadAttendance,
    invalidateCache,
    toggleAttendance,
  };
}
