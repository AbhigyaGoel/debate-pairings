import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
  Trash2,
  Users,
  Clock,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";
import { ROUND_TYPES, POSITION_NAMES } from "../utils/constants";

function formatDate(dateStr) {
  if (!dateStr) return "";
  // Handle "YYYY-MM-DD" without timezone shift (new Date("2025-01-27") parses as UTC, showing wrong day in US timezones)
  const parts = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = parts
    ? new Date(parts[1], parts[2] - 1, parts[3])
    : new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SessionName({ name, fallbackDate, onRename }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const displayName = name || `Session - ${formatDate(fallbackDate)}`;

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(displayName);
    setEditing(true);
  };

  const save = (e) => {
    e.stopPropagation();
    const trimmed = draft.trim();
    if (trimmed && trimmed !== displayName) onRename(trimmed);
    setEditing(false);
  };

  const cancel = (e) => {
    e.stopPropagation();
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(e); if (e.key === "Escape") cancel(e); }}
          className="px-2 py-0.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-0"
          autoFocus
        />
        <button onClick={save} className="text-emerald-500 hover:text-emerald-600 p-0.5">
          <Check className="w-3.5 h-3.5" />
        </button>
        <button onClick={cancel} className="text-gray-300 hover:text-gray-500 p-0.5">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-sm font-medium text-gray-700 truncate">{displayName}</span>
      <button onClick={startEdit} className="text-gray-300 hover:text-indigo-500 p-0.5 flex-shrink-0 transition-colors duration-150">
        <Edit2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function AttendeeList({ checkins }) {
  if (!checkins) {
    return (
      <div className="py-3 text-sm text-gray-400 text-center">Loading...</div>
    );
  }
  if (checkins.length === 0) {
    return (
      <div className="py-3 text-sm text-gray-400 text-center">No attendance records</div>
    );
  }

  return (
    <div className="pt-2 pb-1">
      {/* Mobile cards */}
      <div className="sm:hidden space-y-1.5">
        {checkins.map((c) => (
          <div key={c.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-gray-50">
            <span className="text-sm text-gray-700 flex-1 truncate">{c.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              c.experience === "Competitive"
                ? "bg-sky-50 text-sky-700 border border-sky-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>{c.experience || "General"}</span>
            <span className="text-xs text-gray-400">{c.role || "Debate"}</span>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Experience</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody>
            {checkins.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-2 text-sm text-gray-600">{c.name}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.experience === "Competitive"
                      ? "bg-sky-50 text-sky-700 border border-sky-200"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>{c.experience || "General"}</span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">{c.role || "Debate"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SessionMotion({ session }) {
  if (!session.motion) return null;
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
        <MessageSquare className="w-3.5 h-3.5" />
        Motion
      </div>
      <p className="text-sm font-medium text-gray-800 leading-relaxed">
        &ldquo;{session.motion}&rdquo;
      </p>
      {session.infoslide && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="text-xs font-medium text-gray-400 mb-1">Infoslide</div>
          <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{session.infoslide}</p>
        </div>
      )}
    </div>
  );
}

function SessionPairings({ session }) {
  const chambers = session.chambers;
  if (!chambers || chambers.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
        <LayoutGrid className="w-3.5 h-3.5" />
        Pairings ({chambers.length} chamber{chambers.length !== 1 ? "s" : ""})
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {chambers.map((chamber) => (
          <div key={chamber.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">{chamber.room}</span>
              <span className="text-xs text-gray-400">{ROUND_TYPES[chamber.roundType]?.label || "Full Round"}</span>
            </div>
            <div className="space-y-1.5">
              {ROUND_TYPES[chamber.roundType]?.positions.map((pos) => {
                const team = chamber.teams.find((t) => t.position === pos);
                if (!team || team.members.length === 0) return null;
                return (
                  <div key={pos} className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 font-medium w-6 flex-shrink-0 mt-0.5">{pos}</span>
                    <div className="text-xs text-gray-600">
                      {team.members.map((m) => m.name).join(" & ")}
                      {team.members.length === 1 && (
                        <span className="ml-1 text-amber-600 font-medium">(Iron)</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {chamber.hasIron && chamber.ironPerson && (
                <div className="flex items-start gap-2">
                  <span className="text-xs text-amber-600 font-medium w-6 flex-shrink-0 mt-0.5">Fe</span>
                  <span className="text-xs text-amber-700">
                    {chamber.ironPerson.name} ({POSITION_NAMES[chamber.ironPosition]})
                  </span>
                </div>
              )}
            </div>
            {chamber.judges?.length > 0 && (
              <div className="mt-1.5 pt-1.5 border-t border-gray-200 text-xs text-gray-500">
                Judge: {chamber.judges.map((j) => j.name).join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
      {session.spectators?.length > 0 && (
        <div className="text-xs text-gray-400">
          Spectators: {session.spectators.map((s) => s.name || s).join(", ")}
        </div>
      )}
    </div>
  );
}

function SessionDetails({ session, checkins }) {
  const hasMotion = !!session.motion;
  const hasPairings = session.chambers?.length > 0;

  return (
    <div className="space-y-4">
      {hasMotion && <SessionMotion session={session} />}
      {hasPairings && <SessionPairings session={session} />}
      {(hasMotion || hasPairings) && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <Users className="w-3.5 h-3.5" />
          Attendance
        </div>
      )}
      <AttendeeList checkins={checkins} />
    </div>
  );
}

function SessionCard({ session, expanded, checkins, onExpand, onRename, onDelete }) {
  const attendanceCount = checkins?.length ?? session.attendanceCount ?? "—";
  const hasPositions = session.sessionPositions && Object.keys(session.sessionPositions).length > 0;

  const handleDelete = (e) => {
    e.stopPropagation();
    const msg = hasPositions
      ? "Delete this session? Its position assignments will be removed from the accumulated history."
      : "Delete this session? (No position data to remove from history.)";
    if (window.confirm(msg)) onDelete(session.id);
  };

  return (
    <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors duration-150"
        onClick={() => onExpand(session.id)}
      >
        <span className="text-gray-400 flex-shrink-0">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </span>
        <div className="flex-1 min-w-0">
          <SessionName name={session.name} fallbackDate={session.createdAt} onRename={(n) => onRename(session.id, n)} />
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {formatDate(session.createdAt)}
            </span>
            {session.createdBy && (
              <span className="text-xs text-gray-400">by {session.createdBy}</span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Users className="w-3 h-3" />
              {attendanceCount}
            </span>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className="text-gray-300 hover:text-red-500 p-1.5 flex-shrink-0 transition-colors duration-150"
          title="Delete session"
          aria-label="Delete session"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-gray-100 px-3 py-3">
          <SessionDetails session={session} checkins={checkins} />
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, expanded, checkins, onExpand, onRename, onDelete }) {
  const attendanceCount = checkins?.length ?? session.attendanceCount ?? "—";
  const hasPositions = session.sessionPositions && Object.keys(session.sessionPositions).length > 0;

  const handleDelete = (e) => {
    e.stopPropagation();
    const msg = hasPositions
      ? "Delete this session? Its position assignments will be removed from the accumulated history."
      : "Delete this session? (No position data to remove from history.)";
    if (window.confirm(msg)) onDelete(session.id);
  };

  return (
    <>
      <tr
        className="border-b border-gray-100 last:border-0 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
        onClick={() => onExpand(session.id)}
      >
        <td className="px-4 py-3 w-8">
          <span className="text-gray-400">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </span>
        </td>
        <td className="px-4 py-3">
          <SessionName name={session.name} fallbackDate={session.createdAt} onRename={(n) => onRename(session.id, n)} />
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(session.createdAt)}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{session.createdBy || "—"}</td>
        <td className="px-4 py-3 text-sm text-gray-500">{attendanceCount}</td>
        <td className="px-4 py-3">
          <button
            onClick={handleDelete}
            className="text-gray-300 hover:text-red-500 p-1 transition-colors duration-150"
            title="Delete session"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={6} className="px-4 py-3 bg-gray-50/50">
            <SessionDetails session={session} checkins={checkins} />
          </td>
        </tr>
      )}
    </>
  );
}

export function SessionsTab({
  closedSessions,
  expandedSessionId,
  checkinCache,
  loading,
  onExpand,
  onRename,
  onDelete,
}) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="glass-spinner mx-auto" />
      </div>
    );
  }

  if (closedSessions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="font-medium">No past sessions</p>
        <p className="text-sm mt-1">Closed sessions will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-subtle rounded-xl p-3 flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-gray-400" />
        <span className="text-gray-500 font-medium">{closedSessions.length} past session{closedSessions.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Mobile card layout */}
      <div className="sm:hidden space-y-2">
        {closedSessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            expanded={expandedSessionId === session.id}
            checkins={checkinCache[session.id]}
            onExpand={onExpand}
            onRename={onRename}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 w-8" />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created By</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Attendance</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-16">Actions</th>
            </tr>
          </thead>
          <tbody>
            {closedSessions.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                expanded={expandedSessionId === session.id}
                checkins={checkinCache[session.id]}
                onExpand={onExpand}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
