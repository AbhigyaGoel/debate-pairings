import React, { useState, useMemo, useRef, useEffect } from "react";
import { Search, CheckCircle, Edit2, Save, Users, Lock, ArrowLeft } from "lucide-react";
import { findClosestMember, normalizeName, levenshtein } from "../utils/helpers";
import { EXPERIENCE_LEVELS, ROLE_OPTIONS, PREFERENCE_OPTIONS } from "../utils/constants";

const ROLE_PILL_OPTIONS = ROLE_OPTIONS.map((r) => ({ value: r, label: r }));

function JoinCodeGate({ joinCode, onVerified }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code.trim().toUpperCase() === joinCode.toUpperCase()) {
      onVerified();
    } else {
      setError("Invalid code. Ask your admin for the session join code.");
    }
  };

  return (
    <div className="max-w-sm mx-auto text-center px-4">
      <Lock className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
      <h2 className="text-xl font-bold text-gray-900 mb-1">Join Session</h2>
      <p className="text-sm text-gray-500 mb-6">
        Enter the session code to check in
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
          placeholder="Enter code..."
          className="w-full text-center text-2xl font-mono tracking-[0.3em] px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 uppercase transition-all duration-150"
          maxLength={4}
          autoFocus
        />
        <button
          type="submit"
          disabled={code.trim().length < 4}
          className="w-full py-3 bg-indigo-500 text-white text-sm rounded-xl font-medium disabled:opacity-50 hover:bg-indigo-600 transition-all duration-150"
        >
          Join
        </button>
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 border-l-4 border-l-red-400 p-3 rounded-xl">{error}</p>
        )}
      </form>
    </div>
  );
}

