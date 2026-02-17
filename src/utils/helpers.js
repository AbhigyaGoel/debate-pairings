export const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const filterByRole = (participants, roleKeyword) =>
  participants.filter((p) =>
    (p.role || "").toLowerCase().trim().includes(roleKeyword),
  );

export const isDebater = (person) => {
  const role = (person.role || "").toLowerCase().trim();
  return !role || role.includes("debat") || role === "";
};

export const flattenTeamsToPeople = (teams) =>
  teams.flatMap((team) => team.members);

export const normalizeName = (name) =>
  name.toLowerCase().replace(/\s+/g, " ").trim();

export const normalizeRole = (role) => {
  if (!role) return "Debate";
  const r = role.toLowerCase().trim();
  if (r.includes("judg")) return "Judge";
  if (r.includes("spectat")) return "Spectate";
  return "Debate";
};

export const levenshtein = (a, b) => {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
};

// Returns { match: string|null, distance: number }
export const findClosestMember = (name, members) => {
  const norm = normalizeName(name);
  let best = { match: null, distance: Infinity };
  for (const member of members) {
    const memberNorm = normalizeName(member.name);
    if (norm === memberNorm) return { match: member.name, distance: 0 };
    const dist = levenshtein(norm, memberNorm);
    if (dist < best.distance) best = { match: member.name, distance: dist };
  }
  return best;
};

export const removePersonFromPairings = (name, chambers, spectators) => {
  const norm = normalizeName(name);
  const newChambers = chambers.map((chamber) => {
    let newTeams = chamber.teams.map((team) => ({
      ...team,
      members: team.members.filter((m) => normalizeName(m.name) !== norm),
    })).filter((team) => team.members.length > 0);

    let { hasIron, ironPerson, ironPosition } = chamber;
    if (ironPerson && normalizeName(ironPerson.name) === norm) {
      hasIron = false;
      ironPerson = null;
      ironPosition = null;
    }

    const newJudges = (chamber.judges || []).filter(
      (j) => normalizeName(j.name) !== norm
    );

    return { ...chamber, teams: newTeams, judges: newJudges, hasIron, ironPerson, ironPosition };
  });

  const newSpectators = spectators.filter(
    (s) => normalizeName(s.name || s) !== norm
  );

  return { chambers: newChambers, spectators: newSpectators };
};

export const parseCSVLine = (line) => {
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
