/**
 * Tests for useSessionHistory hook logic.
 * Mocks Firebase services to test state management in isolation.
 */
import { renderHook, act } from "@testing-library/react";
import { useSessionHistory } from "../hooks/useSessionHistory";

// Mock all sessionService functions
jest.mock("../services/sessionService", () => ({
  loadClosedSessions: jest.fn(),
  loadSessionCheckins: jest.fn(),
  updateSessionName: jest.fn(),
  deleteSession: jest.fn(),
  updateSessionDate: jest.fn(),
  updateSessionPairings: jest.fn(),
  updateSessionMotion: jest.fn(),
  removeCheckIn: jest.fn(),
}));

const {
  loadClosedSessions,
  loadSessionCheckins,
  updateSessionName,
  deleteSession,
  updateSessionDate,
  updateSessionPairings,
  updateSessionMotion,
  removeCheckIn,
} = require("../services/sessionService");

const makeChamber = (id, teams = [], judges = []) => ({
  id,
  room: `Room ${id}`,
  teams,
  judges,
  roundType: "full",
  hasIron: false,
  ironPerson: null,
  ironPosition: null,
});

describe("useSessionHistory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("loadSessions", () => {
    it("loads closed sessions and sets state", async () => {
      const sessions = [
        { id: "s1", name: "Session 1", attendanceCount: 5 },
        { id: "s2", name: "Session 2", attendanceCount: 3 },
      ];
      loadClosedSessions.mockResolvedValue(sessions);

      const { result } = renderHook(() => useSessionHistory());

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.closedSessions).toHaveLength(2);
      expect(result.current.loading).toBe(false);
    });

    it("loads checkins for sessions missing attendanceCount", async () => {
      const sessions = [
        { id: "s1", name: "Session 1" }, // no attendanceCount
      ];
      loadClosedSessions.mockResolvedValue(sessions);
      loadSessionCheckins.mockResolvedValue([{ id: "c1", name: "Alice" }]);

      const { result } = renderHook(() => useSessionHistory());

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(loadSessionCheckins).toHaveBeenCalledWith("s1");
    });

    it("handles loadClosedSessions failure gracefully", async () => {
      loadClosedSessions.mockRejectedValue(new Error("Network error"));
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const { result } = renderHook(() => useSessionHistory());

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.closedSessions).toHaveLength(0);
      expect(result.current.loading).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe("expandSession", () => {
    it("expands a session and loads checkins", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", attendanceCount: 2 }]);
      loadSessionCheckins.mockResolvedValue([{ id: "c1", name: "Alice" }]);

      const { result } = renderHook(() => useSessionHistory());

      await act(async () => {
        await result.current.loadSessions();
      });

      await act(async () => {
        await result.current.expandSession("s1");
      });

      expect(result.current.expandedSessionId).toBe("s1");
      expect(result.current.checkinCache["s1"]).toHaveLength(1);
    });

    it("collapses when expanding the already-expanded session", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", attendanceCount: 2 }]);
      loadSessionCheckins.mockResolvedValue([]);

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });
      await act(async () => { await result.current.expandSession("s1"); });
      expect(result.current.expandedSessionId).toBe("s1");

      await act(async () => { await result.current.expandSession("s1"); });
      expect(result.current.expandedSessionId).toBeNull();
    });

    it("does not re-fetch checkins if already cached", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", attendanceCount: 2 }]);
      loadSessionCheckins.mockResolvedValue([{ id: "c1", name: "Alice" }]);

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      // First expand — fetches
      await act(async () => { await result.current.expandSession("s1"); });
      expect(loadSessionCheckins).toHaveBeenCalledTimes(1);

      // Collapse
      await act(async () => { await result.current.expandSession("s1"); });
      // Re-expand — should not re-fetch
      await act(async () => { await result.current.expandSession("s1"); });
      expect(loadSessionCheckins).toHaveBeenCalledTimes(1); // still 1
    });
  });

  describe("renameSession", () => {
    it("renames session and updates local state", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", name: "Old Name", attendanceCount: 2 }]);
      updateSessionName.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.renameSession("s1", "New Name");
      });

      expect(updateSessionName).toHaveBeenCalledWith("s1", "New Name");
      expect(result.current.closedSessions[0].name).toBe("New Name");
    });
  });

  describe("deleteSessionFull", () => {
    it("deletes session and removes from state", async () => {
      loadClosedSessions.mockResolvedValue([
        { id: "s1", name: "A", attendanceCount: 1 },
        { id: "s2", name: "B", attendanceCount: 2 },
      ]);
      deleteSession.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.deleteSessionFull("s1");
      });

      expect(deleteSession).toHaveBeenCalledWith("s1");
      expect(result.current.closedSessions).toHaveLength(1);
      expect(result.current.closedSessions[0].id).toBe("s2");
    });

    it("clears expanded state if deleted session was expanded", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", attendanceCount: 1 }]);
      loadSessionCheckins.mockResolvedValue([]);
      deleteSession.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });
      await act(async () => { await result.current.expandSession("s1"); });
      expect(result.current.expandedSessionId).toBe("s1");

      await act(async () => { await result.current.deleteSessionFull("s1"); });
      expect(result.current.expandedSessionId).toBeNull();
    });
  });

  describe("changeSessionDate", () => {
    it("updates date and reflects in local state", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", date: "2026-01-01", attendanceCount: 1 }]);
      updateSessionDate.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.changeSessionDate("s1", "2026-03-05");
      });

      expect(updateSessionDate).toHaveBeenCalledWith("s1", "2026-03-05");
      expect(result.current.closedSessions[0].date).toBe("2026-03-05");
    });
  });

  describe("updateMotion", () => {
    it("updates motion and infoslide on a session", async () => {
      loadClosedSessions.mockResolvedValue([
        { id: "s1", motion: null, infoslide: null, attendanceCount: 1 },
      ]);
      updateSessionMotion.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.updateMotion("s1", "THW ban X", "Context about X");
      });

      expect(updateSessionMotion).toHaveBeenCalledWith("s1", "THW ban X", "Context about X");
      expect(result.current.closedSessions[0].motion).toBe("THW ban X");
      expect(result.current.closedSessions[0].infoslide).toBe("Context about X");
    });

    it("clears motion when empty string passed", async () => {
      loadClosedSessions.mockResolvedValue([
        { id: "s1", motion: "Old motion", infoslide: "Old info", attendanceCount: 1 },
      ]);
      updateSessionMotion.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.updateMotion("s1", "", "");
      });

      expect(result.current.closedSessions[0].motion).toBeNull();
      expect(result.current.closedSessions[0].infoslide).toBeNull();
    });
  });

  describe("addPersonToPairings", () => {
    it("adds a debater to an existing team position", async () => {
      const chambers = [
        makeChamber("c1", [
          { position: "OG", members: [{ name: "Alice" }] },
        ]),
      ];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "Bob", {
          type: "debater",
          chamberIndex: 0,
          position: "OG",
        });
      });

      expect(updateSessionPairings).toHaveBeenCalled();
      const updatedChambers = result.current.closedSessions[0].chambers;
      const ogTeam = updatedChambers[0].teams.find((t) => t.position === "OG");
      expect(ogTeam.members).toHaveLength(2);
      expect(ogTeam.members[1].name).toBe("Bob");
    });

    it("creates a new team if position does not exist", async () => {
      const chambers = [
        makeChamber("c1", [
          { position: "OG", members: [{ name: "Alice" }, { name: "Bob" }] },
        ]),
      ];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "Charlie", {
          type: "debater",
          chamberIndex: 0,
          position: "OO",
        });
      });

      const updatedChambers = result.current.closedSessions[0].chambers;
      const ooTeam = updatedChambers[0].teams.find((t) => t.position === "OO");
      expect(ooTeam).toBeTruthy();
      expect(ooTeam.members[0].name).toBe("Charlie");
    });

    it("adds a judge to a chamber", async () => {
      const chambers = [makeChamber("c1", [], [{ name: "Judge1" }])];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "Judge2", {
          type: "judge",
          chamberIndex: 0,
        });
      });

      const updatedChambers = result.current.closedSessions[0].chambers;
      expect(updatedChambers[0].judges).toHaveLength(2);
      expect(updatedChambers[0].judges[1].name).toBe("Judge2");
    });

    it("adds a judge to a chamber with no existing judges", async () => {
      const chambers = [makeChamber("c1", [])];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "NewJudge", {
          type: "judge",
          chamberIndex: 0,
        });
      });

      const updatedChambers = result.current.closedSessions[0].chambers;
      expect(updatedChambers[0].judges).toHaveLength(1);
    });

    it("adds a spectator", async () => {
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers: [], spectators: [{ name: "Spec1" }], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "Spec2", {
          type: "spectator",
        });
      });

      expect(result.current.closedSessions[0].spectators).toHaveLength(2);
      expect(result.current.closedSessions[0].spectators[1].name).toBe("Spec2");
    });

    it("does nothing for invalid session ID", async () => {
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers: [], spectators: [], attendanceCount: 1 },
      ]);

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("nonexistent", "Bob", {
          type: "spectator",
        });
      });

      expect(updateSessionPairings).not.toHaveBeenCalled();
    });

    it("does nothing for invalid chamber index", async () => {
      const chambers = [makeChamber("c1", [])];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "Bob", {
          type: "debater",
          chamberIndex: 99,
          position: "OG",
        });
      });

      expect(updateSessionPairings).not.toHaveBeenCalled();
    });

    it("deep clones chambers before mutation", async () => {
      const originalTeam = { position: "OG", members: [{ name: "Alice" }] };
      const chambers = [makeChamber("c1", [originalTeam])];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.addPersonToPairings("s1", "Bob", {
          type: "debater",
          chamberIndex: 0,
          position: "OG",
        });
      });

      // Original team object should not be mutated
      expect(originalTeam.members).toHaveLength(1);
    });
  });

  describe("removePersonFromSessionPairings", () => {
    it("removes person and persists to Firestore", async () => {
      const chambers = [
        makeChamber("c1", [
          { position: "OG", members: [{ name: "Alice" }, { name: "Bob" }] },
        ]),
      ];
      loadClosedSessions.mockResolvedValue([
        { id: "s1", chambers, spectators: [], attendanceCount: 1 },
      ]);
      updateSessionPairings.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });

      await act(async () => {
        await result.current.removePersonFromSessionPairings("s1", "Alice");
      });

      expect(updateSessionPairings).toHaveBeenCalled();
      const updatedChambers = result.current.closedSessions[0].chambers;
      const members = updatedChambers[0].teams[0].members;
      expect(members).toHaveLength(1);
      expect(members[0].name).toBe("Bob");
    });
  });

  describe("removeSessionCheckin", () => {
    it("removes checkin from cache", async () => {
      loadClosedSessions.mockResolvedValue([{ id: "s1", attendanceCount: 2 }]);
      loadSessionCheckins.mockResolvedValue([
        { id: "c1", name: "Alice" },
        { id: "c2", name: "Bob" },
      ]);
      removeCheckIn.mockResolvedValue();

      const { result } = renderHook(() => useSessionHistory());
      await act(async () => { await result.current.loadSessions(); });
      await act(async () => { await result.current.expandSession("s1"); });

      await act(async () => {
        await result.current.removeSessionCheckin("s1", "c1");
      });

      expect(removeCheckIn).toHaveBeenCalledWith("s1", "c1");
      expect(result.current.checkinCache["s1"]).toHaveLength(1);
      expect(result.current.checkinCache["s1"][0].name).toBe("Bob");
    });
  });
});
