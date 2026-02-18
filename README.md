# Trojan Debate Society - Pairings System

Real-time debate chamber pairing tool built for the Trojan Debate Society at USC. An admin starts a session, debaters check in on their phones, and the system generates balanced parliamentary debate chambers with fair position rotation - all synced live.

Deployed on **Vercel** with a **Firebase** backend.

## How It Works

### Admin Flow

1. Log in with admin code
2. Start a session (generates a 4-character join code)
3. Share the code — debaters check in on their phones
4. Generate pairings from check-ins (or from the roster for testing)
5. Adjust chambers with drag-and-drop if needed — rename rooms, swap teams, reassign positions
6. Pairings sync live to all viewers
7. End session — position history is saved for next time

### Debater Flow

1. Open the app on your phone
2. Enter the session join code
3. Search for your name (fuzzy matching handles typos and partial input)
4. Pick your role (Debate / Judge / Spectate), partner, and round preference
5. Check in — view your chamber assignment on the Display tab

## Features

**Pairing Engine**
- Generates 4-team parliamentary chambers grouped by experience level (Competitive / General)
- Creates mixed-experience chambers when needed, iron-man chambers for odd counts (3, 5, or 7 people)
- Opening-only and closing-only half-round support
- Fuzzy partner matching — handles typos, first-name-only, case differences
- Judges distributed round-robin across chambers

**Position Rotation**
- Tracks each debater's OG / OO / CG / CO history across all sessions
- Greedy rotation algorithm ensures fair cycling through all four positions
- Respects opening/closing half preferences
- History persists in Firestore, survives session deletes via rollback

**Drag-and-Drop Editing**
- Swap teams between positions within a chamber
- Move teams across chambers
- Drag individuals to/from the spectator bench
- Custom touch implementation for mobile (10px activation threshold, auto-scroll near edges, ghost element follows finger)
- All swaps update position history in real time

**Session Management**
- Session lifecycle: open → paired → closed
- Join code gating for debater check-in
- Inline session renaming
- Admin can add/remove/edit check-ins manually
- Real-time sync — admin edits (room names, team swaps) propagate instantly via Firestore

**Roster**
- Persistent member list stored in Firestore
- CSV import with fuzzy duplicate detection (Levenshtein distance)
- Walk-in debaters auto-added to roster on check-in
- Batch add roster members to active session

**Attendance**
- Cross-session attendance matrix built from check-in history
- Per-member stats: attendance rate, streak, first/last seen, inactive flag
- Tri-state cells (present / absent / N/A) with click-to-toggle editing
- Multiple sessions on the same date merged into one attendance column

**Session History**
- Browse all past sessions with attendee lists
- Rename or delete old sessions
- Deleting a session rolls back its position assignments from the accumulated history

**Display & Export**
- Clean read-only Display tab for projecting pairings
- CSV export of chamber assignments
- CSV export of full position history

## Getting Started

```bash
git clone https://github.com/yourusername/debate-pairings.git
cd debate-pairings
npm install
npm start
```

Requires a Firebase project with Firestore and Anonymous Auth enabled. The app config lives in `src/services/firebase.js`.

## UI

Glass morphism design using custom CSS backdrop-filter classes (`.glass`, `.glass-strong`, `.glass-subtle`). Responsive dual-layout throughout: card-based UI on mobile (`sm:hidden`), table-based on desktop (`hidden sm:block`). Two-row tab bar on mobile for reachability.

---

## Technical Details

### Stack

| | |
|-|-|
| **Frontend** | React 19, Tailwind CSS (CDN), Lucide React icons |
| **Backend** | Firebase Firestore + Anonymous Auth |
| **Hosting** | Vercel with Vercel Analytics |
| **Build** | Create React App (react-scripts 5.0.1) |
| **State** | React Context (Auth, DragDrop) + custom hooks |

### Firestore Data Model

```
organizations/{orgId}
  ├── admins: { uid: { displayName, grantedAt } }
  ├── positionHistory: { "Alice": ["OG", "OO", ...], ... }
  ├── members/
  │     └── {memberId}: { name, experience, active, createdAt }
  └── sessions/
        └── {sessionId}
              ├── status: "open" | "paired" | "closed"
              ├── date, name, joinCode, createdBy
              ├── chambers: [...]          // full pairing state
              ├── spectators: [...]
              ├── sessionPositions: {...}   // this session's assignments
              └── checkins/
                    └── {checkinId}: { uid, name, role, partner, experience, preference }
```

**Position history is split into two levels:**
- **Org-level `positionHistory`** — accumulated from all past sessions, drives the assignment algorithm
- **Session-level `sessionPositions`** — current session only, replaced on each regenerate, merged into org history when the session ends

