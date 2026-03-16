import { applyVercelEnv } from "@/vercel/env";

export async function register() {
  const isVercel = applyVercelEnv();

  // On Vercel, migrations run at build time (see src/vercel/build-migrate.ts).
  // Locally, run them on startup for a frictionless dev experience.
  if (!isVercel) {
    const { ensureDb } = await import("@/db/init");
    await ensureDb();
  }
}
