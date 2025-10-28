import React from 'react';
import { GripVertical } from 'lucide-react';
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
  onDrop 
}) => {
  const { dragOverTarget } = useDragDrop();
  const team = chamber.teams.find((t) => t.position === pos);
  const isDropZone = dragOverTarget?.type === "position" && 
                     dragOverTarget.chamberIdx === chamberIdx && 
                     dragOverTarget.position === pos;

  return (
    <div
      className={`border rounded-lg p-4 transition-all ${
        isDropZone ? "bg-blue-100 border-blue-400 border-2" : "bg-gray-50"
      }`}
      onDragOver={onDragOver}
      onDragEnter={(e) => onDragEnter(e, { type: "position", chamberIdx, position: pos })}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, { type: "position", chamberIdx, position: pos })}
    >
      <div className="font-medium text-sm text-gray-600 mb-2">{POSITION_NAMES[pos]}</div>
      {team && team.members.length > 0 ? (
        <div className="bg-white rounded p-2 border border-gray-200">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, "team", { team, chamberIdx, position: pos })}
            onDragEnd={onDragEnd}
            className="cursor-move flex items-center justify-center mb-2 pb-2 border-b hover:bg-gray-50 p-1 rounded"
          >
            <GripVertical className="w-5 h-5 text-blue-500 flex-shrink-0" />
          </div>

          {team.members.map((member, memberIdx) => {
            const isHovered = dragOverTarget?.type === "position" &&
                            dragOverTarget.chamberIdx === chamberIdx &&
                            dragOverTarget.position === pos &&
                            dragOverTarget.memberIdx === memberIdx;

            return (
              <div
                key={member.name}
                className={`flex items-start gap-2 py-1 px-2 rounded transition-colors ${
                  isHovered ? "bg-red-100" : "hover:bg-gray-50"
                }`}
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
                  <div className="font-medium text-sm truncate">{member.name}</div>
                </div>
              </div>
            );
          })}

          <div className="text-xs text-gray-500 mt-2">{team.experience}</div>
        </div>
      ) : (
        <div className="text-gray-400 italic text-center py-2">Empty - drag people here</div>
      )}
    </div>
  );
};
