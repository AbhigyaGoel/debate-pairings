import React, { useState, useMemo } from "react";
import { Download, Search, CalendarDays, Users, TrendingUp, ChevronDown } from "lucide-react";

function formatDateShort(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function rateColor(rate) {
  if (rate >= 0.75) return "text-emerald-600";
  if (rate >= 0.5) return "text-amber-600";
  if (rate > 0) return "text-red-500";
  return "text-gray-300";
}

function barColor(rate) {
  if (rate >= 0.75) return "bg-emerald-500";
  if (rate >= 0.5) return "bg-amber-500";
  if (rate > 0) return "bg-red-400";
  return "bg-gray-200";
}

// Compute the display state for a cell (applies N/A → absent inference after firstPresent)
function getDisplayState(rawState, date, firstPresent) {
  if (rawState === "na" && firstPresent && date >= firstPresent) return "absent";
  return rawState;
}

// Context-aware cycle:
// After firstPresent (no na): present → absent → excused → present
// Before firstPresent (full):  na → present → absent → excused → na
function nextState(displayState, afterFirstPresent) {
  if (afterFirstPresent) {
    if (displayState === "present") return "absent";
    if (displayState === "absent") return "excused";
    return "present"; // excused → present
  }
  if (displayState === "na") return "present";
  if (displayState === "present") return "absent";
  if (displayState === "absent") return "excused";
  return "na"; // excused → na
}

function StateIcon({ state, size = "w-3 h-3" }) {
  if (state === "present") return <span className={`inline-block ${size} bg-emerald-500 rounded-full`} />;
  if (state === "absent") return <span className={`inline-block ${size} bg-red-400 rounded-full opacity-70`} />;
  if (state === "excused") return <span className={`inline-block ${size} bg-amber-400 rounded-full opacity-80`} />;
  return <span className="inline-block text-gray-300 text-sm leading-none">&mdash;</span>;
}

function AttendanceCell({ state, isActive, isEditable, onClick }) {
  const base = "px-2 py-2.5 text-center";
  const activeBg = isActive ? "bg-indigo-50/40" : "";
  const editable = isEditable
    ? "cursor-pointer hover:bg-gray-100 transition-colors duration-100"
    : "";

  return (
    <td className={`${base} ${activeBg} ${editable}`} onClick={isEditable ? onClick : undefined}>
      <StateIcon state={state} />
    </td>
  );
}

function InactiveBadge() {
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 font-medium flex-shrink-0">
      Inactive
    </span>
  );
}

