import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, query, where, writeBatch, addDoc } from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const firebaseConfig = {
  apiKey: "AIzaSyBeZ9VcpPKPQzTkSZeQ2law2yZczoebbUI",
  authDomain: "debate-pairings-system.firebaseapp.com",
  projectId: "debate-pairings-system",
  storageBucket: "debate-pairings-system.firebasestorage.app",
  messagingSenderId: "316236474525",
  appId: "1:316236474525:web:444db450fefd277d728c74",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const ORG_ID = "trojan-debate";

// Year for the dates in the CSV (Spring 2026 semester)
const YEAR = 2026;

function parseCSVLine(line) {
  const result = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

function parseDateHeader(header) {
  const parts = header.split("/");
  if (parts.length !== 2) return null;
  const month = parts[0].padStart(2, "0");
  const day = parts[1].padStart(2, "0");
  return `${YEAR}-${month}-${day}`;
}

function normalizeName(name) {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

async function deleteSessionAndCheckins(sessionId) {
  const checkinsCol = collection(db, "organizations", ORG_ID, "sessions", sessionId, "checkins");
  const checkinSnap = await getDocs(checkinsCol);
  const docs = checkinSnap.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    docs.slice(i, i + 500).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  const batch = writeBatch(db);
  batch.delete(doc(db, "organizations", ORG_ID, "sessions", sessionId));
  await batch.commit();
}

async function main() {
  await signInAnonymously(auth);
  console.log("Signed in anonymously");

  // Load roster to match experience levels
  const membersCol = collection(db, "organizations", ORG_ID, "members");
  const membersSnap = await getDocs(query(membersCol, where("active", "==", true)));
  const rosterMap = {};
  membersSnap.docs.forEach((d) => {
    const data = d.data();
    rosterMap[normalizeName(data.name)] = {
      name: data.name,
      experience: data.experience || "General",
    };
  });
  console.log(`Loaded ${Object.keys(rosterMap).length} roster members`);

  // Handle known name mismatches between CSV and roster
  const nameAliases = {
    "aldo hernandez paredes": "aj hernandez paredes",
    "drishti": "drishti baid",
    "shivali": "shivali sharma",
  };

  // Parse CSV
  const csvPath = resolve(__dirname, "..", "data", "tds_attendance.csv");
  const csvText = readFileSync(csvPath, "utf-8");
  const lines = csvText.trim().split("\n").filter((l) => l.trim());

  const headers = parseCSVLine(lines[0]);
  const dateHeaders = headers.slice(1);
  const dates = dateHeaders.map(parseDateHeader).filter(Boolean);

  console.log(`\nCSV has ${dates.length} date columns: ${dates.join(", ")}`);

  // Build attendance: { date: [{ name, experience, status }] }
  // status: "present" for 1, "absent" for 0, skip N/A and empty
  const attendanceByDate = {};
  dates.forEach((d) => { attendanceByDate[d] = []; });

  let unmatchedNames = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const csvName = values[0]?.trim();
    if (!csvName) continue;

    const norm = normalizeName(csvName);
    const aliasNorm = nameAliases[norm] || norm;

    const rosterMatch = rosterMap[aliasNorm] || rosterMap[norm];
    const experience = rosterMatch?.experience || "General";
    const displayName = rosterMatch?.name || csvName;

    if (!rosterMatch && !unmatchedNames.includes(csvName)) {
      unmatchedNames.push(csvName);
    }

    for (let j = 0; j < dates.length; j++) {
      const val = (values[j + 1] || "").trim();
      if (val === "1") {
        attendanceByDate[dates[j]].push({ name: displayName, experience, status: "present" });
      } else if (val === "0") {
        attendanceByDate[dates[j]].push({ name: displayName, experience, status: "absent" });
      }
      // N/A and empty → no doc (gray in UI)
    }
  }

  if (unmatchedNames.length > 0) {
    console.log(`\nWarning: ${unmatchedNames.length} names not found in roster (will use CSV name + General):`);
    unmatchedNames.forEach((n) => console.log(`  - ${n}`));
  }

  // Only create sessions for dates that have at least one entry (present or absent)
  const activeDates = dates.filter((d) => attendanceByDate[d].length > 0);
  console.log(`\n${activeDates.length} dates have data:`);
  activeDates.forEach((d) => {
    const present = attendanceByDate[d].filter((a) => a.status === "present").length;
    const absent = attendanceByDate[d].filter((a) => a.status === "absent").length;
    console.log(`  ${d}: ${present} present, ${absent} absent`);
  });

  // Delete old CSV-imported sessions to avoid duplicates
  const sessionsCol = collection(db, "organizations", ORG_ID, "sessions");
  const closedSnap = await getDocs(query(sessionsCol, where("status", "==", "closed")));
  const csvImportSessions = closedSnap.docs.filter((d) => d.data().source === "csv-import");

  if (csvImportSessions.length > 0) {
    console.log(`\nDeleting ${csvImportSessions.length} old CSV-imported sessions...`);
    for (const sessionDoc of csvImportSessions) {
      await deleteSessionAndCheckins(sessionDoc.id);
      console.log(`  Deleted ${sessionDoc.data().date} (${sessionDoc.id})`);
    }
  }

  // Also check for non-CSV sessions on these dates
  const existingDates = new Set();
  closedSnap.docs.forEach((d) => {
    if (d.data().source !== "csv-import" && d.data().date) {
      existingDates.add(d.data().date);
    }
  });

  const datesToCreate = activeDates.filter((d) => !existingDates.has(d));
  const skippedDates = activeDates.filter((d) => existingDates.has(d));

  if (skippedDates.length > 0) {
    console.log(`\nSkipping ${skippedDates.length} dates (non-CSV sessions already exist): ${skippedDates.join(", ")}`);
  }

  console.log(`\nCreating ${datesToCreate.length} sessions with checkins...`);

  let totalPresent = 0;
  let totalAbsent = 0;

  for (const date of datesToCreate) {
    const entries = attendanceByDate[date];
    const d = new Date(date + "T12:00:00");
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const sessionRef = await addDoc(sessionsCol, {
      date,
      name: `Session - ${formatted}`,
      status: "closed",
      joinCode: "",
      createdBy: "CSV Import",
      createdAt: d.toISOString(),
      source: "csv-import",
    });

    const presentCount = entries.filter((e) => e.status === "present").length;
    const absentCount = entries.filter((e) => e.status === "absent").length;
    console.log(`  Created session ${date} (${sessionRef.id}) — ${presentCount} present, ${absentCount} absent`);
    totalPresent += presentCount;
    totalAbsent += absentCount;

    // Add checkins in batches of 500
    const checkinsCol = collection(db, "organizations", ORG_ID, "sessions", sessionRef.id, "checkins");
    for (let i = 0; i < entries.length; i += 500) {
      const batch = writeBatch(db);
      entries.slice(i, i + 500).forEach((entry) => {
        const ref = doc(checkinsCol);
        const data = {
          uid: "csv-import",
          memberId: "",
          name: entry.name,
          experience: entry.experience,
          role: "Debate",
          partner: "",
          preference: "No Preference",
          halfRound: "",
          checkedInAt: d.toISOString(),
        };
        if (entry.status === "absent") {
          data.status = "absent";
        }
        batch.set(ref, data);
      });
      await batch.commit();
    }
  }

  console.log("\nDone! Summary:");
  console.log(`  Sessions created: ${datesToCreate.length}`);
  console.log(`  Present checkins: ${totalPresent}`);
  console.log(`  Absent checkins: ${totalAbsent}`);
  console.log(`  Total checkins: ${totalPresent + totalAbsent}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
