# InterruptQ Enhancement #1 — Break Functionality

## 1. Purpose

This enhancement introduces a **Break** state to InterruptQ, representing periods during working hours when the user is not performing any work activity. Break is not a classification of work (like green/yellow/red) — it is the absence of work. Its primary purpose is to prevent idle time from inflating or distorting tracked work metrics, while remaining visible in the day-level timeline for an honest picture of how the day unfolded.

---

## 2. Core Behavior

### 2.1 Entering Break

Break is activated exclusively via a dedicated **Break button** in the UI (see §3). Typing the word "Break" or any variation into the activity entry text field has no special meaning — it is treated as a normal activity entry, classified by the standard green/yellow/red rules, and subject to all normal entry behaviors (ticket extraction, @-tag parsing, etc.).

The Break button behaves like a quick-pick card tap: pressing it immediately ends the current activity block and begins a Break block timestamped to the current moment. No text input is involved. The Break block has no entry text, no ticket references, and no @-tags.

### 2.2 Exiting Break

Break ends implicitly when the user begins any new activity — whether by typing and submitting an entry, tapping a quick-pick card, or any other mechanism that creates a new activity entry. There is no "end break" button or explicit break-exit action.

### 2.3 Current Activity Display

While on break, the "current activity" display area (which normally shows the active entry text, start time, elapsed time, and classification color) should indicate the Break state. It should show:

- A label such as **"Break"** or **"On Break"**
- The start time of the break
- Running elapsed time
- A **gray** color indicator (consistent with the gray used in the timeline view)

### 2.4 Auto-Break at End of Workday

When the configured working hours end for the current day, the system automatically transitions the user into Break. This means:

- The currently active work block is trimmed to the configured end-of-day time (per the existing auto-trimming rule in §4.2 of the base spec).
- From that moment, the user is considered on Break.
- This auto-break is silent and requires no user interaction.

### 2.5 Start of Next Workday

When the next working day begins, the user is on Break by default. No work time accrues until the user explicitly logs a new activity. This is consistent with the existing behavior described in the base spec (§4.2) where a previous activity does not resume the next morning — Break simply gives that implicit idle state a concrete name and visual representation.

### 2.6 Non-Working Days

On days toggled off in working hours preferences, the user is effectively on break for the entire day. No break time is recorded or displayed for non-working days, consistent with the existing rule that non-working days contribute zero tracked time.

---

## 3. User Interface

### 3.1 Break Button Placement

The Break button is placed directly below the **On-Call / Off-Call toggle** in the Sprint & State Management panel area. It is always visible and accessible from the main view — not buried in a menu or modal.

The button should be visually distinct from work-related controls (quick-pick cards, the activity entry field). It is a utility control, not a work-selection control. Suggested styling: a gray-toned button consistent with the gray color used for break blocks in the timeline, with a label such as "Break" or a pause icon with label.

When the user is currently on break, the button should appear in an active/pressed state to reinforce the current status. When the user is not on break, it appears in its default inactive state.

### 3.2 Quick-Pick Grid

Break does **not** appear as a card in the quick-pick grid. The quick-pick grid is exclusively for work activities.

### 3.3 Timeline View (Day Reports)

Break blocks appear in the day-level timeline as **gray** colored blocks, consistent with the green/yellow/red blocks for classified work. Each break block shows:

- Start time
- Duration
- The label "Break" as the entry text

This provides a complete visual picture of the day, including when the user stepped away and for how long.

### 3.4 Aggregate View (Day Reports)

Break is **not** represented in the aggregate view. Specifically:

- No gray-bordered summary card for break time alongside the on-target / re-prioritized / interrupted cards.
- No break-related aggregate metrics (no "total break time," "mean break duration," "number of breaks," or anything similar).
- Break time is excluded from total tracked time (see §4), so the percentages displayed for green/yellow/red sum to 100% of *work* time only.

### 3.5 Multi-Day Aggregate Views (Week / Sprint / Month / Custom)

Break is **not** shown in any multi-day aggregate view. Specifically:

- The stacked bar / area charts for time distribution show only green/yellow/red segments. Break time is simply absent — the bars represent work time only.
- No break-related summary cards, totals, percentages, or trend lines.
- All metrics (context switches, mean time between switches, mean focus time, etc.) are computed against work time only, with break time excluded.

### 3.6 Persistence Feedback

