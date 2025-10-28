import { useCallback } from 'react';
import { filterByRole, isDebater, normalizeExperience, shuffleArray, flattenTeamsToPeople } from '../utils/helpers';
import { MAX_SPECTATOR_PROPAGATION_ITERATIONS, IRON_SCENARIOS } from '../utils/constants';

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
    hasIron: true
  };
};

export const usePairingGenerator = (participants, setSpectators, setAlerts) => {
  const createTeams = useCallback(() => {
    const teams = [], processed = new Set();
    const singles = {
      "Returning Members": [],
      "Competitive Team Fall '25": [],
      "General Members": []
    };

    const judgeList = filterByRole(participants, "judg");
    const explicitSpectators = filterByRole(participants, "spectat");
    const debaters = participants.filter(isDebater);

    const spectatorNames = new Set();
    explicitSpectators.forEach((s) => spectatorNames.add(s.name));

    const propagateSpectators = () => {
      let changed = false;
      participants.forEach((person) => {
        const partnerName = (person.partner || "").trim();
        if (spectatorNames.has(person.name) && partnerName && !spectatorNames.has(partnerName)) {
          spectatorNames.add(partnerName);
          changed = true;
        }
        if (partnerName && spectatorNames.has(partnerName) && !spectatorNames.has(person.name)) {
          spectatorNames.add(person.name);
          changed = true;
        }
      });
      return changed;
    };

    let iterations = 0;
    while (propagateSpectators() && iterations < MAX_SPECTATOR_PROPAGATION_ITERATIONS) {
      iterations++;
    }

    const allSpectators = participants.filter((person) => spectatorNames.has(person.name));
    const activeDebaters = debaters.filter((p) => !spectatorNames.has(p.name));

    activeDebaters.forEach((person) => {
      if (processed.has(person.name)) return;
      const partnerName = (person.partner || "").trim();

      if (partnerName) {
        let partner = activeDebaters.find((other) => other.name === partnerName && !processed.has(other.name));

        if (partner && partner.experience !== person.experience) {
          setAlerts((prev) => [...prev, {
            type: "warning",
            message: `${person.name} and ${partner.name} have different experience levels - cannot form team`
          }]);
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
            role: "Debate"
          };
        }

        teams.push({
          id: `team-${teams.length}`,
          members: [person, partner],
          experience: normalizeExperience(person.experience),
          preference: person.preference || "No Preference",
          halfRound: person.halfRound || partner.halfRound || ""
        });
        processed.add(person.name);
        processed.add(partner.name);
      } else {
        singles[normalizeExperience(person.experience)].push(person);
        processed.add(person.name);
      }
    });

    Object.keys(singles).forEach((level) => {
      const levelSingles = singles[level];
      for (let i = 0; i < levelSingles.length - 1; i += 2) {
        teams.push({
          id: `team-${teams.length}`,
          members: [levelSingles[i], levelSingles[i + 1]],
          experience: level,
          preference: "No Preference",
          halfRound: levelSingles[i].halfRound || levelSingles[i + 1].halfRound || ""
        });
      }

      if (levelSingles.length % 2 === 1) {
        teams.push({
          id: `team-${teams.length}`,
          members: [levelSingles[levelSingles.length - 1]],
          experience: level,
          preference: "No Preference",
          halfRound: levelSingles[levelSingles.length - 1].halfRound || ""
        });
      }
    });

    setSpectators(allSpectators);
    return { teams, judges: judgeList };
  }, [participants, setSpectators, setAlerts]);

  const createChambers = useCallback((teams) => {
    const chamberList = [];
    const fullRoundTeams = teams.filter((t) => !t.halfRound || t.halfRound.toLowerCase() === "no" || t.halfRound === "");
    const openingHalfTeams = teams.filter((t) => t.halfRound && t.halfRound.toLowerCase().includes("opening"));
    const closingHalfTeams = teams.filter((t) => t.halfRound && t.halfRound.toLowerCase().includes("closing"));

    const teamsByExperience = {
      "Returning Members": [],
      "Competitive Team Fall '25": [],
      "General Members": []
    };

    fullRoundTeams.forEach((team) => teamsByExperience[team.experience].push(team));
    Object.keys(teamsByExperience).forEach((level) => {
      teamsByExperience[level] = shuffleArray(teamsByExperience[level]);
    });

    Object.keys(teamsByExperience).forEach((level) => {
      const levelTeams = teamsByExperience[level];
      while (levelTeams.length >= 4) {
        chamberList.push({
          id: `chamber-${chamberList.length}`,
          room: `Room ${chamberList.length + 1}`,
          teams: levelTeams.splice(0, 4).map((team) => ({ ...team, position: null })),
          judges: [],
          mixed: false,
          roundType: "full",
          hasIron: false
        });
      }
    });

    const [remainingReturning, remainingCompetitive, remainingGeneral] = [
      teamsByExperience["Returning Members"],
      teamsByExperience["Competitive Team Fall '25"],
      teamsByExperience["General Members"]
    ];

    const mixTeams = (arr1, arr2) => {
      while (arr1.length + arr2.length >= 4) {
        const chamberTeams = [];
        while (chamberTeams.length < 4 && (arr1.length > 0 || arr2.length > 0)) {
          if (arr1.length > 0) chamberTeams.push(arr1.shift());
          if (chamberTeams.length < 4 && arr2.length > 0) chamberTeams.push(arr2.shift());
        }
        if (chamberTeams.length === 4) {
          chamberList.push({
            id: `chamber-${chamberList.length}`,
            room: `Room ${chamberList.length + 1}`,
            teams: chamberTeams.map((team) => ({ ...team, position: null })),
            judges: [],
            mixed: true,
            roundType: "full",
            hasIron: false
          });
        }
      }
    };

    mixTeams(remainingCompetitive, remainingGeneral);
    mixTeams(remainingCompetitive, remainingReturning);
    mixTeams(remainingReturning, remainingGeneral);

    const allRemaining = [...remainingReturning, ...remainingCompetitive, ...remainingGeneral];
    const totalPeople = allRemaining.reduce((sum, team) => sum + team.members.length, 0);

    if (totalPeople === IRON_SCENARIOS.FULL_ROUND_3_TEAMS) {
      chamberList.push(createIronChamber(flattenTeamsToPeople(allRemaining), chamberList.length, "full"));
    } else if (totalPeople === IRON_SCENARIOS.FULL_ROUND_2_TEAMS) {
      chamberList.push(createIronChamber(flattenTeamsToPeople(allRemaining), chamberList.length, "full"));
    } else if (totalPeople === IRON_SCENARIOS.HALF_ROUND_1_TEAM) {
      chamberList.push(createIronChamber(flattenTeamsToPeople(allRemaining), chamberList.length, "opening"));
    } else if (totalPeople === 1) {
      allRemaining.forEach((team) => team.members.forEach((member) => setSpectators((prev) => [...prev, member])));
    } else if (allRemaining.length > 0) {
      chamberList.push({
        id: `chamber-${chamberList.length}`,
        room: `Room ${chamberList.length + 1}`,
        teams: allRemaining.map((team) => ({ ...team, position: null })),
        judges: [],
        mixed: true,
        roundType: "full",
        hasIron: false
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
          hasIron: false
        });
      }
      if (shuffled.length > 0) {
        setSpectators((prev) => {
          const newSpectators = [...prev];
          shuffled.forEach((team) => team.members.forEach((member) => newSpectators.push(member)));
          return newSpectators;
        });
      }
    };

    processHalfRound(openingHalfTeams, "opening");
    processHalfRound(closingHalfTeams, "closing");

    return chamberList;
  }, [setSpectators]);

  return { createTeams, createChambers };
};
