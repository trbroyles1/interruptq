# InterruptQ Enhancement #3 — Postgres / Supabase Support (Dual-Driver Database)

## 1. Purpose

This enhancement adds PostgreSQL (specifically targeting Supabase-hosted Postgres) as an alternative database backend for InterruptQ, while retaining SQLite as the default for local development and zero-infrastructure deployments. The choice of database is made at startup via environment configuration and is transparent to all application logic above the database layer.

The motivation is deployment flexibility. SQLite is excellent for single-machine, local-first usage — which is InterruptQ's origin — but imposes limitations for hosted deployments where the filesystem is ephemeral or shared-nothing (e.g., Vercel serverless functions, containerized environments). Postgres removes that constraint and opens the path to hosted, always-available instances.

---

## 2. Driver Selection

### 2.1 Environment Variable

The database driver is selected via a single environment variable:

```
DB_DRIVER=sqlite|postgres
```

When absent or empty, the default is `sqlite`. Any value other than `sqlite` or `postgres` is an error at startup.

### 2.2 Connection String

The existing `DATABASE_URL` environment variable is reused for both drivers:

- **SQLite:** A filesystem path to the database file (relative or absolute). Default: `./data/interruptq.db`. The directory is created automatically if it does not exist.
- **Postgres:** A standard PostgreSQL connection string (e.g., `postgresql://user:pass@host:5432/dbname`). Required when `DB_DRIVER=postgres`; the app must fail fast with a clear error if missing.

### 2.3 No Runtime Switching

The driver is resolved once at module initialization time and does not change for the lifetime of the process. There is no mechanism to switch drivers without restarting the application.

---

## 3. Schema Parity

### 3.1 Dual Schema Definitions

Two separate Drizzle ORM schema files are maintained — one using `drizzle-orm/sqlite-core` table builders and one using `drizzle-orm/pg-core` table builders. Both define the same tables, columns, relationships, constraints, and indexes. They differ only in dialect-specific details:

| Aspect | SQLite | Postgres |
|---|---|---|
| Primary keys | `integer().primaryKey({ autoIncrement: true })` | `serial().primaryKey()` |
| Booleans | `integer({ mode: "boolean" })` | `boolean()` |
| Timestamp defaults | `sql\`(datetime('now'))\`` | `sql\`now()\`` |
| Enum columns | `text({ enum: [...] })` | `pgEnum(...)` |
| Date/time storage | `text` | `text` (not `timestamp` — see §3.2) |
| JSON storage | `text` | `text` (not `jsonb` — see §3.2) |

### 3.2 Conservative Type Mapping

Dates and JSON-structured data are stored as `text` in both dialects. The application already works with ISO-8601 date strings and `JSON.parse`/`JSON.stringify` throughout. Using Postgres-native `timestamp` or `jsonb` types would require changes to serialization logic across the application and is deferred to a future enhancement. The `text` approach ensures identical application behavior regardless of driver.

### 3.3 Table Re-Export Layer

A re-export module conditionally loads table objects from the correct schema file based on the active driver. All application code imports table references through this module, never directly from either schema file. This ensures that the Drizzle query builder receives table definitions matching the active driver's dialect.

---

## 4. Query Abstraction

### 4.1 The Sync/Async Problem

The SQLite driver (`better-sqlite3`) is synchronous — Drizzle query builders expose `.get()`, `.all()`, and `.run()` methods that return values directly. The Postgres driver (`postgres.js`) is asynchronous — Drizzle query builders are thenables that must be `await`-ed.

These are fundamentally different calling conventions. Application code cannot use `.get()` with a Postgres driver, and cannot `await` a bare SQLite query builder.

### 4.2 Helper Functions

A set of thin helper functions abstracts the terminal execution step:

| Helper | Replaces | Behavior |
|---|---|---|
| `first(builder)` | `.get()` | Returns `Promise<T \| undefined>`. SQLite: calls `.get()`. Postgres: awaits the builder and returns `[0]`. |
| `all(builder)` | `.all()` | Returns `Promise<T[]>`. SQLite: calls `.all()`. Postgres: awaits the builder. |
| `run(builder)` | `.run()` | Returns `Promise<void>`. SQLite: calls `.run()`. Postgres: awaits the builder. |
| `returningFirst(builder)` | `.returning().get()` | Returns `Promise<T>`. Caller passes the builder _after_ calling `.returning()`. SQLite: calls `.get()`. Postgres: awaits and returns `[0]`. |

All helpers are `async` and return Promises. For the SQLite path, the synchronous result is returned from the `async` function, which wraps it in a resolved Promise. The overhead is negligible.

### 4.3 Application Code Pattern

Before this enhancement, a typical query looks like:

```typescript
const row = db.select().from(table).where(eq(table.id, id)).get();
```

After this enhancement:

```typescript
const row = await first(db.select().from(table).where(eq(table.id, id)));
```

The query builder chain (`db.select().from().where()...`) is identical between drivers. Only the terminal execution method changes — and that is now hidden inside the helper.

---

## 5. Initialization

### 5.1 Async Initialization

Database initialization (`ensureDb()`) becomes asynchronous. The function runs migrations and seeds on first invocation, using a Promise-based guard to ensure it executes exactly once even under concurrent calls (e.g., multiple API route handlers firing simultaneously at cold start).

