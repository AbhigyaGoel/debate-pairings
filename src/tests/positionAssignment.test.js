import { renderHook } from "@testing-library/react";
import { usePositionAssignment } from "../hooks/usePositionAssignment";

describe("usePositionAssignment", () => {
  describe("getNextPosition", () => {
    it("assigns first available position when no history", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const pos = result.current.getNextPosition("Alice", "No Preference", "full");
      expect(pos).toBe("OG"); // first in ROUND_TYPES.full.positions
    });

    it("respects Opening Half preference when no history", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const pos = result.current.getNextPosition("Alice", "Opening Half", "full");
      expect(["OG", "OO"]).toContain(pos);
    });

    it("respects Closing Half preference when no history", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const pos = result.current.getNextPosition("Alice", "Closing Half", "full");
      expect(["CG", "CO"]).toContain(pos);
    });

    it("rotates positions based on history", () => {
      const history = { Alice: ["OG"] };
      const { result } = renderHook(() => usePositionAssignment(history));
      const pos = result.current.getNextPosition("Alice", "No Preference", "full");
      // Should avoid OG since Alice already did it
      expect(pos).not.toBe("OG");
      expect(["OO", "CG", "CO"]).toContain(pos);
    });

    it("rotates through all positions before repeating", () => {
      const history = { Alice: ["OG", "OO", "CG"] };
      const { result } = renderHook(() => usePositionAssignment(history));
      const pos = result.current.getNextPosition("Alice", "No Preference", "full");
      // Only CO left
      expect(pos).toBe("CO");
    });

    it("wraps around when all positions used", () => {
      const history = { Alice: ["OG", "OO", "CG", "CO"] };
      const { result } = renderHook(() => usePositionAssignment(history));
      const pos = result.current.getNextPosition("Alice", "No Preference", "full");
      // All done, falls back to first position
      expect(pos).toBe("OG");
    });

    it("prefers preferred position even with history", () => {
      const history = { Alice: ["OG"] };
      const { result } = renderHook(() => usePositionAssignment(history));
      const pos = result.current.getNextPosition("Alice", "Closing Half", "full");
      // CG and CO are both not done, and Closing Half prefers CG/CO
      expect(["CG", "CO"]).toContain(pos);
    });

    it("handles opening half round type", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const pos = result.current.getNextPosition("Alice", "No Preference", "opening");
      expect(["OG", "OO"]).toContain(pos);
    });

    it("handles closing half round type", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const pos = result.current.getNextPosition("Alice", "No Preference", "closing");
      expect(["CG", "CO"]).toContain(pos);
    });

    it("handles unknown debater name (no history entry)", () => {
      const history = { Bob: ["OG", "OO"] };
      const { result } = renderHook(() => usePositionAssignment(history));
      const pos = result.current.getNextPosition("Alice", "No Preference", "full");
      expect(pos).toBe("OG"); // No history for Alice
    });
  });

  describe("assignPositionsInChamber", () => {
    it("assigns unique positions to all teams", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const chamber = {
        roundType: "full",
        teams: [
          { members: [{ name: "A" }, { name: "B" }], preference: "No Preference" },
          { members: [{ name: "C" }, { name: "D" }], preference: "No Preference" },
          { members: [{ name: "E" }, { name: "F" }], preference: "No Preference" },
          { members: [{ name: "G" }, { name: "H" }], preference: "No Preference" },
        ],
        hasIron: false,
      };
      const assigned = result.current.assignPositionsInChamber(chamber);
      const positions = assigned.teams.map((t) => t.position);
      // All 4 positions should be unique
      expect(new Set(positions).size).toBe(4);
      expect(positions.every((p) => ["OG", "OO", "CG", "CO"].includes(p))).toBe(true);
    });

    it("assigns positions to opening half round", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const chamber = {
        roundType: "opening",
        teams: [
          { members: [{ name: "A" }, { name: "B" }], preference: "No Preference" },
          { members: [{ name: "C" }, { name: "D" }], preference: "No Preference" },
        ],
        hasIron: false,
      };
      const assigned = result.current.assignPositionsInChamber(chamber);
      const positions = assigned.teams.map((t) => t.position);
      expect(positions.every((p) => ["OG", "OO"].includes(p))).toBe(true);
      expect(new Set(positions).size).toBe(2);
    });

    it("assigns iron person position", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const chamber = {
        roundType: "full",
        teams: [
          { members: [{ name: "A" }, { name: "B" }], preference: "No Preference" },
          { members: [{ name: "C" }, { name: "D" }], preference: "No Preference" },
          { members: [{ name: "E" }, { name: "F" }], preference: "No Preference" },
        ],
        hasIron: true,
        ironPerson: { name: "Iron", preference: "No Preference" },
        ironPosition: null,
      };
      const assigned = result.current.assignPositionsInChamber(chamber);
      expect(assigned.ironPosition).toBeTruthy();
      expect(["OG", "OO", "CG", "CO"]).toContain(assigned.ironPosition);
      // Iron position should not overlap with team positions
      const teamPositions = assigned.teams.map((t) => t.position);
      expect(teamPositions).not.toContain(assigned.ironPosition);
    });

    it("handles single-member team", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const chamber = {
        roundType: "opening",
        teams: [
          { members: [{ name: "Solo" }], preference: "No Preference" },
          { members: [{ name: "A" }, { name: "B" }], preference: "No Preference" },
        ],
        hasIron: false,
      };
      const assigned = result.current.assignPositionsInChamber(chamber);
      expect(assigned.teams.every((t) => t.position !== null)).toBe(true);
    });

    it("respects team preferences during assignment", () => {
      const { result } = renderHook(() => usePositionAssignment({}));
      const chamber = {
        roundType: "full",
        teams: [
          { members: [{ name: "A" }, { name: "B" }], preference: "Opening Half" },
          { members: [{ name: "C" }, { name: "D" }], preference: "Closing Half" },
          { members: [{ name: "E" }, { name: "F" }], preference: "No Preference" },
          { members: [{ name: "G" }, { name: "H" }], preference: "No Preference" },
        ],
        hasIron: false,
      };
      const assigned = result.current.assignPositionsInChamber(chamber);
      // Team with Opening Half preference should get OG or OO
      expect(["OG", "OO"]).toContain(assigned.teams[0].position);
      // Team with Closing Half preference should get CG or CO
      expect(["CG", "CO"]).toContain(assigned.teams[1].position);
    });
  });
});
