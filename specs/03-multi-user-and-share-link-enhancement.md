# InterruptQ Enhancement #2 — Multi-User Partitioning & Sharable Links

## 1. Purpose

This enhancement introduces lightweight multi-user support to InterruptQ. There are no accounts, no names, no emails, no sessions, and no authentication in the traditional sense. A "user" is nothing more than an opaque token that partitions all data in the system. Alongside this, the enhancement adds the ability for a connected user to generate time-limited sharable links that give read-only access to their reports.

---

## 2. Identity Model

### 2.1 User Tokens

A user token is the sole credential for accessing a data partition. Tokens take the form:

```
iqt-<alphanumeric value>
```

where the prefix `iqt-` (InterruptQ Token) is fixed and the remainder is a cryptographically random alphanumeric string of sufficient length to be unguessable (minimum 32 characters after the prefix).

Tokens are generated **server-side** to prevent tampering or exploitation via client-side code. The plaintext token is returned to the client and **shown to the user exactly once** — at generation time. The system does not store the plaintext token and cannot retrieve it.

### 2.2 Identity Records

The system maintains an identities table with the following fields:

- **id** — a system-generated identifier (e.g., auto-incrementing integer or UUID).
- **token_hash** — a one-way hash of the full token string (including the `iqt-` prefix).
- **created_at** — timestamp of when the identity was created.
- **last_seen** — timestamp of the most recent request made with this token.

The **id** from the identity record is used as the partition key on all other data in the system. Every table that currently stores user data gains a reference to this identity id, and all queries are scoped by it.

### 2.3 Token Verification

When a user presents a token (either on first connection or via the stored cookie on subsequent visits), the system hashes the provided token and looks up the matching `token_hash` in the identities table. If a match is found, the request is associated with that identity's id. If no match is found, the connection is rejected and the user is returned to the welcome screen with an error indication.

The `last_seen` timestamp is updated on each successful verification. The cadence of this update is an implementation detail — per-request, or throttled to once per minute or similar — but it must remain reasonably current.

### 2.4 Hashing Requirements

The hashing algorithm must be deterministic and fast enough for per-request verification but resistant to brute-force attacks. A standard approach such as SHA-256 of the token value is acceptable given the high entropy of the generated token. Bcrypt or similar slow hashes are not required because the token space is large enough that brute-force is infeasible regardless.

---

## 3. Connection Flow

### 3.1 Welcome Screen

When a user visits the app without a valid token cookie, they are presented with a welcome screen. This screen offers two paths:

1. **Connect with existing token** — a text input where the user can paste their token, plus a submit action. On submission, the token is verified per §2.3. If valid, the token is stored in a cookie (see §3.2) and the user proceeds to the main app view. If invalid, the user remains on the welcome screen with a clear error message (e.g., "Token not recognized").

2. **Generate new token** — a button that creates a new identity (§2.2) and generates a fresh token. The plaintext token is displayed to the user **once** with a clear, prominent warning that they must copy and save it securely, as the app cannot recover it. The screen must include a one-click copy-to-clipboard action for the token. After the user confirms they have saved it (e.g., an acknowledgment checkbox or button — not a modal requiring typed confirmation, just a deliberate "I've saved my token, continue" action), the token is stored in a cookie and the user proceeds to the main app view.

### 3.2 Token Persistence

The token is stored in an HTTP-only, secure (when served over HTTPS), long-lived cookie. "Long-lived" means the cookie expiration is set far into the future (e.g., 10 years). There is no session timeout — once connected, the user remains connected from that browser indefinitely until they explicitly disconnect.

The cookie value is the **plaintext token** (not the hash), since the system needs to hash it on each request for lookup. This is analogous to how bearer tokens work in API authentication.

### 3.3 Request Scoping

Every request from the front end to the back end includes the token (via the cookie). The back end verifies the token, resolves it to an identity id, and scopes all data access to that id. Requests without a valid token receive no data and are directed to the welcome screen.

### 3.4 No Implicit Token Assignment

The app never silently generates a token or creates an identity without explicit user action. A visitor who arrives without a token sees the welcome screen and nothing else.

---

## 4. Disconnection

### 4.1 Disconnect Action

