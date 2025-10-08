import React, { useState, useCallback } from "react";
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
const POSITIONS = ["OG", "OO", "CG", "CO"];
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

function App() {
  const [participants, setParticipants] = useState([]);
  const [positionHistory, setPositionHistory] = useState({});
  const [chambers, setChambers] = useState([]);
  const [judges, setJudges] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [draggedTeam, setDraggedTeam] = useState(null);
  const [dragOverPosition, setDragOverPosition] = useState(null);
  const [sheetUrl, setSheetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Load position history on mount
  React.useEffect(() => {
    const saved = localStorage.getItem("debate-position-history");
    if (saved) {
      try {
        setPositionHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history:", e);
      }
    }
  }, []);

  // Save position history whenever it changes
  React.useEffect(() => {
    if (Object.keys(positionHistory).length > 0) {
      localStorage.setItem(
        "debate-position-history",
        JSON.stringify(positionHistory)
      );
    }
  }, [positionHistory]);

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

      const debaters = data.filter((p) => {
        const role = (p.role || "").toLowerCase().trim();
        return !role || role.includes("debat") || role === "";
      });

      const judges = data.filter((p) => {
        const role = (p.role || "").toLowerCase().trim();
        return role.includes("judg");
      });

      const spectators = data.filter((p) => {
        const role = (p.role || "").toLowerCase().trim();
        return role.includes("spectat");
      });

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

    const judgeList = participants.filter((p) => {
      const role = (p.role || "").toLowerCase().trim();
      return role.includes("judg") && p.experience === "Returning Members";
    });
    setJudges(judgeList);

    // Filter out explicit spectators
    const explicitSpectators = participants.filter((p) => {
      const role = (p.role || "").toLowerCase().trim();
      return role.includes("spectat");
    });

    const debaters = participants.filter((p) => {
      const role = (p.role || "").toLowerCase().trim();
      return !role || role.includes("debat") || role === "";
    });

    // Build comprehensive spectator set
    const spectatorNames = new Set();

    // Add all explicit spectators
    explicitSpectators.forEach((s) => spectatorNames.add(s.name));

    // Iteratively add partners until no changes
    let changed = true;
    let iterations = 0;
    while (changed && iterations < 10) {
      changed = false;
      iterations++;

      participants.forEach((person) => {
        const partnerName = (person.partner || "").trim();

        // If this person is a spectator and has a partner, partner becomes spectator
        if (
          spectatorNames.has(person.name) &&
          partnerName &&
          !spectatorNames.has(partnerName)
        ) {
          spectatorNames.add(partnerName);
          changed = true;
        }

        // If this person's partner is a spectator, this person becomes spectator
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

    // Collect all spectators from participants
    const allSpectators = [];
    participants.forEach((person) => {
      if (spectatorNames.has(person.name)) {
        allSpectators.push(person);
      }
    });

    // Filter debaters to exclude all spectators
    const activeDebaters = debaters.filter((p) => !spectatorNames.has(p.name));

    activeDebaters.forEach((person) => {
      if (processed.has(person.name)) return;

      const partnerName = (person.partner || "").trim();

      if (partnerName) {
        let partner = activeDebaters.find(
          (other) => other.name === partnerName && !processed.has(other.name)
        );

        // Partner validation: must be same experience level
        if (partner && partner.experience !== person.experience) {
          setAlerts((prev) => [
            ...prev,
            {
              type: "warning",
              message: `${person.name} and ${partner.name} have different experience levels - cannot form team`,
            },
          ]);
          singles[
            person.experience === "General Member"
              ? "General Members"
              : person.experience
          ].push(person);
          singles[
            partner.experience === "General Member"
              ? "General Members"
              : partner.experience
          ].push(partner);
          processed.add(person.name);
          processed.add(partner.name);
          return;
        }

        // If partner not found, create virtual partner with same experience
        if (!partner) {
          partner = {
            name: partnerName,
            partner: "",
            experience: person.experience,
            preference: "No Preference",
            role: "Debate",
          };
        }

        const normalizedExp =
          person.experience === "General Member"
            ? "General Members"
            : person.experience;
        teams.push({
          id: `team-${teams.length}`,
          members: [person, partner],
          experience: normalizedExp,
          preference: person.preference || "No Preference",
          halfRound: person.halfRound || partner.halfRound || "",
        });
        processed.add(person.name);
        processed.add(partner.name);
      } else {
        const expKey =
          person.experience === "General Member"
            ? "General Members"
            : person.experience;
        singles[expKey].push(person);
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

      // Odd person becomes spectator
      if (levelSingles.length % 2 === 1) {
        newSpectators.push(levelSingles[levelSingles.length - 1]);
      }
    });

    setSpectators(newSpectators);
    return { teams, judges: judgeList };
  }, [participants]);

  const createChambers = useCallback((teams) => {
    const chamberList = [];

    // Separate teams by half-round preference
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

    // Group full-round teams by experience
    const teamsByExperience = {
      "Returning Members": [],
      "Competitive Team Fall '25": [],
      "General Members": [],
    };

    fullRoundTeams.forEach((team) => {
      teamsByExperience[team.experience].push(team);
    });

    // Shuffle teams within each experience level
    const shuffleArray = (array) => {
      const shuffled = [...array];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    };

    Object.keys(teamsByExperience).forEach((level) => {
      const levelTeams = shuffleArray(teamsByExperience[level]);
      teamsByExperience[level] = levelTeams;
    });

    // Create full 4-team chambers
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
          judge: null,
          mixed: false,
          roundType: "full",
        });
      }
    });

    // Handle remaining full-round teams
    const remainingReturning = teamsByExperience["Returning Members"];
    const remainingCompetitive = teamsByExperience["Competitive Team Fall '25"];
    const remainingGeneral = teamsByExperience["General Members"];

    const allRemaining = [];

    if (remainingCompetitive.length > 0 && remainingReturning.length > 0) {
      while (
        remainingCompetitive.length > 0 &&
        remainingReturning.length > 0 &&
        allRemaining.length < 4
      ) {
        allRemaining.push(remainingCompetitive.shift());
        if (allRemaining.length < 4 && remainingReturning.length > 0) {
          allRemaining.push(remainingReturning.shift());
        }
      }
    }

    if (
      allRemaining.length < 4 &&
      remainingCompetitive.length > 0 &&
      remainingGeneral.length > 0
    ) {
      while (
        remainingCompetitive.length > 0 &&
        remainingGeneral.length > 0 &&
        allRemaining.length < 4
      ) {
        allRemaining.push(remainingCompetitive.shift());
        if (allRemaining.length < 4 && remainingGeneral.length > 0) {
          allRemaining.push(remainingGeneral.shift());
        }
      }
    }

    allRemaining.push(
      ...remainingReturning,
      ...remainingCompetitive,
      ...remainingGeneral
    );

    // If exactly 4 remaining, make a mixed full chamber
    if (allRemaining.length === 4) {
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: allRemaining.map((team) => ({
          ...team,
          position: null,
        })),
        judge: null,
        mixed: true,
        roundType: "full",
      });
    }
    // If exactly 2 remaining full-round teams AND there are opening half teams available,
    // try to pair them with opening half teams first
    else if (allRemaining.length === 2 && openingHalfTeams.length >= 2) {
      // Put the 2 remaining teams back as opening half preference
      allRemaining.forEach((team) => {
        openingHalfTeams.push(team);
      });
    }
    // If exactly 2 remaining and no opening half teams, make a half chamber
    else if (allRemaining.length === 2) {
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: allRemaining.map((team) => ({
          ...team,
          position: null,
        })),
        judge: null,
        mixed: allRemaining[0].experience !== allRemaining[1].experience,
        roundType: "opening",
      });
    }
    // More than 4 or odd number, make them spectators
    else if (allRemaining.length > 0) {
      setSpectators((prev) => {
        const newSpectators = [...prev];
        allRemaining.forEach((team) => {
          team.members.forEach((member) => newSpectators.push(member));
        });
        return newSpectators;
      });
    }

    // Create opening half chambers - prioritize pairing teams that WANT opening half
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
        judge: null,
        mixed: chamberTeams[0].experience !== chamberTeams[1].experience,
        roundType: "opening",
      });
    }

    // Create closing half chambers
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
        judge: null,
        mixed: chamberTeams[0].experience !== chamberTeams[1].experience,
        roundType: "closing",
      });
    }

    // Leftover half-round teams become spectators
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

      // First time debater - apply preference or default
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

      // If all positions done, reset and start rotation again
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

      // Apply preference filter to available positions
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

      const availableJudges = [...judgeList];
      chamberList.forEach((chamber) => {
        if (availableJudges.length > 0) {
          chamber.judge = availableJudges.shift();
        } else {
          setAlerts((prev) => [
            ...prev,
            {
              type: "warning",
              message: `${chamber.room} has no judge - insufficient Returning Member judges`,
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

  const handleDragStart = (e, team, chamberIdx, position) => {
    setDraggedTeam({ team, chamberIdx, position });

    const dragElement = e.currentTarget.cloneNode(true);
    dragElement.style.position = "absolute";
    dragElement.style.top = "-1000px";
    dragElement.style.width = e.currentTarget.offsetWidth + "px";
    dragElement.style.backgroundColor = "white";
    dragElement.style.border = "2px solid #3b82f6";
    dragElement.style.borderRadius = "0.5rem";
    dragElement.style.padding = "0.5rem";
    dragElement.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 0, 0);
    setTimeout(() => document.body.removeChild(dragElement), 0);
  };

  const handleDragEnd = (e) => {
    setDraggedTeam(null);
    setDragOverPosition(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e, chamberIdx, position) => {
    e.preventDefault();
    if (
      draggedTeam &&
      `${chamberIdx}-${position}` !==
        `${draggedTeam.chamberIdx}-${draggedTeam.position}`
    ) {
      setDragOverPosition(`${chamberIdx}-${position}`);
    }
  };

  const handleDragLeave = (e, chamberIdx, position) => {
    if (dragOverPosition === `${chamberIdx}-${position}`) {
      setDragOverPosition(null);
    }
  };

  const handleDrop = (e, targetChamberIdx, targetPosition) => {
    e.preventDefault();
    setDragOverPosition(null);

    if (!draggedTeam) return;

    const newChambers = [...chambers];
    const sourceTeam = draggedTeam.team;
    const targetChamber = newChambers[targetChamberIdx];
    const targetTeam = targetChamber.teams.find(
      (t) => t.position === targetPosition
    );

    if (targetTeam) {
      const sourceChamber = newChambers[draggedTeam.chamberIdx];
      const sourceTeamIndex = sourceChamber.teams.findIndex(
        (t) => t.id === sourceTeam.id
      );
      const targetTeamIndex = targetChamber.teams.findIndex(
        (t) => t.id === targetTeam.id
      );

      sourceChamber.teams[sourceTeamIndex].position = targetPosition;
      targetChamber.teams[targetTeamIndex].position = draggedTeam.position;
    }

    setChambers(newChambers);
    setDraggedTeam(null);
  };

  const exportToCSV = () => {
    let csv =
      "Session Date,Chamber,Round Type,Position,Team Member 1,Team Member 2,Judge\n";

    chambers.forEach((chamber) => {
      const positions = ROUND_TYPES[chamber.roundType].positions;
      positions.forEach((pos) => {
        const team = chamber.teams.find((t) => t.position === pos);
        if (team) {
          const member1 = team.members[0].name.replace(/,/g, " ");
          const member2 = team.members[1]
            ? team.members[1].name.replace(/,/g, " ")
            : "";
          const judge = chamber.judge
            ? chamber.judge.name.replace(/,/g, " ")
            : "No Judge";
          const roundTypeLabel = ROUND_TYPES[chamber.roundType].label;
          csv += `${sessionDate},${chamber.room},${roundTypeLabel},${POSITION_NAMES[pos]},${member1},${member2},${judge}\n`;
        }
      });
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
      csv += `${name.replace(/,/g, " ")},"${history.join(" → ")}"\n`;
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
      localStorage.removeItem("debate-position-history");
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

    const printWindow = window.open("", "", "width=1000,height=800");
    printWindow.document.write(`
      <html>
        <head>
          <title>Debate Pairings - ${sessionDate}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              padding: 16px;
              background: white;
            }
            .text-center { text-align: center; }
            .mb-6 { margin-bottom: 1.5rem; }
            .pb-4 { padding-bottom: 1rem; }
            .border-b-2 { border-bottom-width: 2px; }
            .border-gray-300 { border-color: #d1d5db; }
            .text-2xl { font-size: 1.5rem; }
            .font-bold { font-weight: 700; }
            .text-gray-900 { color: #111827; }
            
            .grid { display: grid; }
            .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
            @media (min-width: 768px) {
              .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (min-width: 1024px) {
              .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            }
            .gap-6 { gap: 1.5rem; }
            
            .border { border-width: 1px; }
            .border-gray-200 { border-color: #e5e7eb; }
            .rounded-lg { border-radius: 0.5rem; }
            .p-4 { padding: 1rem; }
            .bg-white { background-color: white; }
            .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
            
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .items-center { align-items: center; }
            .mb-4 { margin-bottom: 1rem; }
            .pb-3 { padding-bottom: 0.75rem; }
            .text-lg { font-size: 1.125rem; }
            .font-semibold { font-weight: 600; }
            .gap-2 { gap: 0.5rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .bg-blue-100 { background-color: #dbeafe; }
            .text-blue-800 { color: #1e40af; }
            .text-xs { font-size: 0.75rem; }
            .rounded { border-radius: 0.25rem; }
            .font-medium { font-weight: 500; }
            .bg-yellow-100 { background-color: #fef3c7; }
            .text-yellow-800 { color: #92400e; }
            
            .space-y-4 > * + * { margin-top: 1rem; }
            .space-y-2 > * + * { margin-top: 0.5rem; }
            .text-sm { font-size: 0.875rem; }
            .text-gray-700 { color: #374151; }
            .mb-2 { margin-bottom: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .bg-gray-50 { background-color: #f9fafb; }
            .text-gray-600 { color: #4b5563; }
            .mb-1 { margin-bottom: 0.25rem; }
            .text-gray-500 { color: #6b7280; }
            .mt-1 { margin-top: 0.25rem; }
            .text-gray-400 { color: #9ca3af; }
            .italic { font-style: italic; }
            
            .mt-4 { margin-top: 1rem; }
            .pt-3 { padding-top: 0.75rem; }
            .border-t { border-top-width: 1px; }
            .w-4 { width: 1rem; }
            .h-4 { height: 1rem; }
            .text-blue-600 { color: #2563eb; }
            .flex-shrink-0 { flex-shrink: 0; }
            .text-red-600 { color: #dc2626; }
            
            .mt-6 { margin-top: 1.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .flex-wrap { flex-wrap: wrap; }
            .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
            .rounded-full { border-radius: 9999px; }
            .border-gray-300 { border-color: #d1d5db; }
            
            @media print { 
              body { padding: 10px; }
              .shadow-sm { box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 250);
            };
          </script>
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
                      • <strong>Inputs:</strong> The Experience Level input is
                      mandatory
                    </li>
                    <li>
                      • <strong>Display:</strong> The display tab is for
                      download and upload to GroupMe
                    </li>
                    <li>
                      • <strong>Rooms:</strong> You can edit rooms in the
                      Chambers tab now
                    </li>
                    <li>
                      • <strong>Spectators:</strong> If both members in a team
                      are spectating, the second member won't display in the
                      spectate list, I'll fix it later
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
                        Select a CSV file from your computer
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">OR</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Google Sheets Published CSV URL
                      </label>
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={sheetUrl}
                          onChange={(e) => setSheetUrl(e.target.value)}
                          placeholder="https://docs.google.com/spreadsheets/d/e/..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-900 focus:border-red-900"
                        />
                        <button
                          onClick={async () => {
                            if (sheetUrl) {
                              setLoading(true);
                              try {
                                const response = await fetch(sheetUrl);
                                const csvText = await response.text();
                                handleManualInput(csvText);
                              } catch (error) {
                                setAlerts([
                                  {
                                    type: "error",
                                    message:
                                      "Failed to load from Google Sheets. Ensure the sheet is published.",
                                  },
                                ]);
                              } finally {
                                setLoading(false);
                              }
                            }
                          }}
                          disabled={!sheetUrl || loading}
                          className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                          {loading ? "Loading..." : "Load from Sheets"}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        File → Share → Publish to web → CSV → Publish
                      </p>
                    </div>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-300"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">OR</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paste CSV Data
                      </label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        rows="10"
                        placeholder="Name,Partner,Experience Level,Preference,Half Round?,Role
Alice Johnson,Bob Smith,Returning Members,Opening Half,,Debate
Bob Smith,Alice Johnson,Returning Members,Opening Half,,Debate
Charlie Davis,,General Members,,,Debating
Judge Smith,,Returning Members,,,Judging
Spectator Joe,,General Members,,,Spectating
Half Team A,Half Team B,Returning Members,,Opening Half,Debate
Half Team B,Half Team A,Returning Members,,Opening Half,Debate"
                        onChange={(e) => handleManualInput(e.target.value)}
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
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
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
                            {chambers.filter((c) => c.judge).length}/
                            {chambers.length}
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
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                              {ROUND_TYPES[chamber.roundType].label}
                            </span>
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
                                const isBeingDragged =
                                  draggedTeam &&
                                  draggedTeam.chamberIdx === chamberIdx &&
                                  draggedTeam.position === pos;
                                const isDropZone =
                                  dragOverPosition === `${chamberIdx}-${pos}`;
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
                                      handleDragEnter(e, chamberIdx, pos)
                                    }
                                    onDragLeave={(e) =>
                                      handleDragLeave(e, chamberIdx, pos)
                                    }
                                    onDrop={(e) =>
                                      handleDrop(e, chamberIdx, pos)
                                    }
                                  >
                                    <div className="font-medium text-sm text-gray-600 mb-2">
                                      {POSITION_NAMES[pos]}
                                    </div>
                                    {team && !isBeingDragged ? (
                                      <div
                                        draggable
                                        onDragStart={(e) =>
                                          handleDragStart(
                                            e,
                                            team,
                                            chamberIdx,
                                            pos
                                          )
                                        }
                                        onDragEnd={handleDragEnd}
                                        className="cursor-move bg-white rounded p-2 transition-all hover:shadow-md border border-gray-200"
                                      >
                                        <div className="flex items-start gap-2">
                                          <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                              {team.members[0].name}
                                            </div>
                                            {team.members[1] && (
                                              <div className="font-medium truncate">
                                                {team.members[1].name}
                                              </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                              {team.experience}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : isBeingDragged ? (
                                      <div className="text-gray-400 italic bg-gray-200 rounded p-4 min-h-[80px] flex items-center justify-center">
                                        Dragging...
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 italic">
                                        Empty
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
                                const isBeingDragged =
                                  draggedTeam &&
                                  draggedTeam.chamberIdx === chamberIdx &&
                                  draggedTeam.position === pos;
                                const isDropZone =
                                  dragOverPosition === `${chamberIdx}-${pos}`;
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
                                      handleDragEnter(e, chamberIdx, pos)
                                    }
                                    onDragLeave={(e) =>
                                      handleDragLeave(e, chamberIdx, pos)
                                    }
                                    onDrop={(e) =>
                                      handleDrop(e, chamberIdx, pos)
                                    }
                                  >
                                    <div className="font-medium text-sm text-gray-600 mb-2">
                                      {POSITION_NAMES[pos]}
                                    </div>
                                    {team && !isBeingDragged ? (
                                      <div
                                        draggable
                                        onDragStart={(e) =>
                                          handleDragStart(
                                            e,
                                            team,
                                            chamberIdx,
                                            pos
                                          )
                                        }
                                        onDragEnd={handleDragEnd}
                                        className="cursor-move bg-white rounded p-2 transition-all hover:shadow-md border border-gray-200"
                                      >
                                        <div className="flex items-start gap-2">
                                          <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">
                                              {team.members[0].name}
                                            </div>
                                            {team.members[1] && (
                                              <div className="font-medium truncate">
                                                {team.members[1].name}
                                              </div>
                                            )}
                                            <div className="text-xs text-gray-500 mt-1">
                                              {team.experience}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    ) : isBeingDragged ? (
                                      <div className="text-gray-400 italic bg-gray-200 rounded p-4 min-h-[80px] flex items-center justify-center">
                                        Dragging...
                                      </div>
                                    ) : (
                                      <div className="text-gray-400 italic">
                                        Empty
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium">Judge:</span>
                          {chamber.judge ? (
                            <span>{chamber.judge.name}</span>
                          ) : (
                            <span className="text-red-600">
                              No judge assigned
                            </span>
                          )}
                        </div>
                      </div>
                    ))}

                    {spectators.length > 0 && (
                      <div className="border rounded-lg p-6 bg-gray-50">
                        <h4 className="text-lg font-semibold mb-3">
                          Spectators ({spectators.length})
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {spectators.map((person, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-white rounded-full text-sm border"
                            >
                              {person.name || person}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
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
                          {chambers.map((chamber, idx) => (
                            <div
                              key={chamber.id}
                              className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
                            >
                              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {chamber.room}
                                </h4>
                                <div className="flex gap-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                                    {ROUND_TYPES[chamber.roundType].label}
                                  </span>
                                  {chamber.mixed && (
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                                      Mixed
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="space-y-4">
                                <div>
                                  <h5 className="font-medium text-sm text-gray-700 mb-2">
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
                                            className="border border-gray-200 rounded p-3 bg-gray-50"
                                          >
                                            <div className="font-medium text-xs text-gray-600 mb-1">
                                              {POSITION_NAMES[pos]}
                                            </div>
                                            {team ? (
                                              <>
                                                <div className="font-medium text-sm">
                                                  {team.members[0].name}
                                                </div>
                                                {team.members[1] && (
                                                  <div className="font-medium text-sm">
                                                    {team.members[1].name}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {team.experience}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="text-sm text-gray-400 italic">
                                                Empty
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>

                                <div>
                                  <h5 className="font-medium text-sm text-gray-700 mb-2">
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
                                            className="border border-gray-200 rounded p-3 bg-gray-50"
                                          >
                                            <div className="font-medium text-xs text-gray-600 mb-1">
                                              {POSITION_NAMES[pos]}
                                            </div>
                                            {team ? (
                                              <>
                                                <div className="font-medium text-sm">
                                                  {team.members[0].name}
                                                </div>
                                                {team.members[1] && (
                                                  <div className="font-medium text-sm">
                                                    {team.members[1].name}
                                                  </div>
                                                )}
                                                <div className="text-xs text-gray-500 mt-1">
                                                  {team.experience}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="text-sm text-gray-400 italic">
                                                Empty
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                <span className="font-medium text-sm">
                                  Judge:
                                </span>
                                {chamber.judge ? (
                                  <span className="text-sm">
                                    {chamber.judge.name}
                                  </span>
                                ) : (
                                  <span className="text-red-600 text-sm">
                                    No judge assigned
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {spectators.length > 0 && (
                          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mt-6">
                            <h4 className="text-lg font-semibold mb-3 text-gray-900">
                              Spectators ({spectators.length})
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {spectators.map((person, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1 bg-white rounded-full text-sm border border-gray-300"
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
