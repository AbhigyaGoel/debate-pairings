import { useCallback } from 'react';
import { ROUND_TYPES } from '../utils/constants';

export const usePositionAssignment = (positionHistory) => {
  const getNextPosition = useCallback((debaterName, preference, chamberRoundType) => {
    const availablePositions = ROUND_TYPES[chamberRoundType].positions;
    const history = positionHistory[debaterName] || [];
    const preferenceMap = {
      "Opening Half": ["OG", "OO"],
      "Closing Half": ["CG", "CO"]
    };

    const getPreferred = () => preferenceMap[preference]?.find((p) => availablePositions.includes(p));

    if (history.length === 0) return getPreferred() || availablePositions[0];

    const positionsDone = new Set(history);
    const positionsNotDone = availablePositions.filter((p) => !positionsDone.has(p));

    if (positionsNotDone.length === 0) return getPreferred() || availablePositions[0];

    let candidatePositions = positionsNotDone;
    if (preference && preferenceMap[preference]) {
      const preferred = preferenceMap[preference].filter((p) => positionsNotDone.includes(p));
      if (preferred.length > 0) candidatePositions = preferred;
    }

    return candidatePositions[0];
  }, [positionHistory]);

  const assignPositionsInChamber = useCallback((chamber) => {
    const availablePositions = ROUND_TYPES[chamber.roundType].positions;
    const takenPositions = new Set();

    chamber.teams.forEach((team) => {
      const teamPreference = team.preference;
      const member1Pos = getNextPosition(team.members[0].name, teamPreference, chamber.roundType);
      const member2Pos = team.members[1] ? getNextPosition(team.members[1].name, teamPreference, chamber.roundType) : member1Pos;

      let assignedPos = null;
      if (member1Pos === member2Pos && !takenPositions.has(member1Pos)) assignedPos = member1Pos;
      else if (!takenPositions.has(member1Pos)) assignedPos = member1Pos;
      else if (team.members[1] && !takenPositions.has(member2Pos)) assignedPos = member2Pos;

      if (assignedPos) {
        team.position = assignedPos;
        takenPositions.add(assignedPos);
      }
    });

    chamber.teams.forEach((team) => {
      if (!team.position) {
        const available = availablePositions.find((p) => !takenPositions.has(p));
        if (available) {
          team.position = available;
          takenPositions.add(available);
        }
      }
    });

    if (chamber.hasIron && chamber.ironPerson) {
      const ironPreference = chamber.ironPerson.preference || "No Preference";
      const ironPos = getNextPosition(chamber.ironPerson.name, ironPreference, chamber.roundType);
      const assignedIronPos = !takenPositions.has(ironPos) ? ironPos : availablePositions.find((p) => !takenPositions.has(p));

      if (assignedIronPos) {
        chamber.ironPosition = assignedIronPos;
        takenPositions.add(assignedIronPos);
      }
    }

    return chamber;
  }, [getNextPosition]);

  return { getNextPosition, assignPositionsInChamber };
};