function MobileAttendanceCard({ row, dates, activeSessionDate, onToggleAttendance, isExpanded, onToggleExpand }) {
  const displayRate = row.firstSeen ? row.sinceJoinedRate : row.rate;
  const presentCount = dates.filter((d) => row.attendanceByDate[d] === "present").length;
  const missedCount = dates.filter((d) => {
    const ds = getDisplayState(row.attendanceByDate[d], d, row.firstPresent);
    return ds === "absent" || ds === "excused";
  }).length;

  return (
    <div className="border border-gray-100 rounded-xl bg-white overflow-hidden">
      <button
        className="w-full p-3 text-left"
        onClick={onToggleExpand}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium text-gray-700 truncate">{row.name}</span>
            {row.inactive && <InactiveBadge />}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
              row.experience === "Competitive"
                ? "bg-sky-50 text-sky-700 border border-sky-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}>
              {row.experience}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </div>
        </div>

        <div className="mb-2">
          <div className="flex items-baseline justify-between mb-1">
            <span className={`text-2xl font-bold ${rateColor(displayRate)}`}>
              {Math.round(displayRate * 100)}%
            </span>
            <span className="text-xs text-gray-400">
              {presentCount} present{missedCount > 0 ? `, ${missedCount} missed` : ""}
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${barColor(displayRate)}`}
              style={{ width: `${Math.round(displayRate * 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {row.streak} streak
          </span>
          {row.lastSeen && (
            <span>Last: {formatDateShort(row.lastSeen)}</span>
          )}
        </div>
      </button>

      {/* Expanded: date-by-date grid for editing */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-3 pb-3 pt-2">
          <div className="grid grid-cols-4 gap-1.5">
            {dates.map((date) => {
              const rawState = row.attendanceByDate[date];
              const afterFirst = !!(row.firstPresent && date >= row.firstPresent);
              const displayState = getDisplayState(rawState, date, row.firstPresent);
              const isActive = date === activeSessionDate;
              const canEdit = onToggleAttendance && !isActive;
              return (
                <button
                  key={date}
                  onClick={canEdit ? () => onToggleAttendance(row.name, date, nextState(displayState, afterFirst)) : undefined}
                  disabled={!canEdit}
                  className={`flex flex-col items-center gap-1 py-2 rounded-lg text-xs transition-colors duration-100 ${
                    isActive
                      ? "bg-indigo-50/60 border border-indigo-200"
                      : canEdit
                        ? "bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
                        : "bg-gray-50 opacity-60"
                  }`}
                >
                  <span className={`font-medium ${isActive ? "text-indigo-600" : "text-gray-500"}`}>
                    {formatDateShort(date)}
                  </span>
                  <StateIcon state={displayState} size="w-2.5 h-2.5" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function AttendanceTab({
  loading,
  progress,
  dates,
  memberRows,
  summary,
  activeSessionDate,
  onToggleAttendance,
}) {
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [filterExperience, setFilterExperience] = useState("all");
  const [search, setSearch] = useState("");
  const [expandedCard, setExpandedCard] = useState(null);

  const filteredAndSorted = useMemo(() => {
    let rows = [...memberRows];

    if (filterExperience !== "all") {
      rows = rows.filter((r) => r.experience === filterExperience);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "rate":
          cmp = a.sinceJoinedRate - b.sinceJoinedRate;
          break;
        case "streak":
          cmp = a.streak - b.streak;
          break;
        case "total":
          cmp = a.totalAttended - b.totalAttended;
          break;
        default:
          cmp = 0;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [memberRows, sortBy, sortDir, filterExperience, search]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const exportCSV = () => {
    const allRows = [...memberRows].sort((a, b) => a.name.localeCompare(b.name));
    const headers = ["Name", "Experience", "Rate%", "Since Joined%", "Total", "Streak", "First Seen", "Last Seen", ...dates];
    const csvRows = [headers.join(",")];

    for (const row of allRows) {
      const cols = [
        row.name.replace(/,/g, " "),
        row.experience,
        Math.round(row.rate * 100),
        Math.round(row.sinceJoinedRate * 100),
        row.totalAttended,
        row.streak,
        row.firstSeen || "",
        row.lastSeen || "",
        ...dates.map((d) => {
          const ds = getDisplayState(row.attendanceByDate[d], d, row.firstPresent);
          if (ds === "present") return "1";
          if (ds === "absent") return "0";
          if (ds === "excused") return "E";
          return "N/A";
        }),
      ];
      csvRows.push(cols.join(","));
    }

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="glass-spinner mx-auto mb-3" />
        <p className="text-sm text-gray-400">
          Loading {progress.loaded} of {progress.total} sessions...
        </p>
      </div>
    );
  }

  if (dates.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-200" />
        <p className="font-medium">No attendance data yet</p>
        <p className="text-sm mt-1">Attendance will appear after sessions are closed</p>
      </div>
    );
  }

  const sortArrow = (field) => {
    if (sortBy !== field) return "";
    return sortDir === "asc" ? " \u2191" : " \u2193";
  };

  const isFiltered = filterExperience !== "all" || search.trim();

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="glass-subtle rounded-xl p-3 flex flex-wrap items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-gray-500">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{summary.totalDates}</span> date{summary.totalDates !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5 text-gray-500">
          <Users className="w-4 h-4 text-gray-400" />
          <span className="font-medium">{summary.memberCount}</span> member{summary.memberCount !== 1 ? "s" : ""}
        </span>
        <span className="flex items-center gap-1.5 text-gray-500">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          Avg <span className="font-medium">{summary.avgAttendance}</span>/session
        </span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-emerald-500 rounded-full" /> Present
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-red-400 rounded-full opacity-70" /> Absent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 bg-amber-400 rounded-full opacity-80" /> Excused
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block text-gray-300 leading-none">&mdash;</span> N/A
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setSortDir(e.target.value === "name" ? "asc" : "desc"); }}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            <option value="name">Sort by Name</option>
            <option value="rate">Sort by Rate</option>
            <option value="total">Sort by Total</option>
            <option value="streak">Sort by Streak</option>
          </select>
          <select
            value={filterExperience}
            onChange={(e) => setFilterExperience(e.target.value)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          >
            <option value="all">All Levels</option>
            <option value="Competitive">Competitive</option>
            <option value="General">General</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 w-full sm:w-48"
            />
          </div>
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-indigo-500 text-white text-sm rounded-lg font-medium flex items-center gap-1.5 hover:bg-indigo-600 transition-all duration-150 flex-shrink-0"
            title={isFiltered ? "Exports all members (ignores current filters)" : "Export attendance as CSV"}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Mobile card layout — expandable for editing */}
      <div className="sm:hidden space-y-2">
        {filteredAndSorted.map((row) => (
          <MobileAttendanceCard
            key={row.name}
            row={row}
            dates={dates}
            activeSessionDate={activeSessionDate}
            onToggleAttendance={onToggleAttendance}
            isExpanded={expandedCard === row.name}
            onToggleExpand={() => setExpandedCard(expandedCard === row.name ? null : row.name)}
          />
        ))}
        {filteredAndSorted.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">No members match your filters</div>
        )}
      </div>

      {/* Desktop matrix table */}
      <div className="hidden sm:block">
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 sticky left-0 bg-gray-50/50 z-10 min-w-[160px]"
                  onClick={() => handleSort("name")}
                >
                  Name{sortArrow("name")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[80px]">
                  Level
                </th>
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 min-w-[60px]"
                  onClick={() => handleSort("rate")}
                  title="Attendance rate since first session attended"
                >
                  Rate{sortArrow("rate")}
                </th>
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 min-w-[60px]"
                  onClick={() => handleSort("total")}
                >
                  Total{sortArrow("total")}
                </th>
                <th
                  className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600 min-w-[60px]"
                  onClick={() => handleSort("streak")}
                >
                  Streak{sortArrow("streak")}
                </th>
                <th className="px-3 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider min-w-[72px]">
                  Last Seen
                </th>
                {dates.map((date) => (
                  <th
                    key={date}
                    className={`px-2 py-3 text-center text-xs font-medium tracking-wider whitespace-nowrap min-w-[52px] ${
                      date === activeSessionDate
                        ? "text-indigo-600 bg-indigo-50/60"
                        : "text-gray-400"
                    }`}
                  >
                    {formatDateShort(date)}
                    {date === activeSessionDate && (
                      <span className="block w-1.5 h-1.5 bg-indigo-500 rounded-full mx-auto mt-0.5 animate-pulse" />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAndSorted.map((row) => {
                const displayRate = row.firstSeen ? row.sinceJoinedRate : row.rate;
                return (
                  <tr key={row.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-150">
                    <td className="px-4 py-2.5 text-sm font-medium text-gray-700 sticky left-0 bg-white z-10">
                      <div className="flex items-center gap-1.5">
                        {row.name}
                        {row.inactive && <InactiveBadge />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                        row.experience === "Competitive"
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}>
                        {row.experience}
                      </span>
                    </td>
                    <td className={`px-3 py-2.5 text-center text-sm font-medium ${rateColor(displayRate)}`}>
                      {Math.round(displayRate * 100)}%
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm text-gray-500">
                      {row.totalAttended}
                    </td>
                    <td className="px-3 py-2.5 text-center text-sm text-gray-500">
                      {row.streak}
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400 whitespace-nowrap">
                      {row.lastSeen ? formatDateShort(row.lastSeen) : "\u2014"}
                    </td>
                    {dates.map((date) => {
                      const isActiveDate = date === activeSessionDate;
                      const canEdit = onToggleAttendance && !isActiveDate;
                      const rawState = row.attendanceByDate[date];
                      const afterFirst = !!(row.firstPresent && date >= row.firstPresent);
                      const displayState = getDisplayState(rawState, date, row.firstPresent);
                      return (
                        <AttendanceCell
                          key={date}
                          state={displayState}
                          isActive={isActiveDate}
                          isEditable={canEdit}
                          onClick={() => onToggleAttendance(row.name, date, nextState(displayState, afterFirst))}
                        />
                      );
                    })}
                  </tr>
                );
              })}
              {filteredAndSorted.length === 0 && (
                <tr>
                  <td colSpan={6 + dates.length} className="text-center py-8 text-gray-400 text-sm">
                    No members match your filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
