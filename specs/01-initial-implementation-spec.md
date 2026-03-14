# InterruptQ — Functional Specification

## 1. Overview

**InterruptQ** is a local-first time-tracking tool designed for startup software developers whose productive time is fragmented by constant context switches, shifting priorities, and ad-hoc interruptions. Its core purpose is to passively build a rich dataset of how a developer's time is actually spent versus how it _should_ be spent, and to surface that data through reports, charts, and exportable summaries suitable for presenting to management.

The app is _not_ a general-purpose time tracker. It is opinionated: it assumes the user operates within a sprint-based workflow, has assigned sprint goals, may be given ad-hoc priorities that diverge from those goals, and may be pulled into on-call rotations — and it classifies every minute of the workday against that reality.

**Key design principles:**
- Single-pane-of-glass UI — no page navigations or reloads; everything operates within one view with panels, modals, or slide-outs.
- Dark mode interface throughout.
- Installable as a PWA ("Add to Home Screen" / browser app mode).
- No authentication or multi-user concerns — runs locally for a single user.
- All user-facing configuration lives in an in-app Preferences panel, not in config files. Only infrastructure-level settings (port, database path, etc.) live in environment variables.

---

## 2. Core Concepts & Terminology

### 2.1 Activity Entry
A timestamped record of what the user is currently working on. Every new entry implicitly ends the previous one. An entry is a free-text string that may contain:
- JIRA ticket references (e.g., `TIK-789`, `CALL-456`)
- `@`-tagged person names (e.g., `@Mark`, `@Robert`)
- Free-text descriptions (e.g., `Meeting: Sprint Refinement`)

Examples: `"Bugfix JAR-456"`, `"1-1 @Robert"`, `"Research JRA-123 @Melissa"`, `"Meeting @Alice @Bob @Charlie"`

### 2.2 Time Classification (Green / Yellow / Red)
Every activity entry is automatically classified into one of three categories based on the user's current state:

