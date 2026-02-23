import React, { useState, useMemo } from "react";
import {
  UserPlus,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  Users,
  AlertTriangle,
  UserCheck,
} from "lucide-react";
import { EXPERIENCE_LEVELS } from "../utils/constants";
import { findClosestMember, normalizeName } from "../utils/helpers";
import { CSVImportModal } from "./CSVImportModal";

function useMemberEditing(member) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const startEditing = () => {
    setDraft({
      name: member.name,
      experience: member.experience,
    });
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setDraft({});
  };

  return { editing, draft, setDraft, startEditing, setEditing, cancel };
}

function MemberCard({ member, onUpdate, onRemove, selectable, selected, onToggle, alreadyIn }) {
  const { editing, draft, setDraft, startEditing, setEditing, cancel } = useMemberEditing(member);

  const save = async () => {
    if (!draft.name?.trim()) return;
    await onUpdate(member.id, { ...draft, name: draft.name.trim() });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-indigo-50 rounded-xl p-3 space-y-2 border border-indigo-200">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
        <select
          value={draft.experience}
          onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
          className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          {EXPERIENCE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>{lvl}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-1.5 bg-indigo-500 text-white text-sm rounded-lg font-medium hover:bg-indigo-600 transition-colors duration-150">
            Save
          </button>
          <button onClick={cancel} className="flex-1 py-1.5 bg-white text-gray-500 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-150">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border border-gray-100 bg-white ${alreadyIn ? "opacity-50" : ""}`}>
      {selectable && (
        <div className="flex-shrink-0">
          {alreadyIn ? (
            <span className="text-emerald-500"><UserCheck className="w-4 h-4" /></span>
          ) : (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(member.id)}
              className="w-4 h-4 rounded border-gray-300 bg-white text-indigo-500 focus:ring-indigo-500/30"
            />
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 truncate">{member.name}</div>
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
          member.experience === "Competitive"
            ? "bg-sky-50 text-sky-700 border border-sky-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>{member.experience}</span>
      </div>
      <div className="flex-shrink-0 flex gap-1">
        <button onClick={startEditing} className="text-gray-300 active:text-indigo-500 p-1.5 transition-colors duration-150">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => { if (window.confirm(`Remove ${member.name} from roster?`)) onRemove(member.id); }} className="text-gray-300 active:text-red-500 p-1.5 transition-colors duration-150" title={`Remove ${member.name}`}>
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function MemberRow({ member, onUpdate, onRemove, selectable, selected, onToggle, alreadyIn }) {
  const { editing, draft, setDraft, startEditing, setEditing, cancel } = useMemberEditing(member);

  const save = async () => {
    if (!draft.name?.trim()) return;
    await onUpdate(member.id, { ...draft, name: draft.name.trim() });
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-indigo-50">
        {selectable && <td className="px-4 py-3" />}
        <td className="px-4 py-3">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </td>
        <td className="px-4 py-3">
          <select
            value={draft.experience}
            onChange={(e) => setDraft({ ...draft, experience: e.target.value })}
            className="w-full px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button onClick={save} className="text-emerald-500 hover:text-emerald-600 p-1 transition-colors duration-150">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={cancel} className="text-gray-300 hover:text-gray-500 p-1 transition-colors duration-150">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className={`border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors duration-150 ${alreadyIn ? "opacity-50" : ""}`}>
      {selectable && (
        <td className="px-4 py-3">
          {alreadyIn ? (
            <span className="text-emerald-500" title="Already in session">
              <UserCheck className="w-4 h-4" />
            </span>
          ) : (
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onToggle(member.id)}
              className="w-4 h-4 rounded border-gray-300 bg-white text-indigo-500 focus:ring-indigo-500/30"
            />
          )}
        </td>
      )}
      <td className="px-4 py-3 text-sm text-gray-600">{member.name}</td>
      <td className="px-4 py-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            member.experience === "Competitive"
              ? "bg-sky-50 text-sky-700 border border-sky-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
        >
          {member.experience}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={startEditing} className="text-gray-300 hover:text-indigo-500 p-1 transition-colors duration-150">
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => { if (window.confirm(`Remove ${member.name} from roster?`)) onRemove(member.id); }}
            className="text-gray-300 hover:text-red-500 p-1 transition-colors duration-150"
            title={`Remove ${member.name}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddMemberForm({ onAdd, members }) {
  const [name, setName] = useState("");
  const [experience, setExperience] = useState("General");

  const dupWarning = useMemo(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || members.length === 0) return null;
    const closest = findClosestMember(trimmed, members);
    if (closest.distance === 0) return { type: "exact", name: closest.match };
    if (closest.distance <= 2) return { type: "fuzzy", name: closest.match };
    return null;
  }, [name, members]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onAdd({ name: name.trim(), experience });
    setName("");
  };

  return (
    <div className="space-y-1">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Member name"
            className={`w-full px-3 py-2 bg-white border rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150 ${
              dupWarning ? "border-amber-400" : "border-gray-200"
            }`}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!name.trim()}
            className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-indigo-600 transition-all duration-150"
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        </div>
      </form>
      {dupWarning && (
        <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 px-3 py-1.5 rounded-lg">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {dupWarning.type === "exact" ? (
            <span><strong>"{dupWarning.name}"</strong> is already in the roster</span>
          ) : (
            <span>Similar to <strong>"{dupWarning.name}"</strong> in the roster — different person?</span>
          )}
        </div>
      )}
    </div>
  );
}

