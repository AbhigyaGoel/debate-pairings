import React from 'react';
import { Download, X } from 'lucide-react';

export const HistoryTab = ({ 
  positionHistory, 
  onExportHistory, 
  onClearHistory,
  getNextPosition 
}) => {
  if (Object.keys(positionHistory).length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No position history available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Position History</h3>
        <div className="flex gap-2">
          <button
            onClick={onExportHistory}
            disabled={Object.keys(positionHistory).length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export History
          </button>
          <button
            onClick={onClearHistory}
            disabled={Object.keys(positionHistory).length === 0}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear History
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Debater
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Position History
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Next Position
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(positionHistory).map(([name, history]) => (
              <tr key={name}>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex gap-2 flex-wrap">
                    {history.map((pos, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                      >
                        {pos}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    {getNextPosition(name, "No Preference", "full")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
