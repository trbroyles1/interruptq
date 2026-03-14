# InterruptQ Enhancement #4 — Boards

## 1. Purpose

This enhancement introduces **Boards** — InterruptQ's take on team-level visibility. A board is a named group of identities that have opted in to comparing their aggregate performance metrics side by side. Boards are not shared work contexts. There are no unified sprint goals, no cross-user ticket tracking, and no team-level velocity calculations. Each participant's data remains individually computed; the board simply stacks those individual aggregates together for comparison.

The design is deliberately lightweight. Joining a board is as frictionless as @-tagging a person in an activity entry: start typing, pick from matching names (or create a new board on the fly), and you're in.

---

## 2. Handles

### 2.1 Definition

A handle is a short, user-chosen display name associated with an identity. It is the label used to represent the user on any board they participate in. Handles are set and changed in the Preferences panel.

### 2.2 Constraints

- Free-form text. No prefix character required.
- Maximum length: 32 characters.
- Minimum length: 1 character.
- No uniqueness constraint. Multiple identities may share the same handle. Board views identify participants by handle, and if two participants share a handle, both are displayed — the board does not attempt to disambiguate. (In practice, collisions within a small board are unlikely and self-correcting — users will change their handle if they notice a conflict.)

### 2.3 Mutability

A user may change their handle at any time via Preferences. The change takes effect immediately and retroactively — everywhere the handle is displayed (including boards and historical board views), the current handle is shown. There is no history of previous handles.

### 2.4 Requirement for Board Participation

A user **must** have a handle set before they can join any board. If a user without a handle attempts to add a board, the UI should prompt them to set a handle first (e.g., an inline message or a redirect to the handle field in Preferences). The board join action is blocked until a handle is saved.

---

## 3. Boards

### 3.1 Definition

A board is a named group with zero or more identity participants. It exists solely to aggregate and compare metrics across those participants. A board has no owner — no single identity has elevated permissions over it.

### 3.2 Board Names

Board names follow these rules:

- **Allowed characters:** alphanumeric (`a-z`, `A-Z`, `0-9`), underscores (`_`), and hyphens (`-`).
- **No spaces.**
- **Minimum length:** 1 character.
- **Maximum length:** 64 characters.
- **Case-insensitive.** `Cool_Board`, `cool_board`, and `COOL_BOARD` all refer to the same board. The system stores a canonical (lowercased) form for matching and lookup. The display form is the name as originally typed by the user who created the board (i.e., the first user whose join action caused the board to be created).
- **Globally unique** by canonical form. There cannot be two boards whose lowercased names are identical.

### 3.3 Board Lifecycle

- **Creation:** A board is created implicitly when a user joins a board name that does not yet exist. There is no explicit "create board" action.
- **Deletion:** A board is deleted automatically when its last participant leaves. The board record and its name are removed from the system. If a user later joins a board with the same name, it is a new board (with the display form as typed by that user).
- **No archive or soft-delete.** Once empty, a board is gone.

### 3.4 Participation Limits

A user may participate in at most **5** boards simultaneously. This limit is fixed and not user-configurable. Attempting to join a sixth board while at the limit is blocked with a clear message indicating the limit and suggesting the user leave an existing board first.

### 3.5 Global Board List

The list of existing boards is **not** partitioned by identity. When a user searches for boards to join, the autocomplete draws from the global list of all boards across the entire application. This is a deliberate exception to the general data-partitioning rule.

---

## 4. Joining and Leaving Boards

### 4.1 Board Membership UI

Board membership is managed in a dedicated section of the left panel, positioned **below** the Sprint Goals and Priorities editors. It displays:

- A heading such as **"Boards"**.
- The list of boards the user currently participates in, each displayed as a chip or tag (similar in visual treatment to how priorities appear in their list).
- An input field for adding a new board.

### 4.2 Joining a Board

The input field supports autocomplete from the global board list:

1. As the user types, a dropdown appears showing up to **10** closest-matching board names, filtered by substring match against the canonical (lowercased) form.
2. The user can select an existing board from the dropdown, or continue typing a new name that does not yet exist.
3. On submission (pressing Enter or clicking a dropdown item):
   - If the name matches an existing board, the user joins that board.
   - If the name does not match any existing board, a new board is created with that name and the user is its first participant.
   - If the user is already a participant in a board with that name, the action is a no-op.
   - If the user is at the 5-board limit, the action is blocked with an explanatory message.
   - If the user has no handle set, the action is blocked with a prompt to set one.

