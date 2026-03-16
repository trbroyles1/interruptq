import { db, dbDriver } from "./index";
import path from "node:path";
import { MIGRATION_URL_KEY } from "./config";

/**
 * Apply pending Drizzle migrations.
 * Tracks applied migrations in the __drizzle_migrations table
 * so each migration runs exactly once.
 *
 * On Vercel, uses the non-pooling direct connection (MIGRATION_DATABASE_URL)
 * to avoid PgBouncer timeouts on DDL statements.
 */
export async function runMigrations() {
  if (dbDriver === "postgres") {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const migrationUrl = process.env[MIGRATION_URL_KEY];

    if (migrationUrl) {
      const postgres = (await import("postgres")).default;
      const { drizzle } = await import("drizzle-orm/postgres-js");
      const client = postgres(migrationUrl, { max: 1 });
      const migrationDb = drizzle(client);
      try {
        await migrate(migrationDb, {
          migrationsFolder: path.resolve(process.cwd(), "drizzle-pg"),
        });
      } finally {
        await client.end();
      }
    } else {
      await migrate(db, {
        migrationsFolder: path.resolve(process.cwd(), "drizzle-pg"),
      });
    }
  } else {
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

    // Foreign keys are temporarily disabled during migrations to allow
    // table recreation patterns (create-copy-drop-rename) required by SQLite.
    const sqlite = (db as unknown as { session: { client: { pragma(s: string): void } } })
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
