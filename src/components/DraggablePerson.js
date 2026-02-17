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
      onTouchStart={(e) => {
        e.stopPropagation();
        onDragStart(e, "person", { person, source, chamberIdx, position });
      }}
      onDragEnd={onDragEnd}
      className={`cursor-move p-1 -m-1 ${className}`}
    >
      <GripVertical className="w-4 h-4 sm:w-3 sm:h-3 text-gray-300 hover:text-gray-500 flex-shrink-0 transition-colors duration-150" />
    </div>
  );
};

