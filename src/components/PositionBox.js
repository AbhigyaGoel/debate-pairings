import React from 'react';
import { GripVertical, X } from 'lucide-react';
import { useDragDrop } from '../contexts/DragDropContext';
import { DraggablePerson } from './DraggablePerson';
import { POSITION_NAMES } from '../utils/constants';

export const PositionBox = ({
  chamber,
  chamberIdx,
  pos,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  onDeleteTeam,
}) => {
  const { dragOverTarget } = useDragDrop();
  const team = chamber.teams.find((t) => t.position === pos);
  const isDropZone = dragOverTarget?.type === "position" &&
                     dragOverTarget.chamberIdx === chamberIdx &&
                     dragOverTarget.position === pos;

  return (
    <div
      className={`rounded-xl p-3 sm:p-4 transition-all duration-150 ${
        isDropZone
          ? "bg-indigo-50 border-2 border-indigo-400 ring-2 ring-indigo-300/30"
          : "bg-gray-50 border border-gray-200"
      }`}
      data-drop-type="position"
      data-drop-chamber={chamberIdx}
      data-drop-position={pos}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(e, { type: "position", chamberIdx, position: pos })}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, { type: "position", chamberIdx, position: pos })}
    >
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{POSITION_NAMES[pos]}</div>
      {team && team.members.length > 0 ? (
        <div className="bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-100">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, "team", { team, chamberIdx, position: pos })}
              onTouchStart={(e) => {
                e.stopPropagation();
                onDragStart(e, "team", { team, chamberIdx, position: pos });
              }}
              onDragEnd={onDragEnd}
              className="cursor-move hover:bg-gray-50 py-1.5 sm:p-1 rounded transition-colors duration-150"
            >
              <GripVertical className="w-5 h-5 text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors duration-150" />
            </div>
            {onDeleteTeam && (
              <button
                onClick={() => onDeleteTeam(chamberIdx, team.id)}
                className="text-gray-300 hover:text-red-500 p-1 transition-colors duration-150"
                title="Move team to spectators"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {team.members.map((member, memberIdx) => {
            const isHovered = dragOverTarget?.type === "position" &&
                            dragOverTarget.chamberIdx === chamberIdx &&
                            dragOverTarget.position === pos &&
                            dragOverTarget.memberIdx === memberIdx;

            return (
              <div
                key={member.name}
                className={`flex items-center gap-2 py-1.5 sm:py-1 px-2 rounded transition-colors duration-150 ${
                  isHovered ? "bg-red-50" : "hover:bg-gray-50"
                }`}
                data-drop-type="position"
                data-drop-chamber={chamberIdx}
                data-drop-position={pos}
                data-drop-member={memberIdx}
                onDragEnter={(e) => {
                  e.stopPropagation();
                  onDragEnter(e, { type: "position", chamberIdx, position: pos, memberIdx });
                }}
              >
                <DraggablePerson
                  person={member}
                  source="position"
                  chamberIdx={chamberIdx}
                  position={pos}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-700 truncate">{member.name}</div>
                </div>
              </div>
            );
          })}

          {team.members.length === 1 && (
            <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-200">Iron</span>
          )}
          <div className="text-xs text-gray-400 mt-1.5 sm:mt-2">{team.experience}</div>
        </div>
      ) : (
        <div className="text-gray-300 italic text-center py-2 text-sm">Empty - drag people here</div>
      )}
    </div>
  );
};
