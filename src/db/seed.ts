import { db } from "./index";
import { first, run } from "./helpers";
import { preferences, sprints } from "./tables";
import { eq } from "drizzle-orm";

/**
 * Seed default preferences and an initial sprint for a given identity.
 * Called when a new identity is created (via token generation).
 */
export async function seedIdentityDefaults(identityId: number) {
  // Ensure a default preferences row exists for this identity
  const existing = await first(
    db
      .select()
      .from(preferences)
      .where(eq(preferences.identityId, identityId))
  );
  if (!existing) {
    await run(db.insert(preferences).values({ identityId }));
  }

  // Ensure at least one sprint exists for this identity
  const existingSprint = await first(
    db
      .select()
      .from(sprints)
      .where(eq(sprints.identityId, identityId))
      .limit(1)
  );
  if (!existingSprint) {
    const today = new Date().toISOString().split("T")[0];
    await run(
      db.insert(sprints).values({ identityId, ordinal: 1, startDate: today })
    );
  }
}

/**
 * Legacy seed function — now a no-op.
 * Pre-existing data was assigned to sentinel identity (id=1) by migration.
 * New identities are seeded via seedIdentityDefaults() at creation time.
 */
export async function seedDefaults() {
  // No-op: seeding is now per-identity
}
