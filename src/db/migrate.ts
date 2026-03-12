import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";
import Database from "better-sqlite3";
import path from "path";

/**
 * Apply pending Drizzle migrations from the drizzle/ folder.
 * Tracks applied migrations in the __drizzle_migrations table
 * so each migration runs exactly once.
 *
 * Foreign keys are temporarily disabled during migrations to allow
 * table recreation patterns (create-copy-drop-rename) required by SQLite.
 */
export function runMigrations() {
  const sqlite = (db as unknown as { session: { client: Database.Database } })
    .session.client;
  sqlite.pragma("foreign_keys = OFF");
  try {
    migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
  } finally {
    sqlite.pragma("foreign_keys = ON");
  }
}