Validation of board name characters (alphanumeric, underscores, hyphens only) occurs at input time — invalid characters are rejected or stripped as they are typed.

### 4.3 Leaving a Board

Each board chip/tag in the membership list has a remove action (e.g., an "×" button). Clicking it immediately removes the user from that board. No confirmation is required — rejoining is trivial.

If the user was the last participant, the board is deleted per §3.3.

### 4.4 Board Links

Each board name in the membership list is a clickable link. Clicking it opens the board view (§5) in a new browser tab. The URL follows the pattern:

```
<base_url>/boards/<canonical_board_name>
```

For example: `https://interruptq.example.com/boards/cool_board`

Base URL resolution follows the same rules as share links (Enhancement #2, §5.3): use the `INTERRUPTQ_BASE_URL` environment variable if set, otherwise auto-detect from the request.

---

## 5. Board View

### 5.1 Access

Board views are **public**. No token or authentication is required. Anyone who knows the URL can view the board. There is no expiration — board views are available as long as the board exists (i.e., has at least one participant).

Visiting a board URL for a board that does not exist (or was deleted) displays a clear "board not found" message.

### 5.2 Time Scopes

The board view supports the following time scopes:

- **Day** — a single calendar day.
- **Week** — a calendar week (Mon–Sun, consistent with the user-level default, though the board view uses a fixed Monday start).
- **Month** — a calendar month.
- **Custom range** — arbitrary date range via date picker.

**Sprint** is not available as a scope. Sprints are per-user and variable-length; they do not translate meaningfully to a cross-user board.

The viewer can navigate between time periods within each scope (previous/next day, previous/next week, etc.).

### 5.3 Privacy Model — Permitted and Prohibited Metrics

The board view enforces a strict privacy boundary: **it never displays absolute time amounts that could be used to reverse-engineer how many hours a specific person worked on a given day.** The guiding principle is that a board should let participants compare the _shape_ and _quality_ of their work time, not the _quantity_.

**Permitted (shown per participant and as board aggregates):**

- Green / Yellow / Red time as **percentages** of total tracked work time.
- Total context switch **count**.
- Mean time between context switches (a duration — this is safe because it is an average that does not reveal total hours worked).
- Mean uninterrupted focus time — overall and broken out by classification (green / yellow / red). Same rationale: averages of block durations, not totals.
- Longest uninterrupted block — per classification and overall.
- Number of sprint goal changes and priority changes within the selected range.

**Prohibited (never shown on a board):**

- Total tracked time (hours or minutes) for any individual.
- Green / Yellow / Red time in absolute hours or minutes.
- Per-activity or per-ticket time totals.
- Per-person (@-tag) time totals.
- Any figure from which total work hours on a specific day could be arithmetically derived.

**Board-level aggregates** (computed across all participants):

- Mean, minimum, and maximum of each permitted metric across participants.
- Per-metric ranking of participants (e.g., "highest green %, lowest context switch count").

### 5.4 Board View Layout

The board view is a read-only page with the following elements:

- **Board name** displayed prominently as the page title.
- **Participant count** shown as a subtitle (e.g., "4 participants").
- **Time scope selector** with navigation controls.
- **Participant comparison table/grid** — one row (or card) per participant, showing all permitted metrics for the selected time scope. Participants are identified by their handle.
- **Board summary section** — aggregates (mean, min, max) across all participants for each metric.

The board view uses the same dark theme as the rest of the application.

### 5.5 Handling Participants with No Data

If a participant has no tracked time within the selected time scope (e.g., they joined recently and the viewer is looking at a historical period, or they simply didn't log anything), they appear in the participant list with a "No data" indication for that period. They are excluded from board-level aggregate calculations for that period.

---

## 6. Board Index Page

### 6.1 URL

```
<base_url>/boards
```

### 6.2 Access

Public, like individual board views. No token required.

### 6.3 Layout

A page displaying all boards in the system as a grid of cards:

- **Card content:** Board name as the title, participant count as a subtitle.
- **Card action:** Clicking a card navigates to that board's view (`/boards/<canonical_board_name>`).
- **Grid density:** Approximately 30 cards visible on a 1080p display without scrolling (adjust card sizing accordingly).
- **Sort order:** Alphabetical by canonical board name.
- **Search:** A search bar at the top of the page, filtering cards by substring match against board name as the user types.

If no boards exist in the system, the page displays a message such as "No boards yet."

The page uses the same dark theme as the rest of the application.

---

## 7. Data Model

### 7.1 Boards Table

| Field | Type | Description |
|---|---|---|
| **id** | auto-generated | System identifier. |
| **name_canonical** | text, unique | Lowercased board name, used for all lookups and URL routing. |
| **name_display** | text | Board name as originally typed by the creator, used for display. |
| **created_at** | timestamp | When the board was created. |

### 7.2 Board Memberships Table

| Field | Type | Description |
|---|---|---|
| **id** | auto-generated | System identifier. |
| **board_id** | reference → boards.id | The board. |
| **identity_id** | reference → identities.id | The participating identity. |
| **joined_at** | timestamp | When the identity joined the board. |

A unique constraint on `(board_id, identity_id)` prevents duplicate memberships.

### 7.3 Identity Table Changes

The existing identities table gains one new column:

| Field | Type | Description |
|---|---|---|
| **handle** | text, nullable | The user's chosen display name. Null until set. |

### 7.4 Data Partitioning Note

The boards and board_memberships tables are **not** partitioned by identity. They are global tables. This is consistent with the design intent: boards are a cross-identity concept.

However, when the board view computes metrics for display, it queries each participant's activity data scoped to their identity — the same partitioned data access pattern used everywhere else. The board view aggregates results _after_ fetching per-identity data, never via cross-identity joins that would bypass partition boundaries.

---

## 8. Impact on Existing Features

### 8.1 Preferences Panel

Two additions:

- **Handle field** — a text input for setting/changing the user's handle. Positioned prominently (e.g., near the top of the Preferences panel).
- **Board membership section** — while the primary board management UI lives in the left panel (§4.1), the Preferences panel may show current board memberships as read-only context (e.g., "You are a member of: `cool_board`, `backend-team`").

### 8.2 Share Links

Board views and share links are independent features. A share link provides access to one user's detailed reports (including timeline, absolute time figures, etc.). A board view provides comparative aggregate metrics across participants with the privacy restrictions in §5.3. There is no interaction between them — a board view does not link to share links, and a share link does not expose board membership.

### 8.3 Activity Entry, Sprint Management, Break, On-Call

No changes. Boards are a read-only, view-layer concept built on top of existing per-identity data.

---

## 9. Edge Cases

| Scenario | Behavior |
|---|---|
| User changes their handle while participating in boards | The new handle appears on all boards immediately. No notification to other participants. |
| Two participants on the same board have the same handle | Both are displayed. The board does not disambiguate. Users are expected to self-correct. |
| User disconnects (clears token) while participating in boards | Their membership persists. Their handle and data continue to appear on the board. If they reconnect with the same token, everything is as they left it. If they never reconnect, their data remains on the board indefinitely (they are still a participant as far as the system is concerned). |
| User joins a board, then another user creates an identity with the same handle and joins the same board | Two rows with the same handle appear on the board. No conflict. |
| Board has one participant who leaves | The board is deleted. The URL returns "board not found." |
| User at the 5-board limit tries to join another | Blocked with a message: "You are already a member of 5 boards. Leave a board to join a new one." |
| User without a handle tries to join a board | Blocked with a prompt to set a handle first. |
| Board view is accessed for a date range where no participant has data | All participants show "No data." Board-level aggregates show "No data." |
| Board name is entered with mixed case (`My_Board`) | Stored canonically as `my_board`. Display form is `My_Board` (the original casing from the user who caused creation). URL is `/boards/my_board`. |
| A board is deleted (last user leaves), then a new user joins a board with the same name | A new board is created. The display form is whatever the new user typed. No historical connection to the old board. |
| Board index page with many boards | Cards are paginated or scroll. Search bar filters in real-time. |

---

## 10. Out of Scope

The following are explicitly not part of this enhancement:

- Board ownership, admin roles, or moderation. All participants are equal.
- Kicking or inviting participants. Joining and leaving are self-service only.
- Board-level sprint goals, shared priorities, or unified velocity tracking.
- Absolute time figures on board views (prohibited by design, §5.3).
- Per-ticket or per-activity breakdowns on board views.
- @-tagged person reports on board views.
- Board-level notifications, alerts, or activity feeds.
- Private or invite-only boards. All boards are public.
- Board descriptions, avatars, or any metadata beyond the name.
- Configurable participation limit (fixed at 5).
- Handle uniqueness enforcement.
- Chat, comments, or any communication features within boards.
- Export (PDF or clipboard) from the board view.
- Board view within the single-pane-of-glass main app UI. Board views open in a new tab as standalone pages, as does the board index page.