function PillSelector({ label, options, value, onChange, colorMap }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</label>
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((opt) => {
          const active = value === opt.value;
          const colors = colorMap?.[opt.value];
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(active ? "No Preference" : opt.value)}
              className={`py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? colors || "bg-indigo-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 active:bg-gray-200 border border-gray-200"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConfirmStep({ name, isWalkIn, defaults, onCheckIn, onBack }) {
  const [role, setRole] = useState(defaults.role || "Debate");
  const [experience, setExperience] = useState(defaults.experience || "General");
  const [partnerMode, setPartnerMode] = useState(defaults.partner ? "partner" : "solo");
  const [partnerName, setPartnerName] = useState(defaults.partner || "");
  const [preference, setPreference] = useState(defaults.preference || "No Preference");

  const canCheckIn = role !== "Debate" || partnerMode === "solo" || partnerName.trim().length > 0;

  const handleCheckIn = () => {
    if (!canCheckIn) return;
    onCheckIn({
      ...(defaults.memberObj || {}),
      name,
      experience,
      defaultRole: role,
      role,
      partner: partnerMode === "solo" ? "" : partnerName.trim(),
      preference,
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 space-y-5">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-indigo-500 active:text-indigo-600 py-1 transition-colors duration-150"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div>
        <h2 className="text-lg font-bold text-gray-900">{name}</h2>
        {isWalkIn && (
          <p className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg mt-1 inline-block border border-indigo-200">New member</p>
        )}
      </div>

      <PillSelector
        label="I'm here to..."
        options={ROLE_PILL_OPTIONS}
        value={role}
        onChange={setRole}
      />

      {isWalkIn && (
        <PillSelector
          label="Experience"
          options={EXPERIENCE_LEVELS.map((lvl) => ({ value: lvl, label: lvl }))}
          value={experience}
          onChange={setExperience}
          colorMap={{
            Competitive: "bg-sky-500 text-white shadow-sm",
            General: "bg-emerald-500 text-white shadow-sm",
          }}
        />
      )}

      {role === "Debate" && (
        <div>
          <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Partner
          </label>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <button
              type="button"
              onClick={() => { setPartnerMode("solo"); setPartnerName(""); }}
              className={`py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                partnerMode === "solo"
                  ? "bg-gray-700 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 active:bg-gray-200 border border-gray-200"
              }`}
            >
              No Partner
            </button>
            <button
              type="button"
              onClick={() => setPartnerMode("partner")}
              className={`py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                partnerMode === "partner"
                  ? "bg-indigo-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-500 active:bg-gray-200 border border-gray-200"
              }`}
            >
              With Partner
            </button>
          </div>
          {partnerMode === "partner" && (
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Enter partner's name"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
              autoFocus
            />
          )}
        </div>
      )}

      {role === "Debate" && (
        <PillSelector
          label="Position Preference (optional)"
          options={PREFERENCE_OPTIONS}
          value={preference}
          onChange={setPreference}
        />
      )}

      <button
        onClick={handleCheckIn}
        disabled={!canCheckIn}
        className="w-full py-4 bg-indigo-500 text-white text-lg font-bold rounded-xl active:bg-indigo-600 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      >
        Check In
      </button>
    </div>
  );
}

function SearchStep({ members, onSelectMember, onWalkIn }) {
  const [query, setQuery] = useState("");
  const [didYouMean, setDidYouMean] = useState(null);
  const suggestionsRef = useRef(null);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2 || members.length === 0) return [];

    // 1. Exact substring match (handles full name, first name, last name typed out)
    const exact = members.filter((m) => m.name.toLowerCase().includes(q));
    if (exact.length > 0) return exact.slice(0, 6);

    // 2. Word-prefix match: each typed word is a prefix of some name word
    //    Handles "abhi w" → "Abhimanyu Wadhwa", "cam c" → "Cameron Coolidge"
    const queryWords = q.split(/\s+/).filter(Boolean);
    if (queryWords.length > 0) {
      const wordMatches = members.filter((m) => {
        const nameWords = m.name.toLowerCase().split(/\s+/);
        return queryWords.every((qw) =>
          nameWords.some((nw) => nw.startsWith(qw))
        );
      });
      if (wordMatches.length > 0) return wordMatches.slice(0, 6);
    }

    // 3. Fuzzy match via Levenshtein distance
    const qNorm = normalizeName(q);
    const scored = members
      .map((m) => ({ member: m, dist: levenshtein(qNorm, normalizeName(m.name)) }))
      .filter((s) => s.dist <= Math.max(3, Math.floor(s.member.name.length * 0.35)))
      .sort((a, b) => a.dist - b.dist);
    return scored.slice(0, 6).map((s) => s.member);
  }, [query, members]);

  // Scroll suggestions into view on mobile when they appear
  useEffect(() => {
    if (suggestions.length > 0 && suggestionsRef.current) {
      suggestionsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [suggestions.length]);

  const handleWalkIn = () => {
    const trimmed = query.trim();
    if (!trimmed || members.length === 0) return;

    // Check for exact match (case-insensitive)
    const closest = findClosestMember(trimmed, members);
    if (closest.distance === 0) {
      const member = members.find(
        (m) => normalizeName(m.name) === normalizeName(trimmed)
      );
      if (member) return onSelectMember(member);
    }

    // Check if query matches a member's first name or is a prefix of their full name
    // Catches "abhigya" → "Abhigya Goel", "abhimanyu" → "Abhimanyu Wadhwa"
    const qLower = trimmed.toLowerCase();
    const prefixMatch = members.find((m) => {
      const nameLower = m.name.toLowerCase();
      const firstName = nameLower.split(/\s+/)[0];
      return nameLower.startsWith(qLower) || firstName === qLower;
    });
    if (prefixMatch) {
      setDidYouMean(prefixMatch.name);
      return;
    }

    // Close Levenshtein match (typos in full name)
    if (closest.match && closest.distance <= 3) {
      setDidYouMean(closest.match);
      return;
    }

    onWalkIn(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length === 1) {
        onSelectMember(suggestions[0]);
      } else if (query.trim().length >= 2 && suggestions.length === 0 && members.length > 0) {
        handleWalkIn();
      }
    }
  };

  // "Did you mean?" confirmation
  if (didYouMean) {
    const member = members.find((m) => m.name === didYouMean);
    return (
      <div className="max-w-md mx-auto px-4 text-center">
        <div className="mb-4">
          <Users className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
          <h2 className="text-lg font-bold text-gray-900">Did you mean?</h2>
          <p className="text-sm text-gray-500 mt-1">
            You typed <strong>"{query.trim()}"</strong>
          </p>
        </div>
        <div className="space-y-3">
          <button
            onClick={() => { setDidYouMean(null); if (member) onSelectMember(member); }}
            className="w-full px-4 py-4 glass rounded-xl active:bg-gray-100 hover:bg-gray-50 flex items-center justify-between transition-all duration-150"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-700">{didYouMean}</span>
              {member && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  member.experience === "Competitive"
                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  {member.experience}
                </span>
              )}
            </div>
            <span className="text-xs text-indigo-500 font-medium">Yes, that's me</span>
          </button>
          <button
            onClick={() => { setDidYouMean(null); onWalkIn(query.trim()); }}
            className="w-full py-3 text-sm text-gray-400 active:text-gray-600 transition-colors duration-150"
          >
            No, join as <strong>"{query.trim()}"</strong>
          </button>
          <button
            onClick={() => setDidYouMean(null)}
            className="w-full py-2 text-xs text-gray-300 active:text-gray-500 transition-colors duration-150"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-4">
        <Users className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">Check In</h2>
        <p className="text-sm text-gray-500 mt-1">Find your name to get started</p>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your name..."
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          enterKeyHint="search"
          autoFocus
        />
      </div>

      {suggestions.length > 0 && (
        <div ref={suggestionsRef} className="space-y-2 mb-3">
          {suggestions.map((member) => (
            <button
              key={member.id}
              onClick={() => onSelectMember(member)}
              className="w-full px-4 py-3 text-left glass rounded-xl active:bg-gray-100 hover:bg-gray-50 flex items-center justify-between transition-all duration-150"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-700">{member.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  member.experience === "Competitive"
                    ? "bg-sky-50 text-sky-700 border border-sky-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  {member.experience}
                </span>
              </div>
              <span className="text-xs text-gray-400">Tap</span>
            </button>
          ))}
        </div>
      )}

      {query.trim().length >= 2 && suggestions.length === 0 && members.length > 0 && (
        <button
          onClick={handleWalkIn}
          className="w-full py-4 bg-gray-50 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-xl font-medium text-sm active:bg-indigo-50 transition-all duration-150"
        >
          New member? Join as <strong>"{query.trim()}"</strong>
        </button>
      )}

      {query.trim().length >= 2 && suggestions.length > 0 && (
        <button
          onClick={handleWalkIn}
          className="w-full py-3 text-sm text-gray-400 active:text-gray-600 transition-colors duration-150"
        >
          Not you? Join as <strong>"{query.trim()}"</strong>
        </button>
      )}
    </div>
  );
}

function CheckedInCard({ checkIn, onUpdate, paired }) {
  const [editing, setEditing] = useState(false);
  const [partnerMode, setPartnerMode] = useState(checkIn.partner ? "partner" : "solo");
  const [partnerName, setPartnerName] = useState(checkIn.partner || "");
  const [role, setRole] = useState(checkIn.role || "Debate");
  const [preference, setPreference] = useState(checkIn.preference || "No Preference");

  const canSave = role !== "Debate" || partnerMode === "solo" || partnerName.trim().length > 0;

  const handleSave = async () => {
    if (!canSave) return;
    await onUpdate(checkIn.id, { partner: partnerMode === "solo" ? "" : partnerName.trim(), role, preference });
    setEditing(false);
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-4">
        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
        <h2 className="text-xl font-bold text-gray-900">You're checked in!</h2>
        <p className="text-sm text-gray-500">
          {paired
            ? "Pairings are live. Edit below to request changes."
            : "Waiting for pairings to be generated..."}
        </p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{checkIn.name}</h3>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1 text-xs text-indigo-500 active:text-indigo-600 px-2 py-1 rounded-lg transition-colors duration-150"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>
          )}
        </div>

        <div className="flex gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            checkIn.experience === "Competitive"
              ? "bg-sky-50 text-sky-700 border border-sky-200"
              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
          }`}>
            {checkIn.experience}
          </span>
        </div>

        {editing ? (
          <div className="space-y-4 pt-3 border-t border-gray-200">
            <PillSelector
              label="Role"
              options={ROLE_PILL_OPTIONS}
              value={role}
              onChange={setRole}
            />
            {role === "Debate" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Partner</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => { setPartnerMode("solo"); setPartnerName(""); }}
                      className={`py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                        partnerMode === "solo"
                          ? "bg-gray-700 text-white shadow-sm"
                          : "bg-gray-100 text-gray-500 active:bg-gray-200 border border-gray-200"
                      }`}
                    >
                      No Partner
                    </button>
                    <button
                      type="button"
                      onClick={() => setPartnerMode("partner")}
                      className={`py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                        partnerMode === "partner"
                          ? "bg-indigo-500 text-white shadow-sm"
                          : "bg-gray-100 text-gray-500 active:bg-gray-200 border border-gray-200"
                      }`}
                    >
                      With Partner
                    </button>
                  </div>
                  {partnerMode === "partner" && (
                    <input
                      type="text"
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="Enter partner's name"
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
                      autoFocus
                    />
                  )}
                </div>
                <PillSelector
                  label="Position Preference (optional)"
                  options={PREFERENCE_OPTIONS}
                  value={preference}
                  onChange={setPreference}
                />
              </>
            )}
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="flex items-center gap-1 w-full justify-center py-3 bg-indigo-500 text-white text-sm rounded-xl font-medium active:bg-indigo-600 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        ) : (
          <div className="space-y-1 text-sm text-gray-600 pt-2 border-t border-gray-200">
            <p>
              <span className="text-gray-400">Role:</span> {checkIn.role}
            </p>
            {checkIn.role === "Debate" && (
              <>
                <p>
                  <span className="text-gray-400">Partner:</span>{" "}
                  {checkIn.partner || <span className="italic text-gray-300">Solo queue</span>}
                </p>
                <p>
                  <span className="text-gray-400">Preference:</span>{" "}
                  {checkIn.preference === "No Preference" ? <span className="italic text-gray-300">None</span> : checkIn.preference}
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CheckInView({ members, myCheckIn, session, onCheckIn, onUpdateCheckIn }) {
  const [codeVerified, setCodeVerified] = useState(false);
  const [step, setStep] = useState("search");
  const [confirmData, setConfirmData] = useState(null);

  if (myCheckIn) {
    return <CheckedInCard checkIn={myCheckIn} onUpdate={onUpdateCheckIn} paired={session?.status === "paired"} />;
  }

  if (session?.joinCode && !codeVerified) {
    return <JoinCodeGate joinCode={session.joinCode} onVerified={() => setCodeVerified(true)} />;
  }

  if (step === "confirm" && confirmData) {
    return (
      <ConfirmStep
        name={confirmData.name}
        isWalkIn={confirmData.isWalkIn}
        defaults={confirmData.defaults}
        onCheckIn={onCheckIn}
        onBack={() => { setStep("search"); setConfirmData(null); }}
      />
    );
  }

  return (
    <SearchStep
      members={members}
      onSelectMember={(member) => {
        setConfirmData({
          name: member.name,
          isWalkIn: false,
          defaults: {
            memberObj: member,
            experience: member.experience || "General",
            role: "Debate",
            preference: "No Preference",
            partner: "",
          },
        });
        setStep("confirm");
      }}
      onWalkIn={(name) => {
        setConfirmData({
          name,
          isWalkIn: true,
          defaults: {
            experience: "General",
            role: "Debate",
            preference: "No Preference",
            partner: "",
          },
        });
        setStep("confirm");
      }}
    />
  );
}
