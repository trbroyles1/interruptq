import { runMigrations } from "./migrate";
import { seedDefaults } from "./seed";

let initPromise: Promise<void> | null = null;

export async function ensureDb() {
  if (!initPromise) {
    initPromise = (async () => {
      await runMigrations();
      await seedDefaults();
    })();
  }
  return initPromise;
}
