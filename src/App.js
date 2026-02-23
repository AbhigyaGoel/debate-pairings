import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Calendar, Shield, LogOut, Play, Square, Edit2, Check, X } from "lucide-react";
import { DragDropProvider } from "./contexts/DragDropContext";
import { AuthProvider, useAuthContext } from "./contexts/AuthContext";
import { Alert } from "./components/Alert";
import { AdminLoginModal } from "./components/AdminLoginModal";
import { RosterTab } from "./components/RosterTab";
import { SessionTab } from "./components/SessionTab";
import { CheckInView } from "./components/CheckInView";
import { ChambersTab } from "./components/ChambersTab";
import { TouchDragLayer } from "./components/TouchDragLayer";
import { DisplayTab } from "./components/DisplayTab";
import { SessionsTab } from "./components/SessionsTab";
import { AttendanceTab } from "./components/AttendanceTab";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { useMembers } from "./hooks/useMembers";
import { useSession } from "./hooks/useSession";
import { usePairingGenerator } from "./hooks/usePairingGenerator";
import { usePositionAssignment } from "./hooks/usePositionAssignment";
import { useDragDropHandlers } from "./hooks/useDragDropHandlers";
import { useSessionHistory } from "./hooks/useSessionHistory";
import { useAttendance } from "./hooks/useAttendance";
import { useDragDrop } from "./contexts/DragDropContext";
import { shuffleArray, normalizeName, normalizeRole, removePersonFromPairings, getLocalDateStr } from "./utils/helpers";
import { ROUND_TYPES, POSITION_NAMES } from "./utils/constants";
import { computePositionHistoryFromSessions, updateSessionName, saveMotionDrop, clearMotionDrop, deleteAttendanceForMember } from "./services/sessionService";

