import React from 'react';
import { GripVertical } from 'lucide-react';

export const DraggablePerson = ({ person, source, chamberIdx, position, onDragStart, onDragEnd, className = "" }) => {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart(e, "person", { person, source, chamberIdx, position });
      }}
      onDragEnd={onDragEnd}
      className={`cursor-move ${className}`}
    >
      <GripVertical className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
    </div>
  );
};

export const DraggablePersonBadge = ({ person, source, chamberIdx, onDragStart, onDragEnd }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, "person", { person, source, chamberIdx })}
      onDragEnd={onDragEnd}
      className="px-3 py-1 bg-white rounded-full text-sm border cursor-move hover:shadow-md transition-shadow flex items-center gap-1"
    >
      <GripVertical className="w-3 h-3 text-gray-400" />
      <span>{person.name || person}</span>
    </div>
  );
};
