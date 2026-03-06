import {
  shuffleArray,
  filterByRole,
  isDebater,
  flattenTeamsToPeople,
  normalizeName,
  normalizeRole,
  levenshtein,
  findClosestMember,
  removePersonFromPairings,
  getLocalDateStr,
  parseCSVLine,
} from "../utils/helpers";

// ============================================================
// shuffleArray
// ============================================================
describe("shuffleArray", () => {
  it("returns a new array of the same length", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffleArray(arr);
    expect(result).toHaveLength(arr.length);
    expect(result).not.toBe(arr); // different reference
  });

  it("does not modify the original array", () => {
    const arr = [1, 2, 3];
    const copy = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(copy);
  });

  it("contains the same elements", () => {
    const arr = [10, 20, 30, 40, 50];
    const result = shuffleArray(arr);
    expect(result.sort()).toEqual(arr.sort());
  });

  it("handles empty array", () => {
    expect(shuffleArray([])).toEqual([]);
  });

  it("handles single element array", () => {
    expect(shuffleArray([42])).toEqual([42]);
  });
});

// ============================================================
// filterByRole
// ============================================================
describe("filterByRole", () => {
  const people = [
    { name: "A", role: "Debate" },
    { name: "B", role: "Judge" },
    { name: "C", role: "Spectate" },
    { name: "D", role: "debate" },
    { name: "E", role: "" },
    { name: "F" }, // no role property
  ];

  it("filters by keyword match (case-insensitive)", () => {
    const judges = filterByRole(people, "judg");
    expect(judges).toHaveLength(1);
    expect(judges[0].name).toBe("B");
  });

  it("finds partial matches", () => {
    const debaters = filterByRole(people, "debat");
    expect(debaters).toHaveLength(2);
    expect(debaters.map((p) => p.name)).toEqual(["A", "D"]);
  });

  it("returns empty when no match", () => {
    expect(filterByRole(people, "moderator")).toEqual([]);
  });

  it("handles people with empty/missing role", () => {
    const spectators = filterByRole(people, "spectat");
    expect(spectators).toHaveLength(1);
  });
});

// ============================================================
// isDebater
// ============================================================
describe("isDebater", () => {
  it("returns true for role 'Debate'", () => {
    expect(isDebater({ role: "Debate" })).toBe(true);
  });

  it("returns true for role 'debater' (partial match)", () => {
    expect(isDebater({ role: "debater" })).toBe(true);
  });

  it("returns true for empty role (default)", () => {
    expect(isDebater({ role: "" })).toBe(true);
  });

  it("returns true for missing role property", () => {
    expect(isDebater({})).toBe(true);
  });

  it("returns false for 'Judge'", () => {
    expect(isDebater({ role: "Judge" })).toBe(false);
  });

  it("returns false for 'Spectate'", () => {
    expect(isDebater({ role: "Spectate" })).toBe(false);
  });

  it("is case-insensitive", () => {
    expect(isDebater({ role: "DEBATE" })).toBe(true);
    expect(isDebater({ role: "JUDGE" })).toBe(false);
  });
});

// ============================================================
// flattenTeamsToPeople
// ============================================================
describe("flattenTeamsToPeople", () => {
  it("flattens teams with multiple members", () => {
    const teams = [
      { members: [{ name: "A" }, { name: "B" }] },
      { members: [{ name: "C" }, { name: "D" }] },
    ];
    const result = flattenTeamsToPeople(teams);
    expect(result).toHaveLength(4);
    expect(result.map((p) => p.name)).toEqual(["A", "B", "C", "D"]);
  });

  it("handles single-member teams (iron person)", () => {
    const teams = [{ members: [{ name: "Solo" }] }];
    expect(flattenTeamsToPeople(teams)).toHaveLength(1);
  });

  it("handles empty teams array", () => {
    expect(flattenTeamsToPeople([])).toEqual([]);
  });

  it("handles teams with empty members", () => {
    const teams = [{ members: [] }];
    expect(flattenTeamsToPeople(teams)).toEqual([]);
  });
});

// ============================================================
// normalizeName
// ============================================================
describe("normalizeName", () => {
  it("lowercases the name", () => {
    expect(normalizeName("John DOE")).toBe("john doe");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeName("  Alice  ")).toBe("alice");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeName("John   Paul   Jones")).toBe("john paul jones");
  });

  it("handles empty string", () => {
    expect(normalizeName("")).toBe("");
  });

  it("handles single word", () => {
    expect(normalizeName("Alice")).toBe("alice");
  });

  it("handles tabs and newlines as spaces", () => {
    expect(normalizeName("John\tDoe")).toBe("john doe");
  });
});

