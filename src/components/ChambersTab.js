import React from "react";
import { Users, Download, GripVertical, Plus } from "lucide-react";
import { Chamber } from "./Chamber";

export const ChambersTab = ({
  chambers,
  spectators,
  onAddChamber,
  onUpdateRoomName,
  onRoundTypeChange,
  onExportCSV,
  onDeleteTeam,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}) => {
  if (chambers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p>No chambers created. Load data and generate pairings.</p>
        <button
          onClick={onAddChamber}
          className="mt-4 px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg font-medium flex items-center gap-2 mx-auto hover:bg-indigo-600 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          Add Chamber
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex flex-wrap gap-4 sm:gap-8">
            <div>
              <span className="text-gray-400 font-medium text-sm">Chambers</span>
              <span className="ml-2 text-gray-900 font-semibold">{chambers.length}</span>
            </div>
            <div>
              <span className="text-gray-400 font-medium text-sm">Teams</span>
              <span className="ml-2 text-gray-900 font-semibold">
                {chambers.reduce((sum, c) => sum + c.teams.length, 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-medium text-sm">Judges</span>
              <span className="ml-2 text-gray-900 font-semibold">
                {chambers.reduce((sum, c) => sum + (c.judges?.length || 0), 0)}
              </span>
            </div>
            <div>
              <span className="text-gray-400 font-medium text-sm">Spectators</span>
              <span className="ml-2 text-gray-900 font-semibold">{spectators.length}</span>
            </div>
          </div>
          <button
            onClick={onAddChamber}
            className="px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-600 transition-all duration-150 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Add Chamber
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <h3 className="text-lg font-semibold text-gray-900">Chamber Assignments</h3>
        <button
          onClick={onExportCSV}
          className="px-4 py-2 text-sm bg-white border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-all duration-150 self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {chambers.map((chamber, chamberIdx) => (
        <Chamber
          key={chamber.id}
          chamber={chamber}
          chamberIdx={chamberIdx}
          onUpdateRoomName={onUpdateRoomName}
          onRoundTypeChange={onRoundTypeChange}
          onDeleteTeam={onDeleteTeam}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        />
      ))}

      <button
        onClick={onAddChamber}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:text-indigo-500 bg-transparent hover:bg-indigo-50/50 text-gray-300 rounded-xl flex items-center justify-center gap-2 font-medium transition-all duration-150"
      >
        <Plus className="w-4 h-4" />
        Add Chamber
      </button>

      <div
        className="glass-subtle rounded-2xl p-4 sm:p-6"
        data-drop-type="spectator"
        onDragOver={(e) => onDragOver(e, { type: "spectator" })}
        onDragEnter={(e) => onDragEnter(e, { type: "spectator" })}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, { type: "spectator" })}
      >
        <h4 className="text-lg font-semibold text-gray-900 mb-3">
          Spectators ({spectators.length})
        </h4>
        {spectators.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {spectators.map((person, idx) => (
              <div
                key={idx}
                draggable
                onDragStart={(e) =>
                  onDragStart(e, "person", { person, source: "spectator" })
                }
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onDragStart(e, "person", { person, source: "spectator" });
                }}
                onDragEnd={onDragEnd}
                className="px-3 py-1.5 sm:py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600 cursor-move hover:bg-gray-200 transition-all duration-150 flex items-center gap-1"
              >
                <GripVertical className="w-4 h-4 sm:w-3 sm:h-3 text-gray-300" />
                <span>{person.name || person}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-300 italic text-center py-4 text-sm">
            No spectators - drag someone here to make them spectate
          </div>
        )}
      </div>
    </div>
  );
};