Previously, `ensureDb()` was called synchronously at module scope in each route file. It is now called as `await ensureDb()` at the top of each route handler function body.

### 5.2 Migration Runner

Migrations are driver-aware:

- **SQLite:** Uses `drizzle-orm/better-sqlite3/migrator` against the `drizzle/` migration directory. Foreign keys are temporarily disabled during migration to support SQLite's table-recreation patterns.
- **Postgres:** Uses `drizzle-orm/postgres-js/migrator` against a separate `drizzle-pg/` migration directory.

### 5.3 Dual Migration Directories

Each driver has its own migration directory with its own SQL files and migration journal:

- `drizzle/` — SQLite migrations (existing, unchanged).
- `drizzle-pg/` — Postgres migrations (generated from the Postgres schema).

Drizzle Kit generates migrations for each dialect independently using separate configuration files:

- `drizzle.config.ts` — default, targets SQLite.
- `drizzle.pg.config.ts` — targets Postgres.

### 5.4 Seeding

The `seedIdentityDefaults()` function (which creates default preferences and an initial sprint for a new identity) becomes asynchronous and uses the query helpers. Its logic is unchanged.

---

## 6. Package Scripts

The following npm scripts are added or modified:

| Script | Command | Purpose |
|---|---|---|
| `db:generate` | `drizzle-kit generate` | Generate SQLite migrations (default, unchanged) |
| `db:generate:sqlite` | `drizzle-kit generate` | Explicit alias for SQLite migration generation |
| `db:generate:pg` | `drizzle-kit generate --config drizzle.pg.config.ts` | Generate Postgres migrations |
| `db:push:pg` | `drizzle-kit push --config drizzle.pg.config.ts` | Push Postgres schema directly (useful for development) |

When the schema changes, both `db:generate:sqlite` and `db:generate:pg` must be run to keep both migration tracks in sync.

---

## 7. Dependencies

One new runtime dependency is added:

- **`postgres`** (postgres.js) — the Postgres client library. Chosen for its native async design, Supabase compatibility, and first-class support in Drizzle ORM's `drizzle-orm/postgres-js` driver package.

The `better-sqlite3` dependency is retained and remains the default.

Both drivers are loaded conditionally via `require()` at startup — only the active driver's module is loaded. The inactive driver's package is present in `node_modules` but never imported.

---

## 8. Scope of Application Code Changes

### 8.1 Files Modified

Every file that interacts with the database requires modification:

- **Database layer** (`src/db/`) — connection factory, migration runner, initialization, seeding, and new helper/config/tables modules.
- **Library files** (`src/lib/`) — identity resolution, authentication middleware, share link validation, and report data computation become asynchronous.
- **API route handlers** (`src/app/api/`) — all ~19 route files adopt the async query pattern and move `ensureDb()` into handler bodies.

### 8.2 Files Not Modified

- **Front-end code** — all changes are server-side. No React components, hooks, styles, or client-side logic are affected.
- **The CLI tool** (`src/cli/claim-data.ts`) — retains its direct SQLite usage. It is a one-time data migration utility that operates only against a local SQLite database by design.
- **SQLite schema and migrations** — unchanged. The existing `schema.ts` and `drizzle/` directory are preserved as-is.

### 8.3 Nature of Changes

The vast majority of application code changes are mechanical:

1. Import tables from the re-export module instead of directly from the SQLite schema file.
2. Replace `.get()` / `.all()` / `.run()` / `.returning().get()` with `await first()` / `await all()` / `await run()` / `await returningFirst()`.
3. Move `ensureDb()` from module scope into handler bodies.
4. Add `await` to functions that became asynchronous (`resolveIdentity`, `validateShareLink`, `computeReportData`, etc.).

No query logic, business logic, or data flow is altered.

---

## 9. Edge Cases

| Scenario | Behavior |
|---|---|
| `DB_DRIVER=postgres` but `DATABASE_URL` is missing | Application fails at startup with a clear error message. |
| `DB_DRIVER=postgres` but the database is unreachable | First request triggers `ensureDb()` which attempts migration; the resulting connection error surfaces as a 500 response. |
| `DB_DRIVER` set to an unrecognized value | Application fails at startup with a clear error message listing valid options. |
| SQLite database file does not exist | Created automatically (existing behavior, unchanged). |
| Postgres database exists but has no tables | Migrations run automatically on first request via `ensureDb()`, creating all tables. |
| Running `db:generate:pg` without a `DATABASE_URL` | Drizzle Kit reads the schema file to generate SQL; it does not need a live database connection for generation. The empty default in the config is sufficient. |

---

## 10. Out of Scope

The following are explicitly not part of this enhancement:

- Migration of existing SQLite data to Postgres. Users who switch drivers start with an empty database. A data migration utility is a separate concern.
- Use of Postgres-native types (`timestamp`, `jsonb`, `uuid`) in place of `text` columns. This is a future optimization that would improve Postgres-side query capabilities but requires serialization changes across the application.
- Connection pooling configuration or tuning. The `postgres.js` driver handles connection management internally; Supabase's connection pooler (Supavisor) can be used at the URL level without application changes.
- Supabase-specific features (Row Level Security, Realtime subscriptions, Edge Functions, Auth). The integration is purely at the Postgres wire protocol level.
- Removal of SQLite support. Both drivers are maintained indefinitely.
