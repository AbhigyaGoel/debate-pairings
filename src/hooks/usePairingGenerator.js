import { useCallback } from "react";
import {
  filterByRole,
  isDebater,
  shuffleArray,
  flattenTeamsToPeople,
  normalizeName,
} from "../utils/helpers";
import { IRON_SCENARIOS } from "../utils/constants";

// Fuzzy partner lookup: exact → case-insensitive → first-name → substring
const findPartnerMatch = (partnerName, debaters, processed, requesterName) => {
  const lower = partnerName.toLowerCase().trim();
  if (!lower) return null;
  const isCandidate = (o) => !processed.has(o.name) && o.name !== requesterName;

  // Exact match
  let match = debaters.find(
    (o) => o.name === partnerName && isCandidate(o)
  );
  if (match) return match;

  // Case-insensitive full match
  match = debaters.find(
    (o) => normalizeName(o.name) === normalizeName(partnerName) && isCandidate(o)
  );
  if (match) return match;

  // partnerName matches the start of someone's full name (e.g. "Cameron" → "Cameron Coolidge")
  match = debaters.find(
    (o) => o.name.toLowerCase().startsWith(lower) && isCandidate(o)
  );
  if (match) return match;

  // partnerName is contained in someone's full name (e.g. "Abhigya" in "Abhigya Goel")
  match = debaters.find(
    (o) => o.name.toLowerCase().includes(lower) && isCandidate(o)
  );
  if (match) return match;

  return null;
};


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