### Source Structure

```
src/
├── App.js                          # Main orchestrator (~750 lines)
├── contexts/
│   ├── AuthContext.js               # Firebase Anonymous Auth + admin verification
│   └── DragDropContext.js           # Drag state (item, target, touch position)
├── hooks/
│   ├── usePairingGenerator.js       # Team creation + chamber layout algorithm
│   ├── usePositionAssignment.js     # OG/OO/CG/CO rotation logic
│   ├── useDragDropHandlers.js       # Swap/move logic for teams, people, judges
│   ├── useSession.js                # Session lifecycle + Firestore sync
│   ├── useMembers.js                # Roster subscription
│   ├── useSessionHistory.js         # Closed session browsing
│   ├── useAttendance.js             # Attendance matrix computation
│   └── useAutoScroll.js             # Scroll during mouse drag
├── components/
│   ├── CheckInView.js               # Mobile check-in (join code → search → confirm)
│   ├── SessionTab.js                # Admin check-in management
│   ├── ChambersTab.js               # Chamber list with drag-drop
│   ├── Chamber.js                   # Single chamber card (room name, round type, positions)
│   ├── PositionBox.js               # Single OG/OO/CG/CO slot
│   ├── DraggablePerson.js           # Draggable name element with grip icon
│   ├── TouchDragLayer.js            # Portal-based touch drag with ghost element
│   ├── DisplayTab.js                # Read-only pairing view
│   ├── HistoryTab.js                # Position history table + next-position predictions
│   ├── RosterTab.js                 # Member CRUD + CSV import
│   ├── AttendanceTab.js             # Attendance grid + stats
│   ├── SessionsTab.js               # Closed session browser
│   ├── CSVImportModal.js            # CSV upload with fuzzy duplicate detection
│   ├── AdminLoginModal.js           # Admin code entry
│   └── Alert.js                     # Toast notifications
├── services/
│   ├── firebase.js                  # Firebase app init
│   ├── sessionService.js            # Session/checkin/position CRUD
│   └── memberService.js             # Roster CRUD with real-time subscription
└── utils/
    ├── helpers.js                   # normalizeName, normalizeRole, levenshtein, parseCSV
    └── constants.js                 # Positions, round types, experience levels, iron scenarios
```

### Pairing Algorithm

1. **Role filtering** — separate debaters, judges, explicit spectators
2. **Partner matching** — 4-level fuzzy: exact → case-insensitive → first-name prefix → substring. Cross-experience partners are split with a warning alert. Unmatched partner names create ghost members.
3. **Team formation** — explicit pairs first, then random pairing of singles within experience level. Odd person out becomes a single-member team.
4. **Chamber creation** — same-experience 4-team chambers first, then mixed chambers from remainders. Leftover counts of 7, 5, or 3 people trigger iron-man chambers. Single leftover goes to spectators.
5. **Half-round routing** — teams requesting opening/closing halves are separated into 2-team chambers
6. **Position assignment** — greedy rotation: look up each debater's history, assign the first position they haven't done yet, respecting half-round preferences. Full cycle before repeating.
7. **Judge distribution** — shuffled, one per chamber round-robin, extras distributed randomly

### Drag-and-Drop

No external library. Mouse drag uses native HTML5 drag events. Touch drag is a custom implementation in `TouchDragLayer.js`:
- Renders as a React Portal on `document.body`
- 10px movement threshold before activation (prevents accidental drags)
- Ghost element follows the finger via `touchmove` coordinates
- `document.elementFromPoint()` identifies drop targets beneath the ghost
- Auto-scrolls the page when dragging within 80px of viewport edges
- Fires a synthetic drop event on `touchend`

Swap logic in `useDragDropHandlers.js`: dragging person A onto person B's position swaps both. All moves update `sessionPositions` for position history tracking.

### Real-Time Sync

- Firestore `onSnapshot` listeners for session, check-ins, and roster
- Chamber edits (room names, team swaps) are debounced 500ms before writing to Firestore
- A sync guard (`isSyncing` ref + `saveTimerRef` check) prevents incoming snapshots from overwriting in-progress local edits

### Auth Model

Firebase Anonymous Auth for all users. Admins are identified by a code stored on the org document — entering the correct code writes the user's UID to the `admins` map. No Google Sign-In, no passwords, no user accounts.

## Scripts

Maintenance utilities in `scripts/` (not part of the app build):
- `seed-roster.mjs` — populate initial member list
- `seed-attendance.mjs` — create test session data
- `fix-names.mjs` — bulk name corrections in Firestore

## License

MIT — built for the Trojan Debate Society at the University of Southern California.