export function RosterTab({
  members,
  membersLoading,
  onAddMember,
  onUpdateMember,
  onRemoveMember,
  onClearRoster,
  onImportCSV,
  sessionActive,
  checkins,
  onAddToSession,
  onGeneratePairings,
  pairingLoading,
}) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [addingToSession, setAddingToSession] = useState(false);

  const checkedInNames = useMemo(
    () => new Set((checkins || []).map((c) => normalizeName(c.name))),
    [checkins]
  );

  const filtered = search
    ? members.filter((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
      )
    : members;

  const addable = useMemo(
    () => filtered.filter((m) => !checkedInNames.has(normalizeName(m.name))),
    [filtered, checkedInNames]
  );

  const compCount = members.filter((m) => m.experience === "Competitive").length;
  const genCount = members.filter((m) => m.experience !== "Competitive").length;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === addable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(addable.map((m) => m.id)));
    }
  };

  const handleAddToSession = async () => {
    const toAdd = members.filter((m) => selected.has(m.id));
    if (toAdd.length === 0) return;
    setAddingToSession(true);
    try {
      await onAddToSession(toAdd);
      setSelected(new Set());
    } finally {
      setAddingToSession(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-subtle rounded-xl p-3 flex items-center gap-2 sm:gap-4 flex-wrap text-sm">
        <span className="flex items-center gap-1 text-gray-500 font-medium">
          <Users className="w-4 h-4" />
          {members.length} members
        </span>
        <span className="text-gray-200 hidden sm:inline">|</span>
        <span className="text-gray-500">{compCount} competitive</span>
        <span className="text-gray-500">{genCount} general</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members..."
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
        />
        <div className="flex flex-wrap gap-2">
          {sessionActive && selected.size > 0 && (
            <button
              onClick={handleAddToSession}
              disabled={addingToSession}
              className="flex items-center gap-1 px-4 py-2 bg-emerald-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 hover:bg-emerald-600 transition-all duration-150"
            >
              <UserCheck className="w-4 h-4" />
              {addingToSession
                ? "Adding..."
                : `Add ${selected.size} to Session`}
            </button>
          )}
          {members.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm(`Remove all ${members.length} members from roster?`))
                  onClearRoster();
              }}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-all duration-150"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-white border border-gray-200 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-all duration-150"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={onGeneratePairings}
            disabled={members.length < 4 || pairingLoading}
            className="flex items-center gap-1 px-4 py-2 bg-indigo-500 text-white text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-all duration-150"
          >
            {pairingLoading ? "Generating..." : "Generate Pairings"}
          </button>
        </div>
      </div>

      <AddMemberForm onAdd={onAddMember} members={members} />

      {membersLoading ? (
        <div className="text-center py-8 text-gray-400 text-sm animate-pulse">Loading members...</div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No members yet</p>
          <p className="text-sm mt-1">Add members above or import from CSV</p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="sm:hidden space-y-2">
            {sessionActive && addable.length > 0 && (
              <button
                onClick={toggleAll}
                className="text-xs text-indigo-500 active:text-indigo-600 py-1 transition-colors duration-150"
              >
                {selected.size === addable.length ? "Deselect all" : "Select all"}
              </button>
            )}
            {filtered.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onUpdate={onUpdateMember}
                onRemove={onRemoveMember}
                selectable={sessionActive}
                selected={selected.has(member.id)}
                onToggle={toggleSelect}
                alreadyIn={checkedInNames.has(normalizeName(member.name))}
              />
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  {sessionActive && (
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={addable.length > 0 && selected.size === addable.length}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-gray-300 bg-white text-indigo-500 focus:ring-indigo-500/30"
                        title="Select all"
                        aria-label="Select all members"
                      />
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Experience</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    onUpdate={onUpdateMember}
                    onRemove={onRemoveMember}
                    selectable={sessionActive}
                    selected={selected.has(member.id)}
                    onToggle={toggleSelect}
                    alreadyIn={checkedInNames.has(normalizeName(member.name))}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {search && filtered.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-400">
              No members matching "{search}"
            </div>
          )}
        </>
      )}

      {showImportModal && (
        <CSVImportModal
          onImport={onImportCSV}
          onClose={() => setShowImportModal(false)}
          existingMembers={members}
        />
      )}
    </div>
  );
}
