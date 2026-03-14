import { applyVercelEnv } from "@/vercel/env";

const VERCEL_ENV_KEY = "VERCEL";
const VERCEL_ENV_VALUE = "1";
const VERCEL_ENV_TYPE_KEY = "VERCEL_ENV";
const VERCEL_ENV_PREVIEW = "preview";

// applyVercelEnv() is called here for runtime and in next.config.ts for build.
// Both are necessary: next.config.ts only runs during `next build` on Vercel,
// while register() only runs on serverless cold starts.
export async function register() {
  applyVercelEnv();

  if (
    process.env[VERCEL_ENV_KEY] === VERCEL_ENV_VALUE &&
    process.env[VERCEL_ENV_TYPE_KEY] === VERCEL_ENV_PREVIEW
  ) {
    const { seedPreviewDatabase } = await import("@/vercel/preview-seed");
    await seedPreviewDatabase();
  }
}
