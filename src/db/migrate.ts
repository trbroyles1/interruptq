import { db, dbDriver } from "./index";
import path from "path";

/**
 * Apply pending Drizzle migrations.
 * Tracks applied migrations in the __drizzle_migrations table
 * so each migration runs exactly once.
 */
export async function runMigrations() {
  if (dbDriver === "postgres") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle-pg"),
    });
  } else {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");
    const Database = (await import("better-sqlite3")).default;

    // Foreign keys are temporarily disabled during migrations to allow
    // table recreation patterns (create-copy-drop-rename) required by SQLite.
    const sqlite = (db as unknown as { session: { client: InstanceType<typeof Database> } })
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
}
