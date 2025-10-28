import React from 'react';
import { GripVertical, UserCheck } from 'lucide-react';
import { PositionBox } from './PositionBox';
import { DraggablePerson } from './DraggablePerson';
import { ROUND_TYPES, POSITION_NAMES } from '../utils/constants';

export const Chamber = ({ 
  chamber, 
  chamberIdx, 
  onUpdateRoomName, 
  onRoundTypeChange,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop
}) => {
  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={chamber.room}
            onChange={(e) => onUpdateRoomName(chamberIdx, e.target.value)}
            className="text-xl font-semibold px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-48"
            placeholder="Room name/number"
          />
          <select
            value={chamber.roundType}
            onChange={(e) => onRoundTypeChange(chamberIdx, e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="full">Full Round</option>
            <option value="opening">Opening Half Only</option>
            <option value="closing">Closing Half Only</option>
          </select>
          {chamber.hasIron && (
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded">Iron</span>
          )}
        </div>
        {chamber.mixed && (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded">Mixed Experience</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <h5 className="font-medium text-gray-700">Government</h5>
          {ROUND_TYPES[chamber.roundType].positions
            .filter((p) => p.includes("G"))
            .map((pos) => (
              <PositionBox
                key={pos}
                chamber={chamber}
                chamberIdx={chamberIdx}
                pos={pos}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
        </div>

        <div className="space-y-4">
          <h5 className="font-medium text-gray-700">Opposition</h5>
          {ROUND_TYPES[chamber.roundType].positions
            .filter((p) => p.includes("O") && !p.includes("G"))
            .map((pos) => (
              <PositionBox
                key={pos}
                chamber={chamber}
                chamberIdx={chamberIdx}
                pos={pos}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOver={onDragOver}
                onDragEnter={onDragEnter}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
        </div>
      </div>

      {chamber.hasIron && chamber.ironPerson && (
        <div
          className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          onDragOver={onDragOver}
          onDragEnter={(e) => onDragEnter(e, { type: "iron", chamberIdx })}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, { type: "iron", chamberIdx })}
        >
          <div className="flex items-center gap-2">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, "person", {
                person: chamber.ironPerson,
                source: "iron",
                chamberIdx,
                position: chamber.ironPosition
              })}
              onDragEnd={onDragEnd}
              className="cursor-move"
            >
              <GripVertical className="w-4 h-4 text-yellow-700" />
            </div>
            <span className="font-semibold text-yellow-900">Iron Position:</span>
            <span className="text-yellow-800">{chamber.ironPerson.name}</span>
            <span className="px-2 py-1 bg-yellow-200 text-yellow-900 text-xs rounded">
              {POSITION_NAMES[chamber.ironPosition]} (Both Speeches)
            </span>
          </div>
        </div>
      )}

      {chamber.teams.filter((t) => !t.position).length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <h5 className="font-semibold text-orange-900 mb-2">
            Unassigned Teams ({chamber.teams.filter((t) => !t.position).length})
          </h5>
          <p className="text-xs text-orange-700 mb-3">
            These teams have invalid positions for the current round type. Drag them to valid positions or to spectators.
          </p>
          <div className="space-y-2">
            {chamber.teams.filter((t) => !t.position).map((team) => (
              <div key={team.id} className="bg-white rounded p-2 border border-orange-300">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, "team", { team, chamberIdx, position: null })}
                    onDragEnd={onDragEnd}
                    className="cursor-move"
                  >
                    <GripVertical className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-xs font-medium text-orange-800">Unassigned Team</span>
                </div>
                {team.members.map((member) => (
                  <div key={member.name} className="flex items-center gap-2 py-1">
                    <DraggablePerson
                      person={member}
                      source="position"
                      chamberIdx={chamberIdx}
                      position={null}
                      onDragStart={onDragStart}
                      onDragEnd={onDragEnd}
                    />
                    <span className="text-sm">{member.name}</span>
                  </div>
                ))}
                <div className="text-xs text-gray-500 mt-1">{team.experience}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="mt-4 pt-4 border-t"
        onDragOver={onDragOver}
        onDragEnter={(e) => onDragEnter(e, { type: "judge", chamberIdx })}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, { type: "judge", chamberIdx })}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="font-medium">Judges:</span>
          {chamber.judges?.length > 0 ? (
            chamber.judges.map((judge, judgeIdx) => (
              <div
                key={`${judge.name}-${judgeIdx}`}
                draggable
                onDragStart={(e) => onDragStart(e, "person", { person: judge, source: "judge", chamberIdx })}
                onDragEnd={onDragEnd}
                className="cursor-move flex items-center gap-1 px-2 py-1 bg-white border border-gray-300 rounded hover:shadow-md transition-shadow"
              >
                <GripVertical className="w-3 h-3 text-gray-400" />
                <span>{judge.name}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-400 italic">Drop someone here to assign judge</span>
          )}
        </div>
      </div>
    </div>
  );
};
