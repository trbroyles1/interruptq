import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const sprints = sqliteTable("sprints", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ordinal: integer("ordinal").notNull().unique(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const activities = sqliteTable("activities", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull(),
  text: text("text").notNull(),
  tickets: text("tickets").notNull().default("[]"),
  tags: text("tags").notNull().default("[]"),
  classification: text("classification", {
    enum: ["green", "yellow", "red", "break"],
  }).notNull(),
  sprintId: integer("sprint_id").references(() => sprints.id),
  onCallAtTime: integer("on_call_at_time", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const sprintGoalSnapshots = sqliteTable("sprint_goal_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id")
    .notNull()
    .references(() => sprints.id),
  timestamp: text("timestamp").notNull(),
  goals: text("goals").notNull().default("[]"),
});

export const prioritySnapshots = sqliteTable("priority_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sprintId: integer("sprint_id")
    .notNull()
    .references(() => sprints.id),
  timestamp: text("timestamp").notNull(),
  priorities: text("priorities").notNull().default("[]"),
});

export const onCallChanges = sqliteTable("on_call_changes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: text("timestamp").notNull(),
  status: integer("status", { mode: "boolean" }).notNull(),
});

export const knownTags = sqliteTable("known_tags", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});

export const preferences = sqliteTable("preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
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
});
