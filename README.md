# InterruptQ

A local-first time-tracking tool for software developers whose productive time is fragmented by context switches, interruptions, and shifting priorities.

InterruptQ passively tracks how you spend your time versus how you *should* spend it, then surfaces that data through reports, charts, and exportable summaries you can share with your teammates or management.

## Why

There are a lot of time tracker / activity tracker tools out there. Most of them are made to benefit the management hierarchy - track attendance, track billing, generally keep tabs on employee activity. InterruptQ is intended to come at time tracking from the other end. It is a time tracker made by a developer, for developers. Particularly developers who deal with a lot of interruptions and assorted requests they are not in a position to refuse, that sidetrack them and impede progress on their objectives. This tool is not for your boss. This tool is for _you_, so that you can have something to pull out and point to when you're asked "why isn't X done yet and where did all the time go?"

## How It Works

Log what you're working on as free text entries. Reference JIRA-style tickets (`TIK-789`) and people (`@Someone`) naturally. InterruptQ automatically classifies each entry based on your current sprint context:

| Classification | Normal Mode | On-Call Mode |
|---|---|---|
| **Green** (on-target) | Matches a sprint goal | Matches an on-call ticket |
| **Yellow** (re-prioritized) | Matches a priority | Matches a sprint goal or priority |
| **Red** (interrupted) | Neither | Neither |

Breaks are tracked separately and don't count toward work metrics.

## Features

- **Single-pane UI**. everything in one view, no page navigation
- **Quick-pick grid**. context-aware cards for sprint goals, priorities, and recent activities
- **Sprint management**. track sprint cutover, goals, and priorities
- **On-call toggle**. shifts classification rules when you're on-call
- **Rich reporting**. day, week, sprint, month, or custom date range scopes with:
  - Activity timelines
  - Green/yellow/red time breakdowns
  - Context switch counts and focus time metrics
  - Person impact reports (time per `@`-tagged person)
  - Sprint goal progress and priority drift summaries
- **Export**.clipboard-ready text formats. PDFs are in the oven.
- **Sharable links**. generate 24-hour read-only report links (max 5 active). Nice for sending to your teammates, boss or whoever.
- **Multi-user**. lightweight token-based partitioning (no accounts or passwords)
- **PWA installable**. add to home screen on supporting browsers
- **Dual database**. SQLite for local use, PostgreSQL for hosted deployments

## Tech Stack

- **Next.js 16** / React 19 / TypeScript
- **Drizzle ORM** with dual-driver support (better-sqlite3 / postgres.js)
- **Tailwind CSS 4** / Recharts / Lucide icons
- **SWR** for data fetching

## Getting Started

### Prerequisites

- Node.js 18+

### Setup

```bash
npm install
```

Create a `.env` file in the project root:

```env
# SQLite (default) - database file is auto-created
DB_DRIVER=sqlite
DATABASE_URL=./data/interruptq.db

# Or PostgreSQL (for hosted deployments)
# DB_DRIVER=postgres
# DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### Run

```bash
# Development (port 3099)
npm run dev

# Production
npm run build
npm start
```

On first visit, you'll see a welcome screen where you can generate a new token or connect with an existing one. Copy and save your token. It's your key to access your data.

### Database Management

```bash
# Generate migrations
npm run db:generate            # SQLite
npm run db:generate:pg         # PostgreSQL

# Push schema directly
npm run db:push                # SQLite
npm run db:push:pg             # PostgreSQL

# Browse data
npm run db:studio
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_DRIVER` | No | `sqlite` | Database driver: `sqlite` or `postgres` |
| `DATABASE_URL` | Yes | - | File path (SQLite) or connection string (PostgreSQL) |
| `INTERRUPTQ_BASE_URL` | No | Auto-detected | Base URL for generated share links |

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
│   ├── api/          # ~19 REST endpoints
│   └── share/        # Read-only share link viewer
├── components/       # React components by domain
│   ├── activity/     # Entry input, current activity, quick-pick grid
│   ├── sprint/       # Sprint panel, goals, priorities
│   ├── reporting/    # Reports, timelines, charts
│   ├── share/        # Share link management and viewer
│   └── auth/         # Welcome screen / token flow
├── db/               # Database layer (schema, migrations, helpers)
├── lib/              # Business logic (classification, parsing, metrics)
├── hooks/            # React hooks (data fetching, state)
├── types/            # TypeScript interfaces
└── cli/              # CLI utilities
specs/                # Design and feature specification documents
```
