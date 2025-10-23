import React, { useState, useCallback, useEffect } from "react";
import {
  AlertCircle,
  Users,
  UserCheck,
  Calendar,
  X,
  GripVertical,
  FileSpreadsheet,
  Download,
  RefreshCw,
} from "lucide-react";

const EXPERIENCE_LEVELS = [
  "Returning Members",
  "Competitive Team Fall '25",
  "General Members",
];
const IRON_SCENARIOS = {
  FULL_ROUND_3_TEAMS: 7,
  FULL_ROUND_2_TEAMS: 5,
  HALF_ROUND_1_TEAM: 3,
};
const MAX_SPECTATOR_PROPAGATION_ITERATIONS = 10;
const POSITION_NAMES = {
  OG: "Opening Government",
  OO: "Opening Opposition",
  CG: "Closing Government",
  CO: "Closing Opposition",
};
const ROUND_TYPES = {
  full: {
    label: "Full Round",
    positions: ["OG", "OO", "CG", "CO"],
    teamsPerChamber: 4,
  },
  opening: {
    label: "Opening Half Only",
    positions: ["OG", "OO"],
    teamsPerChamber: 2,
  },
  closing: {
    label: "Closing Half Only",
    positions: ["CG", "CO"],
    teamsPerChamber: 2,
  },
};

const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const filterByRole = (participants, roleKeyword) =>
  participants.filter((p) =>
    (p.role || "").toLowerCase().trim().includes(roleKeyword)
  );

const isDebater = (person) => {
  const role = (person.role || "").toLowerCase().trim();
  return !role || role.includes("debat") || role === "";
};

const normalizeExperience = (exp) =>
  exp === "General Member" ? "General Members" : exp;

const createIronChamber = (allPeople, chamberCount, roundType = "full") => {
  const ironPerson = allPeople.pop();
  const teams = [];
  for (let i = 0; i < allPeople.length - 1; i += 2) {
    teams.push({
      id: `team-iron-${chamberCount}-${i}`,
      members: [allPeople[i], allPeople[i + 1]],
      experience: allPeople[i].experience,
      position: null,
    });
  }
  return {
    id: `chamber-${chamberCount}`,
    room: `Room ${chamberCount + 1}`,
    teams,
    ironPerson,
    judges: [],
    mixed: true,
    roundType,
    hasIron: true,
  };
};

const flattenTeamsToPeople = (teams) => teams.flatMap((team) => team.members);

const parseCSVLine = (line) => {
  const result = [];
  let current = "",
    inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
};

