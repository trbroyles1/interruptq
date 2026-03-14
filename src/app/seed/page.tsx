export const dynamic = "force-dynamic";

const VERCEL_ENV_KEY = "VERCEL";
const VERCEL_ENV_VALUE = "1";
const VERCEL_ENV_TYPE_KEY = "VERCEL_ENV";
const VERCEL_ENV_PREVIEW = "preview";

const SEEDED_RESPONSE = "Seeded";
const OK_RESPONSE = "OK";

export default async function SeedPage() {
  const isVercelPreview =
    process.env[VERCEL_ENV_KEY] === VERCEL_ENV_VALUE &&
    process.env[VERCEL_ENV_TYPE_KEY] === VERCEL_ENV_PREVIEW;

  if (isVercelPreview) {
    const { seedPreviewDatabase } = await import("@/vercel/preview-seed");
    await seedPreviewDatabase();
    return <p>{SEEDED_RESPONSE}</p>;
  }

  return <p>{OK_RESPONSE}</p>;
}
