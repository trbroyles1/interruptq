CREATE TYPE "public"."classification" AS ENUM('green', 'yellow', 'red', 'break');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"timestamp" text NOT NULL,
	"text" text NOT NULL,
	"tickets" text DEFAULT '[]' NOT NULL,
	"tags" text DEFAULT '[]' NOT NULL,
	"classification" "classification" NOT NULL,
	"sprint_id" integer,
	"on_call_at_time" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"token_hash" text,
	"created_at" text DEFAULT now() NOT NULL,
	"last_seen" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "known_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"name" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "on_call_changes" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"timestamp" text NOT NULL,
	"status" boolean NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"working_hours" text DEFAULT '{"mon":{"enabled":true,"start":"09:00","end":"18:00"},"tue":{"enabled":true,"start":"09:00","end":"18:00"},"wed":{"enabled":true,"start":"09:00","end":"18:00"},"thu":{"enabled":true,"start":"09:00","end":"18:00"},"fri":{"enabled":true,"start":"09:00","end":"18:00"},"sat":{"enabled":false,"start":"09:00","end":"18:00"},"sun":{"enabled":false,"start":"09:00","end":"18:00"}}' NOT NULL,
	"on_call_prefix" text DEFAULT 'CALL' NOT NULL,
	"quick_pick_recent_count" integer DEFAULT 10 NOT NULL,
	"quick_pick_oncall_ticket_count" integer DEFAULT 5 NOT NULL,
	"quick_pick_oncall_other_count" integer DEFAULT 5 NOT NULL,
	"week_start_day" integer DEFAULT 1 NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "priority_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"sprint_id" integer NOT NULL,
	"timestamp" text NOT NULL,
	"priorities" text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "share_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"share_id" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	CONSTRAINT "share_links_share_id_unique" UNIQUE("share_id")
);
--> statement-breakpoint
CREATE TABLE "sprint_goal_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"sprint_id" integer NOT NULL,
	"timestamp" text NOT NULL,
	"goals" text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"identity_id" integer NOT NULL,
	"ordinal" integer NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "known_tags" ADD CONSTRAINT "known_tags_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "on_call_changes" ADD CONSTRAINT "on_call_changes_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preferences" ADD CONSTRAINT "preferences_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_snapshots" ADD CONSTRAINT "priority_snapshots_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "priority_snapshots" ADD CONSTRAINT "priority_snapshots_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_goal_snapshots" ADD CONSTRAINT "sprint_goal_snapshots_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprint_goal_snapshots" ADD CONSTRAINT "sprint_goal_snapshots_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "known_tags_identity_name_unique" ON "known_tags" USING btree ("identity_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "sprints_identity_ordinal_unique" ON "sprints" USING btree ("identity_id","ordinal");