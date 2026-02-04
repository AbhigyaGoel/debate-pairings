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