export const usePairingGenerator = (participants, setSpectators, setAlerts, rosterMembers) => {
  const createTeams = useCallback((overrideParticipants) => {
    const p = overrideParticipants || participants;
    const teams = [],
      processed = new Set();
    const singles = {
      Competitive: [],
      General: [],
    };

    const judgeList = filterByRole(p, "judg");
    const explicitSpectators = filterByRole(p, "spectat");
    const debaters = p.filter(isDebater);

    const activeDebaters = [...debaters];

    activeDebaters.forEach((person) => {
      if (processed.has(person.name)) return;
      const partnerName = (person.partner || "").trim();

      if (partnerName) {
        let partner = findPartnerMatch(partnerName, activeDebaters, processed, person.name);

        if (!partner) {
          // Try to resolve partial name against roster before creating phantom
          let resolvedName = partnerName;
          if (rosterMembers && rosterMembers.length > 0) {
            const lower = partnerName.toLowerCase().trim();
            const rosterMatch =
              rosterMembers.find((m) => m.name.toLowerCase().startsWith(lower)) ||
              rosterMembers.find((m) => m.name.toLowerCase().includes(lower));
            if (rosterMatch) resolvedName = rosterMatch.name;
          }
          partner = {
            name: resolvedName,
            partner: "",
            experience: person.experience,
            preference: "No Preference",
            role: "Debate",
          };
        }

        const teamExperience =
          person.experience === "Competitive" || partner.experience === "Competitive"
            ? "Competitive"
            : "General";
        teams.push({
          id: `team-${teams.length}`,
          members: [person, partner],
          experience: teamExperience,
          preference: person.preference || "No Preference",
          halfRound: person.halfRound || partner.halfRound || "",
        });
        processed.add(person.name);
        processed.add(partner.name);
      } else {
        singles[person.experience].push(person);
        processed.add(person.name);
      }
    });

    const leftoverSingles = [];
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

      if (levelSingles.length % 2 === 1) {
        leftoverSingles.push(levelSingles[levelSingles.length - 1]);
      }
    });

    // Cross-match leftover singles across experience levels
    for (let i = 0; i < leftoverSingles.length - 1; i += 2) {
      const a = leftoverSingles[i];
      const b = leftoverSingles[i + 1];
      const teamExperience =
        a.experience === "Competitive" || b.experience === "Competitive"
          ? "Competitive"
          : "General";
      teams.push({
        id: `team-${teams.length}`,
        members: [a, b],
        experience: teamExperience,
        preference: "No Preference",
        halfRound: a.halfRound || b.halfRound || "",
      });
    }

    // If still one leftover, they become a solo team
    if (leftoverSingles.length % 2 === 1) {
      const last = leftoverSingles[leftoverSingles.length - 1];
      teams.push({
        id: `team-${teams.length}`,
        members: [last],
        experience: last.experience,
        preference: "No Preference",
        halfRound: last.halfRound || "",
      });
    }

    setSpectators(explicitSpectators);
    return { teams, judges: judgeList };
  }, [participants, setSpectators, rosterMembers]);

  const createChambers = useCallback(
    (teams) => {
      const chamberList = [];
      const fullRoundTeams = teams.filter(
        (t) =>
          !t.halfRound ||
          t.halfRound.toLowerCase() === "no" ||
          t.halfRound === "",
      );
      const openingHalfTeams = teams.filter(
        (t) => t.halfRound && t.halfRound.toLowerCase().includes("opening"),
      );
      const closingHalfTeams = teams.filter(
        (t) => t.halfRound && t.halfRound.toLowerCase().includes("closing"),
      );

      const teamsByExperience = {
        Competitive: [],
        General: [],
      };

      fullRoundTeams.forEach((team) =>
        teamsByExperience[team.experience].push(team),
      );
      Object.keys(teamsByExperience).forEach((level) => {
        teamsByExperience[level] = shuffleArray(teamsByExperience[level]);
      });

      Object.keys(teamsByExperience).forEach((level) => {
        const levelTeams = teamsByExperience[level];
        while (levelTeams.length >= 4) {
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
        }
      });

      const [remainingCompetitive, remainingGeneral] = [
        teamsByExperience["Competitive"],
        teamsByExperience["General"],
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
          if (chamberTeams.length === 4) {
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
        }
      };

      mixTeams(remainingCompetitive, remainingGeneral);

      const allRemaining = [...remainingCompetitive, ...remainingGeneral];
      const totalPeople = allRemaining.reduce(
        (sum, team) => sum + team.members.length,
        0,
      );

      if (totalPeople === IRON_SCENARIOS.FULL_ROUND_3_TEAMS) {
        // 7 people = 3 full teams + 1 iron
        const flatPeople = flattenTeamsToPeople(allRemaining);
        chamberList.push(
          createIronChamber(flatPeople, chamberList.length, "full"),
        );
      } else if (totalPeople === IRON_SCENARIOS.FULL_ROUND_2_TEAMS) {
        // 5 people = 2 full teams + 1 iron
        const flatPeople = flattenTeamsToPeople(allRemaining);
        chamberList.push(
          createIronChamber(flatPeople, chamberList.length, "full"),
        );
      } else if (totalPeople === IRON_SCENARIOS.HALF_ROUND_1_TEAM) {
        // 3 people = 1 team + 1 iron - keep partnerships intact
        const soloTeam = allRemaining.find((t) => t.members.length === 1);
        const fullTeam = allRemaining.find((t) => t.members.length === 2);

        if (soloTeam && fullTeam) {
          chamberList.push({
            id: `chamber-${chamberList.length}`,
            room: `Room ${chamberList.length + 1}`,
            teams: [{ ...fullTeam, position: null }],
            ironPerson: soloTeam.members[0],
            ironPosition: null,
            judges: [],
            mixed: true,
            roundType: "opening",
            hasIron: true,
          });
        } else {
          // Fallback if no clear solo/pair
          const flatPeople = flattenTeamsToPeople(allRemaining);
          chamberList.push(
            createIronChamber(flatPeople, chamberList.length, "opening"),
          );
        }
      } else if (totalPeople === 1) {
        allRemaining.forEach((team) =>
          team.members.forEach((member) =>
            setSpectators((prev) => [...prev, member]),
          ),
        );
      } else if (allRemaining.length > 0) {
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: allRemaining.map((team) => ({ ...team, position: null })),
          judges: [],
          mixed: true,
          roundType: "full",
          hasIron: false,
        });
      }

      const processHalfRound = (teams, roundType) => {
        const shuffled = shuffleArray(teams);
        while (shuffled.length >= 2) {
          const chamberTeams = shuffled.splice(0, 2);
          chamberList.push({
            id: `chamber-${chamberList.length}`,
            room: `Room ${chamberList.length + 1}`,
            teams: chamberTeams.map((team) => ({ ...team, position: null })),
            judges: [],
            mixed: chamberTeams[0].experience !== chamberTeams[1].experience,
            roundType,
            hasIron: false,
          });
        }
        if (shuffled.length > 0) {
          setSpectators((prev) => {
            const newSpectators = [...prev];
            shuffled.forEach((team) =>
              team.members.forEach((member) => newSpectators.push(member)),
            );
            return newSpectators;
          });
        }
      };

      processHalfRound(openingHalfTeams, "opening");
      processHalfRound(closingHalfTeams, "closing");

      return chamberList;
    },
    [setSpectators],
  );

  return { createTeams, createChambers };
};
