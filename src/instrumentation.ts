import { applyVercelEnv } from "@/vercel/env";

// applyVercelEnv() is called here for runtime and in next.config.ts for build.
// Both are necessary: next.config.ts only runs during `next build` on Vercel,
// while register() only runs on serverless cold starts.
export async function register() {
  applyVercelEnv();

  const { ensureDb } = await import("@/db/init");
  await ensureDb();
}
