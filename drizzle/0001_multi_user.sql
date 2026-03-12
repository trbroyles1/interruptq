-- Create identities table
CREATE TABLE `identities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`token_hash` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_seen` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint

-- Insert sentinel identity for pre-existing data (id=1, no token)
INSERT INTO `identities` (`id`, `token_hash`) VALUES (1, NULL);
--> statement-breakpoint

-- Create share_links table
CREATE TABLE `share_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity_id` integer NOT NULL,
	`share_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `share_links_share_id_unique` ON `share_links` (`share_id`);
--> statement-breakpoint

-- Recreate sprints with identity_id and compound unique index
-- (SQLite cannot alter unique constraints, so we use create-copy-drop-rename)
CREATE TABLE `sprints_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity_id` integer NOT NULL DEFAULT 1,
	`ordinal` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `sprints_new` (`id`, `identity_id`, `ordinal`, `start_date`, `end_date`, `created_at`)
  SELECT `id`, 1, `ordinal`, `start_date`, `end_date`, `created_at` FROM `sprints`;
--> statement-breakpoint
DROP TABLE `sprints`;
--> statement-breakpoint
ALTER TABLE `sprints_new` RENAME TO `sprints`;
--> statement-breakpoint
CREATE UNIQUE INDEX `sprints_identity_ordinal_unique` ON `sprints` (`identity_id`, `ordinal`);
--> statement-breakpoint

-- Recreate known_tags with identity_id and compound unique index
CREATE TABLE `known_tags_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identity_id` integer NOT NULL DEFAULT 1,
	`name` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `known_tags_new` (`id`, `identity_id`, `name`, `created_at`)
  SELECT `id`, 1, `name`, `created_at` FROM `known_tags`;
--> statement-breakpoint
DROP TABLE `known_tags`;
--> statement-breakpoint
ALTER TABLE `known_tags_new` RENAME TO `known_tags`;
--> statement-breakpoint
CREATE UNIQUE INDEX `known_tags_identity_name_unique` ON `known_tags` (`identity_id`, `name`);
--> statement-breakpoint

-- Add identity_id to remaining tables via ALTER TABLE
ALTER TABLE `activities` ADD COLUMN `identity_id` integer NOT NULL DEFAULT 1 REFERENCES `identities`(`id`);
--> statement-breakpoint
ALTER TABLE `sprint_goal_snapshots` ADD COLUMN `identity_id` integer NOT NULL DEFAULT 1 REFERENCES `identities`(`id`);
--> statement-breakpoint
ALTER TABLE `priority_snapshots` ADD COLUMN `identity_id` integer NOT NULL DEFAULT 1 REFERENCES `identities`(`id`);
--> statement-breakpoint
ALTER TABLE `on_call_changes` ADD COLUMN `identity_id` integer NOT NULL DEFAULT 1 REFERENCES `identities`(`id`);
--> statement-breakpoint
ALTER TABLE `preferences` ADD COLUMN `identity_id` integer NOT NULL DEFAULT 1 REFERENCES `identities`(`id`);
