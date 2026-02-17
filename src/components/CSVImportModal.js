import React, { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Upload, FileText } from "lucide-react";
import { parseCSVLine, findClosestMember } from "../utils/helpers";
import { EXPERIENCE_LEVELS } from "../utils/constants";

export function CSVImportModal({ onImport, onClose, existingMembers = [] }) {
  const [parsedData, setParsedData] = useState(null);
  const [fuzzyInclude, setFuzzyInclude] = useState({});
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");


  const parseCSV = useCallback((csvText) => {
    const lines = csvText.trim().split("\n").filter((line) => line.trim());
    if (lines.length === 0) return { data: [], skipped: [] };

    const headers = parseCSVLine(lines[0]);
    const data = [];
    const skipped = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row = {
        name: "",
        experience: "",
      };

      headers.forEach((header, index) => {
        const value = (values[index] || "").trim();
        const headerLower = header.toLowerCase().trim();

        if (headerLower === "name") row.name = value;
        else if (headerLower.includes("experience")) row.experience = value;
      });

      if (row.name && row.experience) {
        if (EXPERIENCE_LEVELS.includes(row.experience)) data.push(row);
        else skipped.push(`${row.name} (invalid experience: "${row.experience}")`);
      } else if (row.name) {
        skipped.push(`${row.name} (missing experience level)`);
      }
    }

    return { data, skipped };
  }, []);

  const handleFileUpload = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setError("");
      setFuzzyInclude({});

      const reader = new FileReader();
      reader.onload = (event) => {
        const csvText = event.target?.result;
        if (typeof csvText === "string") {
          const result = parseCSV(csvText);
          if (result.data.length === 0) {
            setError("No valid entries found. Check column headers and experience levels.");
            setParsedData(null);
          } else {
            const newMembers = [];
            const exactDuplicates = [];
            const fuzzyMatches = [];

            result.data.forEach((row) => {
              const closest = findClosestMember(row.name, existingMembers);
              if (closest.distance === 0) {
                exactDuplicates.push({ csvName: row.name, rosterName: closest.match });
              } else if (closest.distance <= 2) {
                fuzzyMatches.push({ row, existingName: closest.match, distance: closest.distance });
              } else {
                newMembers.push(row);
              }
            });

            const defaultFuzzy = {};
            fuzzyMatches.forEach((_, i) => { defaultFuzzy[i] = false; });
            setFuzzyInclude(defaultFuzzy);

            setParsedData({ ...result, newMembers, exactDuplicates, fuzzyMatches });
          }
        }
      };
      reader.onerror = () => setError("Failed to read file");
      reader.readAsText(file);
    },
    [parseCSV, existingMembers]
  );

  const handleImport = async () => {
    if (!parsedData) return;
    const toImport = [
      ...parsedData.newMembers,
      ...parsedData.fuzzyMatches
        .filter((_, i) => fuzzyInclude[i])
        .map((f) => f.row),
    ];
    if (toImport.length === 0) return;

    setImporting(true);
    try {
      await onImport(toImport);
      onClose();
    } catch (err) {
      setError("Import failed: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  const totalToImport = parsedData
    ? parsedData.newMembers.length +
      parsedData.fuzzyMatches.filter((_, i) => fuzzyInclude[i]).length
    : 0;

  const newMembers = parsedData ? parsedData.newMembers : [];
  const compCount = newMembers.filter((m) => m.experience === "Competitive").length;
  const genCount = newMembers.length - compCount;

  return createPortal(
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-strong rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900">Import from CSV</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 p-1 transition-all duration-150">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          <p className="text-sm text-gray-500">
            Expected columns: Name, Experience Level
          </p>

          <div className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50/50 rounded-xl p-6 text-center transition-colors duration-150">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-import"
            />
            <label
              htmlFor="csv-import"
              className="cursor-pointer flex flex-col items-center gap-2"
            >
              <FileText className="w-8 h-8 text-gray-300" />
              {fileName ? (
                <span className="text-sm text-gray-700">{fileName}</span>
              ) : (
                <span className="text-sm text-gray-400">Click to select CSV file</span>
              )}
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 border-l-4 border-l-red-400 p-3 rounded-lg">{error}</p>
          )}

          {parsedData && (
            <div className="space-y-3">
              {newMembers.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 border-l-4 border-l-emerald-400 rounded-xl p-3 space-y-1">
                  <p className="text-sm font-medium text-emerald-700">
                    {newMembers.length} new member{newMembers.length !== 1 ? "s" : ""}
                  </p>
                  <div className="flex gap-3 text-xs text-emerald-600">
                    <span>{compCount} competitive</span>
                    <span>{genCount} general</span>
                  </div>
                </div>
              )}

              {parsedData.exactDuplicates.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 border-l-4 border-l-gray-300 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-500">
                    {parsedData.exactDuplicates.length} already in roster (skipping)
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {parsedData.exactDuplicates.map((d) => d.csvName).join(", ")}
                  </p>
                </div>
              )}

              {parsedData.fuzzyMatches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 border-l-4 border-l-amber-400 rounded-xl p-3 space-y-2">
                  <p className="text-sm font-medium text-amber-700">
                    {parsedData.fuzzyMatches.length} possible duplicate{parsedData.fuzzyMatches.length !== 1 ? "s" : ""} — check any that are actually new people:
                  </p>
                  {parsedData.fuzzyMatches.map((fm, i) => (
                    <label
                      key={i}
                      className="flex items-center gap-2 text-sm cursor-pointer py-1"
                    >
                      <input
                        type="checkbox"
                        checked={fuzzyInclude[i] || false}
                        onChange={(e) =>
                          setFuzzyInclude({ ...fuzzyInclude, [i]: e.target.checked })
                        }
                        className="rounded border-gray-300 bg-white text-indigo-500 focus:ring-indigo-500/30"
                      />
                      <span className="text-amber-800">
                        <strong>"{fm.row.name}"</strong>
                        <span className="text-amber-600"> looks like </span>
                        <strong>"{fm.existingName}"</strong>
                        <span className="text-amber-500 text-xs ml-1">
                          in roster
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {parsedData.skipped.length > 0 && (
                <div className="bg-red-50 border border-red-200 border-l-4 border-l-red-400 rounded-xl p-3">
                  <p className="text-xs text-red-600">
                    {parsedData.skipped.length} invalid: {parsedData.skipped.join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end p-4 sm:p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-150"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!parsedData || totalToImport === 0 || importing}
            className="px-4 py-2 text-sm bg-indigo-500 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-600 transition-all duration-150"
          >
            {importing
              ? "Importing..."
              : totalToImport > 0
                ? `Import ${totalToImport} Member${totalToImport !== 1 ? "s" : ""}`
                : "Nothing to Import"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
