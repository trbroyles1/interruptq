import { db } from "./index";
import { preferences, sprints } from "./schema";
import { eq } from "drizzle-orm";

export function seedDefaults() {
  // Ensure a default preferences row exists
  const existing = db.select().from(preferences).where(eq(preferences.id, 1)).get();
  if (!existing) {
    db.insert(preferences).values({ id: 1 }).run();
  }

  // Ensure at least one sprint exists
  const existingSprint = db.select().from(sprints).orderBy(sprints.id).limit(1).get();
  if (!existingSprint) {
    const today = new Date().toISOString().split("T")[0];
    db.insert(sprints).values({ ordinal: 1, startDate: today }).run();
  }
}