Activating break (pressing the Break button) is a state-persisting action and must provide the same unobtrusive save-confirmation feedback as any other persisted action, per §3.5 of the base spec.

---

## 4. Impact on Metrics and Time Tracking

### 4.1 Total Tracked Time

Break time is **excluded** from total tracked time. Total tracked time represents the sum of all *work* activity block durations within working hours. If a user works from 9:00 AM to 6:00 PM (9 hours of working hours) and takes 1 hour of break across the day, total tracked time is 8 hours.

### 4.2 Classification Percentages

Green, yellow, and red percentages are calculated against total tracked time (which excludes break). Therefore, they always sum to 100%.

### 4.3 Context Switches

Transitioning **to** Break does not count as a context switch. Transitioning **from** Break to a work activity does not count as a context switch either. Break is invisible to context-switch counting.

In practical terms: if the user is working on Activity A, takes a break, then resumes Activity A, the context switch count does not change — it is as if the break never happened. If the user is working on Activity A, takes a break, then starts Activity B, that counts as **one** context switch (A → B), not two.

### 4.4 Mean Time Between Context Switches

Since break does not generate context switches, and break time is excluded from total tracked time, this metric is computed purely against work time and work-to-work transitions.

### 4.5 Mean Uninterrupted Focus Time

Break blocks interrupt the continuity of a work classification streak for the purpose of this metric. If a user has a green block, then a break, then another green block, these are two separate green focus blocks — they are not merged into one. The break itself does not count as a focus block of any color.

However, break *duration* does not count against focus time. The two green blocks are measured by their own durations independently.

### 4.6 Per-Activity, Per-Ticket, Per-Person Time

Break contributes no time to any activity, ticket, or person. It has no entry text, no ticket references, and no @-tags.

### 4.7 On-Call Metrics

Break time while on-call is still break — it is excluded from on-call work time calculations. The on-call summary reports time spent working on on-call tickets vs. other work while on-call; break is neither.

---

## 5. Data Model Changes

### 5.1 Activity Entries

Break is stored as an activity entry with a special marker distinguishing it from normal entries. The entry has:

- A timestamp (like all entries).
- No entry text (or a reserved sentinel value — implementation detail).
- No extracted ticket references.
- No extracted @-tags.
- A classification of **Break** (distinct from green/yellow/red — a fourth classification value at the storage level, even though it is not presented as a peer classification in the UI).

### 5.2 Auto-Break Events

End-of-day auto-breaks are stored identically to user-initiated breaks. There is no need to distinguish them at the data level — a break is a break regardless of how it was triggered.

---

## 6. Export Behavior

### 6.1 PDF Export

- **Day-level reports with timeline:** Break blocks appear as gray segments in the timeline, consistent with the on-screen timeline view.
- **Day-level aggregate and all multi-day reports:** Break is excluded, consistent with the on-screen behavior.

### 6.2 Clipboard-Friendly Export

Break is excluded from the clipboard export text. The export summarizes work time and work metrics only.

---

## 7. Edge Cases

| Scenario | Behavior |
|---|---|
| User presses Break when already on break | No-op. No new entry is created. |
| User's first action of the day is pressing Break | The user was already implicitly on break; this is a no-op (or creates a break entry at the start of working hours if none exists yet — implementation detail, but the visible effect is that the user remains on break). |
| Activity entry is made outside working hours, then break pressed before next working day | Break is recorded. When the next working day starts, user is on break. The outside-hours entry and the break entry both contribute zero time per existing outside-hours rules. |
| Sprint cutover while on break | Cutover proceeds normally. User remains on break. |
| On-call toggle while on break | Toggle proceeds normally. User remains on break. The on-call status change is recorded at its timestamp as usual. |
| Break spans across a working-hours boundary (e.g., user goes on break at 5:30 PM, workday ends at 6:00 PM) | The break block within working hours is 30 minutes (shown in day timeline). Time after 6:00 PM is outside working hours and not tracked. Next day, user is on break from the start of working hours. |

---

## 8. Out of Scope

The following are explicitly not part of this enhancement:

- Break categories or reasons (e.g., "lunch," "coffee," "personal"). Break is a single undifferentiated state.
- Break reminders or notifications (e.g., "you've been on break for 30 minutes").
- Break-related aggregate metrics of any kind.
- Keyboard shortcut for break activation.
- Retroactive break insertion (editing past entries to mark them as break).