function App() {
  const [participants, setParticipants] = useState([]);
  const [positionHistory, setPositionHistory] = useState({});
  const [chambers, setChambers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverTarget, setDragOverTarget] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!draggedItem) return;
    let animationFrameId = null,
      currentMouseY = null;
    const scroll = () => {
      if (currentMouseY === null) {
        animationFrameId = null;
        return;
      }
      const SCROLL_ZONE = 200,
        MAX_SPEED = 15,
        viewportHeight = window.innerHeight;
      let speed = 0;
      if (currentMouseY < SCROLL_ZONE)
        speed = -MAX_SPEED * (1 - currentMouseY / SCROLL_ZONE);
      else if (currentMouseY > viewportHeight - SCROLL_ZONE)
        speed =
          MAX_SPEED *
          ((currentMouseY - (viewportHeight - SCROLL_ZONE)) / SCROLL_ZONE);
      if (speed !== 0) window.scrollBy(0, speed);
      animationFrameId = requestAnimationFrame(scroll);
    };
    const handleDrag = (e) => {
      if (e.clientY !== 0) {
        currentMouseY = e.clientY;
        if (!animationFrameId) animationFrameId = requestAnimationFrame(scroll);
      }
    };
    const handleDragEnd = () => {
      currentMouseY = null;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    };
    document.addEventListener("drag", handleDrag);
    document.addEventListener("dragend", handleDragEnd);
    return () => {
      document.removeEventListener("drag", handleDrag);
      document.removeEventListener("dragend", handleDragEnd);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [draggedItem]);

  const parseCSVData = (csvText) => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    if (lines.length === 0) return [];
    const headers = parseCSVLine(lines[0]);
    const data = [],
      skipped = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {
        name: "",
        partner: "",
        experience: "",
        preference: "No Preference",
        halfRound: "",
        role: "Debate",
      };
      headers.forEach((header, index) => {
        const value = (values[index] || "").trim();
        const headerLower = header.toLowerCase().trim();
        if (headerLower === "name") row.name = value;
        else if (headerLower.includes("partner")) row.partner = value;
        else if (headerLower.includes("experience")) row.experience = value;
        else if (headerLower.includes("preference"))
          row.preference = value || "No Preference";
        else if (headerLower.includes("half") && headerLower.includes("round"))
          row.halfRound = value || "";
        else if (headerLower === "role") row.role = value || "Debate";
      });
      if (row.experience === "General Member")
        row.experience = "General Members";
      if (row.name && row.experience) {
        if (EXPERIENCE_LEVELS.includes(row.experience)) data.push(row);
        else
          skipped.push(`${row.name} (invalid experience: "${row.experience}")`);
      } else if (row.name)
        skipped.push(`${row.name} (missing experience level)`);
    }
    if (skipped.length > 0)
      setAlerts((prev) => [
        ...prev,
        {
          type: "warning",
          message: `Skipped ${skipped.length} entries: ${skipped.join(", ")}`,
        },
      ]);
    return data;
  };

  const handleManualInput = (csvText) => {
    if (!csvText?.trim()) {
      setAlerts([{ type: "error", message: "Please provide CSV data" }]);
      return;
    }
    try {
      const data = parseCSVData(csvText);
      if (data.length === 0) {
        setAlerts([
          {
            type: "error",
            message:
              "No valid data found in CSV. Check column headers and experience levels.",
          },
        ]);
        return;
      }
      const debaters = data.filter(isDebater),
        judges = filterByRole(data, "judg"),
        spectators = filterByRole(data, "spectat");
      setParticipants(data);
      setAlerts([
        {
          type: "success",
          message: `Loaded ${data.length} participants: ${debaters.length} debaters, ${judges.length} judges, ${spectators.length} spectators`,
        },
      ]);
    } catch (error) {
      setAlerts([
        { type: "error", message: "Failed to parse CSV: " + error.message },
      ]);
    }
  };

  const createTeams = useCallback(() => {
    const teams = [],
      processed = new Set(),
      singles = {
        "Returning Members": [],
        "Competitive Team Fall '25": [],
        "General Members": [],
      };
    const judgeList = filterByRole(participants, "judg"),
      explicitSpectators = filterByRole(participants, "spectat"),
      debaters = participants.filter(isDebater);
    const spectatorNames = new Set();
    explicitSpectators.forEach((s) => spectatorNames.add(s.name));

    const propagateSpectators = () => {
      let changed = false;
      participants.forEach((person) => {
        const partnerName = (person.partner || "").trim();
        if (
          spectatorNames.has(person.name) &&
          partnerName &&
          !spectatorNames.has(partnerName)
        ) {
          spectatorNames.add(partnerName);
          changed = true;
        }
        if (
          partnerName &&
          spectatorNames.has(partnerName) &&
          !spectatorNames.has(person.name)
        ) {
          spectatorNames.add(person.name);
          changed = true;
        }
      });
      return changed;
    };

    let iterations = 0;
    while (
      propagateSpectators() &&
      iterations < MAX_SPECTATOR_PROPAGATION_ITERATIONS
    ) {
      iterations++;
    }
    const allSpectators = participants.filter((person) =>
      spectatorNames.has(person.name)
    );
    const activeDebaters = debaters.filter((p) => !spectatorNames.has(p.name));
    activeDebaters.forEach((person) => {
      if (processed.has(person.name)) return;
      const partnerName = (person.partner || "").trim();
      if (partnerName) {
        let partner = activeDebaters.find(
          (other) => other.name === partnerName && !processed.has(other.name)
        );
        if (partner && partner.experience !== person.experience) {
          setAlerts((prev) => [
            ...prev,
            {
              type: "warning",
              message: `${person.name} and ${partner.name} have different experience levels - cannot form team`,
            },
          ]);
          singles[normalizeExperience(person.experience)].push(person);
          singles[normalizeExperience(partner.experience)].push(partner);
          processed.add(person.name);
          processed.add(partner.name);
          return;
        }
        if (!partner)
          partner = {
            name: partnerName,
            partner: "",
            experience: person.experience,
            preference: "No Preference",
            role: "Debate",
          };
        teams.push({
          id: `team-${teams.length}`,
          members: [person, partner],
          experience: normalizeExperience(person.experience),
          preference: person.preference || "No Preference",
          halfRound: person.halfRound || partner.halfRound || "",
        });
        processed.add(person.name);
        processed.add(partner.name);
      } else {
        singles[normalizeExperience(person.experience)].push(person);
        processed.add(person.name);
      }
    });
    Object.keys(singles).forEach((level) => {
      const levelSingles = singles[level];
      for (let i = 0; i < levelSingles.length - 1; i += 2) {
        teams.push({
          id: `team-${teams.length}`,
          members: [levelSingles[i], levelSingles[i + 1]],
          experience: level,
          preference: "No Preference",
          halfRound:
            levelSingles[i].halfRound || levelSingles[i + 1].halfRound || "",
        });
      }
      if (levelSingles.length % 2 === 1)
        teams.push({
          id: `team-${teams.length}`,
          members: [levelSingles[levelSingles.length - 1]],
          experience: level,
          preference: "No Preference",
          halfRound: levelSingles[levelSingles.length - 1].halfRound || "",
        });
    });
    setSpectators(allSpectators);
    return { teams, judges: judgeList };
  }, [participants]);

  const createChambers = useCallback((teams) => {
    const chamberList = [];
    const fullRoundTeams = teams.filter(
      (t) =>
        !t.halfRound || t.halfRound.toLowerCase() === "no" || t.halfRound === ""
    );
    const openingHalfTeams = teams.filter(
      (t) => t.halfRound && t.halfRound.toLowerCase().includes("opening")
    );
    const closingHalfTeams = teams.filter(
      (t) => t.halfRound && t.halfRound.toLowerCase().includes("closing")
    );
    const teamsByExperience = {
      "Returning Members": [],
      "Competitive Team Fall '25": [],
      "General Members": [],
    };
    fullRoundTeams.forEach((team) =>
      teamsByExperience[team.experience].push(team)
    );
    Object.keys(teamsByExperience).forEach((level) => {
      teamsByExperience[level] = shuffleArray(teamsByExperience[level]);
    });
    Object.keys(teamsByExperience).forEach((level) => {
      const levelTeams = teamsByExperience[level];
      while (levelTeams.length >= 4)
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: levelTeams
            .splice(0, 4)
            .map((team) => ({ ...team, position: null })),
          judges: [],
          mixed: false,
          roundType: "full",
          hasIron: false,
        });
    });
    const [remainingReturning, remainingCompetitive, remainingGeneral] = [
      teamsByExperience["Returning Members"],
      teamsByExperience["Competitive Team Fall '25"],
      teamsByExperience["General Members"],
    ];
    const mixTeams = (arr1, arr2) => {
      while (arr1.length + arr2.length >= 4) {
        const chamberTeams = [];
        while (
          chamberTeams.length < 4 &&
          (arr1.length > 0 || arr2.length > 0)
        ) {
          if (arr1.length > 0) chamberTeams.push(arr1.shift());
          if (chamberTeams.length < 4 && arr2.length > 0)
            chamberTeams.push(arr2.shift());
        }
        if (chamberTeams.length === 4)
          chamberList.push({
            id: `chamber-${chamberList.length}`,
            room: `Room ${chamberList.length + 1}`,
            teams: chamberTeams.map((team) => ({ ...team, position: null })),
            judges: [],
            mixed: true,
            roundType: "full",
            hasIron: false,
          });
      }
    };
    mixTeams(remainingCompetitive, remainingGeneral);
    mixTeams(remainingCompetitive, remainingReturning);
    mixTeams(remainingReturning, remainingGeneral);
    const allRemaining = [
      ...remainingReturning,
      ...remainingCompetitive,
      ...remainingGeneral,
    ];
    const totalPeople = allRemaining.reduce(
      (sum, team) => sum + team.members.length,
      0
    );
    if (totalPeople === IRON_SCENARIOS.FULL_ROUND_3_TEAMS)
      chamberList.push(
        createIronChamber(
          flattenTeamsToPeople(allRemaining),
          chamberList.length,
          "full"
        )
      );
    else if (totalPeople === IRON_SCENARIOS.FULL_ROUND_2_TEAMS)
      chamberList.push(
        createIronChamber(
          flattenTeamsToPeople(allRemaining),
          chamberList.length,
          "full"
        )
      );
    else if (totalPeople === IRON_SCENARIOS.HALF_ROUND_1_TEAM)
      chamberList.push(
        createIronChamber(
          flattenTeamsToPeople(allRemaining),
          chamberList.length,
          "opening"
        )
      );
    else if (totalPeople === 1)
      allRemaining.forEach((team) =>
        team.members.forEach((member) =>
          setSpectators((prev) => [...prev, member])
        )
      );
    else if (allRemaining.length > 0)
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: allRemaining.map((team) => ({ ...team, position: null })),
        judges: [],
        mixed: true,
        roundType: "full",
        hasIron: false,
      });
    const processHalfRound = (teams) => {
      const shuffled = shuffleArray(teams);
      while (shuffled.length >= 2) {
        const chamberTeams = shuffled.splice(0, 2);
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: chamberTeams.map((team) => ({ ...team, position: null })),
          judges: [],
          mixed: chamberTeams[0].experience !== chamberTeams[1].experience,
          roundType: teams === openingHalfTeams ? "opening" : "closing",
          hasIron: false,
        });
      }
      if (shuffled.length > 0)
        setSpectators((prev) => {
          const newSpectators = [...prev];
          shuffled.forEach((team) =>
            team.members.forEach((member) => newSpectators.push(member))
          );
          return newSpectators;
        });
    };
    processHalfRound(openingHalfTeams);
    processHalfRound(closingHalfTeams);
    return chamberList;
  }, []);

  const getNextPosition = useCallback(
    (debaterName, preference, chamberRoundType) => {
      const availablePositions = ROUND_TYPES[chamberRoundType].positions;
      const history = positionHistory[debaterName] || [];
      const preferenceMap = {
        "Opening Half": ["OG", "OO"],
        "Closing Half": ["CG", "CO"],
      };
      const getPreferred = () =>
        preferenceMap[preference]?.find((p) => availablePositions.includes(p));
      if (history.length === 0) return getPreferred() || availablePositions[0];
      const positionsDone = new Set(history);
      const positionsNotDone = availablePositions.filter(
        (p) => !positionsDone.has(p)
      );
      if (positionsNotDone.length === 0)
        return getPreferred() || availablePositions[0];
      let candidatePositions = positionsNotDone;
      if (preference && preferenceMap[preference]) {
        const preferred = preferenceMap[preference].filter((p) =>
          positionsNotDone.includes(p)
        );
        if (preferred.length > 0) candidatePositions = preferred;
      }
      return candidatePositions[0];
    },
    [positionHistory]
  );

  const assignPositionsInChamber = useCallback(
    (chamber) => {
      const availablePositions = ROUND_TYPES[chamber.roundType].positions;
      const takenPositions = new Set();
      chamber.teams.forEach((team) => {
        const teamPreference = team.preference;
        const member1Pos = getNextPosition(
          team.members[0].name,
          teamPreference,
          chamber.roundType
        );
        const member2Pos = team.members[1]
          ? getNextPosition(
              team.members[1].name,
              teamPreference,
              chamber.roundType
            )
          : member1Pos;
        let assignedPos = null;
        if (member1Pos === member2Pos && !takenPositions.has(member1Pos))
          assignedPos = member1Pos;
        else if (!takenPositions.has(member1Pos)) assignedPos = member1Pos;
        else if (team.members[1] && !takenPositions.has(member2Pos))
          assignedPos = member2Pos;
        if (assignedPos) {
          team.position = assignedPos;
          takenPositions.add(assignedPos);
        }
      });
      chamber.teams.forEach((team) => {
        if (!team.position) {
          const available = availablePositions.find(
            (p) => !takenPositions.has(p)
          );
          if (available) {
            team.position = available;
            takenPositions.add(available);
          }
        }
      });
      if (chamber.hasIron && chamber.ironPerson) {
        const ironPreference = chamber.ironPerson.preference || "No Preference";
        const ironPos = getNextPosition(
          chamber.ironPerson.name,
          ironPreference,
          chamber.roundType
        );
        const assignedIronPos = !takenPositions.has(ironPos)
          ? ironPos
          : availablePositions.find((p) => !takenPositions.has(p));
        if (assignedIronPos) {
          chamber.ironPosition = assignedIronPos;
          takenPositions.add(assignedIronPos);
        }
      }
      return chamber;
    },
    [getNextPosition]
  );

  const generatePairings = useCallback(() => {
    setAlerts([]);
    setSpectators([]);
    setLoading(true);
    try {
      const result = createTeams();
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
      let chamberList = createChambers(teams).map((chamber) =>
        assignPositionsInChamber(chamber)
      );
      const availableJudges = shuffleArray([...judgeList]);
      chamberList.forEach((chamber) => {
        chamber.judges = [];
        if (availableJudges.length > 0)
          chamber.judges.push(availableJudges.shift());
      });
      while (availableJudges.length > 0)
        chamberList[Math.floor(Math.random() * chamberList.length)].judges.push(
          availableJudges.shift()
        );
      chamberList.forEach((chamber) => {
        if (chamber.judges.length === 0)
          setAlerts((prev) => [
            ...prev,
            {
              type: "warning",
              message: `${chamber.room} has no judge - insufficient judges`,
            },
          ]);
      });
      const newHistory = { ...positionHistory };
      chamberList.forEach((chamber) => {
        chamber.teams.forEach((team) =>
          team.members.forEach((member) => {
            if (!newHistory[member.name]) newHistory[member.name] = [];
            newHistory[member.name].push(team.position);
          })
        );
        if (chamber.hasIron && chamber.ironPerson && chamber.ironPosition) {
          if (!newHistory[chamber.ironPerson.name])
            newHistory[chamber.ironPerson.name] = [];
          newHistory[chamber.ironPerson.name].push(chamber.ironPosition);
        }
      });
      setPositionHistory(newHistory);
      setChambers(chamberList);
      setActiveTab("chambers");
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
  }, [createTeams, createChambers, assignPositionsInChamber, positionHistory]);

  const addChamber = () =>
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

  const handleRoundTypeChange = (chamberIdx, newRoundType) => {
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
    if (unassignedCount > 0)
      setAlerts((prev) => [
        ...prev,
        {
          type: "warning",
          message: `${unassignedCount} team(s) unassigned due to round type change. See "Unassigned Teams" section to reassign them.`,
        },
      ]);
  };

  const handleDragStart = (e, dragType, data) => {
    setDraggedItem({ type: dragType, ...data });
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = (e) => {
    e.preventDefault();
    setDraggedItem(null);
    setDragOverTarget(null);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDragEnter = (e, target) => {
    e.preventDefault();
    setDragOverTarget(target);
  };
  const handleDragLeave = () => setDragOverTarget(null);

  const handleDrop = (e, dropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
    if (!draggedItem || !dropTarget?.type) {
      setDraggedItem(null);
      return;
    }
    if (
      draggedItem.type === "person" &&
      draggedItem.source === dropTarget.type &&
      draggedItem.chamberIdx === dropTarget.chamberIdx &&
      draggedItem.position === dropTarget.position
    ) {
      setDraggedItem(null);
      return;
    }
    if (
      draggedItem.type === "team" &&
      draggedItem.chamberIdx === dropTarget.chamberIdx &&
      draggedItem.position === dropTarget.position
    ) {
      setDraggedItem(null);
      return;
    }
    try {
      const newChambers = [...chambers],
        newSpectators = [...spectators];
      let newHistory = { ...positionHistory };
      const updateHistory = (personName, position) => {
        if (!position) return;
        if (!newHistory[personName]) newHistory[personName] = [];
        const lastPos =
          newHistory[personName][newHistory[personName].length - 1];
        if (lastPos !== position) newHistory[personName].push(position);
      };
      if (draggedItem.type === "person") {
        const sourcePerson = draggedItem.person;
        let replacedPerson = null,
          replacedPersonIndex = null,
          sourcePersonIndex = null;
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          const targetTeam = targetChamber.teams.find(
            (t) => t.position === dropTarget.position
          );
          if (targetTeam && targetTeam.members.length > 0) {
            if (
              targetTeam.members.length === 2 ||
              dropTarget.memberIdx !== undefined
            ) {
              const replaceIdx =
                dropTarget.memberIdx !== undefined ? dropTarget.memberIdx : 0;
              if (targetTeam.members[replaceIdx]) {
                replacedPerson = targetTeam.members[replaceIdx];
                replacedPersonIndex = replaceIdx;
                targetTeam.members.splice(replaceIdx, 1);
              }
            }
          }
        } else if (dropTarget.type === "iron") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          if (targetChamber.ironPerson) {
            replacedPerson = targetChamber.ironPerson;
            targetChamber.ironPerson = null;
          }
        }
        if (draggedItem.source === "position") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          const sourceTeam = sourceChamber.teams.find((t) =>
            t.members.some((m) => m.name === sourcePerson.name)
          );
          if (sourceTeam) {
            const memberIdx = sourceTeam.members.findIndex(
              (m) => m.name === sourcePerson.name
            );
            if (memberIdx !== -1) {
              sourcePersonIndex = memberIdx;
              sourceTeam.members.splice(memberIdx, 1);
              if (
                sourceTeam.members.length === 0 &&
                sourceTeam.position === null
              ) {
                const teamIdx = sourceChamber.teams.findIndex(
                  (t) => t.id === sourceTeam.id
                );
                sourceChamber.teams.splice(teamIdx, 1);
              }
            }
          }
        } else if (draggedItem.source === "iron")
          newChambers[draggedItem.chamberIdx].ironPerson = null;
        else if (draggedItem.source === "judge") {
          const judgeIdx = newChambers[draggedItem.chamberIdx].judges.findIndex(
            (j) => j.name === sourcePerson.name
          );
          if (judgeIdx !== -1)
            newChambers[draggedItem.chamberIdx].judges.splice(judgeIdx, 1);
        } else if (draggedItem.source === "spectator") {
          const spectatorIdx = newSpectators.findIndex(
            (s) => s.name === sourcePerson.name
          );
          if (spectatorIdx !== -1) newSpectators.splice(spectatorIdx, 1);
        }
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          let targetTeam = targetChamber.teams.find(
            (t) => t.position === dropTarget.position
          );
          if (!targetTeam) {
            targetTeam = {
              id: `team-new-${Date.now()}`,
              members: [],
              experience: sourcePerson.experience,
              position: dropTarget.position,
            };
            targetChamber.teams.push(targetTeam);
          }
          if (
            replacedPersonIndex !== null &&
            replacedPersonIndex <= targetTeam.members.length
          )
            targetTeam.members.splice(replacedPersonIndex, 0, sourcePerson);
          else targetTeam.members.push(sourcePerson);
          updateHistory(sourcePerson.name, dropTarget.position);
        } else if (dropTarget.type === "iron") {
          newChambers[dropTarget.chamberIdx].ironPerson = sourcePerson;
          updateHistory(
            sourcePerson.name,
            newChambers[dropTarget.chamberIdx].ironPosition
          );
        } else if (dropTarget.type === "judge")
          newChambers[dropTarget.chamberIdx].judges.push(sourcePerson);
        else if (dropTarget.type === "spectator")
          newSpectators.push(sourcePerson);
        if (replacedPerson) {
          if (draggedItem.source === "position") {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            let sourceTeam = sourceChamber.teams.find(
              (t) => t.position === draggedItem.position
            );
            if (!sourceTeam) {
              sourceTeam = {
                id: `team-new-${Date.now()}`,
                members: [],
                experience: replacedPerson.experience,
                position: draggedItem.position,
              };
              sourceChamber.teams.push(sourceTeam);
            }
            if (sourceTeam.members.length < 2) {
              if (
                sourcePersonIndex !== null &&
                sourcePersonIndex <= sourceTeam.members.length
              )
                sourceTeam.members.splice(sourcePersonIndex, 0, replacedPerson);
              else sourceTeam.members.push(replacedPerson);
              updateHistory(replacedPerson.name, draggedItem.position);
            } else newSpectators.push(replacedPerson);
          } else if (draggedItem.source === "iron") {
            newChambers[draggedItem.chamberIdx].ironPerson = replacedPerson;
            updateHistory(
              replacedPerson.name,
              newChambers[draggedItem.chamberIdx].ironPosition
            );
          } else if (draggedItem.source === "judge")
            newChambers[draggedItem.chamberIdx].judges.push(replacedPerson);
          else if (draggedItem.source === "spectator")
            newSpectators.push(replacedPerson);
        }
      } else if (draggedItem.type === "team") {
        const sourceTeam = draggedItem.team;
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          const targetTeam = targetChamber.teams.find(
            (t) => t.position === dropTarget.position
          );
          if (targetTeam) {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            const sourceTeamIdx = sourceChamber.teams.findIndex(
              (t) => t.id === sourceTeam.id
            );
            const targetTeamIdx = targetChamber.teams.findIndex(
              (t) => t.id === targetTeam.id
            );
            const tempTeam = sourceChamber.teams[sourceTeamIdx];
            sourceChamber.teams[sourceTeamIdx] = targetTeam;
            targetChamber.teams[targetTeamIdx] = tempTeam;
            sourceChamber.teams[sourceTeamIdx].position = draggedItem.position;
            targetChamber.teams[targetTeamIdx].position = dropTarget.position;
            sourceTeam.members.forEach((m) =>
              updateHistory(m.name, dropTarget.position)
            );
            targetTeam.members.forEach((m) =>
              updateHistory(m.name, draggedItem.position)
            );
          } else {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            const sourceTeamIdx = sourceChamber.teams.findIndex(
              (t) => t.id === sourceTeam.id
            );
            if (draggedItem.chamberIdx === dropTarget.chamberIdx)
              sourceChamber.teams[sourceTeamIdx].position = dropTarget.position;
            else {
              const [movedTeam] = sourceChamber.teams.splice(sourceTeamIdx, 1);
              movedTeam.position = dropTarget.position;
              targetChamber.teams.push(movedTeam);
            }
            sourceTeam.members.forEach((m) =>
              updateHistory(m.name, dropTarget.position)
            );
          }
        } else if (dropTarget.type === "spectator") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          const sourceTeamIdx = sourceChamber.teams.findIndex(
            (t) => t.id === sourceTeam.id
          );
          if (sourceTeamIdx !== -1) {
            sourceTeam.members.forEach((member) => newSpectators.push(member));
            sourceChamber.teams.splice(sourceTeamIdx, 1);
          }
        }
      }
      setPositionHistory(newHistory);
      setChambers(newChambers);
      setSpectators(newSpectators);
      setTimeout(() => {
        const allPeople = [],
          duplicates = new Set();
        chambers.forEach((chamber) => {
          chamber.teams.forEach((team) =>
            team.members.forEach((member) => {
              if (allPeople.includes(member.name)) duplicates.add(member.name);
              else allPeople.push(member.name);
            })
          );
          if (chamber.ironPerson) {
            if (allPeople.includes(chamber.ironPerson.name))
              duplicates.add(chamber.ironPerson.name);
            else allPeople.push(chamber.ironPerson.name);
          }
          if (chamber.judges)
            chamber.judges.forEach((judge) => {
              if (allPeople.includes(judge.name)) duplicates.add(judge.name);
              else allPeople.push(judge.name);
            });
        });
        if (duplicates.size > 0) {
          console.error("Duplicates detected:", Array.from(duplicates));
          setAlerts((prev) => [
            ...prev,
            {
              type: "error",
              message: `Duplicate people detected: ${Array.from(
                duplicates
              ).join(", ")}. Please refresh the page.`,
            },
          ]);
        }
      }, 100);
    } catch (error) {
      console.error("Drop error:", error);
      setAlerts((prev) => [
        ...prev,
        {
          type: "error",
          message: "Error during drag and drop. Please try again.",
        },
      ]);
    } finally {
      setDraggedItem(null);
      setDragOverTarget(null);
    }
  };

  const exportToCSV = () => {
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
          const member1 = team.members[0]?.name.replace(/,/g, " ") || "",
            member2 = team.members[1]?.name.replace(/,/g, " ") || "";
          csv += `${sessionDate},${chamber.room},${
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
  };

  const exportHistory = () => {
    let csv = "Debater,Position History (Oldest to Newest)\n";
    Object.entries(positionHistory).forEach(
      ([name, history]) =>
        (csv += `${name.replace(/,/g, " ")},"${history.join(" → ")}"\n`)
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `position-history-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const clearHistory = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all position history? This cannot be undone."
      )
    ) {
      setPositionHistory({});
      setAlerts([{ type: "success", message: "Position history cleared" }]);
    }
  };
  const updateRoomName = (chamberIdx, newName) => {
    const newChambers = [...chambers];
    newChambers[chamberIdx].room = newName;
    setChambers(newChambers);
  };

  const renderPositionBox = (chamber, chamberIdx, pos) => {
    const team = chamber.teams.find((t) => t.position === pos);
    const isDropZone =
      dragOverTarget?.type === "position" &&
      dragOverTarget.chamberIdx === chamberIdx &&
      dragOverTarget.position === pos;
    return (
      <div
        key={pos}
        className={`border rounded-lg p-4 transition-all ${
          isDropZone ? "bg-blue-100 border-blue-400 border-2" : "bg-gray-50"
        }`}
        onDragOver={handleDragOver}
        onDragEnter={(e) =>
          handleDragEnter(e, { type: "position", chamberIdx, position: pos })
        }
        onDragLeave={handleDragLeave}
        onDrop={(e) =>
          handleDrop(e, { type: "position", chamberIdx, position: pos })
        }
      >
        <div className="font-medium text-sm text-gray-600 mb-2">
          {POSITION_NAMES[pos]}
        </div>
        {team && team.members.length > 0 ? (
          <div className="bg-white rounded p-2 border border-gray-200">
            <div
              draggable
              onDragStart={(e) =>
                handleDragStart(e, "team", { team, chamberIdx, position: pos })
              }
              onDragEnd={handleDragEnd}
              className="cursor-move flex items-center justify-center mb-2 pb-2 border-b hover:bg-gray-50 p-1 rounded"
            >
              <GripVertical className="w-5 h-5 text-blue-500 flex-shrink-0" />
            </div>
            {team.members.map((member, memberIdx) => {
              const isHovered =
                dragOverTarget?.type === "position" &&
                dragOverTarget.chamberIdx === chamberIdx &&
                dragOverTarget.position === pos &&
                dragOverTarget.memberIdx === memberIdx;
              return (
                <div
                  key={member.name}
                  className={`flex items-start gap-2 py-1 px-2 rounded transition-colors ${
                    isHovered ? "bg-red-100" : "hover:bg-gray-50"
                  }`}
                  onDragEnter={(e) => {
                    e.stopPropagation();
                    handleDragEnter(e, {
                      type: "position",
                      chamberIdx,
                      position: pos,
                      memberIdx,
                    });
                  }}
                >
                  <div
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      handleDragStart(e, "person", {
                        person: member,
                        source: "position",
                        chamberIdx,
                        position: pos,
                      });
                    }}
                    onDragEnd={handleDragEnd}
                    className="cursor-move"
                  >
                    <GripVertical className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {member.name}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-gray-500 mt-2">{team.experience}</div>
          </div>
        ) : (
          <div className="text-gray-400 italic text-center py-2">
            Empty - drag people here
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Trojan Debate Society Pairings
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Session: {sessionDate}
            </span>
            <input
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="px-3 py-1 border rounded-md"
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Position history is automatically saved across sessions
          </p>
        </div>

        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
              alert.type === "error"
                ? "bg-red-50 text-red-800"
                : alert.type === "warning"
                ? "bg-yellow-50 text-yellow-800"
                : "bg-green-50 text-green-800"
            }`}
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{alert.message}</span>
            <button
              onClick={() => setAlerts(alerts.filter((_, i) => i !== idx))}
              className="flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b">
            <div className="flex gap-1 p-1">
              {["input", "chambers", "history"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md font-medium capitalize transition ${
                    activeTab === tab
                      ? "bg-blue-500 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab === "input" ? "Data Input" : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "input" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    BP Pairings System
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>
                      • <strong>Inputs:</strong> The Experience Level input is
                      mandatory
                    </li>
                    <li>
                      • <strong>Rooms:</strong> You can edit rooms in the
                      Chambers tab
                    </li>
                    <li>
                      • <strong>Iron Position:</strong> When there are 7 people
                      (3 teams + 1), the 7th person "irons" - debates both
                      speeches for their side
                    </li>
                    <li>
                      • <strong>Dragging:</strong> Drag individuals or whole
                      teams between positions. Hover to highlight swap targets
                    </li>
                  </ul>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5" />
                    Import Data
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload CSV File
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLoading(true);
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              const csvText = event.target?.result;
                              if (typeof csvText === "string")
                                handleManualInput(csvText);
                              setLoading(false);
                            };
                            reader.onerror = () => {
                              setAlerts([
                                {
                                  type: "error",
                                  message: "Failed to read CSV file",
                                },
                              ]);
                              setLoading(false);
                            };
                            reader.readAsText(file);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Format: Name, Partner (blank if none), Experience Level,
                        Preference, Half Round? (Opening Half/Closing
                        Half/blank), Role (Debate/Debating, Judge/Judging, or
                        Spectate/Spectating)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600">
                    {participants.length > 0 && (
                      <span>{participants.length} participants loaded</span>
                    )}
                  </div>
                  <button
                    onClick={generatePairings}
                    disabled={participants.length === 0 || loading}
                    className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Generate Pairings
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {activeTab === "chambers" && (
              <div className="space-y-6">
                {chambers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No chambers created. Load data and generate pairings.</p>
                    <button
                      onClick={addChamber}
                      className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 mx-auto"
                    >
                      <Users className="w-4 h-4" />
                      Add Chamber
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <div className="flex justify-between items-center">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="font-semibold text-blue-900">
                              Chambers:
                            </span>
                            <span className="ml-2 text-blue-700">
                              {chambers.length}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-900">
                              Teams:
                            </span>
                            <span className="ml-2 text-blue-700">
                              {chambers.reduce(
                                (sum, c) => sum + c.teams.length,
                                0
                              )}
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-900">
                              Judges:
                            </span>
                            <span className="ml-2 text-blue-700">
                              {chambers.reduce(
                                (sum, c) => sum + (c.judges?.length || 0),
                                0
                              )}{" "}
                              total
                            </span>
                          </div>
                          <div>
                            <span className="font-semibold text-blue-900">
                              Spectators:
                            </span>
                            <span className="ml-2 text-blue-700">
                              {spectators.length}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={addChamber}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
                        >
                          <Users className="w-4 h-4" />
                          Add Chamber
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold">
                        Chamber Assignments
                      </h3>
                      <button
                        onClick={exportToCSV}
                        className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Export CSV
                      </button>
                    </div>

                    {chambers.map((chamber, chamberIdx) => (
                      <div
                        key={chamber.id}
                        className="border rounded-lg p-6 bg-white"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <input
                              type="text"
                              value={chamber.room}
                              onChange={(e) =>
                                updateRoomName(chamberIdx, e.target.value)
                              }
                              className="text-xl font-semibold px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
                              placeholder="Room name/number"
                            />
                            <select
                              value={chamber.roundType}
                              onChange={(e) =>
                                handleRoundTypeChange(
                                  chamberIdx,
                                  e.target.value
                                )
                              }
                              className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            >
                              <option value="full">Full Round</option>
                              <option value="opening">Opening Half Only</option>
                              <option value="closing">Closing Half Only</option>
                            </select>
                            {chamber.hasIron && (
                              <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded">
                                Iron
                              </span>
                            )}
                          </div>
                          {chamber.mixed && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">
                              Mixed Experience
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h5 className="font-medium text-gray-700">
                              Government
                            </h5>
                            {ROUND_TYPES[chamber.roundType].positions
                              .filter((p) => p.includes("G"))
                              .map((pos) =>
                                renderPositionBox(chamber, chamberIdx, pos)
                              )}
                          </div>
                          <div className="space-y-4">
                            <h5 className="font-medium text-gray-700">
                              Opposition
                            </h5>
                            {ROUND_TYPES[chamber.roundType].positions
                              .filter(
                                (p) => p.includes("O") && !p.includes("G")
                              )
                              .map((pos) =>
                                renderPositionBox(chamber, chamberIdx, pos)
                              )}
                          </div>
                        </div>

                        {chamber.hasIron && chamber.ironPerson && (
                          <div
                            className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                            onDragOver={handleDragOver}
                            onDragEnter={(e) =>
                              handleDragEnter(e, { type: "iron", chamberIdx })
                            }
                            onDragLeave={handleDragLeave}
                            onDrop={(e) =>
                              handleDrop(e, { type: "iron", chamberIdx })
                            }
                          >
                            <div className="flex items-center gap-2">
                              <div
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(e, "person", {
                                    person: chamber.ironPerson,
                                    source: "iron",
                                    chamberIdx,
                                    position: chamber.ironPosition,
                                  })
                                }
                                onDragEnd={handleDragEnd}
                                className="cursor-move"
                              >
                                <GripVertical className="w-4 h-4 text-yellow-700" />
                              </div>
                              <span className="font-semibold text-yellow-900">
                                Iron Position:
                              </span>
                              <span className="text-yellow-800">
                                {chamber.ironPerson.name}
                              </span>
                              <span className="px-2 py-1 bg-yellow-200 text-yellow-900 text-xs rounded">
                                {POSITION_NAMES[chamber.ironPosition]} (Both
                                Speeches)
                              </span>
                            </div>
                          </div>
                        )}

                        {chamber.teams.filter((t) => !t.position).length >
                          0 && (
                          <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <h5 className="font-semibold text-orange-900 mb-2">
                              Unassigned Teams (
                              {chamber.teams.filter((t) => !t.position).length})
                            </h5>
                            <p className="text-xs text-orange-700 mb-3">
                              These teams have invalid positions for the current
                              round type. Drag them to valid positions or to
                              spectators.
                            </p>
                            <div className="space-y-2">
                              {chamber.teams
                                .filter((t) => !t.position)
                                .map((team) => (
                                  <div
                                    key={team.id}
                                    className="bg-white rounded p-2 border border-orange-300"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <div
                                        draggable
                                        onDragStart={(e) =>
                                          handleDragStart(e, "team", {
                                            team,
                                            chamberIdx,
                                            position: null,
                                          })
                                        }
                                        onDragEnd={handleDragEnd}
                                        className="cursor-move"
                                      >
                                        <GripVertical className="w-4 h-4 text-orange-600" />
                                      </div>
                                      <span className="text-xs font-medium text-orange-800">
                                        Unassigned Team
                                      </span>
                                    </div>
                                    {team.members.map((member) => (
                                      <div
                                        key={member.name}
                                        className="flex items-center gap-2 py-1"
                                      >
                                        <div
                                          draggable
                                          onDragStart={(e) => {
                                            e.stopPropagation();
                                            handleDragStart(e, "person", {
                                              person: member,
                                              source: "position",
                                              chamberIdx,
                                              position: null,
                                            });
                                          }}
                                          onDragEnd={handleDragEnd}
                                          className="cursor-move"
                                        >
                                          <GripVertical className="w-3 h-3 text-gray-400" />
                                        </div>
                                        <span className="text-sm">
                                          {member.name}
                                        </span>
                                      </div>
                                    ))}
                                    <div className="text-xs text-gray-500 mt-1">
                                      {team.experience}
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}

                        <div
                          className="mt-4 pt-4 border-t"
                          onDragOver={handleDragOver}
                          onDragEnter={(e) =>
                            handleDragEnter(e, { type: "judge", chamberIdx })
                          }
                          onDragLeave={handleDragLeave}
                          onDrop={(e) =>
                            handleDrop(e, { type: "judge", chamberIdx })
                          }
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">Judges:</span>
                            {chamber.judges?.length > 0 ? (
                              chamber.judges.map((judge, judgeIdx) => (
                                <div
                                  key={`${judge.name}-${judgeIdx}`}
                                  draggable
                                  onDragStart={(e) =>
                                    handleDragStart(e, "person", {
                                      person: judge,
                                      source: "judge",
                                      chamberIdx,
                                    })
                                  }
                                  onDragEnd={handleDragEnd}
                                  className="cursor-move flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded hover:shadow-md transition-shadow"
                                >
                                  <GripVertical className="w-3 h-3 text-gray-400" />
                                  <span>{judge.name}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-gray-400 italic">
                                Drop someone here to assign judge
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={addChamber}
                      className="w-full px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 font-medium"
                    >
                      <Users className="w-4 h-4" />
                      Add Chamber
                    </button>

                    <div
                      className="border rounded-lg p-6 bg-gray-50"
                      onDragOver={handleDragOver}
                      onDragEnter={(e) =>
                        handleDragEnter(e, { type: "spectator" })
                      }
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, { type: "spectator" })}
                    >
                      <h4 className="text-lg font-semibold mb-3">
                        Spectators ({spectators.length})
                      </h4>
                      {spectators.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {spectators.map((person, idx) => (
                            <div
                              key={idx}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, "person", {
                                  person,
                                  source: "spectator",
                                })
                              }
                              onDragEnd={handleDragEnd}
                              className="px-3 py-1 bg-white rounded-full text-sm border cursor-move hover:shadow-md transition-shadow flex items-center gap-1"
                            >
                              <GripVertical className="w-3 h-3 text-gray-400" />
                              <span>{person.name || person}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-400 italic text-center py-4">
                          No spectators - drag someone here to make them
                          spectate
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Position History</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={exportHistory}
                      disabled={Object.keys(positionHistory).length === 0}
                      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Export History
                    </button>
                    <button
                      onClick={clearHistory}
                      disabled={Object.keys(positionHistory).length === 0}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear History
                    </button>
                  </div>
                </div>
                {Object.keys(positionHistory).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No position history available yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Debater
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Position History
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Next Position
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {Object.entries(positionHistory).map(
                          ([name, history]) => (
                            <tr key={name}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                {name}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="flex gap-2 flex-wrap">
                                  {history.map((pos, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                                    >
                                      {pos}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                  {getNextPosition(
                                    name,
                                    "No Preference",
                                    "full"
                                  )}
                                </span>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