| Color | Label | Meaning |
|-------|-------|---------|
| **Green** | On-target | Working on what you _should_ be working on. If **not on-call**: the entry matches a sprint goal. If **on-call**: the entry matches an on-call ticket. |
| **Yellow** | Re-prioritized | Working on something from the priority list that is not a sprint goal (i.e., you've been re-prioritized without officially changing the sprint). If on-call and working a sprint goal, this is also yellow (sprint work while on-call is secondary). |
| **Red** | Interrupted | Working on something that matches neither a sprint goal, a priority, nor (if on-call) an on-call ticket. |

**Classification rules in detail:**

**When NOT on-call:**
- Entry matches a sprint goal ticket → **Green**
- Entry matches a priority list item (but not a sprint goal) → **Yellow**
- Entry matches neither → **Red**

**When on-call:**
- Entry matches an on-call ticket (configurable prefix, default `CALL`) → **Green**
- Entry matches a sprint goal or priority list item → **Yellow**
- Entry matches neither → **Red**

**Matching logic:** An entry "matches" a sprint goal or priority if the entry text contains the ticket number or is an exact match to a free-text priority string. Matching should be case-insensitive and should match ticket numbers as whole tokens (e.g., `TIK-789` in the entry matches sprint goal `TIK-789`, but `TIK-7890` does not).

There is no mechanism to retroactively re-classify an entry or link free-text entries to goals/priorities. If it doesn't match, it's red.

### 2.3 Sprint
A date range representing a development sprint. Sprints are variable-length and delineated solely by the user pressing a "Sprint Cutover" action. There is no sprint naming — sprints are identified by their ordinal number and date range (e.g., "Sprint 12: Feb 3 – Feb 14"). The cutover action accepts an optional date (defaulting to today) to allow retroactive cutover if the user forgot on day 0.

### 2.4 Sprint Goals
An ordered list of JIRA ticket numbers representing what the user is officially supposed to deliver in the current sprint. When sprint goals are set or changed, the priority list is automatically overwritten to match the new sprint goals. Sprint goal changes within a sprint are counted and tracked.

### 2.5 Priorities
An ordered list of items the user has been told to focus on. Each item may be a JIRA ticket number or a free-text string (e.g., `"review widget-service config"`). Priorities can be edited independently of sprint goals. When priorities diverge from sprint goals, this is itself a tracked data point. Priority changes within a sprint are counted and tracked.

### 2.6 On-Call Status
A boolean toggle indicating whether the user is currently on-call. When on-call, the classification rules change (see §2.2) and the quick-pick layout changes (see §3.2). On-call status is toggled manually and the app records the timestamp of each toggle.

### 2.7 On-Call Ticket Prefix
A configurable string (default: `CALL`) used to identify on-call tickets. Any ticket reference in an entry whose project prefix matches this string is considered an on-call ticket. Editable in Preferences.

### 2.8 @-Tagged People
Person names prefixed with `@` within activity entries. The app extracts and remembers all unique `@`-tagged names across all entries. Multiple `@` tags per entry are supported. Each tagged person is attributed the full duration of that activity block in person-level reports. Names are stored for autocomplete in future entries.

---

## 3. User Interface

The entire application operates as a single-pane-of-glass interface. There are no separate pages or route-based navigation. The UI is organized into a primary workspace with contextual panels or modals for secondary functions (preferences, reports, sprint management).

### 3.1 Activity Entry Area
The primary interaction point, always visible and prominent. Consists of:

- **A text input field** for typing the current activity. As the user types:
  - If `@` is typed, an autocomplete dropdown appears showing previously-used names, filterable by continued typing. If the user types a new name not in the list and moves on (space, tab, or submits), the new name is memorized for future autocomplete.
  - Pressing Enter (or a submit action) records the entry with the current timestamp.
- **A "current activity" display** showing what is currently being tracked, its start time, its running elapsed time, and its classification color (green/yellow/red).
- **The quick-pick grid** (see §3.2) displayed below or beside the input field.

### 3.2 Quick-Pick Grid
A grid of cards (not a dropdown) providing one-tap entry for common activities. The layout is contextual:

**When NOT on-call:**
1. **Sprint Goals** (primary position, visually distinguished) — one card per sprint goal ticket.
2. **Priorities** (secondary position) — one card per priority item, _excluding_ any item that already appears in the sprint goals section. If the priority list is identical to sprint goals, this section is empty and hidden.
3. **Recent Other** — the last _N_ entries that were neither a sprint goal nor a priority item, where _N_ is user-configurable (default: 10). These persist indefinitely and scroll off naturally by count (newest pushes oldest out). Deduplicated by entry text.

**When on-call:**
1. **Recent On-Call Tickets** — the last _M_ entries matching the on-call ticket prefix, where _M_ is user-configurable (default: 5). Deduplicated by ticket number.
2. **Sprint Goals**
3. **Priorities** (excluding sprint goal duplicates, as above)
4. **Recent Other** — the last _M_ entries that are _not_ on-call tickets, sprint goals, or priority items (default: 5, user-configurable separately from the non-on-call recent count).

Tapping a quick-pick card populates and submits the entry immediately (equivalent to typing and pressing Enter).

### 3.3 Sprint & State Management Panel
Accessible via a persistent UI element (e.g., a sidebar section or header area). Displays and allows editing of:

- **On-call toggle** — a prominent switch showing current on-call status.
- **Sprint info** — current sprint number, start date, elapsed days. Contains the "Sprint Cutover" action with an optional date picker (defaults to today).
- **Sprint Goals editor** — an ordered list editor for JIRA ticket numbers. Changing this list overwrites the priority list. The app records the change event (timestamp + old list + new list) for reporting.
- **Priorities editor** — an ordered list editor for ticket numbers or free-text strings. Changing this list does _not_ affect sprint goals. The app records the change event for reporting.

The panel should display a subtle indicator when priorities differ from sprint goals (i.e., "priorities have diverged from sprint goals").

### 3.4 Reports & Analytics Panel
A rich reporting interface accessible from the main view (e.g., a large slide-out panel, an expandable section, or a modal overlay — but never a separate page). Reports operate across three configurable scopes:

- **Day** — a single calendar day
- **Week** — a calendar week (Mon–Sun or configurable)
- **Sprint** — a specific sprint's date range
- **Month** — a calendar month
- **Custom range** — arbitrary date range via date picker

The user should be able to navigate between scopes and between time periods within a scope (e.g., previous/next day, previous/next sprint).

#### 3.4.1 Day View Reports
Two display modes, togglable:

**Timeline mode:**
- A horizontal or vertical timeline of the workday showing each activity as a colored block (green/yellow/red) with the entry text, start time, and duration.
- Visual representation of the day's flow, making interruption patterns visually obvious.

**Aggregate mode:**
- Total time by classification (green / yellow / red) with percentages.
- Total number of context switches.
- Mean time between context switches.
- Mean uninterrupted focus time by classification (e.g., "average green block was 47 minutes").
- List of distinct activities with total time per activity.
- Breakdown by `@`-tagged person: how much time was spent on activities involving each person.

#### 3.4.2 Multi-Day View Reports (Week / Sprint / Month / Custom)
- **Time distribution chart** — stacked bar chart or area chart showing green/yellow/red time per day across the range.
- **Totals & percentages** — aggregate green/yellow/red time for the entire range.
- **Context switch frequency** — total switches, daily average, trend line.
- **Mean time between context switches** — for the range, and as a daily trend.
- **Mean uninterrupted focus time** — broken out by classification.
- **Top activities** — ranked list of activities by total time.
- **Person impact report** — for each `@`-tagged person: total time spent on activities involving them, number of context switches involving them, and classification breakdown. Sortable and filterable.
- **Sprint goal progress** — for sprint-scoped reports: time spent per sprint goal ticket, percentage of total time.
- **Priority drift summary** — for sprint-scoped reports: number of times sprint goals changed, number of times priorities changed, a timeline of when changes occurred.
- **On-call summary** — if on-call was active during the range: time spent on-call, time on on-call tickets vs. other work while on-call.

#### 3.4.3 Export
All reports support two export mechanisms:
- **PDF export** — a formatted, printable document of the currently displayed report.
- **Clipboard-friendly export** — a plain-text or lightly-formatted summary optimized for pasting into Slack messages or emails. Should include key metrics and a simple text-based breakdown, not raw data dumps.

### 3.5 Persistence Feedback
Every user action that persists state — including but not limited to submitting an activity entry, toggling on-call status, performing a sprint cutover, changing sprint goals or priorities, and saving preferences — must provide unobtrusive visual confirmation that the change was successfully saved. This could take the form of a brief inline indicator (e.g., a momentary checkmark, a subtle flash or highlight on the affected element, a small toast) but must not be disruptive to workflow (no modal dialogs, no alerts requiring dismissal). Conversely, if a save fails, the app must make the failure clearly apparent so the user is never left uncertain about whether their change was persisted.

### 3.6 Preferences Panel
Accessible from the main view (e.g., a gear icon). All settings are persisted to the database, not to config files. Settings include:

- **Working hours** — start time and end time for each day of the week, with days togglable on/off. Default: Monday–Friday, 9:00 AM – 6:00 PM.
- **On-call ticket prefix** — string, default `CALL`.
- **Quick-pick recent count (not on-call)** — integer, default 10.
- **Quick-pick recent on-call ticket count** — integer, default 5.
- **Quick-pick recent other count (while on-call)** — integer, default 5.
- **Week start day** — for weekly report alignment, default Monday.

---

## 4. Time Tracking Behavior

### 4.1 Entry Creates a Time Block
Each activity entry marks the beginning of a time block. The block ends when the next entry is created. There is no explicit "stop" or "pause" action.

### 4.2 Auto-Trimming to Working Hours
Time is only counted within the user's configured working hours. If an activity spans past the end of the workday, the tracked time stops at the configured end time. If no new entry is made the next morning, the previous activity does _not_ resume — the user must enter a new activity. If an entry is made outside working hours, it is recorded but contributes zero time until working hours resume (and is then treated as the active task from the start of the next working period, unless a new entry supersedes it before then).

### 4.3 Non-Working Days
Days toggled off in the working hours preferences contribute zero tracked time. Entries made on non-working days follow the same logic as entries outside working hours.

---

## 5. Data Model (Functional)

This section describes what data the system must persist, not how to implement it.

- **Activity entries** — timestamp, entry text, extracted ticket references, extracted `@`-tags, computed classification at time of entry.
- **Sprints** — ordinal number, start date, end date (null if current).
- **Sprint goal snapshots** — timestamp, ordered list of ticket numbers, associated sprint. A new snapshot is created each time goals are changed.
- **Priority snapshots** — timestamp, ordered list of items (ticket or free-text), associated sprint. A new snapshot is created each time priorities are changed.
- **On-call status changes** — timestamp, new status (on/off).
- **Known `@`-tag names** — deduplicated list of all person names ever tagged.
- **User preferences** — all settings from §3.5.

---

## 6. Derived Metrics

The following metrics must be computable for any arbitrary time range:

- **Total tracked time** — sum of all activity block durations within working hours.
- **Green / Yellow / Red time** — absolute and as percentage of total tracked time.
- **Total context switches** — count of activity entries (minus 1 for the first entry of each day, which is a "start" not a "switch").
- **Mean time between context switches** — total tracked time ÷ total context switches.
- **Mean uninterrupted focus time** — average duration of consecutive blocks of the same classification color.
- **Mean uninterrupted focus time by classification** — same as above, filtered to each color.
- **Longest uninterrupted block** — per classification and overall.
- **Per-activity time** — total time for each unique activity entry text.
- **Per-ticket time** — total time for each unique ticket reference.
- **Per-person time** — total time for activities involving each `@`-tagged person.
- **Per-person context switch count** — number of switches to/from activities involving each person.
- **Sprint goal change count** — number of sprint goal snapshot changes within a sprint.
- **Priority change count** — number of priority snapshot changes within a sprint.
- **On-call time** — total time spent while on-call status was active.
- **On-call ticket time** — total time on entries matching the on-call prefix.
- **On-call ticket time while not on-call** — time on on-call tickets when not in on-call status (represents being pulled off priorities by someone else's on-call work).

---

## 7. Technical Constraints

These are not implementation prescriptions but hard constraints the implementation must satisfy:

- **Runtime:** Node.js with Next.js.
- **Database:** SQLite.
- **ORM:** Drizzle ORM or Prisma (implementer's choice based on best fit).
- **Configuration:** Infrastructure config (port, DB path, etc.) via environment variables with `.env` file support. All other configuration via in-app Preferences persisted to the database.
- **Installability:** The app must serve a valid Web App Manifest and meet PWA installability criteria so browsers offer the "Install" / "Add to Home Screen" prompt.
- **No authentication:** Single-user, local-only. No login, sessions, or user accounts.

---

## 8. Open Items / Future Considerations

_These are explicitly out of scope for the initial build but noted for awareness:_

- JIRA integration (auto-importing sprint goals, ticket titles, etc.)
- Multi-user / team views
- Notification or reminder to log activity after idle periods
- Mobile-optimized layout
- Shared team dashboards
