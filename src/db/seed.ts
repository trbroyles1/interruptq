import { db } from "./index";
import { preferences, sprints } from "./schema";
import { eq } from "drizzle-orm";

/**
 * Seed default preferences and an initial sprint for a given identity.
 * Called when a new identity is created (via token generation).
 */
export function seedIdentityDefaults(identityId: number) {
  // Ensure a default preferences row exists for this identity
  const existing = db
    .select()
    .from(preferences)
    .where(eq(preferences.identityId, identityId))
    .get();
  if (!existing) {
    db.insert(preferences).values({ identityId }).run();
  }

  // Ensure at least one sprint exists for this identity
  const existingSprint = db
    .select()
    .from(sprints)
    .where(eq(sprints.identityId, identityId))
    .limit(1)
    .get();
  if (!existingSprint) {
    const today = new Date().toISOString().split("T")[0];
    db.insert(sprints)
      .values({ identityId, ordinal: 1, startDate: today })
      .run();
  }
}

/**
 * Legacy seed function — now a no-op.
 * Pre-existing data was assigned to sentinel identity (id=1) by migration.
 * New identities are seeded via seedIdentityDefaults() at creation time.
 */
export function seedDefaults() {
  // No-op: seeding is now per-identity
}
