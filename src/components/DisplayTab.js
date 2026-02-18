import React, { useState, useEffect } from "react";
import { Eye, Send, X } from "lucide-react";
import { ROUND_TYPES, POSITION_NAMES } from "../utils/constants";

const TRAVEL_SECONDS = 120;
const PREP_SECONDS = 900;
const TOTAL_SECONDS = TRAVEL_SECONDS + PREP_SECONDS;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function MotionTimer({ motionDroppedAt }) {
  const [elapsed, setElapsed] = useState(() =>
    Math.floor((Date.now() - Date.parse(motionDroppedAt)) / 1000)
  );

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - Date.parse(motionDroppedAt)) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [motionDroppedAt]);

  if (elapsed >= TOTAL_SECONDS) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-sm font-semibold text-emerald-700">Round in Progress</span>
      </div>
    );
  }

  const isTravel = elapsed < TRAVEL_SECONDS;
  const remaining = isTravel
    ? TRAVEL_SECONDS - elapsed
    : TOTAL_SECONDS - elapsed;
  const phase = isTravel ? "Travel Time" : "Prep Time";
  const colors = isTravel
    ? "bg-amber-50 border-amber-200 text-amber-700"
    : "bg-indigo-50 border-indigo-200 text-indigo-700";

  return (
    <div className={`flex items-center gap-4 px-5 py-3 rounded-xl border ${colors}`}>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider opacity-75">{phase}</div>
        <div className="text-2xl font-bold tabular-nums">{formatTime(remaining)}</div>
      </div>
      <div className="text-xs opacity-60">
        {isTravel ? "Get to your rooms" : "Prep your cases"}
      </div>
    </div>
  );
}

function MotionInput({ onDropMotion }) {
  const [motionText, setMotionText] = useState("");
  const [infoslideText, setInfoslideText] = useState("");

  const handleDrop = () => {
    if (!motionText.trim()) return;
    onDropMotion(motionText.trim(), infoslideText.trim());
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
          Motion
        </label>
        <textarea
          value={motionText}
          onChange={(e) => setMotionText(e.target.value)}
          placeholder="This house would..."
          rows={2}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150 resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide mb-1.5">
          Infoslide <span className="normal-case font-normal">(optional)</span>
        </label>
        <textarea
          value={infoslideText}
          onChange={(e) => setInfoslideText(e.target.value)}
          placeholder="Context or definitions for the motion..."
          rows={3}
          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150 resize-none"
        />
      </div>
      <button
        onClick={handleDrop}
        disabled={!motionText.trim()}
        className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150"
      >
        <Send className="w-4 h-4" />
        Drop Motion
      </button>
    </div>
  );
}

function MotionDisplay({ motion, infoslide, motionDroppedAt, isAdmin, onClearMotion }) {
  return (
    <div className="space-y-3">
      <MotionTimer motionDroppedAt={motionDroppedAt} />

      <div className="text-center">
        <p className="text-lg sm:text-xl font-semibold text-gray-900 leading-relaxed">
          &ldquo;{motion}&rdquo;
        </p>
      </div>

      {infoslide && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Infoslide
          </div>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{infoslide}</p>
        </div>
      )}

      {isAdmin && onClearMotion && (
        <div className="flex justify-end">
          <button
            onClick={onClearMotion}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors duration-150"
          >
            <X className="w-3 h-3" />
            Clear motion
          </button>
        </div>
      )}
    </div>
  );
}

export const DisplayTab = ({
  chambers,
  spectators,
  sessionDate,
  motion,
  infoslide,
  motionDroppedAt,
  isAdmin,
  onDropMotion,
  onClearMotion,
}) => {
  if (chambers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Eye className="w-12 h-12 mx-auto mb-4 text-gray-200" />
        <p>No chambers created. Load data and generate pairings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div id="display-export">
        <div className="mb-6 pb-4 border-b border-gray-200">
          {motion && motionDroppedAt ? (
            <MotionDisplay
              motion={motion}
              infoslide={infoslide}
              motionDroppedAt={motionDroppedAt}
              isAdmin={isAdmin}
              onClearMotion={onClearMotion}
            />
          ) : isAdmin && onDropMotion ? (
            <MotionInput onDropMotion={onDropMotion} />
          ) : (
            <div className="text-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Chambers - {sessionDate}
              </h1>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chambers.map((chamber) => (
            <div
              key={chamber.id}
              className="glass rounded-2xl p-4 sm:p-5 hover:shadow-lg transition-all duration-200"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">
                  {chamber.room}
                </h4>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs rounded-full font-medium border border-indigo-200">
                    {ROUND_TYPES[chamber.roundType].label}
                  </span>
                  {chamber.hasIron && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-200">
                      Iron
                    </span>
                  )}
                  {chamber.mixed && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-200">
                      Mixed
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Government
                  </h5>
                  <div className="space-y-2">
                    {ROUND_TYPES[chamber.roundType].positions
                      .filter((p) => p.includes("G"))
                      .map((pos) => {
                        const team = chamber.teams.find(
                          (t) => t.position === pos
                        );
                        return (
                          <div
                            key={pos}
                            className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                          >
                            <div className="text-xs font-medium text-gray-400 mb-1">
                              {POSITION_NAMES[pos]}
                            </div>
                            {team && team.members.length > 0 ? (
                              <>
                                {team.members.map((member) => (
                                  <div
                                    key={member.name}
                                    className="font-medium text-sm text-gray-700"
                                  >
                                    {member.name}
                                  </div>
                                ))}
                                {team.members.length === 1 && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-200">Iron</span>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  {team.experience}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-300 italic">
                                Empty
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Opposition
                  </h5>
                  <div className="space-y-2">
                    {ROUND_TYPES[chamber.roundType].positions
                      .filter((p) => p.includes("O") && !p.includes("G"))
                      .map((pos) => {
                        const team = chamber.teams.find(
                          (t) => t.position === pos
                        );
                        return (
                          <div
                            key={pos}
                            className="bg-gray-50 rounded-xl p-3 border border-gray-200"
                          >
                            <div className="text-xs font-medium text-gray-400 mb-1">
                              {POSITION_NAMES[pos]}
                            </div>
                            {team && team.members.length > 0 ? (
                              <>
                                {team.members.map((member) => (
                                  <div
                                    key={member.name}
                                    className="font-medium text-sm text-gray-700"
                                  >
                                    {member.name}
                                  </div>
                                ))}
                                {team.members.length === 1 && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full font-medium border border-amber-200">Iron</span>
                                )}
                                <div className="text-xs text-gray-400 mt-1">
                                  {team.experience}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-300 italic">
                                Empty
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              {chamber.hasIron && chamber.ironPerson && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="font-semibold text-amber-700 text-sm">
                    Iron:
                  </span>
                  <span className="text-amber-800 text-sm ml-2">
                    {chamber.ironPerson.name}
                  </span>
                  <span className="text-xs text-amber-600 ml-2">
                    ({POSITION_NAMES[chamber.ironPosition]})
                  </span>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-500">Judge:</span>
                {chamber.judges && chamber.judges.length > 0 ? (
                  <span className="text-gray-700">{chamber.judges.map((j) => j.name).join(", ")}</span>
                ) : (
                  <span className="text-red-500">
                    No judge assigned
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {spectators.length > 0 && (
          <div className="glass-subtle rounded-2xl p-5 mt-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-3">
              Spectators ({spectators.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {spectators.map((person, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600"
                >
                  {person.name || person}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
