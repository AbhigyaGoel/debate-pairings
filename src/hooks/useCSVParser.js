import { useCallback } from "react";
import { parseCSVLine, isDebater, filterByRole } from "../utils/helpers";
import { EXPERIENCE_LEVELS } from "../utils/constants";

export const useCSVParser = (setParticipants, setAlerts) => {
  const parseCSVData = useCallback(
    (csvText) => {
      const lines = csvText
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      if (lines.length === 0) return [];

      const headers = parseCSVLine(lines[0]);
      const data = [],
        skipped = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {
          name: "",
          partner: "",
          experience: "",
          preference: "No Preference",
          halfRound: "",
          role: "Debate",
        };

        headers.forEach((header, index) => {
          const value = (values[index] || "").trim();
          const headerLower = header.toLowerCase().trim();

          if (headerLower === "name") row.name = value;
          else if (headerLower.includes("partner")) row.partner = value;
          else if (headerLower.includes("experience")) row.experience = value;
          else if (headerLower.includes("preference"))
            row.preference = value || "No Preference";
          else if (
            headerLower.includes("half") &&
            headerLower.includes("round")
          )
            row.halfRound = value || "";
          else if (headerLower === "role") row.role = value || "Debate";
        });

        if (row.name && row.experience) {
          if (EXPERIENCE_LEVELS.includes(row.experience)) data.push(row);
          else
            skipped.push(
              `${row.name} (invalid experience: "${row.experience}")`,
            );
        } else if (row.name)
          skipped.push(`${row.name} (missing experience level)`);
      }

      if (skipped.length > 0) {
        setAlerts((prev) => [
          ...prev,
          {
            type: "warning",
            message: `Skipped ${skipped.length} entries: ${skipped.join(", ")}`,
          },
        ]);
      }

      return data;
    },
    [setAlerts],
  );

  const handleCSVInput = useCallback(
    (csvText) => {
      if (!csvText?.trim()) {
        setAlerts([{ type: "error", message: "Please provide CSV data" }]);
        return;
      }

      try {
        const data = parseCSVData(csvText);
        if (data.length === 0) {
          setAlerts([
            {
              type: "error",
              message:
                "No valid data found in CSV. Check column headers and experience levels.",
            },
          ]);
          return;
        }

        const debaters = data.filter(isDebater);
        const judges = filterByRole(data, "judg");
        const spectators = filterByRole(data, "spectat");

        setParticipants(data);
        setAlerts([
          {
            type: "success",
            message: `Loaded ${data.length} participants: ${debaters.length} debaters, ${judges.length} judges, ${spectators.length} spectators`,
          },
        ]);
      } catch (error) {
        setAlerts([
          { type: "error", message: "Failed to parse CSV: " + error.message },
        ]);
      }
    },
    [parseCSVData, setParticipants, setAlerts],
  );

  return { handleCSVInput };
};
