import { useCallback } from 'react';
import { useDragDrop } from '../contexts/DragDropContext';

export const useDragDropHandlers = (
  chambers,
  setChambers,
  spectators,
  setSpectators,
  sessionPositions,
  setSessionPositions,
  setAlerts
) => {
  const { draggedItem, setDraggedItem, setDragOverTarget, touchStartRef } = useDragDrop();

  const handleDragStart = useCallback((e, dragType, data) => {
    if (e.touches) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, dragType, data };
      return;
    }
    setDraggedItem({ type: dragType, ...data });
    e.dataTransfer.effectAllowed = 'move';
  }, [setDraggedItem, touchStartRef]);

  const handleDragEnd = useCallback((e) => {
    e.preventDefault();
    setDraggedItem(null);
    setDragOverTarget(null);
  }, [setDraggedItem, setDragOverTarget]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDragEnter = useCallback((e, target) => {
    e.preventDefault();
    setDragOverTarget(target);
  }, [setDragOverTarget]);

  const handleDragLeave = useCallback(() => {
    setDragOverTarget(null);
  }, [setDragOverTarget]);

  const handleDrop = useCallback((e, dropTarget) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    if (!draggedItem || !dropTarget?.type) {
      setDraggedItem(null);
      return;
    }

    if (draggedItem.type === "person" && draggedItem.source === dropTarget.type && 
        draggedItem.chamberIdx === dropTarget.chamberIdx && draggedItem.position === dropTarget.position) {
      setDraggedItem(null);
      return;
    }

    if (draggedItem.type === "team" && draggedItem.chamberIdx === dropTarget.chamberIdx && 
        draggedItem.position === dropTarget.position) {
      setDraggedItem(null);
      return;
    }

    try {
      const newChambers = [...chambers];
      const newSpectators = [...spectators];
      let newHistory = { ...sessionPositions };

      const updateHistory = (personName, position) => {
        if (!position) return;
        if (!newHistory[personName]) newHistory[personName] = [];
        const lastPos = newHistory[personName][newHistory[personName].length - 1];
        if (lastPos !== position) newHistory[personName].push(position);
      };

      if (draggedItem.type === "person") {
        const sourcePerson = draggedItem.person;
        let replacedPerson = null, replacedPersonIndex = null, sourcePersonIndex = null;

        // Remove person being replaced at target
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          const targetTeam = targetChamber.teams.find((t) => t.position === dropTarget.position);
          if (targetTeam && targetTeam.members.length > 0) {
            if (targetTeam.members.length === 2 || dropTarget.memberIdx !== undefined) {
              const replaceIdx = dropTarget.memberIdx !== undefined ? dropTarget.memberIdx : 0;
              if (targetTeam.members[replaceIdx]) {
                replacedPerson = targetTeam.members[replaceIdx];
                replacedPersonIndex = replaceIdx;
                targetTeam.members.splice(replaceIdx, 1);
              }
            }
          }
        } else if (dropTarget.type === "iron") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          if (targetChamber.ironPerson) {
            replacedPerson = targetChamber.ironPerson;
            targetChamber.ironPerson = null;
          }
        }

        // Remove source person
        if (draggedItem.source === "position") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          const sourceTeam = sourceChamber.teams.find((t) => t.members.some((m) => m.name === sourcePerson.name));
          if (sourceTeam) {
            const memberIdx = sourceTeam.members.findIndex((m) => m.name === sourcePerson.name);
            if (memberIdx !== -1) {
              sourcePersonIndex = memberIdx;
              sourceTeam.members.splice(memberIdx, 1);
              if (sourceTeam.members.length === 0 && sourceTeam.position === null) {
                const teamIdx = sourceChamber.teams.findIndex((t) => t.id === sourceTeam.id);
                sourceChamber.teams.splice(teamIdx, 1);
              }
            }
          }
        } else if (draggedItem.source === "iron") {
          newChambers[draggedItem.chamberIdx].ironPerson = null;
        } else if (draggedItem.source === "judge") {
          const judgeIdx = newChambers[draggedItem.chamberIdx].judges.findIndex((j) => j.name === sourcePerson.name);
          if (judgeIdx !== -1) newChambers[draggedItem.chamberIdx].judges.splice(judgeIdx, 1);
        } else if (draggedItem.source === "spectator") {
          const spectatorIdx = newSpectators.findIndex((s) => s.name === sourcePerson.name);
          if (spectatorIdx !== -1) newSpectators.splice(spectatorIdx, 1);
        }

        // Place source person at target
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          let targetTeam = targetChamber.teams.find((t) => t.position === dropTarget.position);
          if (!targetTeam) {
            targetTeam = {
              id: `team-new-${Date.now()}`,
              members: [],
              experience: sourcePerson.experience,
              position: dropTarget.position
            };
            targetChamber.teams.push(targetTeam);
          }
          if (replacedPersonIndex !== null && replacedPersonIndex <= targetTeam.members.length) {
            targetTeam.members.splice(replacedPersonIndex, 0, sourcePerson);
          } else {
            targetTeam.members.push(sourcePerson);
          }
          updateHistory(sourcePerson.name, dropTarget.position);
        } else if (dropTarget.type === "iron") {
          newChambers[dropTarget.chamberIdx].ironPerson = sourcePerson;
          updateHistory(sourcePerson.name, newChambers[dropTarget.chamberIdx].ironPosition);
        } else if (dropTarget.type === "judge") {
          newChambers[dropTarget.chamberIdx].judges.push(sourcePerson);
        } else if (dropTarget.type === "spectator") {
          newSpectators.push(sourcePerson);
        }

        // Place replaced person at source (swap)
        if (replacedPerson) {
          if (draggedItem.source === "position") {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            let sourceTeam = sourceChamber.teams.find((t) => t.position === draggedItem.position);
            if (!sourceTeam) {
              sourceTeam = {
                id: `team-new-${Date.now()}`,
                members: [],
                experience: replacedPerson.experience,
                position: draggedItem.position
              };
              sourceChamber.teams.push(sourceTeam);
            }
            if (sourceTeam.members.length < 2) {
              if (sourcePersonIndex !== null && sourcePersonIndex <= sourceTeam.members.length) {
                sourceTeam.members.splice(sourcePersonIndex, 0, replacedPerson);
              } else {
                sourceTeam.members.push(replacedPerson);
              }
              updateHistory(replacedPerson.name, draggedItem.position);
            } else {
              newSpectators.push(replacedPerson);
            }
          } else if (draggedItem.source === "iron") {
            newChambers[draggedItem.chamberIdx].ironPerson = replacedPerson;
            updateHistory(replacedPerson.name, newChambers[draggedItem.chamberIdx].ironPosition);
          } else if (draggedItem.source === "judge") {
            newChambers[draggedItem.chamberIdx].judges.push(replacedPerson);
          } else if (draggedItem.source === "spectator") {
            newSpectators.push(replacedPerson);
          }
        }
      } else if (draggedItem.type === "team") {
        const sourceTeam = draggedItem.team;
        if (dropTarget.type === "position") {
          const targetChamber = newChambers[dropTarget.chamberIdx];
          const targetTeam = targetChamber.teams.find((t) => t.position === dropTarget.position);
          if (targetTeam) {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            const sourceTeamIdx = sourceChamber.teams.findIndex((t) => t.id === sourceTeam.id);
            const targetTeamIdx = targetChamber.teams.findIndex((t) => t.id === targetTeam.id);
            const tempTeam = sourceChamber.teams[sourceTeamIdx];
            sourceChamber.teams[sourceTeamIdx] = targetTeam;
            targetChamber.teams[targetTeamIdx] = tempTeam;
            sourceChamber.teams[sourceTeamIdx].position = draggedItem.position;
            targetChamber.teams[targetTeamIdx].position = dropTarget.position;
            sourceTeam.members.forEach((m) => updateHistory(m.name, dropTarget.position));
            targetTeam.members.forEach((m) => updateHistory(m.name, draggedItem.position));
          } else {
            const sourceChamber = newChambers[draggedItem.chamberIdx];
            const sourceTeamIdx = sourceChamber.teams.findIndex((t) => t.id === sourceTeam.id);
            if (draggedItem.chamberIdx === dropTarget.chamberIdx) {
              sourceChamber.teams[sourceTeamIdx].position = dropTarget.position;
            } else {
              const [movedTeam] = sourceChamber.teams.splice(sourceTeamIdx, 1);
              movedTeam.position = dropTarget.position;
              targetChamber.teams.push(movedTeam);
            }
            sourceTeam.members.forEach((m) => updateHistory(m.name, dropTarget.position));
          }
        } else if (dropTarget.type === "spectator") {
          const sourceChamber = newChambers[draggedItem.chamberIdx];
          const sourceTeamIdx = sourceChamber.teams.findIndex((t) => t.id === sourceTeam.id);
          if (sourceTeamIdx !== -1) {
            sourceTeam.members.forEach((member) => newSpectators.push(member));
            sourceChamber.teams.splice(sourceTeamIdx, 1);
          }
        }
      }

      setSessionPositions(newHistory);
      setChambers(newChambers);
      setSpectators(newSpectators);
    } catch (error) {
      console.error("Drop error:", error);
      setAlerts((prev) => [...prev, {
        type: "error",
        message: "Error during drag and drop. Please try again."
      }]);
    } finally {
      setDraggedItem(null);
      setDragOverTarget(null);
    }
  }, [draggedItem, chambers, spectators, sessionPositions, setDraggedItem, setDragOverTarget, setChambers, setSpectators, setSessionPositions, setAlerts]);

  return {
    onDragStart: handleDragStart,
    onDragEnd: handleDragEnd,
    onDragOver: handleDragOver,
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDrop: handleDrop
  };
};