A **Disconnect** button is added to the Preferences panel. Pressing it:

1. Clears the token cookie from the browser.
2. Returns the user to the welcome screen immediately.

This does **not** delete the user's data. Their identity and all associated data remain in the system. They (or anyone with the token) can reconnect at any time by entering the token on the welcome screen.

### 4.2 Disconnect Confirmation

Because disconnection means the user must re-enter their token to reconnect (and the app cannot recover a lost token), pressing Disconnect should trigger a brief confirmation step — e.g., an inline "Are you sure? You will need your token to reconnect." prompt with confirm/cancel options. This is one of the rare cases where a confirmation gate is warranted.

---

## 5. Sharable Links

### 5.1 Concept

A connected user can generate a sharable link that grants read-only access to their reports. The link is self-contained — anyone with the link can view reports without needing a token or any other credential.

### 5.2 Share Link Structure

A share link encodes a unique, opaque share identifier. The URL takes the form:

```
<base_url>/share/<share_id>
```

where `share_id` is a cryptographically random string (minimum 32 alphanumeric characters), unrelated to and not derivable from the user's token or identity id.

### 5.3 Base URL Resolution

The share link must include the correct base URL so it works when opened in any browser. The system determines the base URL as follows:

1. If an environment variable (e.g., `INTERRUPTQ_BASE_URL`) is set, use that value.
2. Otherwise, auto-detect from the incoming request's `Host` header and protocol at the time the share link is generated.

The environment variable takes precedence. When deploying to hosted environments (e.g., Vercel), this variable must be set.

### 5.4 Share Link Lifetime

Share links expire **24 hours** after creation. After expiry, the link returns a clear "this link has expired" message to anyone who visits it. Expired links are inert — they cannot be renewed or reactivated. The user must generate a new link if they want to share again.

Cleanup of expired share link records from the database is an implementation detail (eager deletion, lazy cleanup on access, periodic sweep — any approach is acceptable as long as expired links are never honored).

### 5.5 Active Link Limits

A user may have up to **5** active (non-expired, non-revoked) share links at any given time. This limit is fixed and not user-configurable. Attempting to generate a sixth link while five are active should be blocked with a message indicating the limit and suggesting revocation of an existing link.

### 5.6 Share Link Viewer Experience

A visitor arriving via a share link sees a **read-only report view**. Specifically:

**Visible and functional:**
- All report scopes: Day, Week, Sprint, Month, Custom.
- Navigation between time periods within each scope (previous/next).
- Day reports: **Aggregate mode only.** The Timeline tab is not available in the share view.
- All multi-day report views (Week, Sprint, Month, Custom) in full.
- Sprint goals, priorities, and on-call status are visible as contextual reference — the viewer can see what the user's goals and priorities were, but cannot modify them.
- Export functionality: both PDF and clipboard-friendly export are available to the viewer.

**Not visible or accessible:**
- The activity entry field and current activity display.
- The quick-pick grid.
- The Break button.
- The on-call toggle (the viewer can see on-call *status* in reports but cannot toggle it).
- The Sprint Cutover action.
- The Sprint Goals and Priorities editors (content is visible as read-only context, not as editable controls).
- The Preferences panel.
- The share link management controls.
- The Timeline sub-tab within Day reports.

The share view should be visually identifiable as a shared/read-only view — e.g., a subtle banner indicating "Shared view" and the expiration time of the link, and the absence of all editing controls.

### 5.7 Share Link Data Scope

A share link provides access to **all** of the user's report data across all time. It is not scoped to a particular date range or sprint at generation time. The viewer can navigate freely to any date, sprint, or custom range.

### 5.8 Share Link Management UI

The share link management control is accessible from the main app view, positioned in the vicinity of the Reports panel area (see attached screenshots for general placement). It takes the form of a small button or link (e.g., "Share" or a share icon) that opens an **in-page dialog** (not a separate screen or external modal).

The dialog provides:

1. **Generate new link** — a button that creates a new share link and displays the full URL with a copy-to-clipboard action. The link is shown immediately upon generation. If the user is at the 5-link limit, this button is disabled with an explanatory note.

