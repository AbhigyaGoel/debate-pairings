import React, { useState, useCallback, useMemo } from "react";
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
  Eye,
} from "lucide-react";

const EXPERIENCE_LEVELS = [
  "Returning Members",
  "Competitive Team Fall '25",
  "General Members",
];

// Iron position configuration
const IRON_SCENARIOS = {
  FULL_ROUND_3_TEAMS: 7, // 3 teams (6 people) + 1 iron
  FULL_ROUND_2_TEAMS: 5, // 2 teams (4 people) + 1 iron
  HALF_ROUND_1_TEAM: 3, // 1 team (2 people) + 1 iron
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

// Utility Functions
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

const normalizeExperience = (experience) =>
  experience === "General Member" ? "General Members" : experience;

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
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
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

  // Auto-scroll when dragging near edges
  React.useEffect(() => {
    if (!draggedItem) {
      return;
    }

    let animationFrameId = null;
    let currentMouseY = null;

    const scroll = () => {
      if (currentMouseY === null) {
        animationFrameId = null;
        return;
      }

      const SCROLL_ZONE = 200;
      const MAX_SPEED = 15;
      const viewportHeight = window.innerHeight;

      let speed = 0;

      if (currentMouseY < SCROLL_ZONE) {
        const ratio = 1 - currentMouseY / SCROLL_ZONE;
        speed = -MAX_SPEED * ratio;
      } else if (currentMouseY > viewportHeight - SCROLL_ZONE) {
        const ratio =
          (currentMouseY - (viewportHeight - SCROLL_ZONE)) / SCROLL_ZONE;
        speed = MAX_SPEED * ratio;
      }

      if (speed !== 0) {
        window.scrollBy(0, speed);
      }

      animationFrameId = requestAnimationFrame(scroll);
    };

    const handleDrag = (e) => {
      // drag event fires continuously during drag
      if (e.clientY !== 0) {
        // clientY is 0 at the end of drag, ignore that
        currentMouseY = e.clientY;

        if (!animationFrameId) {
          animationFrameId = requestAnimationFrame(scroll);
        }
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
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [draggedItem]);

  const parseCSVData = (csvText) => {
    const lines = csvText
      .trim()
      .split("\n")
      .filter((line) => line.trim());
    if (lines.length === 0) return [];

    const headers = parseCSVLine(lines[0]);
    const data = [];
    const skipped = [];

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

        if (headerLower === "name") {
          row.name = value;
        } else if (headerLower.includes("partner")) {
          row.partner = value;
        } else if (headerLower.includes("experience")) {
          row.experience = value;
        } else if (headerLower.includes("preference")) {
          row.preference = value || "No Preference";
        } else if (
          headerLower.includes("half") &&
          headerLower.includes("round")
        ) {
          row.halfRound = value || "";
        } else if (headerLower === "role") {
          row.role = value || "Debate";
        }
      });

      if (row.experience === "General Member") {
        row.experience = "General Members";
      }

      if (row.name && row.experience) {
        const validExperience = EXPERIENCE_LEVELS.includes(row.experience);
        if (validExperience) {
          data.push(row);
        } else {
          skipped.push(`${row.name} (invalid experience: "${row.experience}")`);
        }
      } else if (row.name) {
        skipped.push(`${row.name} (missing experience level)`);
      }
    }

    if (skipped.length > 0) {
      setAlerts((prev) => [
        ...prev,
        {
          type: "warning",
          message: `Skipped ${skipped.length} entries: ${skipped.join(", ")}`,
        },
      ]);
    }

    return data;
  };

  const handleManualInput = (csvText) => {
    if (!csvText || !csvText.trim()) {
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

      const debaters = data.filter(isDebater);
      const judges = filterByRole(data, "judg");
      const spectators = filterByRole(data, "spectat");

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
    const teams = [];
    const processed = new Set();
    const singles = {
      "Returning Members": [],
      "Competitive Team Fall '25": [],
      "General Members": [],
    };

    const judgeList = filterByRole(participants, "judg");
    const explicitSpectators = filterByRole(participants, "spectat");
    const debaters = participants.filter(isDebater);

    const spectatorNames = new Set();
    explicitSpectators.forEach((s) => spectatorNames.add(s.name));

    let changed = true;
    let iterations = 0;
    while (changed && iterations < MAX_SPECTATOR_PROPAGATION_ITERATIONS) {
      changed = false;
      iterations++;

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

        if (!partner) {
          partner = {
            name: partnerName,
            partner: "",
            experience: person.experience,
            preference: "No Preference",
            role: "Debate",
          };
        }

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

    const newSpectators = allSpectators;
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

      // Keep odd person as a 1-person team for potential iron position
      if (levelSingles.length % 2 === 1) {
        teams.push({
          id: `team-${teams.length}`,
          members: [levelSingles[levelSingles.length - 1]],
          experience: level,
          preference: "No Preference",
          halfRound: levelSingles[levelSingles.length - 1].halfRound || "",
        });
      }
    });

    setSpectators(newSpectators);
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

    fullRoundTeams.forEach((team) => {
      teamsByExperience[team.experience].push(team);
    });

    Object.keys(teamsByExperience).forEach((level) => {
      const levelTeams = shuffleArray(teamsByExperience[level]);
      teamsByExperience[level] = levelTeams;
    });

    Object.keys(teamsByExperience).forEach((level) => {
      const levelTeams = teamsByExperience[level];
      while (levelTeams.length >= 4) {
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: levelTeams.splice(0, 4).map((team) => ({
            ...team,
            position: null,
          })),
          judges: [],
          mixed: false,
          roundType: "full",
          hasIron: false,
        });
      }
    });

    const remainingReturning = teamsByExperience["Returning Members"];
    const remainingCompetitive = teamsByExperience["Competitive Team Fall '25"];
    const remainingGeneral = teamsByExperience["General Members"];

    while (remainingCompetitive.length + remainingGeneral.length >= 4) {
      const chamberTeams = [];
      while (
        chamberTeams.length < 4 &&
        (remainingCompetitive.length > 0 || remainingGeneral.length > 0)
      ) {
        if (remainingCompetitive.length > 0) {
          chamberTeams.push(remainingCompetitive.shift());
        }
        if (chamberTeams.length < 4 && remainingGeneral.length > 0) {
          chamberTeams.push(remainingGeneral.shift());
        }
      }
      if (chamberTeams.length === 4) {
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: chamberTeams.map((team) => ({
            ...team,
            position: null,
          })),
          judges: [],
          mixed: true,
          roundType: "full",
          hasIron: false,
        });
      }
    }

    while (remainingCompetitive.length + remainingReturning.length >= 4) {
      const chamberTeams = [];
      while (
        chamberTeams.length < 4 &&
        (remainingCompetitive.length > 0 || remainingReturning.length > 0)
      ) {
        if (remainingCompetitive.length > 0) {
          chamberTeams.push(remainingCompetitive.shift());
        }
        if (chamberTeams.length < 4 && remainingReturning.length > 0) {
          chamberTeams.push(remainingReturning.shift());
        }
      }
      if (chamberTeams.length === 4) {
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: chamberTeams.map((team) => ({
            ...team,
            position: null,
          })),
          judges: [],
          mixed: true,
          roundType: "full",
          hasIron: false,
        });
      }
    }

    while (remainingReturning.length + remainingGeneral.length >= 4) {
      const chamberTeams = [];
      while (
        chamberTeams.length < 4 &&
        (remainingReturning.length > 0 || remainingGeneral.length > 0)
      ) {
        if (remainingReturning.length > 0) {
          chamberTeams.push(remainingReturning.shift());
        }
        if (chamberTeams.length < 4 && remainingGeneral.length > 0) {
          chamberTeams.push(remainingGeneral.shift());
        }
      }
      if (chamberTeams.length === 4) {
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: chamberTeams.map((team) => ({
            ...team,
            position: null,
          })),
          judges: [],
          mixed: true,
          roundType: "full",
          hasIron: false,
        });
      }
    }

    const allRemaining = [
      ...remainingReturning,
      ...remainingCompetitive,
      ...remainingGeneral,
    ];

    // Count total PEOPLE not team objects
    const totalPeople = allRemaining.reduce(
      (sum, team) => sum + team.members.length,
      0
    );

    // Handle various odd-number scenarios for iron positions
    if (totalPeople === IRON_SCENARIOS.FULL_ROUND_3_TEAMS) {
      // 7 people = 3 teams + 1 iron (full round)
      const allPeople = flattenTeamsToPeople(allRemaining);
      chamberList.push(
        createIronChamber(allPeople, chamberList.length, "full")
      );
    } else if (totalPeople === IRON_SCENARIOS.FULL_ROUND_2_TEAMS) {
      // 5 people = 2 teams + 1 iron (full round)
      const allPeople = flattenTeamsToPeople(allRemaining);
      chamberList.push(
        createIronChamber(allPeople, chamberList.length, "full")
      );
    } else if (totalPeople === IRON_SCENARIOS.HALF_ROUND_1_TEAM) {
      // 3 people = 1 team + 1 iron (half round)
      const allPeople = flattenTeamsToPeople(allRemaining);
      chamberList.push(
        createIronChamber(allPeople, chamberList.length, "opening")
      );
    } else if (totalPeople === 1) {
      // Single person left - send to spectators
      allRemaining.forEach((team) => {
        team.members.forEach((member) => {
          setSpectators((prev) => [...prev, member]);
        });
      });
    } else if (allRemaining.length > 0) {
      // Even number of people or other scenarios - create regular chamber
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: allRemaining.map((team) => ({
          ...team,
          position: null,
        })),
        judges: [],
        mixed: true,
        roundType: "full",
        hasIron: false,
      });
    }

    const shuffledOpening = shuffleArray(openingHalfTeams);
    while (shuffledOpening.length >= 2) {
      const chamberTeams = shuffledOpening.splice(0, 2);
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: chamberTeams.map((team) => ({
          ...team,
          position: null,
        })),
        judges: [],
        mixed: chamberTeams[0].experience !== chamberTeams[1].experience,
        roundType: "opening",
        hasIron: false,
      });
    }

    const shuffledClosing = shuffleArray(closingHalfTeams);
    while (shuffledClosing.length >= 2) {
      const chamberTeams = shuffledClosing.splice(0, 2);
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: chamberTeams.map((team) => ({
          ...team,
          position: null,
        })),
        judges: [],
        mixed: chamberTeams[0].experience !== chamberTeams[1].experience,
        roundType: "closing",
        hasIron: false,
      });
    }

    if (shuffledOpening.length > 0) {
      setSpectators((prev) => {
        const newSpectators = [...prev];
        shuffledOpening.forEach((team) => {
          team.members.forEach((member) => newSpectators.push(member));
        });
        return newSpectators;
      });
    }

    if (shuffledClosing.length > 0) {
      setSpectators((prev) => {
        const newSpectators = [...prev];
        shuffledClosing.forEach((team) => {
          team.members.forEach((member) => newSpectators.push(member));
        });
        return newSpectators;
      });
    }

    return chamberList;
  }, []);

  const getNextPosition = useCallback(
    (debaterName, preference, chamberRoundType) => {
      const availablePositions = ROUND_TYPES[chamberRoundType].positions;
      const history = positionHistory[debaterName] || [];

      if (history.length === 0) {
        if (preference === "Opening Half" && availablePositions.includes("OG"))
          return "OG";
        if (preference === "Opening Half" && availablePositions.includes("OO"))
          return "OO";
        if (preference === "Closing Half" && availablePositions.includes("CG"))
          return "CG";
        if (preference === "Closing Half" && availablePositions.includes("CO"))
          return "CO";
        return availablePositions[0];
      }

      const positionsDone = new Set(history);
      const positionsNotDone = availablePositions.filter(
        (p) => !positionsDone.has(p)
      );

      if (positionsNotDone.length === 0) {
        if (preference === "Opening Half" && availablePositions.includes("OG"))
          return "OG";
        if (preference === "Opening Half" && availablePositions.includes("OO"))
          return "OO";
        if (preference === "Closing Half" && availablePositions.includes("CG"))
          return "CG";
        if (preference === "Closing Half" && availablePositions.includes("CO"))
          return "CO";
        return availablePositions[0];
      }

      let candidatePositions = positionsNotDone;
      if (preference === "Opening Half") {
        const opening = ["OG", "OO"].filter((p) =>
          positionsNotDone.includes(p)
        );
        if (opening.length > 0) candidatePositions = opening;
      } else if (preference === "Closing Half") {
        const closing = ["CG", "CO"].filter((p) =>
          positionsNotDone.includes(p)
        );
        if (closing.length > 0) candidatePositions = closing;
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

        if (member1Pos === member2Pos && !takenPositions.has(member1Pos)) {
          assignedPos = member1Pos;
        } else if (!takenPositions.has(member1Pos)) {
          assignedPos = member1Pos;
        } else if (team.members[1] && !takenPositions.has(member2Pos)) {
          assignedPos = member2Pos;
        }

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

        let assignedIronPos = null;
        if (!takenPositions.has(ironPos)) {
          assignedIronPos = ironPos;
        } else {
          assignedIronPos = availablePositions.find(
            (p) => !takenPositions.has(p)
          );
        }

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

      if (!result || !result.teams) {
        setAlerts([{ type: "error", message: "Failed to create teams" }]);
        setLoading(false);
        return;
      }

      const teams = result.teams;
      const judgeList = result.judges || [];

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

      let chamberList = createChambers(teams);
      chamberList = chamberList.map((chamber) =>
        assignPositionsInChamber(chamber)
      );

      const availableJudges = shuffleArray([...judgeList]);

      // Distribute judges: if more judges than chambers, some get 2
      chamberList.forEach((chamber) => {
        chamber.judges = [];
        if (availableJudges.length > 0) {
          chamber.judges.push(availableJudges.shift());
        }
      });

      // Distribute remaining judges randomly
      while (availableJudges.length > 0) {
        const randomChamberIdx = Math.floor(Math.random() * chamberList.length);
        chamberList[randomChamberIdx].judges.push(availableJudges.shift());
      }

      // Alert if any chamber has no judges
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

      const newHistory = { ...positionHistory };
      chamberList.forEach((chamber) => {
        chamber.teams.forEach((team) => {
          team.members.forEach((member) => {
            if (!newHistory[member.name]) {
              newHistory[member.name] = [];
            }
            newHistory[member.name].push(team.position);
          });
        });
        if (chamber.hasIron && chamber.ironPerson && chamber.ironPosition) {
          if (!newHistory[chamber.ironPerson.name]) {
            newHistory[chamber.ironPerson.name] = [];
          }
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

  const addChamber = () => {
    const newChamber = {
      id: `chamber-${Date.now()}`,
      room: `Room ${chambers.length + 1}`,
      teams: [],
      judges: [],
      mixed: false,
      roundType: "full",
      hasIron: false,
      ironPerson: null,
    };
    setChambers([...chambers, newChamber]);
  };

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

    if (unassignedCount > 0) {
      setAlerts((prev) => [
        ...prev,
        {
          type: "warning",
          message: `${unassignedCount} team(s) unassigned due to round type change. See "Unassigned Teams" section to reassign them.`,
        },
      ]);
    }
  };

  const handleDragStart = (e, dragType, data) => {
    setDraggedItem({ type: dragType, ...data });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e) => {
    // Prevent default to avoid any browser default drag behavior
    e.preventDefault();

    // Always clear drag state
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

  const handleDragLeave = () => {
    setDragOverTarget(null);
  };

  const handleDrop = (e, dropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    if (!draggedItem) return;

    // Validate that we have a valid drop target
    if (!dropTarget || !dropTarget.type) {
      setDraggedItem(null);
      return;
    }

    // Check if dropping in the same location (no-op)
    if (draggedItem.type === "person") {
      if (
        draggedItem.source === dropTarget.type &&
        draggedItem.chamberIdx === dropTarget.chamberIdx &&
        draggedItem.position === dropTarget.position
      ) {
        setDraggedItem(null);
        return;
      }
    } else if (draggedItem.type === "team") {
      if (
        draggedItem.chamberIdx === dropTarget.chamberIdx &&
        draggedItem.position === dropTarget.position
      ) {
        setDraggedItem(null);
        return;
      }
    }

    try {
      const newChambers = [...chambers];
      const newSpectators = [...spectators];
      let newHistory = { ...positionHistory };

      const updateHistory = (personName, position) => {
        if (!position) return; // Don't track null positions
        if (!newHistory[personName]) {
          newHistory[personName] = [];
        }
        const lastPos =
          newHistory[personName][newHistory[personName].length - 1];
        if (lastPos !== position) {
          newHistory[personName].push(position);
        }
      };

      if (draggedItem.type === "person") {
        const sourcePerson = draggedItem.person;
        let replacedPerson = null;
        let replacedPersonIndex = null;
        let sourcePersonIndex = null;

        // Step 1: Identify and remove the person being replaced at target
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          const targetTeam = targetChamber.teams.find(
            (t) => t.position === dropTarget.position
          );

          // Only replace if team is full (2 members) OR if memberIdx is specified
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
            // If team has 1 member and no specific memberIdx, don't replace - just add
          }
        } else if (dropTarget.type === "iron") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          if (targetChamber.ironPerson) {
            replacedPerson = targetChamber.ironPerson;
            targetChamber.ironPerson = null;
          }
        } else if (dropTarget.type === "judge") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          // For judges, just add to the array (no replacement)
          replacedPerson = null;
        } else if (dropTarget.type === "spectator") {
          // Dragging to spectators - no one is replaced
          replacedPerson = null;
        }

        // Step 2: Remove source person from their original location and remember their index
        if (draggedItem.source === "position") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          // Find team by checking all members, not just position (handles unassigned teams)
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
              // Remove unassigned teams when they become empty
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
        } else if (draggedItem.source === "iron") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          sourceChamber.ironPerson = null;
        } else if (draggedItem.source === "judge") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          const judgeIdx = sourceChamber.judges.findIndex(
            (j) => j.name === sourcePerson.name
          );
          if (judgeIdx !== -1) {
            sourceChamber.judges.splice(judgeIdx, 1);
          }
        } else if (draggedItem.source === "spectator") {
          const spectatorIdx = newSpectators.findIndex(
            (s) => s.name === sourcePerson.name
          );
          if (spectatorIdx !== -1) {
            newSpectators.splice(spectatorIdx, 1);
          }
        }

        // Step 3: Place source person at target location (at the same index where replaced person was)
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          let targetTeam = targetChamber.teams.find(
            (t) => t.position === dropTarget.position
          );

          if (!targetTeam) {
            // Create new team if position is empty
            targetTeam = {
              id: `team-new-${Date.now()}`,
              members: [],
              experience: sourcePerson.experience,
              position: dropTarget.position,
            };
            targetChamber.teams.push(targetTeam);
          }

          // Insert at the same index where we removed the person, or at the end
          if (
            replacedPersonIndex !== null &&
            replacedPersonIndex <= targetTeam.members.length
          ) {
            targetTeam.members.splice(replacedPersonIndex, 0, sourcePerson);
          } else {
            targetTeam.members.push(sourcePerson);
          }
          updateHistory(sourcePerson.name, dropTarget.position);
        } else if (dropTarget.type === "iron") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          targetChamber.ironPerson = sourcePerson;
          updateHistory(sourcePerson.name, targetChamber.ironPosition);
        } else if (dropTarget.type === "judge") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          targetChamber.judges.push(sourcePerson);
        } else if (dropTarget.type === "spectator") {
          newSpectators.push(sourcePerson);
        }

        // Step 4: Place replaced person at source location (SWAP) at the same index
        if (replacedPerson) {
          if (draggedItem.source === "position") {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            let sourceTeam = sourceChamber.teams.find(
              (t) => t.position === draggedItem.position
            );

            if (!sourceTeam) {
              // Create new team at source position
              sourceTeam = {
                id: `team-new-${Date.now()}`,
                members: [],
                experience: replacedPerson.experience,
                position: draggedItem.position,
              };
              sourceChamber.teams.push(sourceTeam);
            }

            // Only add if team has space (less than 2 members)
            if (sourceTeam.members.length < 2) {
              // Insert at the same index where we removed the source person, or at the end
              if (
                sourcePersonIndex !== null &&
                sourcePersonIndex <= sourceTeam.members.length
              ) {
                sourceTeam.members.splice(sourcePersonIndex, 0, replacedPerson);
              } else {
                sourceTeam.members.push(replacedPerson);
              }
              updateHistory(replacedPerson.name, draggedItem.position);
            } else {
              // Team is full, send replaced person to spectators
              newSpectators.push(replacedPerson);
            }
          } else if (draggedItem.source === "iron") {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            sourceChamber.ironPerson = replacedPerson;
            updateHistory(replacedPerson.name, sourceChamber.ironPosition);
          } else if (draggedItem.source === "judge") {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            sourceChamber.judges.push(replacedPerson);
          } else if (draggedItem.source === "spectator") {
            newSpectators.push(replacedPerson);
          }
        }
      } else if (draggedItem.type === "team") {
        const sourceTeam = draggedItem.team;

        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          const targetTeam = targetChamber.teams.find(
            (t) => t.position === dropTarget.position
          );

          if (targetTeam) {
            // Swap teams
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
            // Move to empty position
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            const sourceTeamIdx = sourceChamber.teams.findIndex(
              (t) => t.id === sourceTeam.id
            );

            // If moving within same chamber, just update position
            if (draggedItem.chamberIdx === dropTarget.chamberIdx) {
              sourceChamber.teams[sourceTeamIdx].position = dropTarget.position;
            } else {
              // Moving to different chamber
              const [movedTeam] = sourceChamber.teams.splice(sourceTeamIdx, 1);
              movedTeam.position = dropTarget.position;
              targetChamber.teams.push(movedTeam);
            }

            sourceTeam.members.forEach((m) =>
              updateHistory(m.name, dropTarget.position)
            );
          }
        } else if (dropTarget.type === "spectator") {
          // Move all team members to spectators
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          const sourceTeamIdx = sourceChamber.teams.findIndex(
            (t) => t.id === sourceTeam.id
          );

          if (sourceTeamIdx !== -1) {
            sourceTeam.members.forEach((member) => {
              newSpectators.push(member);
            });
            // Remove the team
            sourceChamber.teams.splice(sourceTeamIdx, 1);
          }
        }
      }

      setPositionHistory(newHistory);
      setChambers(newChambers);
      setSpectators(newSpectators);

      // Validate no duplicates exist (safety check)
      setTimeout(() => {
        const allPeople = [];
        const duplicates = new Set();

        chambers.forEach((chamber) => {
          chamber.teams.forEach((team) => {
            team.members.forEach((member) => {
              if (allPeople.includes(member.name)) {
                duplicates.add(member.name);
              } else {
                allPeople.push(member.name);
              }
            });
          });
          if (chamber.ironPerson) {
            if (allPeople.includes(chamber.ironPerson.name)) {
              duplicates.add(chamber.ironPerson.name);
            } else {
              allPeople.push(chamber.ironPerson.name);
            }
          }
          if (chamber.judges) {
            chamber.judges.forEach((judge) => {
              if (allPeople.includes(judge.name)) {
                duplicates.add(judge.name);
              } else {
                allPeople.push(judge.name);
              }
            });
          }
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
      // Always clear drag state, even if there's an error
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
        chamber.judges && chamber.judges.length > 0
          ? chamber.judges.map((j) => j.name.replace(/,/g, " ")).join("; ")
          : "No Judge";

      positions.forEach((pos) => {
        const team = chamber.teams.find((t) => t.position === pos);
        if (team) {
          const member1 = team.members[0]?.name.replace(/,/g, " ") || "";
          const member2 = team.members[1]?.name.replace(/,/g, " ") || "";
          const roundTypeLabel = ROUND_TYPES[chamber.roundType].label;
          csv += `${sessionDate},${chamber.room},${roundTypeLabel},${POSITION_NAMES[pos]},${member1},${member2},${judgeNames}\n`;
        }
      });

      if (chamber.hasIron && chamber.ironPerson && chamber.ironPosition) {
        const ironName = chamber.ironPerson.name.replace(/,/g, " ");
        const roundTypeLabel = ROUND_TYPES[chamber.roundType].label;
        csv += `${sessionDate},${chamber.room},${roundTypeLabel},${
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
    Object.entries(positionHistory).forEach(([name, history]) => {
      csv += `${name.replace(/,/g, " ")},"${history.join(
        " ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾Ãƒâ€šÃ‚Â¢ "
      )}"\n`;
    });

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

  const exportDisplayAsPNG = () => {
    const element = document.getElementById("display-export");
    if (!element) return;

    const printWindow = window.open("", "", "width=1200,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Debate Pairings - ${sessionDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 24px; background: white; color: #111827; line-height: 1.5; }
            .text-center { text-align: center; }
            .mb-6 { margin-bottom: 1.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .border-b-2 { border-bottom: 2px solid #d1d5db; }
            .text-2xl { font-size: 1.5rem; line-height: 2rem; }
            .font-bold { font-weight: 700; }
            .text-gray-900 { color: #111827; }
            .grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
            .chamber-card { border: 1px solid #e5e7eb; border-radius: 0.5rem; padding: 1rem; background-color: white; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); page-break-inside: avoid; break-inside: avoid; }
            .chamber-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid #e5e7eb; }
            .chamber-title { font-size: 1.125rem; font-weight: 600; color: #111827; }
            .badge { display: inline-block; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 500; border-radius: 0.25rem; margin-left: 0.5rem; }
            .badge-blue { background-color: #dbeafe; color: #1e40af; }
            .badge-yellow { background-color: #fef3c7; color: #92400e; }
            .badge-purple { background-color: #e9d5ff; color: #6b21a8; }
            .section { margin-bottom: 1rem; }
            .section-title { font-weight: 500; font-size: 0.875rem; color: #374151; margin-bottom: 0.5rem; }
            .position-box { border: 1px solid #e5e7eb; border-radius: 0.375rem; padding: 0.75rem; background-color: #f9fafb; margin-bottom: 0.5rem; }
            .position-label { font-weight: 500; font-size: 0.75rem; color: #6b7280; margin-bottom: 0.25rem; }
            .team-member { font-weight: 500; font-size: 0.875rem; color: #111827; }
            .experience { font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem; }
            .empty-slot { font-size: 0.875rem; color: #9ca3af; font-style: italic; }
            .judge-section { margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e5e7eb; display: flex; align-items: center; gap: 0.5rem; font-size: 0.875rem; }
            .judge-label { font-weight: 500; }
            .no-judge { color: #dc2626; }
            .iron-section { margin-top: 0.75rem; padding: 0.75rem; background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 0.375rem; font-size: 0.875rem; }
            .iron-label { font-weight: 600; color: #92400e; }
            .spectators { margin-top: 1.5rem; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background-color: #f9fafb; page-break-inside: avoid; }
            .spectators-title { font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: #111827; }
            .spectator-list { display: flex; flex-wrap: wrap; gap: 0.5rem; }
            .spectator-badge { padding: 0.25rem 0.75rem; background-color: white; border: 1px solid #d1d5db; border-radius: 9999px; font-size: 0.875rem; }
            @media print { body { padding: 12px; } .chamber-card { box-shadow: none; border: 1px solid #d1d5db; } .grid { gap: 1rem; } }
            @page { margin: 0.5in; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 250); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
              {["input", "chambers", "display", "history"].map((tab) => (
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
                      ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ <strong>Inputs:</strong> The Experience
                      Level input is mandatory
                    </li>
                    <li>
                      ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ <strong>Display:</strong> The display tab
                      is for download and upload to GroupMe
                    </li>
                    <li>
                      ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ <strong>Rooms:</strong> You can edit rooms
                      in the Chambers tab
                    </li>
                    <li>
                      ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ <strong>Iron Position:</strong> When there
                      are 7 people (3 teams + 1), the 7th person "irons" -
                      debates both speeches for their side
                    </li>
                    <li>
                      ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ <strong>Dragging:</strong> Drag
                      individuals or whole teams between positions. Hover to
                      highlight swap targets
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
                              if (typeof csvText === "string") {
                                handleManualInput(csvText);
                              }
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
                              .map((pos) => {
                                const team = chamber.teams.find(
                                  (t) => t.position === pos
                                );
                                const isDropZone =
                                  dragOverTarget?.type === "position" &&
                                  dragOverTarget.chamberIdx === chamberIdx &&
                                  dragOverTarget.position === pos;

                                return (
                                  <div
                                    key={pos}
                                    className={`border rounded-lg p-4 transition-all ${
                                      isDropZone
                                        ? "bg-blue-100 border-blue-400 border-2"
                                        : "bg-gray-50"
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) =>
                                      handleDragEnter(e, {
                                        type: "position",
                                        chamberIdx,
                                        position: pos,
                                      })
                                    }
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) =>
                                      handleDrop(e, {
                                        type: "position",
                                        chamberIdx,
                                        position: pos,
                                      })
                                    }
                                  >
                                    <div className="font-medium text-sm text-gray-600 mb-2">
                                      {POSITION_NAMES[pos]}
                                    </div>
                                    {team && team.members.length > 0 ? (
                                      <div className="bg-white rounded p-2 border border-gray-200">
                                        {/* Team drag handle */}
                                        <div
                                          draggable
                                          onDragStart={(e) =>
                                            handleDragStart(e, "team", {
                                              team,
                                              chamberIdx,
                                              position: pos,
                                            })
                                          }
                                          onDragEnd={handleDragEnd}
                                          className="cursor-move flex items-center justify-center mb-2 pb-2 border-b hover:bg-gray-50 p-1 rounded"
                                        >
                                          <GripVertical className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                        </div>

                                        {/* Individual members */}
                                        {team.members.map(
                                          (member, memberIdx) => {
                                            const isHovered =
                                              dragOverTarget?.type ===
                                                "position" &&
                                              dragOverTarget.chamberIdx ===
                                                chamberIdx &&
                                              dragOverTarget.position === pos &&
                                              dragOverTarget.memberIdx ===
                                                memberIdx;

                                            return (
                                              <div
                                                key={member.name}
                                                className={`flex items-start gap-2 py-1 px-2 rounded transition-colors ${
                                                  isHovered
                                                    ? "bg-red-100"
                                                    : "hover:bg-gray-50"
                                                }`}
                                                onDragEnter={(e) => {
                                                  e.stopPropagation();
                                                  // Allow targeting individual members
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
                                                    handleDragStart(
                                                      e,
                                                      "person",
                                                      {
                                                        person: member,
                                                        source: "position",
                                                        chamberIdx,
                                                        position: pos,
                                                      }
                                                    );
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
                                          }
                                        )}

                                        <div className="text-xs text-gray-500 mt-2">
                                          {team.experience}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 italic text-center py-2">
                                        Empty - drag people here
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>

                          <div className="space-y-4">
                            <h5 className="font-medium text-gray-700">
                              Opposition
                            </h5>
                            {ROUND_TYPES[chamber.roundType].positions
                              .filter(
                                (p) => p.includes("O") && !p.includes("G")
                              )
                              .map((pos) => {
                                const team = chamber.teams.find(
                                  (t) => t.position === pos
                                );
                                const isDropZone =
                                  dragOverTarget?.type === "position" &&
                                  dragOverTarget.chamberIdx === chamberIdx &&
                                  dragOverTarget.position === pos;

                                return (
                                  <div
                                    key={pos}
                                    className={`border rounded-lg p-4 transition-all ${
                                      isDropZone
                                        ? "bg-blue-100 border-blue-400 border-2"
                                        : "bg-gray-50"
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragEnter={(e) =>
                                      handleDragEnter(e, {
                                        type: "position",
                                        chamberIdx,
                                        position: pos,
                                      })
                                    }
                                    onDragLeave={handleDragLeave}
                                    onDrop={(e) =>
                                      handleDrop(e, {
                                        type: "position",
                                        chamberIdx,
                                        position: pos,
                                      })
                                    }
                                  >
                                    <div className="font-medium text-sm text-gray-600 mb-2">
                                      {POSITION_NAMES[pos]}
                                    </div>
                                    {team && team.members.length > 0 ? (
                                      <div className="bg-white rounded p-2 border border-gray-200">
                                        {/* Team drag handle */}
                                        <div
                                          draggable
                                          onDragStart={(e) =>
                                            handleDragStart(e, "team", {
                                              team,
                                              chamberIdx,
                                              position: pos,
                                            })
                                          }
                                          onDragEnd={handleDragEnd}
                                          className="cursor-move flex items-center justify-center mb-2 pb-2 border-b hover:bg-gray-50 p-1 rounded"
                                        >
                                          <GripVertical className="w-5 h-5 text-blue-500 flex-shrink-0" />
                                        </div>

                                        {/* Individual members */}
                                        {team.members.map(
                                          (member, memberIdx) => {
                                            const isHovered =
                                              dragOverTarget?.type ===
                                                "position" &&
                                              dragOverTarget.chamberIdx ===
                                                chamberIdx &&
                                              dragOverTarget.position === pos &&
                                              dragOverTarget.memberIdx ===
                                                memberIdx;

                                            return (
                                              <div
                                                key={member.name}
                                                className={`flex items-start gap-2 py-1 px-2 rounded transition-colors ${
                                                  isHovered
                                                    ? "bg-red-100"
                                                    : "hover:bg-gray-50"
                                                }`}
                                                onDragEnter={(e) => {
                                                  e.stopPropagation();
                                                  // Allow targeting individual members
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
                                                    handleDragStart(
                                                      e,
                                                      "person",
                                                      {
                                                        person: member,
                                                        source: "position",
                                                        chamberIdx,
                                                        position: pos,
                                                      }
                                                    );
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
                                          }
                                        )}

                                        <div className="text-xs text-gray-500 mt-2">
                                          {team.experience}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 italic text-center py-2">
                                        Empty - drag people here
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
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
                            {chamber.judges && chamber.judges.length > 0 ? (
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

            {activeTab === "display" && (
              <div className="space-y-6">
                {chambers.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    <p>No chambers created. Load data and generate pairings.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Compact View for Download
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Click Download to save as PDF
                        </p>
                      </div>
                      <button
                        onClick={exportDisplayAsPNG}
                        className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 flex items-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download File (Save as PDF/PNG)
                      </button>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-200">
                      <div id="display-export">
                        <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
                          <h1 className="text-2xl font-bold text-gray-900">
                            Trojan Debate Society - {sessionDate}
                          </h1>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {chambers.map((chamber) => (
                            <div
                              key={chamber.id}
                              className="chamber-card border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                            >
                              <div className="chamber-header flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                                <h4 className="chamber-title text-lg font-semibold text-gray-900">
                                  {chamber.room}
                                </h4>
                                <div className="flex gap-2">
                                  <span className="badge badge-blue px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                                    {ROUND_TYPES[chamber.roundType].label}
                                  </span>
                                  {chamber.hasIron && (
                                    <span className="badge badge-purple px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                                      Iron
                                    </span>
                                  )}
                                  {chamber.mixed && (
                                    <span className="badge badge-yellow px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                                      Mixed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div className="section">
                                  <h5 className="section-title font-medium text-sm text-gray-700 mb-2">
                                    Government
                                  </h5>
                                  <div className="space-y-2">
                                    {ROUND_TYPES[chamber.roundType].positions
                                      .filter((p) => p.includes("G"))
                                      .map((pos) => {
                                        const team = chamber.teams.find(
                                          (t) => t.position === pos
                                        );
                                        return (
                                          <div
                                            key={pos}
                                            className="position-box border border-gray-200 rounded p-3 bg-gray-50"
                                          >
                                            <div className="position-label font-medium text-xs text-gray-600 mb-1">
                                              {POSITION_NAMES[pos]}
                                            </div>
                                            {team && team.members.length > 0 ? (
                                              <>
                                                {team.members.map((member) => (
                                                  <div
                                                    key={member.name}
                                                    className="team-member font-medium text-sm"
                                                  >
                                                    {member.name}
                                                  </div>
                                                ))}
                                                <div className="experience text-xs text-gray-500 mt-1">
                                                  {team.experience}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="empty-slot text-sm text-gray-400 italic">
                                                Empty
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>

                                <div className="section">
                                  <h5 className="section-title font-medium text-sm text-gray-700 mb-2">
                                    Opposition
                                  </h5>
                                  <div className="space-y-2">
                                    {ROUND_TYPES[chamber.roundType].positions
                                      .filter(
                                        (p) =>
                                          p.includes("O") && !p.includes("G")
                                      )
                                      .map((pos) => {
                                        const team = chamber.teams.find(
                                          (t) => t.position === pos
                                        );
                                        return (
                                          <div
                                            key={pos}
                                            className="position-box border border-gray-200 rounded p-3 bg-gray-50"
                                          >
                                            <div className="position-label font-medium text-xs text-gray-600 mb-1">
                                              {POSITION_NAMES[pos]}
                                            </div>
                                            {team && team.members.length > 0 ? (
                                              <>
                                                {team.members.map((member) => (
                                                  <div
                                                    key={member.name}
                                                    className="team-member font-medium text-sm"
                                                  >
                                                    {member.name}
                                                  </div>
                                                ))}
                                                <div className="experience text-xs text-gray-500 mt-1">
                                                  {team.experience}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="empty-slot text-sm text-gray-400 italic">
                                                Empty
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>

                              {chamber.hasIron && chamber.ironPerson && (
                                <div className="iron-section mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                  <span className="iron-label font-semibold text-yellow-900">
                                    Iron:
                                  </span>
                                  <span className="text-yellow-800 ml-2">
                                    {chamber.ironPerson.name}
                                  </span>
                                  <span className="text-xs text-yellow-700 ml-2">
                                    ({POSITION_NAMES[chamber.ironPosition]})
                                  </span>
                                </div>
                              )}

                              <div className="judge-section mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm flex-wrap">
                                <span className="judge-label font-medium">
                                  Judges:
                                </span>
                                {chamber.judges && chamber.judges.length > 0 ? (
                                  chamber.judges.map((judge, idx) => (
                                    <span key={idx}>
                                      {judge.name}
                                      {idx < chamber.judges.length - 1
                                        ? ", "
                                        : ""}
                                    </span>
                                  ))
                                ) : (
                                  <span className="no-judge text-red-600">
                                    No judge assigned
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {spectators.length > 0 && (
                          <div className="spectators border border-gray-200 rounded-lg p-4 bg-gray-50 mt-6">
                            <h4 className="spectators-title text-lg font-semibold mb-3 text-gray-900">
                              Spectators ({spectators.length})
                            </h4>
                            <div className="spectator-list flex flex-wrap gap-2">
                              {spectators.map((person, idx) => (
                                <span
                                  key={idx}
                                  className="spectator-badge px-3 py-1 bg-white rounded-full text-sm border border-gray-300"
                                >
                                  {person.name || person}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
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
                    <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
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
