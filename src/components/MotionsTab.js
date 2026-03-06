import React, { useState } from "react";
import { MessageSquare, Search, ChevronDown, ChevronUp, Calendar } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = parts
    ? new Date(parts[1], parts[2] - 1, parts[3])
    : new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MotionsTab({ motions, loading }) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = motions.filter((m) =>
    m.motion.toLowerCase().includes(search.toLowerCase()) ||
    m.sessionName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="glass-spinner" />
      </div>
    );
  }

  if (motions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="text-lg font-medium">No motions yet</p>
        <p className="text-sm mt-1 text-gray-300">
          Motions from completed debate sessions will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Past Motions</h2>
          <p className="text-xs text-gray-400">{motions.length} motion{motions.length !== 1 ? "s" : ""} from past sessions</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            type="text"
            placeholder="Search motions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-full sm:w-64"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No motions match your search.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((m) => (
            <div key={m.id} className="glass-subtle rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 leading-relaxed italic">
                    "{m.motion}"
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(m.date)}
                    </span>
                    <span>{m.sessionName}</span>
                  </div>

                  {m.infoslide && (
                    <div className="mt-2">
                      <button
                        onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors duration-150"
                      >
                        {expandedId === m.id ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                        Info slide
                      </button>
                      {expandedId === m.id && (
                        <div className="mt-2 p-3 bg-indigo-50/50 rounded-lg text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {m.infoslide}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
