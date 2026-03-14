CREATE TABLE "board_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"board_id" integer NOT NULL,
	"identity_id" integer NOT NULL,
	"joined_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "boards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name_canonical" text NOT NULL,
	"name_display" text NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "boards_name_canonical_unique" UNIQUE("name_canonical")
);
--> statement-breakpoint
ALTER TABLE "identities" ADD COLUMN "handle" text;--> statement-breakpoint
ALTER TABLE "board_memberships" ADD CONSTRAINT "board_memberships_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_memberships" ADD CONSTRAINT "board_memberships_identity_id_identities_id_fk" FOREIGN KEY ("identity_id") REFERENCES "public"."identities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "board_memberships_board_identity_unique" ON "board_memberships" USING btree ("board_id","identity_id");