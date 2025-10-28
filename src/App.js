import React, { useState, useCallback } from "react";
import { Calendar } from "lucide-react";
import { DragDropProvider } from "./contexts/DragDropContext";
import { Alert } from "./components/Alert";
import { DataInputTab } from "./components/DataInputTab";
import { ChambersTab } from "./components/ChambersTab";
import { DisplayTab } from "./components/DisplayTab";
import { HistoryTab } from "./components/HistoryTab";
import { useAutoScroll } from "./hooks/useAutoScroll";
import { useCSVParser } from "./hooks/useCSVParser";
import { usePairingGenerator } from "./hooks/usePairingGenerator";
import { usePositionAssignment } from "./hooks/usePositionAssignment";
import { useDragDropHandlers } from "./hooks/useDragDropHandlers";
import { useDragDrop } from "./contexts/DragDropContext";
import { shuffleArray } from "./utils/helpers";
import { ROUND_TYPES, POSITION_NAMES } from "./utils/constants";

function AppContent() {
  const [participants, setParticipants] = useState([]);
  const [positionHistory, setPositionHistory] = useState({});
  const [chambers, setChambers] = useState([]);
  const [spectators, setSpectators] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("input");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);

  const { draggedItem } = useDragDrop();
  useAutoScroll(draggedItem);

  const { handleCSVInput } = useCSVParser(setParticipants, setAlerts);
  const { createTeams, createChambers: generateChambers } = usePairingGenerator(
    participants,
    setSpectators,
    setAlerts
  );
  const { getNextPosition, assignPositionsInChamber } =
    usePositionAssignment(positionHistory);

  const dragDropHandlers = useDragDropHandlers(
    chambers,
    setChambers,
    spectators,
    setSpectators,
    positionHistory,
    setPositionHistory,
    setAlerts
  );

  const handleCSVUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
          const csvText = event.target?.result;
          if (typeof csvText === "string") handleCSVInput(csvText);
          setLoading(false);
        };
        reader.onerror = () => {
          setAlerts([{ type: "error", message: "Failed to read CSV file" }]);
          setLoading(false);
        };
        reader.readAsText(file);
      }
    },
    [handleCSVInput, setAlerts]
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
  }, [
    createTeams,
    generateChambers,
    assignPositionsInChamber,
    positionHistory,
  ]);

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

  const exportToCSV = useCallback(() => {
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
  }, [chambers, sessionDate]);

  const exportHistory = useCallback(() => {
    let csv = "Debater,Position History (Oldest to Newest)\n";
    Object.entries(positionHistory).forEach(
      ([name, history]) =>
        (csv += `${name.replace(/,/g, " ")},"${history.join(" â†’ ")}"\n`)
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
  }, [positionHistory]);

  const clearHistory = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to clear all position history? This cannot be undone."
      )
    ) {
      setPositionHistory({});
      setAlerts([{ type: "success", message: "Position history cleared" }]);
    }
  }, []);

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
          <Alert
            key={idx}
            alert={alert}
            onClose={() => setAlerts(alerts.filter((_, i) => i !== idx))}
          />
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
              <DataInputTab
                participants={participants}
                loading={loading}
                onCSVUpload={handleCSVUpload}
                onGeneratePairings={generatePairings}
              />
            )}

            {activeTab === "chambers" && (
              <ChambersTab
                chambers={chambers}
                spectators={spectators}
                onAddChamber={addChamber}
                onUpdateRoomName={updateRoomName}
                onRoundTypeChange={handleRoundTypeChange}
                onExportCSV={exportToCSV}
                {...dragDropHandlers}
              />
            )}

            {activeTab === "display" && (
              <DisplayTab
                chambers={chambers}
                spectators={spectators}
                sessionDate={sessionDate}
              />
            )}

            {activeTab === "history" && (
              <HistoryTab
                positionHistory={positionHistory}
                onExportHistory={exportHistory}
                onClearHistory={clearHistory}
                getNextPosition={getNextPosition}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <DragDropProvider>
      <AppContent />
    </DragDropProvider>
  );
}

export default App;