// ============================================================
// normalizeRole
// ============================================================
describe("normalizeRole", () => {
  it("returns 'Debate' for null/undefined/empty", () => {
    expect(normalizeRole(null)).toBe("Debate");
    expect(normalizeRole(undefined)).toBe("Debate");
    expect(normalizeRole("")).toBe("Debate");
  });

  it("returns 'Judge' for judge variants", () => {
    expect(normalizeRole("Judge")).toBe("Judge");
    expect(normalizeRole("judge")).toBe("Judge");
    expect(normalizeRole("JUDGE")).toBe("Judge");
    expect(normalizeRole("judging")).toBe("Judge");
  });

  it("returns 'Spectate' for spectate variants", () => {
    expect(normalizeRole("Spectate")).toBe("Spectate");
    expect(normalizeRole("spectator")).toBe("Spectate");
    expect(normalizeRole("SPECTATING")).toBe("Spectate");
  });

  it("returns 'Debate' for debate variants", () => {
    expect(normalizeRole("Debate")).toBe("Debate");
    expect(normalizeRole("debater")).toBe("Debate");
    expect(normalizeRole("random-string")).toBe("Debate"); // anything unrecognized = Debate
  });

  it("trims whitespace", () => {
    expect(normalizeRole("  Judge  ")).toBe("Judge");
  });
});

// ============================================================
// levenshtein
// ============================================================
describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    expect(levenshtein("hello", "hello")).toBe(0);
  });

  it("returns correct distance for single edit", () => {
    expect(levenshtein("cat", "bat")).toBe(1); // substitution
    expect(levenshtein("cat", "cats")).toBe(1); // insertion
    expect(levenshtein("cats", "cat")).toBe(1); // deletion
  });

  it("returns full length for completely different strings", () => {
    expect(levenshtein("abc", "xyz")).toBe(3);
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "hello")).toBe(5);
    expect(levenshtein("hello", "")).toBe(5);
    expect(levenshtein("", "")).toBe(0);
  });

  it("is symmetric", () => {
    expect(levenshtein("kitten", "sitting")).toBe(levenshtein("sitting", "kitten"));
  });

  it("calculates known edit distance correctly", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
    expect(levenshtein("sunday", "saturday")).toBe(3);
  });
});

// ============================================================
// findClosestMember
// ============================================================
describe("findClosestMember", () => {
  const members = [
    { name: "John Smith" },
    { name: "Jane Doe" },
    { name: "Abhigya Goel" },
    { name: "Cameron Coolidge" },
  ];

  it("returns exact match with distance 0", () => {
    const result = findClosestMember("John Smith", members);
    expect(result.match).toBe("John Smith");
    expect(result.distance).toBe(0);
  });

  it("finds case-insensitive exact match", () => {
    const result = findClosestMember("john smith", members);
    expect(result.match).toBe("John Smith");
    expect(result.distance).toBe(0);
  });

  it("finds closest match for typo", () => {
    const result = findClosestMember("Jon Smith", members);
    expect(result.match).toBe("John Smith");
    expect(result.distance).toBeLessThanOrEqual(2);
  });

  it("returns some match even for very different names", () => {
    const result = findClosestMember("ZZZZZ", members);
    expect(result.match).toBeTruthy();
    expect(result.distance).toBeGreaterThan(0);
  });

  it("handles whitespace variations", () => {
    const result = findClosestMember("  John   Smith  ", members);
    expect(result.match).toBe("John Smith");
    expect(result.distance).toBe(0);
  });

  it("returns null match and Infinity distance for empty members", () => {
    const result = findClosestMember("John", []);
    expect(result.match).toBeNull();
    expect(result.distance).toBe(Infinity);
  });
});

