import React from "react";
import { Eye } from "lucide-react";
import { ROUND_TYPES, POSITION_NAMES } from "../utils/constants";

export const DisplayTab = ({ chambers, spectators, sessionDate }) => {
  if (chambers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>No chambers created. Load data and generate pairings.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div id="display-export">
          <div className="text-center mb-6 pb-4 border-b-2 border-gray-300">
            <h1 className="text-2xl font-bold text-gray-900">
              Trojan Debate Society - {sessionDate}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chambers.map((chamber) => (
              <div
                key={chamber.id}
                className="chamber-card border border-gray-200 rounded-lg p-4 bg-white shadow-sm"
              >
                <div className="chamber-header flex justify-between items-center mb-4 pb-3 border-b border-gray-200">
                  <h4 className="chamber-title text-lg font-semibold text-gray-900">
                    {chamber.room}
                  </h4>
                  <div className="flex gap-2">
                    <span className="badge badge-blue px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded font-medium">
                      {ROUND_TYPES[chamber.roundType].label}
                    </span>
                    {chamber.hasIron && (
                      <span className="badge badge-purple px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded font-medium">
                        Iron
                      </span>
                    )}
                    {chamber.mixed && (
                      <span className="badge badge-yellow px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded font-medium">
                        Mixed
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="section">
                    <h5 className="section-title font-medium text-sm text-gray-700 mb-2">
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
                              className="position-box border border-gray-200 rounded p-3 bg-gray-50"
                            >
                              <div className="position-label font-medium text-xs text-gray-600 mb-1">
                                {POSITION_NAMES[pos]}
                              </div>
                              {team && team.members.length > 0 ? (
                                <>
                                  {team.members.map((member) => (
                                    <div
                                      key={member.name}
                                      className="team-member font-medium text-sm"
                                    >
                                      {member.name}
                                    </div>
                                  ))}
                                  <div className="experience text-xs text-gray-500 mt-1">
                                    {team.experience}
                                  </div>
                                </>
                              ) : (
                                <div className="empty-slot text-sm text-gray-400 italic">
                                  Empty
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>

                  <div className="section">
                    <h5 className="section-title font-medium text-sm text-gray-700 mb-2">
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
                              className="position-box border border-gray-200 rounded p-3 bg-gray-50"
                            >
                              <div className="position-label font-medium text-xs text-gray-600 mb-1">
                                {POSITION_NAMES[pos]}
                              </div>
                              {team && team.members.length > 0 ? (
                                <>
                                  {team.members.map((member) => (
                                    <div
                                      key={member.name}
                                      className="team-member font-medium text-sm"
                                    >
                                      {member.name}
                                    </div>
                                  ))}
                                  <div className="experience text-xs text-gray-500 mt-1">
                                    {team.experience}
                                  </div>
                                </>
                              ) : (
                                <div className="empty-slot text-sm text-gray-400 italic">
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
                  <div className="iron-section mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <span className="iron-label font-semibold text-yellow-900">
                      Iron:
                    </span>
                    <span className="text-yellow-800 ml-2">
                      {chamber.ironPerson.name}
                    </span>
                    <span className="text-xs text-yellow-700 ml-2">
                      ({POSITION_NAMES[chamber.ironPosition]})
                    </span>
                  </div>
                )}

                <div className="judge-section mt-4 pt-3 border-t border-gray-200 flex items-center gap-2 text-sm">
                  <span className="judge-label font-medium">Judge:</span>
                  {chamber.judges && chamber.judges.length > 0 ? (
                    <span>{chamber.judges.map((j) => j.name).join(", ")}</span>
                  ) : (
                    <span className="no-judge text-red-600">
                      No judge assigned
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {spectators.length > 0 && (
            <div className="spectators border border-gray-200 rounded-lg p-4 bg-gray-50 mt-6">
              <h4 className="spectators-title text-lg font-semibold mb-3 text-gray-900">
                Spectators ({spectators.length})
              </h4>
              <div className="spectator-list flex flex-wrap gap-2">
                {spectators.map((person, idx) => (
                  <span
                    key={idx}
                    className="spectator-badge px-3 py-1 bg-white rounded-full text-sm border border-gray-300"
                  >
                    {person.name || person}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
