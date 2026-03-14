import { db } from "@/db/index";
import { boardMemberships, identities } from "@/db/tables";
import { all } from "@/db/helpers";
import { eq } from "drizzle-orm";
import { computeReportData, type ReportPayload } from "@/lib/report-data";
import type {
  BoardSafeMetrics,
  BoardAggregates,
  BoardAggregateField,
  BoardParticipantMetrics,
} from "@/types";

const SAFE_METRIC_KEYS: readonly (keyof BoardSafeMetrics)[] = [
  "greenPct",
  "yellowPct",
  "redPct",
  "totalContextSwitches",
  "meanTimeBetweenSwitches",
  "meanFocusTime",
  "meanGreenFocus",
  "meanYellowFocus",
  "meanRedFocus",
  "longestBlock",
  "longestGreenBlock",
  "longestYellowBlock",
  "longestRedBlock",
  "goalChangeCount",
  "priorityChangeCount",
] as const;

/** Extract only the privacy-safe subset of metrics from a full report. */
export function extractBoardSafeMetrics(
  report: ReportPayload
): BoardSafeMetrics {
  const result = {} as BoardSafeMetrics;
  for (const key of SAFE_METRIC_KEYS) {
    result[key] = report[key];
  }
  return result;
}

/** Compute aggregate stats (mean, min, max) across a set of participant metrics. */
export function computeBoardAggregates(
  metrics: BoardSafeMetrics[]
): BoardAggregates {
  const result = {} as BoardAggregates;

  for (const key of SAFE_METRIC_KEYS) {
    const values = metrics.map((m) => m[key]).filter((v) => v != null);
    if (values.length === 0) {
      result[key] = { mean: 0, min: 0, max: 0 };
    } else {
      const sum = values.reduce((a, b) => a + b, 0);
      result[key] = {
        mean: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
      } satisfies BoardAggregateField;
    }
  }

  return result;
}

/**
 * Compute the full board view data for a given board and date range.
 * Fetches all participants, computes per-participant metrics, and aggregates.
 */
export async function computeBoardViewData(
  boardId: number,
  from: string,
  to: string
): Promise<{
  participants: BoardParticipantMetrics[];
  aggregates: BoardAggregates | null;
}> {
  const memberships = await all(
    db
      .select({
        identityId: boardMemberships.identityId,
        handle: identities.handle,
      })
      .from(boardMemberships)
      .innerJoin(identities, eq(boardMemberships.identityId, identities.id))
      .where(eq(boardMemberships.boardId, boardId))
  );

  const participantResults = await Promise.all(
    memberships.map(async (m) => {
      const result = await computeReportData(m.identityId, from, to);
      const metrics =
        "data" in result ? extractBoardSafeMetrics(result.data) : null;
      return {
        handle: m.handle ?? "",
        identityId: m.identityId,
        metrics,
      };
    })
  );

  const validMetrics = participantResults
    .map((p) => p.metrics)
    .filter((m): m is BoardSafeMetrics => m !== null);

  const aggregates =
    validMetrics.length > 0 ? computeBoardAggregates(validMetrics) : null;

  return { participants: participantResults, aggregates };
}
