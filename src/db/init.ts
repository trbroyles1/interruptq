import { runMigrations } from "./migrate";
import { seedDefaults } from "./seed";

let initialized = false;

export function ensureDb() {
  if (initialized) return;
  runMigrations();
  seedDefaults();
  initialized = true;
}
