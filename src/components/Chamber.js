import React from 'react';
import { GripVertical, UserCheck, X } from 'lucide-react';
import { PositionBox } from './PositionBox';
import { DraggablePerson } from './DraggablePerson';
import { ROUND_TYPES, POSITION_NAMES } from '../utils/constants';

export const Chamber = ({
  chamber,
  chamberIdx,
  onUpdateRoomName,
  onRoundTypeChange,
  onDeleteTeam,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop
}) => {
  return (
    <div className="glass rounded-2xl p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <input
            type="text"
            value={chamber.room}
            onChange={(e) => onUpdateRoomName(chamberIdx, e.target.value)}
            className="text-lg font-semibold text-gray-900 border-0 border-b border-transparent hover:border-gray-300 focus:border-indigo-400 focus:ring-0 bg-transparent px-0 py-1 w-36 sm:w-48 transition-all duration-150 focus:outline-none"
            placeholder="Room name/number"
          />
          <select
            value={chamber.roundType}
            onChange={(e) => onRoundTypeChange(chamberIdx, e.target.value)}
            className="px-3 py-1 text-sm bg-white border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
          >
            <option value="full">Full Round</option>
            <option value="opening">Opening Half Only</option>
            <option value="closing">Closing Half Only</option>
          </select>
          {chamber.hasIron && (
            <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-full font-medium">Iron</span>
          )}
        </div>
        {chamber.mixed && (
          <span className="px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 text-xs rounded-full font-medium self-start">Mixed Experience</span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-8">
        <div className="space-y-3 sm:space-y-4">
          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Government</h5>
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
                onDeleteTeam={onDeleteTeam}
              />
            ))}
        </div>

        <div className="space-y-3 sm:space-y-4">
          <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Opposition</h5>
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
                onDeleteTeam={onDeleteTeam}
              />
            ))}
        </div>
      </div>

      {chamber.hasIron && chamber.ironPerson && (
        <div
          className="mt-3 sm:mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl"
          data-drop-type="iron"
          data-drop-chamber={chamberIdx}
          onDragOver={onDragOver}
          onDragEnter={(e) => onDragEnter(e, { type: "iron", chamberIdx })}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, { type: "iron", chamberIdx })}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, "person", {
                person: chamber.ironPerson,
                source: "iron",
                chamberIdx,
                position: chamber.ironPosition
              })}
              onTouchStart={(e) => {
                e.stopPropagation();
                onDragStart(e, "person", {
                  person: chamber.ironPerson,
                  source: "iron",
                  chamberIdx,
                  position: chamber.ironPosition
                });
              }}
              onDragEnd={onDragEnd}
              className="cursor-move p-1 -m-1"
            >
              <GripVertical className="w-4 h-4 text-amber-400" />
            </div>
            <span className="font-semibold text-amber-700 text-sm">Iron:</span>
            <span className="text-amber-800 text-sm">{chamber.ironPerson.name}</span>
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium border border-amber-200">
              {POSITION_NAMES[chamber.ironPosition]}
            </span>
          </div>
        </div>
      )}

      {chamber.teams.filter((t) => !t.position).length > 0 && (
        <div className="mt-3 sm:mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
          <h5 className="font-semibold text-orange-700 mb-2 text-sm">
            Unassigned Teams ({chamber.teams.filter((t) => !t.position).length})
          </h5>
          <p className="text-xs text-orange-600 mb-2 sm:mb-3">
            Drag them to valid positions or to spectators.
          </p>
          <div className="space-y-2">
            {chamber.teams.filter((t) => !t.position).map((team) => (
              <div key={team.id} className="bg-white rounded-lg p-2 border border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    draggable
                    onDragStart={(e) => onDragStart(e, "team", { team, chamberIdx, position: null })}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      onDragStart(e, "team", { team, chamberIdx, position: null });
                    }}
                    onDragEnd={onDragEnd}
                    className="cursor-move"
                  >
                    <GripVertical className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-xs font-medium text-orange-700 flex-1">Unassigned Team</span>
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
                    <span className="text-sm text-gray-600">{member.name}</span>
                  </div>
                ))}
                <div className="text-xs text-gray-400 mt-1">{team.experience}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200"
        data-drop-type="judge"
        data-drop-chamber={chamberIdx}
        onDragOver={onDragOver}
        onDragEnter={(e) => onDragEnter(e, { type: "judge", chamberIdx })}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, { type: "judge", chamberIdx })}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <UserCheck className="w-4 h-4 text-indigo-500 flex-shrink-0" />
          <span className="font-medium text-sm text-gray-600">Judges:</span>
          {chamber.judges?.length > 0 ? (
            chamber.judges.map((judge, judgeIdx) => (
              <div
                key={`${judge.name}-${judgeIdx}`}
                draggable
                onDragStart={(e) => onDragStart(e, "person", { person: judge, source: "judge", chamberIdx })}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onDragStart(e, "person", { person: judge, source: "judge", chamberIdx });
                }}
                onDragEnd={onDragEnd}
                className="cursor-move flex items-center gap-1 px-3 py-1.5 sm:py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-gray-200 transition-all duration-150"
              >
                <GripVertical className="w-4 h-4 sm:w-3 sm:h-3 text-gray-300" />
                <span>{judge.name}</span>
              </div>
            ))
          ) : (
            <span className="text-gray-300 italic text-sm">Drop someone here to assign judge</span>
          )}
        </div>
      </div>
    </div>
  );
};