function AppContent() {
  const { user, isAdmin, adminName, loading: authLoading, loginAsAdmin, logout } =
    useAuthContext();
  const [showAdminModal, setShowAdminModal] = useState(false);

  const { members, loading: membersLoading, addMember, updateMember, removeMember, clearRoster, importFromCSV } =
    useMembers(user);

  const {
    session, sessionLoading, checkins, myCheckIn,
    startSession, endSession, markPaired, markDraft,
    checkIn, adminCheckIn, updateCheckIn, removeCheckIn,
    savePairings, saveSessionPositions,
  } = useSession(user);

  const [positionHistory, setPositionHistory] = useState({});
  const [sessionPositions, setSessionPositions] = useState({});
  const [chambers, setChambers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState(isAdmin ? "session" : "display");
  const [sessionDate, setSessionDate] = useState(() => getLocalDateStr());
  const [loading, setLoading] = useState(false);

  const {
    closedSessions, expandedSessionId, checkinCache,
    loading: sessionsLoading, loadSessions,
    expandSession, renameSession, deleteSessionFull,
    changeSessionDate, removePersonFromSessionPairings, removeSessionCheckin,
  } = useSessionHistory();

  const {
    dates: attendanceDates, memberRows: attendanceMemberRows,
    summary: attendanceSummary, loading: attendanceLoading,
    progress: attendanceProgress, loadAttendance, invalidateCache: invalidateAttendanceCache,
    toggleAttendance, deleteAttendanceMember, editSessionDate,
  } = useAttendance(members, checkins, session?.date);

  // Wrap checkIn to auto-add walk-ins to roster
  const checkInAndAutoRoster = useCallback(async (memberData) => {
    const result = await checkIn(memberData);
    // If this person isn't on the roster, add them
    const norm = normalizeName(memberData.name);
    const onRoster = members.some((m) => normalizeName(m.name) === norm);
    if (!onRoster) {
      // Also check if walk-in name is a first-name match of an existing roster member
      // e.g. "Darren" should not create a new entry when "Darren Gao" exists
      const walkInLower = memberData.name.toLowerCase().trim();
      const firstNameMatch = members.some((m) => {
        const firstName = m.name.toLowerCase().trim().split(/\s+/)[0];
        return firstName === walkInLower;
      });
      if (!firstNameMatch) {
        try {
          await addMember({ name: memberData.name, experience: memberData.experience || "General" });
        } catch (err) {
          console.error("Failed to auto-add walk-in to roster:", err);
        }
      }
    }
    return result;
  }, [checkIn, members, addMember]);

  const [editingSessionName, setEditingSessionName] = useState(false);
  const [sessionNameDraft, setSessionNameDraft] = useState("");

  const { draggedItem } = useDragDrop();
  useAutoScroll(draggedItem);

  const rosterParticipants = useMemo(() =>
    members.map((m) => ({
      name: m.name,
      partner: "",
      experience: m.experience || "General",
      preference: "No Preference",
      halfRound: "",
      role: "Debate",
    })),
    [members]
  );

  const sessionParticipants = useMemo(() =>
    checkins.map((c) => ({
      name: c.name,
      partner: c.partner || "",
      experience: c.experience || "General",
      preference: c.preference || "No Preference",
      halfRound: c.halfRound || "",
      role: normalizeRole(c.role),
    })),
    [checkins]
  );

  const participants = sessionParticipants.length > 0 ? sessionParticipants : rosterParticipants;

  const { createTeams, createChambers: generateChambers } = usePairingGenerator(
    participants,
    setSpectators,
    setAlerts,
    members
  );
  const { assignPositionsInChamber } =
    usePositionAssignment(positionHistory);

  // Switch to "session" tab when admin logs in (useState initial value was set before auth resolved)
  useEffect(() => {
    if (isAdmin && activeTab === "display") setActiveTab("session");
  }, [isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  const dragDropHandlers = useDragDropHandlers(
    chambers,
    setChambers,
    spectators,
    setSpectators,
    sessionPositions,
    setSessionPositions,
    setAlerts
  );

  const isSyncing = useRef(false);
  const saveTimerRef = useRef(null);

  // Debounced auto-save chambers/spectators to Firestore (500ms)
  useEffect(() => {
    if (isSyncing.current) return;
    if (chambers.length > 0 && session?.id) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        savePairings(chambers, spectators).catch((err) =>
          console.error("Failed to save pairings to Firestore:", err)
        );
      }, 500);
    }
    return () => clearTimeout(saveTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chambers, session?.status]);

  // Compute position history from all closed sessions on mount
  useEffect(() => {
    computePositionHistoryFromSessions()
      .then(setPositionHistory)
      .catch((err) => console.error("Failed to compute position history:", err));
  }, []);

  // Sync chambers/spectators/sessionPositions from Firestore
  // Only apply remote data if we're not in the middle of a local edit (debounce timer pending)
  useEffect(() => {
    if (!session) {
      setChambers([]);
      setSpectators([]);
      setSessionPositions({});
      return;
    }
    // Skip sync if a local save is pending (user is actively editing)
    if (saveTimerRef.current) return;
    isSyncing.current = true;
    if (session.chambers) setChambers(session.chambers);
    if (session.spectators) setSpectators(session.spectators || []);
    if (session.sessionPositions) setSessionPositions(session.sessionPositions || {});
    setTimeout(() => { isSyncing.current = false; }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Auto-save session positions to session doc
  useEffect(() => {
    if (isSyncing.current) return;
    if (Object.keys(sessionPositions).length > 0 && session?.id) {
      saveSessionPositions(sessionPositions).catch((err) =>
        console.error("Failed to save session positions:", err)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPositions, session?.id]);

  const handleDeleteSession = useCallback(async (sessionId) => {
    try {
      await deleteSessionFull(sessionId);
      invalidateAttendanceCache();
      // Recompute position history from remaining sessions
      const freshHistory = await computePositionHistoryFromSessions();
      setPositionHistory(freshHistory);
      setAlerts([{ type: "success", message: "Session deleted" }]);
    } catch (err) {
      setAlerts([{ type: "error", message: "Failed to delete session: " + err.message }]);
    }
  }, [deleteSessionFull, invalidateAttendanceCache]);

  const handleSaveSessionName = useCallback(async () => {
    const trimmed = sessionNameDraft.trim();
    if (!trimmed || !session?.id) return;
    try {
      await updateSessionName(session.id, trimmed);
      setEditingSessionName(false);
    } catch (err) {
      setAlerts([{ type: "error", message: "Failed to rename session: " + err.message }]);
    }
  }, [sessionNameDraft, session?.id]);

  const handleStartSession = useCallback(async () => {
    try {
      await startSession(adminName);
      setActiveTab("session");
      setChambers([]);
      setSpectators([]);
      setSessionPositions({});
      setAlerts([{ type: "success", message: "Session started — debaters can now check in" }]);
    } catch (err) {
      setAlerts([{ type: "error", message: "Failed to start session: " + err.message }]);
    }
  }, [startSession, adminName]);

  const handleEndSession = useCallback(async () => {
    if (!window.confirm("End the current session? Debaters will no longer be able to check in.")) return;
    try {
      await endSession();
      // Recompute position history from all closed sessions (including the one just closed)
      const freshHistory = await computePositionHistoryFromSessions();
      setPositionHistory(freshHistory);
      setChambers([]);
      setSpectators([]);
      setSessionPositions({});
      invalidateAttendanceCache();
      setActiveTab("roster");
      setAlerts([{ type: "success", message: "Session ended" }]);
    } catch (err) {
      setAlerts([{ type: "error", message: "Failed to end session: " + err.message }]);
    }
  }, [endSession, invalidateAttendanceCache]);

  const handleUpdateMember = useCallback(
    async (memberId, updates) => {
      await updateMember(memberId, updates);
      if (updates.experience && session) {
        const member = members.find((m) => m.id === memberId);
        if (member) {
          const matchingCheckin = checkins.find(
            (c) => normalizeName(c.name) === normalizeName(member.name)
          );
          if (matchingCheckin) {
            updateCheckIn(matchingCheckin.id, { experience: updates.experience }).catch((err) =>
              console.error("Failed to propagate experience to checkin:", err)
            );
          }
        }
      }
    },
    [updateMember, session, members, checkins, updateCheckIn]
  );

  const handleRemoveMember = useCallback(async (memberId) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;
    await removeMember(memberId);
    try {
      await deleteAttendanceForMember(member.name);
      invalidateAttendanceCache();
    } catch (err) {
      console.error("Failed to clean attendance for removed member:", err);
    }
  }, [removeMember, members, invalidateAttendanceCache]);

  const handleAdminAdd = useCallback(
    async (memberData) => {
      try {
        await adminCheckIn(memberData);
      } catch (err) {
        setAlerts([{ type: "error", message: "Failed to add: " + err.message }]);
      }
    },
    [adminCheckIn]
  );

  const handleBatchAddToSession = useCallback(
    async (memberList) => {
      try {
        await Promise.all(memberList.map((m) => adminCheckIn(m)));
        setAlerts([{ type: "success", message: `Added ${memberList.length} members to session` }]);
      } catch (err) {
        setAlerts([{ type: "error", message: "Failed to add members: " + err.message }]);
      }
    },
    [adminCheckIn]
  );

  const handleDropMotion = useCallback(
    async (motion, infoslide) => {
      if (!session?.id) return;
      try {
        await saveMotionDrop(session.id, motion, infoslide);
      } catch (err) {
        setAlerts([{ type: "error", message: "Failed to drop motion: " + err.message }]);
      }
    },
    [session?.id]
  );

  const handleClearMotion = useCallback(async () => {
    if (!session?.id) return;
    try {
      await clearMotionDrop(session.id);
    } catch (err) {
      setAlerts([{ type: "error", message: "Failed to clear motion: " + err.message }]);
    }
  }, [session?.id]);

  const handleRemoveCheckIn = useCallback(
    (checkinId) => {
      const checkin = checkins.find((c) => c.id === checkinId);
      if (checkin) {
        const result = removePersonFromPairings(checkin.name, chambers, spectators);
        setChambers(result.chambers);
        setSpectators(result.spectators);
      }
      removeCheckIn(checkinId);
    },
    [checkins, chambers, spectators, removeCheckIn]
  );

  const handleDeleteTeam = useCallback(
    (chamberIdx, teamId) => {
      const newChambers = [...chambers];
      const chamber = newChambers[chamberIdx];
      const teamIndex = chamber.teams.findIndex((t) => t.id === teamId);
      if (teamIndex === -1) return;
      const team = chamber.teams[teamIndex];
      const membersToSpectate = team.members.map((m) => ({ ...m }));
      chamber.teams.splice(teamIndex, 1);
      setSpectators((prev) => [...prev, ...membersToSpectate]);
      setChambers(newChambers);
    },
    [chambers]
  );

  const handleDeletePerson = useCallback((chamberIdx, position, personName) => {
    const newChambers = [...chambers];
    const chamber = newChambers[chamberIdx];

    // Remove from team at position
    const team = chamber.teams.find((t) => t.position === position);
    if (team) {
      team.members = team.members.filter((m) => m.name !== personName);
      if (team.members.length === 0) {
        chamber.teams = chamber.teams.filter((t) => t.id !== team.id);
      }
    }

    // Also check iron person
    if (chamber.ironPerson && chamber.ironPerson.name === personName) {
      chamber.ironPerson = null;
      chamber.hasIron = false;
      chamber.ironPosition = null;
    }

    // Check judges
    chamber.judges = (chamber.judges || []).filter((j) => j.name !== personName);

    setChambers(newChambers);

    // Remove check-in from session
    const checkin = checkins.find((c) => normalizeName(c.name) === normalizeName(personName));
    if (checkin) {
      removeCheckIn(checkin.id);
    }
  }, [chambers, checkins, removeCheckIn]);

  const generatePairings = useCallback((sourceParticipants) => {
    setAlerts([]);
    setSpectators([]);
    setLoading(true);

    try {
      const result = sourceParticipants ? createTeams(sourceParticipants) : createTeams();
      if (!result?.teams) {
        setAlerts([{ type: "error", message: "Failed to create teams" }]);
        setLoading(false);
        return;
      }

      const { teams, judges: judgeList } = result;
      if (teams.length < 2) {
        setAlerts([
          {
            type: "error",
            message: `Not enough teams to create chambers. Need at least 2 teams, have ${teams.length}`,
          },
        ]);
        setLoading(false);
        return;
      }

      let chamberList = generateChambers(teams).map((chamber) =>
        assignPositionsInChamber(chamber)
      );
      const availableJudges = shuffleArray([...judgeList]);

      chamberList.forEach((chamber) => {
        chamber.judges = [];
        if (availableJudges.length > 0)
          chamber.judges.push(availableJudges.shift());
      });

      while (availableJudges.length > 0) {
        chamberList[Math.floor(Math.random() * chamberList.length)].judges.push(
          availableJudges.shift()
        );
      }

      chamberList.forEach((chamber) => {
        if (chamber.judges.length === 0) {
          setAlerts((prev) => [
            ...prev,
            {
              type: "warning",
              message: `${chamber.room} has no judge - insufficient judges`,
            },
          ]);
        }
      });

      const currentPositions = {};
      chamberList.forEach((chamber) => {
        chamber.teams.forEach((team) =>
          team.members.forEach((member) => {
            if (!currentPositions[member.name]) currentPositions[member.name] = [];
            currentPositions[member.name].push(team.position);
          })
        );
        if (chamber.hasIron && chamber.ironPerson && chamber.ironPosition) {
          if (!currentPositions[chamber.ironPerson.name])
            currentPositions[chamber.ironPerson.name] = [];
          currentPositions[chamber.ironPerson.name].push(chamber.ironPosition);
        }
      });

      setSessionPositions(currentPositions);
      setChambers(chamberList);
      setActiveTab("chambers");
      // If pairings were already released, revert to draft so viewers don't see unfinished re-generation
      if (session?.status === "paired") {
        markDraft().catch((err) => console.error("Failed to revert to draft:", err));
      }
      setAlerts((prev) => [
        ...prev,
        {
          type: "success",
          message: `Created ${chamberList.length} chamber(s) with ${teams.length} teams`,
        },
      ]);
    } catch (error) {
      console.error("Pairing error:", error);
      setAlerts([{ type: "error", message: "Error: " + error.message }]);
    } finally {
      setLoading(false);
    }
  }, [
    createTeams,
    generateChambers,
    assignPositionsInChamber,
    session?.status,
    markDraft,
  ]);

  const generateFromRoster = useCallback(() => {
    generatePairings(rosterParticipants);
  }, [generatePairings, rosterParticipants]);

  const generateFromSession = useCallback(() => {
    const checkinDebaters = sessionParticipants.filter(
      (p) => !p.role || p.role === "Debate"
    ).length;
    if (checkinDebaters >= 4) {
      generatePairings(sessionParticipants);
    } else {
      generatePairings(rosterParticipants);
    }
  }, [generatePairings, sessionParticipants, rosterParticipants]);

  const addChamber = useCallback(() => {
    setChambers([
      ...chambers,
      {
        id: `chamber-${Date.now()}`,
        room: `Room ${chambers.length + 1}`,
        teams: [],
        judges: [],
        mixed: false,
        roundType: "full",
        hasIron: false,
        ironPerson: null,
      },
    ]);
  }, [chambers]);

  const updateRoomName = useCallback(
    (chamberIdx, newName) => {
      const newChambers = [...chambers];
      newChambers[chamberIdx].room = newName;
      setChambers(newChambers);
    },
    [chambers]
  );

  const handleRoundTypeChange = useCallback(
    (chamberIdx, newRoundType) => {
      const newChambers = [...chambers];
      const chamber = newChambers[chamberIdx];
      const newPositions = ROUND_TYPES[newRoundType].positions;
      let unassignedCount = 0;

      chamber.teams.forEach((team) => {
        if (team.position && !newPositions.includes(team.position)) {
          team.position = null;
          unassignedCount++;
        }
      });

      chamber.roundType = newRoundType;
      setChambers(newChambers);

      if (unassignedCount > 0) {
        setAlerts((prev) => [
          ...prev,
          {
            type: "warning",
            message: `${unassignedCount} team(s) unassigned due to round type change. See "Unassigned Teams" section to reassign them.`,
          },
        ]);
      }
    },
    [chambers]
  );

  const handleAutoPlacePerson = useCallback((checkin) => {
    if (chambers.length === 0) return;
    const person = {
      name: checkin.name,
      experience: checkin.experience || "General",
      role: normalizeRole(checkin.role),
    };
    const role = person.role;
    const newChambers = [...chambers];

    if (role === "Judge") {
      const targetChamber = newChambers.reduce((min, c) =>
        (c.judges?.length || 0) < (min.judges?.length || 0) ? c : min
      , newChambers[0]);
      targetChamber.judges = [...(targetChamber.judges || []), person];
    } else if (role === "Spectate") {
      setSpectators((prev) => [...prev, person]);
      setAlerts((prev) => [...prev, { type: "success", message: `${person.name} added as spectator` }]);
      return;
    } else {
      let placed = false;
      for (let ci = 0; ci < newChambers.length && !placed; ci++) {
        for (const team of newChambers[ci].teams) {
          if (team.members.length === 1) {
            team.members.push(person);
            placed = true;
            if (team.position) {
              setSessionPositions((prev) => {
                const updated = { ...prev };
                if (!updated[person.name]) updated[person.name] = [];
                updated[person.name] = [...updated[person.name], team.position];
                return updated;
              });
            }
            break;
          }
        }
      }
      if (!placed) {
        const targetChamber = newChambers.reduce((min, c) =>
          c.teams.length < min.teams.length ? c : min
        , newChambers[0]);
        targetChamber.teams.push({
          id: `team-auto-${Date.now()}`,
          members: [person],
          experience: person.experience,
          position: null,
        });
      }
    }

    setChambers(newChambers);
    setAlerts((prev) => [...prev, { type: "success", message: `${person.name} added to pairings` }]);
  }, [chambers]);

  const isDraftPairings = session?.status === "open" && chambers.length > 0;

  const handleFinalizePairings = useCallback(async () => {
    try {
      await markPaired();
      setAlerts([{ type: "success", message: "Pairings released — viewers can now see chambers" }]);
    } catch (err) {
      setAlerts([{ type: "error", message: "Failed to release pairings: " + err.message }]);
    }
  }, [markPaired]);

  const exportToCSV = useCallback(() => {
    const exportDate = session?.date || sessionDate;
    let csv =
      "Session Date,Chamber,Round Type,Position,Team Member 1,Team Member 2,Judges\n";
    chambers.forEach((chamber) => {
      const positions = ROUND_TYPES[chamber.roundType].positions;
      const judgeNames =
        chamber.judges?.length > 0
          ? chamber.judges.map((j) => j.name.replace(/,/g, " ")).join("; ")
          : "No Judge";

      positions.forEach((pos) => {
        const team = chamber.teams.find((t) => t.position === pos);
        if (team) {
          const member1 = team.members[0]?.name.replace(/,/g, " ") || "";
          const member2 = team.members[1]?.name.replace(/,/g, " ") || "";
          csv += `${exportDate},${chamber.room},${
            ROUND_TYPES[chamber.roundType].label
          },${POSITION_NAMES[pos]},${member1},${member2},${judgeNames}\n`;
        }
      });

      if (chamber.hasIron && chamber.ironPerson && chamber.ironPosition) {
        const ironName = chamber.ironPerson.name.replace(/,/g, " ");
        csv += `${sessionDate},${chamber.room},${
          ROUND_TYPES[chamber.roundType].label
        },${
          POSITION_NAMES[chamber.ironPosition]
        } (Iron),${ironName},,${judgeNames}\n`;
      }
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debate-pairings-${sessionDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [chambers, sessionDate, session]);


  const sessionActive = session && (session.status === "open" || session.status === "paired");
  const adminTabs = sessionActive
    ? ["session", "chambers", "display", "roster", "attendance", "sessions"]
    : ["roster", "display", "attendance", "sessions"];
  const viewerTabs = ["display"];
  const visibleTabs = isAdmin ? adminTabs : viewerTabs;

  const TAB_LABELS = {
    roster: "Roster",
    session: "Session",
    chambers: "Chambers",
    display: "Round",
    attendance: "Attendance",
    sessions: "Sessions",
  };

  const effectiveTab = visibleTabs.includes(activeTab) ? activeTab : visibleTabs[0];

  // Load closed sessions when Sessions tab is opened
  useEffect(() => {
    if (effectiveTab === "sessions") loadSessions();
  }, [effectiveTab, loadSessions]);

  // Load attendance data when Attendance tab is opened
  useEffect(() => {
    if (effectiveTab === "attendance") loadAttendance();
  }, [effectiveTab, loadAttendance]);

  if (authLoading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-spinner" />
      </div>
    );
  }

  // --- Viewer (non-admin) ---
  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto p-3 sm:p-6">
          {/* Header */}
          <div className="glass-strong rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Chambers</h1>
                <p className="text-xs text-gray-400">by <a href="https://abhigyagoel.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-500 transition-colors duration-150">Abhigya Goel</a></p>
                {session && (
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-gray-400">
                      {session.date}
                    </span>
                    {session.status === "open" && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full font-medium border border-emerald-200">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        Check-in open
                      </span>
                    )}
                    {session.status === "paired" && (
                      <span className="inline-flex items-center text-xs text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full font-medium border border-indigo-200">
                        Pairings posted
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowAdminModal(true)}
                className="flex-shrink-0 flex items-center gap-1.5 text-sm px-3 py-1.5 text-gray-400 hover:text-gray-600 glass-subtle rounded-lg transition-all duration-200 hover:bg-gray-50"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            </div>
          </div>

          {showAdminModal && (
            <AdminLoginModal
              onLogin={loginAsAdmin}
              onClose={() => setShowAdminModal(false)}
            />
          )}

          {!session ? (
            <div className="glass rounded-2xl p-4 sm:p-6">
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg font-medium">No active session</p>
                <p className="text-sm mt-1 text-gray-300">Check back when an admin starts a session</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-4 sm:p-6">
                <CheckInView
                  members={members}
                  myCheckIn={myCheckIn}
                  session={session}
                  onCheckIn={checkInAndAutoRoster}
                  onUpdateCheckIn={updateCheckIn}
                  onLeave={() => myCheckIn && removeCheckIn(myCheckIn.id)}
                />
              </div>

              {session.status === "paired" && (session.chambers?.length > 0 || chambers.length > 0) && (
                <div className="glass rounded-2xl p-4 sm:p-6">
                  <DisplayTab
                    chambers={session.chambers || chambers}
                    spectators={session.spectators || spectators}
                    sessionDate={session.date}
                    motion={session.motion}
                    infoslide={session.infoslide}
                    motionDroppedAt={session.motionDroppedAt}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Admin ---
  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Header card */}
        <div className="glass-strong rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">Chambers</h1>
              <p className="text-xs text-gray-400 mb-2">by Abhigya Goel</p>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-gray-400">
                  <Calendar className="w-4 h-4" />
                  {sessionDate}
                </span>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {sessionActive ? (
                <button
                  onClick={handleEndSession}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-200"
                >
                  <Square className="w-4 h-4" />
                  End Session
                </button>
              ) : (
                <button
                  onClick={handleStartSession}
                  className="flex items-center gap-1.5 text-sm px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all duration-200"
                >
                  <Play className="w-4 h-4" />
                  Start Session
                </button>
              )}
              <span className="text-sm text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-full font-medium">
                <Shield className="w-3 h-3 inline mr-1" />
                {adminName}
              </span>
              <button
                onClick={logout}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                title="Exit admin mode"
                aria-label="Exit admin mode"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
          {sessionActive && (
            <div className="mt-3 sm:mt-4 flex items-center gap-3 flex-wrap">
              {editingSessionName ? (
                <div className="flex items-center gap-1.5">
                  <input
                    value={sessionNameDraft}
                    onChange={(e) => setSessionNameDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveSessionName(); if (e.key === "Escape") setEditingSessionName(false); }}
                    className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    autoFocus
                  />
                  <button onClick={handleSaveSessionName} className="text-emerald-500 hover:text-emerald-600 p-0.5">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingSessionName(false)} className="text-gray-300 hover:text-gray-500 p-0.5">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer hover:text-gray-800 transition-colors duration-150"
                  onClick={() => { setSessionNameDraft(session.name || `Session - ${sessionDate}`); setEditingSessionName(true); }}
                >
                  {session.name || `Session - ${sessionDate}`}
                  <Edit2 className="w-3.5 h-3.5 text-gray-300" />
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium border border-emerald-200">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {checkins.length} checked in
              </span>
              {session.joinCode && (
                <span className="inline-flex items-center gap-1 text-xs font-mono tracking-widest text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                  Join code: {session.joinCode}
                </span>
              )}
            </div>
          )}
        </div>

        {showAdminModal && (
          <AdminLoginModal
            onLogin={loginAsAdmin}
            onClose={() => setShowAdminModal(false)}
          />
        )}

        {/* Tab container */}
        <div className="glass rounded-2xl mb-4 sm:mb-6">
          <div className="border-b border-gray-100">
            {/* Desktop: single row */}
            <div className="hidden sm:flex gap-1 p-1.5">
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 whitespace-nowrap ${
                    effectiveTab === tab
                      ? "glass-strong text-gray-900"
                      : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {TAB_LABELS[tab]}
                  {tab === "session" && checkins.length > 0 && (
                    <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                      effectiveTab === tab
                        ? "bg-indigo-100 text-indigo-600"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      {checkins.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Mobile: two-row grid, split evenly */}
            <div className="sm:hidden p-1.5 space-y-1">
              {(() => {
                const mid = Math.ceil(visibleTabs.length / 2);
                const row1 = visibleTabs.slice(0, mid);
                const row2 = visibleTabs.slice(mid);
                const renderTab = (tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2 py-2 text-xs font-medium rounded-lg transition-all duration-200 whitespace-nowrap flex-1 text-center ${
                      effectiveTab === tab
                        ? "glass-strong text-gray-900"
                        : "text-gray-400 active:bg-gray-100"
                    }`}
                  >
                    {TAB_LABELS[tab]}
                    {tab === "session" && checkins.length > 0 && (
                      <span className={`ml-1 text-xs px-1 py-0.5 rounded-full ${
                        effectiveTab === tab
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-gray-100 text-gray-400"
                      }`}>
                        {checkins.length}
                      </span>
                    )}
                  </button>
                );
                return (
                  <>
                    <div className="flex gap-1">{row1.map(renderTab)}</div>
                    {row2.length > 0 && (
                      <div className="flex gap-1">{row2.map(renderTab)}</div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {alerts.map((alert, idx) => (
              <Alert
                key={idx}
                alert={alert}
                onClose={() => setAlerts(alerts.filter((_, i) => i !== idx))}
              />
            ))}

            {effectiveTab === "session" && (
              <SessionTab
                checkins={checkins}
                members={members}
                onUpdateCheckIn={updateCheckIn}
                onRemoveCheckIn={handleRemoveCheckIn}
                onAdminAdd={handleAdminAdd}
                onGeneratePairings={generateFromSession}
                pairingLoading={loading}
                paired={session?.status === "paired" || isDraftPairings}
                chambers={chambers}
                spectators={spectators}
                onAutoPlace={handleAutoPlacePerson}
              />
            )}

            {effectiveTab === "roster" && (
              <RosterTab
                members={members}
                membersLoading={membersLoading}
                onAddMember={addMember}
                onUpdateMember={handleUpdateMember}
                onRemoveMember={handleRemoveMember}
                onClearRoster={clearRoster}
                onImportCSV={importFromCSV}
                sessionActive={sessionActive}
                checkins={checkins}
                onAddToSession={handleBatchAddToSession}
                onGeneratePairings={generateFromRoster}
                pairingLoading={loading}
              />
            )}

            {effectiveTab === "chambers" && (
              <ChambersTab
                chambers={chambers}
                spectators={spectators}
                onAddChamber={addChamber}
                onUpdateRoomName={updateRoomName}
                onRoundTypeChange={handleRoundTypeChange}
                onExportCSV={exportToCSV}
                onDeleteTeam={handleDeleteTeam}
                onDeletePerson={handleDeletePerson}
                isDraft={isDraftPairings}
                onFinalize={handleFinalizePairings}
                {...dragDropHandlers}
              />
            )}

            {effectiveTab === "display" && (
              <DisplayTab
                chambers={chambers}
                spectators={spectators}
                sessionDate={sessionDate}
                motion={session?.motion}
                infoslide={session?.infoslide}
                motionDroppedAt={session?.motionDroppedAt}
                isAdmin
                onDropMotion={handleDropMotion}
                onClearMotion={handleClearMotion}
              />
            )}

            {effectiveTab === "attendance" && (
              <AttendanceTab
                loading={attendanceLoading}
                progress={attendanceProgress}
                dates={attendanceDates}
                memberRows={attendanceMemberRows}
                summary={attendanceSummary}
                activeSessionDate={session?.date}
                onToggleAttendance={toggleAttendance}
                onDeleteMember={deleteAttendanceMember}
                onEditDate={editSessionDate}
              />
            )}

            {effectiveTab === "sessions" && (
              <SessionsTab
                closedSessions={closedSessions}
                expandedSessionId={expandedSessionId}
                checkinCache={checkinCache}
                loading={sessionsLoading}
                onExpand={expandSession}
                onRename={renameSession}
                onDelete={handleDeleteSession}
                onChangeDate={changeSessionDate}
                onRemovePersonFromPairings={removePersonFromSessionPairings}
                onRemoveCheckin={removeSessionCheckin}
              />
            )}
          </div>
        </div>
        <TouchDragLayer onDrop={dragDropHandlers.onDrop} />
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DragDropProvider>
        <AppContent />
      </DragDropProvider>
    </AuthProvider>
  );
}

export default App;