2. **Active links list** — a list of all currently active (non-expired, non-revoked) share links, each showing:
   - The share URL (or a truncated representation with copy action).
   - When it was created.
   - When it expires.
   - A **Revoke** action to invalidate that specific link immediately.

Revoked links behave identically to expired links — they return a "link no longer valid" message to anyone who visits them.

### 5.9 Share Link Data Model

Share links are stored with the following fields:

- **id** — system-generated identifier.
- **identity_id** — reference to the identity that created the link.
- **share_id** — the opaque string used in the URL.
- **created_at** — timestamp of creation.
- **expires_at** — timestamp of expiration (created_at + 24 hours).
- **revoked_at** — timestamp of revocation, null if not revoked.

A share link is considered active if `revoked_at` is null and `expires_at` is in the future.

---

## 6. Data Partitioning

### 6.1 Scope of Partitioning

All user-generated and user-scoped data is partitioned by identity id. This includes:

- Activity entries
- Sprint records
- Sprint goal snapshots
- Priority snapshots
- On-call status changes
- Known @-tag names
- User preferences
- Share links

### 6.2 Cross-Partition Isolation

No request — whether from a connected user or a share link viewer — may access data belonging to a different identity. Partitioning is enforced at the query level on every data access.

### 6.3 Migration of Pre-Existing Data

Prior to this enhancement, InterruptQ operates as a single-user system with no identity concept. On upgrade:

- A **default identity** record is created automatically (with a null or sentinel token_hash, since there is no token to hash).
- All existing data is associated with this default identity's id.
- The first user to visit the app after upgrade is presented with the welcome screen. They must generate a new token or connect with an existing one.
- The default identity's data remains in the system but is **inaccessible** through normal app usage (since no one holds a token that hashes to the sentinel value).
- A CLI command is provided to claim the default identity's data. The command accepts a token as input, verifies it against an existing identity, and reassigns all data currently associated with the default identity to the matched identity. For example: `npx interruptq claim-data --token iqt-abc123...`. The command should confirm the operation before executing, report how many records were reassigned, and be idempotent (running it again after a successful claim is a no-op since no default-identity data remains). If the provided token does not match any identity, the command exits with an error.

---

## 7. Edge Cases

| Scenario | Behavior |
|---|---|
| User opens the app in two browsers with the same token | Both sessions operate on the same data partition. No conflict resolution — last write wins, consistent with the existing single-user model. |
| User opens a share link while already connected with a token | The share link view opens in its read-only mode. The user's own connected session is unaffected. If the share link is to their own data, they still see the read-only share view (not the full app). |
| Share link is visited after the user has disconnected and has no data changes | The share link still works until it expires or is revoked. Disconnecting does not affect active share links. |
| User generates a token, never saves it, and clears cookies | The data partition exists but is permanently inaccessible. The user must generate a new token, which creates a new empty partition. |
| Token cookie is present but the identity record has been deleted from the database | Treated as an invalid token. User is returned to the welcome screen with an error. |
| Share link viewer attempts to navigate to a non-share app URL | They see the welcome screen (no token cookie present). The share view is self-contained at its own URL path. |
| Multiple users writing simultaneously | Handled by the database's concurrency model. With SQLite, write contention is possible; the app should use WAL mode and handle busy/locked errors gracefully with retries. This concern diminishes after migration to Postgres. |
| User revokes a share link while someone is actively viewing it | The viewer's next data request fails and they see a "link no longer valid" message. In-flight or already-rendered data does not need to be retroactively cleared from their screen. |

---

## 8. Out of Scope

The following are explicitly not part of this enhancement:

- Named user accounts, email addresses, profile information, or any user metadata beyond the identity record.
- Authentication via OAuth, SSO, passwords, or any external identity provider.
- Session timeouts or session management.
- Team views, shared dashboards, or any concept of users being aware of each other.
- Token rotation or regeneration (the user's token is permanent; if compromised, they must generate a new identity and lose access to the old one).
- Admin panel or administrative user management.
- Rate limiting or abuse prevention on share links (noted for future consideration).
- Configurable share link expiry duration (fixed at 24 hours).
- Configurable maximum active share link count (fixed at 5).
- Database migration from SQLite to Postgres (addressed in a separate effort).
