import React from "react";
import { Users, Download, GripVertical } from "lucide-react";
import { Chamber } from "./Chamber";

export const ChambersTab = ({
  chambers,
  spectators,
  onAddChamber,
  onUpdateRoomName,
  onRoundTypeChange,
  onExportCSV,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}) => {
  if (chambers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No chambers created. Load data and generate pairings.</p>
        <button
          onClick={onAddChamber}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 mx-auto"
        >
          <Users className="w-4 h-4" />
          Add Chamber
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-semibold text-blue-900">Chambers:</span>
              <span className="ml-2 text-blue-700">{chambers.length}</span>
            </div>
            <div>
              <span className="font-semibold text-blue-900">Teams:</span>
              <span className="ml-2 text-blue-700">
                {chambers.reduce((sum, c) => sum + c.teams.length, 0)}
              </span>
            </div>
            <div>
              <span className="font-semibold text-blue-900">Judges:</span>
              <span className="ml-2 text-blue-700">
                {chambers.reduce((sum, c) => sum + (c.judges?.length || 0), 0)}{" "}
                total
              </span>
            </div>
            <div>
              <span className="font-semibold text-blue-900">Spectators:</span>
              <span className="ml-2 text-blue-700">{spectators.length}</span>
            </div>
          </div>
          <button
            onClick={onAddChamber}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Add Chamber
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Chamber Assignments</h3>
        <button
          onClick={onExportCSV}
          className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
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
        className="w-full px-4 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center gap-2 font-medium"
      >
        <Users className="w-4 h-4" />
        Add Chamber
      </button>

      <div
        className="border rounded-lg p-6 bg-gray-50"
        onDragOver={(e) => onDragOver(e, { type: "spectator" })}
        onDragEnter={(e) => onDragEnter(e, { type: "spectator" })}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, { type: "spectator" })}
      >
        <h4 className="text-lg font-semibold mb-3">
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
                onDragEnd={onDragEnd}
                className="px-3 py-1 bg-white rounded-full text-sm border cursor-move hover:shadow-md transition-shadow flex items-center gap-1"
              >
                <GripVertical className="w-3 h-3 text-gray-400" />
                <span>{person.name || person}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 italic text-center py-4">
            No spectators - drag someone here to make them spectate
          </div>
        )}
      </div>
    </div>
  );
};
