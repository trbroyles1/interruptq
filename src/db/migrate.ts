import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "./index";
import path from "path";

/**
 * Apply pending Drizzle migrations from the drizzle/ folder.
 * Tracks applied migrations in the __drizzle_migrations table
 * so each migration runs exactly once.
 */
export function runMigrations() {
  migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
}
