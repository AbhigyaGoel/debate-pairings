import React from 'react';
import { FileSpreadsheet, Users, RefreshCw } from 'lucide-react';

export const DataInputTab = ({ 
  participants, 
  loading, 
  onCSVUpload, 
  onGeneratePairings 
}) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">BP Pairings System</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Inputs:</strong> The Experience Level input is mandatory</li>
          <li>• <strong>Rooms:</strong> You can edit rooms in the Chambers tab</li>
          <li>• <strong>Iron Position:</strong> When there are 7 people (3 teams + 1), the 7th person "irons" - debates both speeches for their side</li>
          <li>• <strong>Dragging:</strong> Drag individuals or whole teams between positions. Hover to highlight swap targets</li>
        </ul>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5" />
          Import Data
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={onCSVUpload}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-2">
              Format: Name, Partner (blank if none), Experience Level, Preference, Half Round? (Opening Half/Closing Half/blank), Role (Debate/Debating, Judge/Judging, or Spectate/Spectating)
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {participants.length > 0 && <span>{participants.length} participants loaded</span>}
        </div>
        <button
          onClick={onGeneratePairings}
          disabled={participants.length === 0 || loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Users className="w-4 h-4" />
              Generate Pairings
            </>
          )}
        </button>
      </div>
    </div>
  );
};
