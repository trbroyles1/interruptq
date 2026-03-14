const PREVIEW_SEED_LOG_PREFIX = "[InterruptQ Preview Seed]";
const SEED_WEEKS = 3;
const BANNER_LINE = "========================================";

export async function seedPreviewDatabase(): Promise<void> {
  try {
    const { seedTestData } = await import("@/lib/seed-test-data");
    const result = await seedTestData({ weeks: SEED_WEEKS });

    console.log(`${PREVIEW_SEED_LOG_PREFIX} ${BANNER_LINE}`);
    console.log(`${PREVIEW_SEED_LOG_PREFIX} Token: ${result.token}`);
    console.log(
      `${PREVIEW_SEED_LOG_PREFIX} Sprints: ${result.summary.sprints} | Activities: ${result.summary.activities} | Weeks: ${result.summary.weeks}`,
    );
    console.log(`${PREVIEW_SEED_LOG_PREFIX} ${BANNER_LINE}`);
  } catch (error) {
    console.error(`${PREVIEW_SEED_LOG_PREFIX} Failed to seed preview database:`, error);
  }
}
