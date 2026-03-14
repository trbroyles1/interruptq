import { pgTable, pgEnum, text, integer, serial, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// --- Enums ---

export const classificationEnum = pgEnum("classification", ["green", "yellow", "red", "break"]);

// --- Identity & sharing tables ---

export const identities = pgTable("identities", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash"),
  handle: text("handle"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  lastSeen: text("last_seen")
    .notNull()
    .default(sql`now()`),
});

export const shareLinks = pgTable("share_links", {
  id: serial("id").primaryKey(),
  identityId: integer("identity_id")
    .notNull()
    .references(() => identities.id),
  shareId: text("share_id").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
  expiresAt: text("expires_at").notNull(),
  revokedAt: text("revoked_at"),
});

// --- Core data tables (all partitioned by identityId) ---

export const sprints = pgTable(
  "sprints",
  {
    id: serial("id").primaryKey(),
    identityId: integer("identity_id")
      .notNull()
      .references(() => identities.id),
    ordinal: integer("ordinal").notNull(),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex("sprints_identity_ordinal_unique").on(
      table.identityId,
      table.ordinal
    ),
  ]
);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  identityId: integer("identity_id")
    .notNull()
    .references(() => identities.id),
  timestamp: text("timestamp").notNull(),
  text: text("text").notNull(),
  tickets: text("tickets").notNull().default("[]"),
  tags: text("tags").notNull().default("[]"),
  classification: classificationEnum("classification").notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id),
  onCallAtTime: boolean("on_call_at_time")
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const sprintGoalSnapshots = pgTable("sprint_goal_snapshots", {
  id: serial("id").primaryKey(),
  identityId: integer("identity_id")
    .notNull()
    .references(() => identities.id),
  sprintId: integer("sprint_id")
    .notNull()
    .references(() => sprints.id),
  timestamp: text("timestamp").notNull(),
  goals: text("goals").notNull().default("[]"),
});

export const prioritySnapshots = pgTable("priority_snapshots", {
  id: serial("id").primaryKey(),
  identityId: integer("identity_id")
    .notNull()
    .references(() => identities.id),
  sprintId: integer("sprint_id")
    .notNull()
    .references(() => sprints.id),
  timestamp: text("timestamp").notNull(),
  priorities: text("priorities").notNull().default("[]"),
});

export const onCallChanges = pgTable("on_call_changes", {
  id: serial("id").primaryKey(),
  identityId: integer("identity_id")
    .notNull()
    .references(() => identities.id),
  timestamp: text("timestamp").notNull(),
  status: boolean("status").notNull(),
});

export const knownTags = pgTable(
  "known_tags",
  {
    id: serial("id").primaryKey(),
    identityId: integer("identity_id")
      .notNull()
      .references(() => identities.id),
    name: text("name").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex("known_tags_identity_name_unique").on(
      table.identityId,
      table.name
    ),
  ]
);

// --- Board tables (global, not identity-partitioned) ---

export const boards = pgTable("boards", {
  id: serial("id").primaryKey(),
  nameCanonical: text("name_canonical").notNull().unique(),
  nameDisplay: text("name_display").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`now()`),
});

export const boardMemberships = pgTable(
  "board_memberships",
  {
    id: serial("id").primaryKey(),
    boardId: integer("board_id")
      .notNull()
      .references(() => boards.id),
    identityId: integer("identity_id")
      .notNull()
      .references(() => identities.id),
    joinedAt: text("joined_at")
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    uniqueIndex("board_memberships_board_identity_unique").on(
      table.boardId,
      table.identityId
    ),
  ]
);

// --- User preferences ---

export const preferences = pgTable("preferences", {
  id: serial("id").primaryKey(),
  identityId: integer("identity_id")
    .notNull()
    .references(() => identities.id),
  workingHours: text("working_hours").notNull().default(
    JSON.stringify({
      mon: { enabled: true, start: "09:00", end: "18:00" },
      tue: { enabled: true, start: "09:00", end: "18:00" },
      wed: { enabled: true, start: "09:00", end: "18:00" },
      thu: { enabled: true, start: "09:00", end: "18:00" },
      fri: { enabled: true, start: "09:00", end: "18:00" },
      sat: { enabled: false, start: "09:00", end: "18:00" },
      sun: { enabled: false, start: "09:00", end: "18:00" },
    })
  ),
  onCallPrefix: text("on_call_prefix").notNull().default("CALL"),
  quickPickRecentCount: integer("quick_pick_recent_count")
    .notNull()
    .default(10),
  quickPickOncallTicketCount: integer("quick_pick_oncall_ticket_count")
    .notNull()
    .default(5),
  quickPickOncallOtherCount: integer("quick_pick_oncall_other_count")
    .notNull()
    .default(5),
  weekStartDay: integer("week_start_day").notNull().default(1),
  timezone: text("timezone").notNull().default("America/New_York"),
});
