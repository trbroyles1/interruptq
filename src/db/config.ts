export type DbDriver = "sqlite" | "postgres";

export function getDbDriver(): DbDriver {
  const driver = process.env.DB_DRIVER || "sqlite";
  if (driver !== "sqlite" && driver !== "postgres") {
    throw new Error(`Invalid DB_DRIVER: ${driver}. Must be "sqlite" or "postgres".`);
  }
  return driver;
}

export function getDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (getDbDriver() === "postgres") {
      throw new Error("DATABASE_URL is required when DB_DRIVER=postgres");
    }
    return "./data/interruptq.db";
  }
  return url;
}
