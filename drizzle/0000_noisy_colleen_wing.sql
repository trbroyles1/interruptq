CREATE TABLE `activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`text` text NOT NULL,
	`tickets` text DEFAULT '[]' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`classification` text NOT NULL,
	`sprint_id` integer,
	`on_call_at_time` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `known_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `known_tags_name_unique` ON `known_tags` (`name`);--> statement-breakpoint
CREATE TABLE `on_call_changes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`timestamp` text NOT NULL,
	`status` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `preferences` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`working_hours` text DEFAULT '{"mon":{"enabled":true,"start":"09:00","end":"18:00"},"tue":{"enabled":true,"start":"09:00","end":"18:00"},"wed":{"enabled":true,"start":"09:00","end":"18:00"},"thu":{"enabled":true,"start":"09:00","end":"18:00"},"fri":{"enabled":true,"start":"09:00","end":"18:00"},"sat":{"enabled":false,"start":"09:00","end":"18:00"},"sun":{"enabled":false,"start":"09:00","end":"18:00"}}' NOT NULL,
	`on_call_prefix` text DEFAULT 'CALL' NOT NULL,
	`quick_pick_recent_count` integer DEFAULT 10 NOT NULL,
	`quick_pick_oncall_ticket_count` integer DEFAULT 5 NOT NULL,
	`quick_pick_oncall_other_count` integer DEFAULT 5 NOT NULL,
	`week_start_day` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `priority_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`timestamp` text NOT NULL,
	`priorities` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sprint_goal_snapshots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sprint_id` integer NOT NULL,
	`timestamp` text NOT NULL,
	`goals` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`sprint_id`) REFERENCES `sprints`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sprints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ordinal` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sprints_ordinal_unique` ON `sprints` (`ordinal`);