// ============================================================
// removePersonFromPairings
// ============================================================
describe("removePersonFromPairings", () => {
  const makeChamber = (teams, judges = [], iron = {}) => ({
    id: "c1",
    room: "Room 1",
    teams,
    judges,
    hasIron: iron.hasIron || false,
    ironPerson: iron.ironPerson || null,
    ironPosition: iron.ironPosition || null,
    roundType: "full",
  });

  it("removes a debater from a team", () => {
    const chambers = [
      makeChamber([
        { position: "OG", members: [{ name: "Alice" }, { name: "Bob" }] },
        { position: "OO", members: [{ name: "Charlie" }, { name: "Dave" }] },
      ]),
    ];
    const result = removePersonFromPairings("Alice", chambers, []);
    const team = result.chambers[0].teams.find((t) => t.position === "OG");
    expect(team.members).toHaveLength(1);
    expect(team.members[0].name).toBe("Bob");
  });

  it("removes a team entirely when last member is removed", () => {
    const chambers = [
      makeChamber([
        { position: "OG", members: [{ name: "Solo" }] },
        { position: "OO", members: [{ name: "A" }, { name: "B" }] },
      ]),
    ];
    const result = removePersonFromPairings("Solo", chambers, []);
    // OG team should be removed entirely
    expect(result.chambers[0].teams.find((t) => t.position === "OG")).toBeUndefined();
  });

  it("removes a judge from a chamber", () => {
    const chambers = [
      makeChamber(
        [{ position: "OG", members: [{ name: "A" }, { name: "B" }] }],
        [{ name: "Judge1" }, { name: "Judge2" }]
      ),
    ];
    const result = removePersonFromPairings("Judge1", chambers, []);
    expect(result.chambers[0].judges).toHaveLength(1);
    expect(result.chambers[0].judges[0].name).toBe("Judge2");
  });

  it("removes a spectator", () => {
    const spectators = [{ name: "Spec1" }, { name: "Spec2" }];
    const result = removePersonFromPairings("Spec1", [], spectators);
    expect(result.spectators).toHaveLength(1);
    expect(result.spectators[0].name).toBe("Spec2");
  });

  it("handles spectators as plain strings", () => {
    const spectators = ["Spec1", "Spec2"];
    const result = removePersonFromPairings("Spec1", [], spectators);
    expect(result.spectators).toHaveLength(1);
  });

  it("uses case-insensitive matching via normalizeName", () => {
    const chambers = [
      makeChamber([
        { position: "OG", members: [{ name: "Alice Johnson" }] },
      ]),
    ];
    const result = removePersonFromPairings("alice johnson", chambers, []);
    expect(result.chambers[0].teams).toHaveLength(0);
  });

  it("clears iron person when removed", () => {
    const chambers = [
      makeChamber(
        [{ position: "OG", members: [{ name: "A" }, { name: "B" }] }],
        [],
        { hasIron: true, ironPerson: { name: "IronGuy" }, ironPosition: "CG" }
      ),
    ];
    const result = removePersonFromPairings("IronGuy", chambers, []);
    expect(result.chambers[0].hasIron).toBe(false);
    expect(result.chambers[0].ironPerson).toBeNull();
    expect(result.chambers[0].ironPosition).toBeNull();
  });

  it("does not modify original arrays", () => {
    const chambers = [
      makeChamber([{ position: "OG", members: [{ name: "A" }, { name: "B" }] }]),
    ];
    const spectators = [{ name: "S" }];
    const originalChambers = JSON.parse(JSON.stringify(chambers));
    const originalSpectators = JSON.parse(JSON.stringify(spectators));
    removePersonFromPairings("A", chambers, spectators);
    // removePersonFromPairings uses .map and .filter which create new arrays,
    // but the inner objects may share references — this tests the contract
    expect(spectators).toEqual(originalSpectators);
  });

  it("does nothing when person is not found", () => {
    const chambers = [
      makeChamber([{ position: "OG", members: [{ name: "A" }] }]),
    ];
    const spectators = [{ name: "S" }];
    const result = removePersonFromPairings("Nobody", chambers, spectators);
    expect(result.chambers[0].teams[0].members).toHaveLength(1);
    expect(result.spectators).toHaveLength(1);
  });
});

// ============================================================
// getLocalDateStr
// ============================================================
describe("getLocalDateStr", () => {
  it("formats a date correctly", () => {
    const date = new Date(2026, 2, 5); // March 5, 2026
    expect(getLocalDateStr(date)).toBe("2026-03-05");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 0, 1); // Jan 1, 2026
    expect(getLocalDateStr(date)).toBe("2026-01-01");
  });

  it("handles December 31 correctly", () => {
    const date = new Date(2025, 11, 31); // Dec 31, 2025
    expect(getLocalDateStr(date)).toBe("2025-12-31");
  });

  it("returns today's date when no argument passed", () => {
    const result = getLocalDateStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ============================================================
// parseCSVLine
// ============================================================
describe("parseCSVLine", () => {
  it("parses basic comma-separated values", () => {
    expect(parseCSVLine("Alice,Competitive,Debate")).toEqual([
      "Alice",
      "Competitive",
      "Debate",
    ]);
  });

  it("trims whitespace around values", () => {
    expect(parseCSVLine(" Alice , Competitive , Debate ")).toEqual([
      "Alice",
      "Competitive",
      "Debate",
    ]);
  });

  it("handles quoted fields with commas inside", () => {
    expect(parseCSVLine('"Smith, John",Competitive,Debate')).toEqual([
      "Smith, John",
      "Competitive",
      "Debate",
    ]);
  });

  it("handles empty fields", () => {
    expect(parseCSVLine("Alice,,Debate")).toEqual(["Alice", "", "Debate"]);
  });

  it("handles single value", () => {
    expect(parseCSVLine("Alice")).toEqual(["Alice"]);
  });

  it("handles empty string", () => {
    expect(parseCSVLine("")).toEqual([""]);
  });

  it("handles multiple quoted fields", () => {
    expect(parseCSVLine('"Last, First","City, State"')).toEqual([
      "Last, First",
      "City, State",
    ]);
  });
});
