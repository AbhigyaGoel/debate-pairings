import React, { useState, useMemo } from "react";
import {
  Users,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
} from "lucide-react";
import { normalizeName, normalizeRole } from "../utils/helpers";
import { EXPERIENCE_LEVELS, ROLE_OPTIONS } from "../utils/constants";

function useCheckinEditing(checkin) {
  const [editing, setEditing] = useState(false);
  const [partnerMode, setPartnerMode] = useState(checkin.partner ? "partner" : "solo");
  const [partnerName, setPartnerName] = useState(checkin.partner || "");
  const [role, setRole] = useState(checkin.role || "Debate");
  const [experience, setExperience] = useState(checkin.experience || "General");
  const partner = partnerMode === "solo" ? "" : partnerName.trim();
  return { editing, setEditing, partnerMode, setPartnerMode, partnerName, setPartnerName, partner, role, setRole, experience, setExperience };
}

function CheckInCard({ checkin, onUpdate, onRemove }) {
  const { editing, setEditing, partnerMode, setPartnerMode, partnerName, setPartnerName, partner, role, setRole, experience, setExperience } = useCheckinEditing(checkin);

  const save = async () => {
    await onUpdate(checkin.id, { partner, role, experience });
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="bg-indigo-50 rounded-xl p-3 space-y-2 border border-indigo-200">
        <div className="text-sm font-medium text-gray-700">{checkin.name}</div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => { setPartnerMode("solo"); setPartnerName(""); }}
            className={`py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              partnerMode === "solo"
                ? "bg-gray-700 text-white"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            No Partner
          </button>
          <button
            type="button"
            onClick={() => setPartnerMode("partner")}
            className={`py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              partnerMode === "partner"
                ? "bg-indigo-500 text-white"
                : "bg-white text-gray-500 border border-gray-200"
            }`}
          >
            With Partner
          </button>
        </div>
        {partnerMode === "partner" && (
          <input
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
            placeholder="Partner's name"
          />
        )}
        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-1.5 bg-indigo-500 text-white text-sm rounded-lg font-medium hover:bg-indigo-600 transition-colors duration-150">
            Save
          </button>
          <button onClick={() => setEditing(false)} className="flex-1 py-1.5 bg-white text-gray-500 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors duration-150">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl border border-gray-100 bg-white">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-gray-700 truncate">{checkin.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            onClick={() => {
              const next = checkin.experience === "Competitive" ? "General" : "Competitive";
              onUpdate(checkin.id, { experience: next });
            }}
            className={`text-xs px-1.5 py-0.5 rounded-full font-medium transition-all duration-150 active:opacity-80 ${
              checkin.experience === "Competitive"
                ? "bg-sky-50 text-sky-700 border border-sky-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >{checkin.experience}</button>
          <span className="text-xs text-gray-400">{checkin.role}</span>
          {checkin.partner && <span className="text-xs text-gray-400">w/ {checkin.partner}</span>}
        </div>
      </div>
      <div className="flex-shrink-0 flex gap-1">
        <button onClick={() => setEditing(true)} className="text-gray-300 active:text-indigo-500 p-1.5 transition-colors duration-150">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onRemove(checkin.id)} className="text-gray-300 active:text-red-500 p-1.5 transition-colors duration-150">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CheckInRow({ checkin, onUpdate, onRemove }) {
  const { editing, setEditing, partnerMode, setPartnerMode, partnerName, setPartnerName, partner, role, setRole, experience, setExperience } = useCheckinEditing(checkin);

  const save = async () => {
    await onUpdate(checkin.id, { partner, role, experience });
    setEditing(false);
  };

  if (editing) {
    return (
      <tr className="bg-indigo-50">
        <td className="px-4 py-3 text-sm text-gray-700">{checkin.name}</td>
        <td className="px-4 py-3">
          <select
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            {EXPERIENCE_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </td>
        <td className="px-4 py-3">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { setPartnerMode("solo"); setPartnerName(""); }}
              className={`px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 ${
                partnerMode === "solo"
                  ? "bg-gray-700 text-white"
                  : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              Solo
            </button>
            {partnerMode === "partner" ? (
              <input
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="flex-1 min-w-0 px-2 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                placeholder="Partner's name"
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => setPartnerMode("partner")}
                className="px-2 py-1 rounded-lg text-xs font-medium text-indigo-500 bg-white border border-gray-200 hover:bg-indigo-50 transition-all duration-150"
              >
                + Partner
              </button>
            )}
          </div>
        </td>
        <td className="px-4 py-3">
          <div className="flex gap-1">
            <button onClick={save} className="text-emerald-500 hover:text-emerald-600 p-1 transition-colors duration-150">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-300 hover:text-gray-500 p-1 transition-colors duration-150">
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors duration-150">
      <td className="px-4 py-3 text-sm text-gray-600">{checkin.name}</td>
      <td className="px-4 py-3">
        <button
          onClick={() => {
            const next = checkin.experience === "Competitive" ? "General" : "Competitive";
            onUpdate(checkin.id, { experience: next });
          }}
          className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-all duration-150 hover:opacity-80 ${
            checkin.experience === "Competitive"
              ? "bg-sky-50 text-sky-700 border border-sky-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}
          title="Click to toggle experience level"
        >{checkin.experience}</button>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">{checkin.role}</td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {checkin.partner || <span className="italic text-gray-300">Solo</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-1">
          <button onClick={() => setEditing(true)} className="text-gray-300 hover:text-indigo-500 p-1 transition-colors duration-150">
            <Edit2 className="w-4 h-4" />
          </button>
          <button onClick={() => onRemove(checkin.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors duration-150">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function CheckInList({ checkins, onUpdate, onRemove }) {
  return (
    <>
      <div className="sm:hidden space-y-2">
        {checkins.map((checkin) => (
          <CheckInCard key={checkin.id} checkin={checkin} onUpdate={onUpdate} onRemove={onRemove} />
        ))}
      </div>
      <div className="hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Experience</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Partner</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {checkins.map((checkin) => (
              <CheckInRow key={checkin.id} checkin={checkin} onUpdate={onUpdate} onRemove={onRemove} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function AdminAddForm({ members, checkins, onAdd }) {
  const [query, setQuery] = useState("");

  const alreadyCheckedIn = useMemo(
    () => new Set(checkins.map((c) => normalizeName(c.name))),
    [checkins]
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 1) return [];
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) &&
          !alreadyCheckedIn.has(normalizeName(m.name))
      )
      .slice(0, 5);
  }, [query, members, alreadyCheckedIn]);

  const handleAdd = (member) => {
    onAdd(member);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Add member to session..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
          />
        </div>
      </div>
      {suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full glass-strong rounded-xl shadow-xl divide-y divide-gray-100 overflow-hidden">
          {suggestions.map((member) => (
            <button
              key={member.id}
              onClick={() => handleAdd(member)}
              className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center justify-between text-sm transition-colors duration-150"
            >
              <span className="text-gray-700">{member.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                member.experience === "Competitive"
                  ? "bg-sky-50 text-sky-700 border border-sky-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}>{member.experience}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SessionTab({
  checkins,
  members,
  onUpdateCheckIn,
  onRemoveCheckIn,
  onAdminAdd,
  onGeneratePairings,
  pairingLoading,
  paired,
  chambers,
  spectators,
}) {
  const debaterCount = checkins.filter(
    (c) => normalizeRole(c.role) === "Debate"
  ).length;
  const rosterDebaterCount = members.filter(
    (m) => normalizeRole(m.defaultRole) === "Debate"
  ).length;
  const canGenerate = debaterCount >= 4 || rosterDebaterCount >= 4;
  const judgeCount = checkins.filter((c) => normalizeRole(c.role) === "Judge").length;
  const spectatorCount = checkins.filter((c) => normalizeRole(c.role) === "Spectate").length;

  const pairedNames = useMemo(() => {
    if (!paired || !chambers || chambers.length === 0) return new Set();
    const names = new Set();
    chambers.forEach((chamber) => {
      chamber.teams.forEach((team) =>
        team.members.forEach((m) => names.add(normalizeName(m.name)))
      );
      if (chamber.ironPerson) names.add(normalizeName(chamber.ironPerson.name));
      (chamber.judges || []).forEach((j) => names.add(normalizeName(j.name)));
    });
    (spectators || []).forEach((s) => names.add(normalizeName(s.name || s)));
    return names;
  }, [paired, chambers, spectators]);

  const { pairedCheckins, unpairedCheckins } = useMemo(() => {
    if (!paired || pairedNames.size === 0) return { pairedCheckins: checkins, unpairedCheckins: [] };
    const pc = [];
    const upc = [];
    checkins.forEach((c) => {
      if (pairedNames.has(normalizeName(c.name))) pc.push(c);
      else upc.push(c);
    });
    return { pairedCheckins: pc, unpairedCheckins: upc };
  }, [checkins, paired, pairedNames]);

  return (
    <div className="space-y-4">
      <div className="glass-subtle rounded-xl p-3 flex items-center gap-2 sm:gap-4 flex-wrap text-sm">
        <span className="flex items-center gap-1 text-gray-500 font-medium">
          <Users className="w-4 h-4" />
          {checkins.length} checked in
        </span>
        <span className="text-gray-200 hidden sm:inline">|</span>
        <span className="text-gray-500">{debaterCount} debaters</span>
        <span className="text-gray-500">{judgeCount} judges</span>
        <span className="text-gray-500">{spectatorCount} spectators</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
        <AdminAddForm members={members} checkins={checkins} onAdd={onAdminAdd} />
        <div className="flex-shrink-0 flex items-center gap-2 flex-wrap">
          {!canGenerate && (
            <span className="text-xs text-gray-400">
              Need {4 - debaterCount} more debater{4 - debaterCount !== 1 ? "s" : ""}
            </span>
          )}
          {canGenerate && debaterCount < 4 && (
            <span className="text-xs text-indigo-600">
              Will use roster ({rosterDebaterCount} debaters)
            </span>
          )}
          <button
            onClick={onGeneratePairings}
            disabled={!canGenerate || pairingLoading}
            className={`flex items-center gap-1 px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ${
              paired
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-indigo-500 text-white hover:bg-indigo-600"
            }`}
          >
            {pairingLoading
              ? "Generating..."
              : paired
              ? "Re-generate Pairings"
              : "Generate Pairings"}
          </button>
        </div>
      </div>

      {checkins.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-200" />
          <p className="font-medium">No one has checked in yet</p>
          <p className="text-sm mt-1">
            Debaters can check in from their phones, or add them manually above
          </p>
        </div>
      ) : (
        <>
          {paired && unpairedCheckins.length > 0 ? (
            <>
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                Paired ({pairedCheckins.length})
              </h4>
              <CheckInList checkins={pairedCheckins} onUpdate={onUpdateCheckIn} onRemove={onRemoveCheckIn} />

              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                  Unpaired ({unpairedCheckins.length})
                </h4>
                <p className="text-xs text-gray-400 mb-2">Checked in after pairings were generated</p>
                <CheckInList checkins={unpairedCheckins} onUpdate={onUpdateCheckIn} onRemove={onRemoveCheckIn} />
              </div>
            </>
          ) : (
            <CheckInList checkins={checkins} onUpdate={onUpdateCheckIn} onRemove={onRemoveCheckIn} />
          )}
        </>
      )}
    </div>
  );
}
