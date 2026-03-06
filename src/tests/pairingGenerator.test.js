import { renderHook, act } from "@testing-library/react";
import { usePairingGenerator } from "../hooks/usePairingGenerator";

// Helper to make participant objects
const makePerson = (name, opts = {}) => ({
  name,
  role: opts.role || "Debate",
  experience: opts.experience || "General",
  partner: opts.partner || "",
  preference: opts.preference || "No Preference",
  halfRound: opts.halfRound || "",
});

describe("usePairingGenerator", () => {
  let spectators;
  let alerts;
  const setSpectators = (fn) => {
    spectators = typeof fn === "function" ? fn(spectators) : fn;
  };
  const setAlerts = (fn) => {
    alerts = typeof fn === "function" ? fn(alerts) : fn;
  };

  beforeEach(() => {
    spectators = [];
    alerts = [];
  });

  describe("createTeams", () => {
    it("pairs two partners together", () => {
      const participants = [
        makePerson("Alice", { partner: "Bob" }),
        makePerson("Bob", { partner: "Alice" }),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      expect(teams).toHaveLength(1);
      expect(teams[0].members.map((m) => m.name).sort()).toEqual(["Alice", "Bob"]);
    });

    it("pairs singles of same experience together", () => {
      const participants = [
        makePerson("A", { experience: "Competitive" }),
        makePerson("B", { experience: "Competitive" }),
        makePerson("C", { experience: "General" }),
        makePerson("D", { experience: "General" }),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      expect(teams).toHaveLength(2);
      // Teams should be same-experience
      teams.forEach((team) => {
        const exps = team.members.map((m) => m.experience);
        expect(exps[0]).toBe(exps[1]);
      });
    });

    it("cross-matches leftover singles across experience levels", () => {
      const participants = [
        makePerson("A", { experience: "Competitive" }),
        makePerson("B", { experience: "Competitive" }),
        makePerson("C", { experience: "Competitive" }),
        makePerson("D", { experience: "General" }),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      expect(teams).toHaveLength(2);
      // One team should be mixed
      const mixed = teams.find(
        (t) => t.members[0].experience !== t.members[1].experience
      );
      expect(mixed).toBeTruthy();
    });

    it("creates solo team when odd number of debaters", () => {
      const participants = [
        makePerson("A"),
        makePerson("B"),
        makePerson("C"),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      // Should have 1 pair + 1 solo
      expect(teams).toHaveLength(2);
      const solo = teams.find((t) => t.members.length === 1);
      expect(solo).toBeTruthy();
    });

    it("separates judges from debaters", () => {
      const participants = [
        makePerson("A"),
        makePerson("B"),
        makePerson("Judge1", { role: "Judge" }),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams, judges } = result.current.createTeams();
      expect(teams).toHaveLength(1);
      expect(judges).toHaveLength(1);
      expect(judges[0].name).toBe("Judge1");
    });

    it("separates spectators from debaters", () => {
      const participants = [
        makePerson("A"),
        makePerson("B"),
        makePerson("Watcher", { role: "Spectate" }),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      result.current.createTeams();
      expect(spectators).toHaveLength(1);
      expect(spectators[0].name).toBe("Watcher");
    });

    it("handles partner that is not in participants (phantom partner)", () => {
      const participants = [
        makePerson("Alice", { partner: "Ghost" }),
        makePerson("Bob"),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      // Alice should be paired with phantom "Ghost", Bob is solo
      const aliceTeam = teams.find((t) => t.members.some((m) => m.name === "Alice"));
      expect(aliceTeam.members.map((m) => m.name)).toContain("Ghost");
    });

    it("partner matching is case-insensitive", () => {
      const participants = [
        makePerson("Alice", { partner: "BOB" }),
        makePerson("Bob"),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      expect(teams).toHaveLength(1);
      expect(teams[0].members.map((m) => m.name).sort()).toEqual(["Alice", "Bob"]);
    });

    it("partner matching works with first-name prefix", () => {
      const participants = [
        makePerson("Alice", { partner: "Cameron" }),
        makePerson("Cameron Coolidge"),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      expect(teams).toHaveLength(1);
      expect(teams[0].members.map((m) => m.name).sort()).toEqual(["Alice", "Cameron Coolidge"]);
    });

    it("does not double-pair a person", () => {
      const participants = [
        makePerson("Alice", { partner: "Bob" }),
        makePerson("Bob", { partner: "Alice" }),
        makePerson("Charlie", { partner: "Bob" }), // Bob already taken
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      // Alice+Bob = 1 team. Charlie gets a phantom "Bob"
      const allMembers = teams.flatMap((t) => t.members.map((m) => m.name));
      // "Alice" appears once, "Bob" appears twice (real + phantom), "Charlie" once
      expect(allMembers.filter((n) => n === "Alice")).toHaveLength(1);
    });

    it("handles empty participants", () => {
      const participants = [];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams, judges } = result.current.createTeams();
      expect(teams).toHaveLength(0);
      expect(judges).toHaveLength(0);
    });

    it("team experience is Competitive if either member is Competitive", () => {
      const participants = [
        makePerson("A", { experience: "Competitive", partner: "B" }),
        makePerson("B", { experience: "General" }),
      ];
      const { result } = renderHook(() =>
        usePairingGenerator(participants, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams();
      expect(teams[0].experience).toBe("Competitive");
    });

    it("overrideParticipants takes precedence", () => {
      const original = [makePerson("A"), makePerson("B")];
      const override = [makePerson("X"), makePerson("Y")];
      const { result } = renderHook(() =>
        usePairingGenerator(original, setSpectators, setAlerts, [])
      );
      const { teams } = result.current.createTeams(override);
      const names = teams.flatMap((t) => t.members.map((m) => m.name));
      expect(names).toContain("X");
      expect(names).toContain("Y");
      expect(names).not.toContain("A");
    });
  });

  describe("createChambers", () => {
    it("creates chambers with 4 teams each for full round", () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i}`,
        members: [{ name: `P${i * 2}` }, { name: `P${i * 2 + 1}` }],
        experience: "General",
        preference: "No Preference",
        halfRound: "",
      }));
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers(teams, "full");
      expect(chambers).toHaveLength(2);
      chambers.forEach((c) => {
        expect(c.teams).toHaveLength(4);
        expect(c.roundType).toBe("full");
      });
    });

    it("creates chambers with 2 teams each for opening half", () => {
      const teams = Array.from({ length: 4 }, (_, i) => ({
        id: `team-${i}`,
        members: [{ name: `P${i * 2}` }, { name: `P${i * 2 + 1}` }],
        experience: "General",
        preference: "No Preference",
        halfRound: "",
      }));
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers(teams, "opening");
      expect(chambers).toHaveLength(2);
      chambers.forEach((c) => {
        expect(c.teams).toHaveLength(2);
        expect(c.roundType).toBe("opening");
      });
    });

    it("separates experience levels into different chambers when possible", () => {
      const teams = [
        { id: "t0", members: [{ name: "C1" }, { name: "C2" }], experience: "Competitive", halfRound: "" },
        { id: "t1", members: [{ name: "C3" }, { name: "C4" }], experience: "Competitive", halfRound: "" },
        { id: "t2", members: [{ name: "C5" }, { name: "C6" }], experience: "Competitive", halfRound: "" },
        { id: "t3", members: [{ name: "C7" }, { name: "C8" }], experience: "Competitive", halfRound: "" },
        { id: "t4", members: [{ name: "G1" }, { name: "G2" }], experience: "General", halfRound: "" },
        { id: "t5", members: [{ name: "G3" }, { name: "G4" }], experience: "General", halfRound: "" },
        { id: "t6", members: [{ name: "G5" }, { name: "G6" }], experience: "General", halfRound: "" },
        { id: "t7", members: [{ name: "G7" }, { name: "G8" }], experience: "General", halfRound: "" },
      ];
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers(teams, "full");
      expect(chambers).toHaveLength(2);
      // Each chamber should be single-experience
      chambers.forEach((c) => {
        expect(c.mixed).toBe(false);
      });
    });

    it("sends leftover single team to spectators in half round", () => {
      const teams = [
        { id: "t0", members: [{ name: "A" }, { name: "B" }], experience: "General", halfRound: "" },
        { id: "t1", members: [{ name: "C" }, { name: "D" }], experience: "General", halfRound: "" },
        { id: "t2", members: [{ name: "E" }, { name: "F" }], experience: "General", halfRound: "" },
      ];
      spectators = [];
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers(teams, "opening");
      expect(chambers).toHaveLength(1);
      // Third team's members should become spectators
      expect(spectators.length).toBeGreaterThan(0);
    });

    it("assigns room names sequentially", () => {
      const teams = Array.from({ length: 8 }, (_, i) => ({
        id: `team-${i}`,
        members: [{ name: `P${i * 2}` }, { name: `P${i * 2 + 1}` }],
        experience: "General",
        halfRound: "",
      }));
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers(teams, "full");
      chambers.forEach((c, i) => {
        expect(c.room).toBe(`Room ${i + 1}`);
      });
    });

    it("handles half-round routing: teams with halfRound go to correct chamber type", () => {
      const teams = [
        // 4 full-round teams
        { id: "t0", members: [{ name: "A" }, { name: "B" }], experience: "General", halfRound: "" },
        { id: "t1", members: [{ name: "C" }, { name: "D" }], experience: "General", halfRound: "" },
        { id: "t2", members: [{ name: "E" }, { name: "F" }], experience: "General", halfRound: "" },
        { id: "t3", members: [{ name: "G" }, { name: "H" }], experience: "General", halfRound: "" },
        // 2 opening-half teams
        { id: "t4", members: [{ name: "I" }, { name: "J" }], experience: "General", halfRound: "Opening Half" },
        { id: "t5", members: [{ name: "K" }, { name: "L" }], experience: "General", halfRound: "Opening Half" },
      ];
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers(teams, "full");
      const fullChambers = chambers.filter((c) => c.roundType === "full");
      const openingChambers = chambers.filter((c) => c.roundType === "opening");
      expect(fullChambers.length).toBeGreaterThanOrEqual(1);
      expect(openingChambers.length).toBeGreaterThanOrEqual(1);
    });

    it("handles empty teams array", () => {
      const { result } = renderHook(() =>
        usePairingGenerator([], setSpectators, setAlerts, [])
      );
      const chambers = result.current.createChambers([], "full");
      expect(chambers).toHaveLength(0);
    });
  });
});
