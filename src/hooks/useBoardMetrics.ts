"use client";

import useSWR from "swr";
import type { BoardParticipantMetrics, BoardAggregates } from "@/types";

interface BoardMetricsResponse {
  participants: BoardParticipantMetrics[];
  aggregates: BoardAggregates | null;
}

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Failed to load board metrics");
    return r.json();
  });

export function useBoardMetrics(
  canonicalName: string,
  from: string | null,
  to: string | null
) {
  const { data, isLoading } = useSWR<BoardMetricsResponse>(
    from && to
      ? `/api/boards/${canonicalName}/metrics?from=${from}&to=${to}`
      : null,
    fetcher
  );

  return {
    participants: data?.participants,
    aggregates: data?.aggregates,
    isLoading,
  };
}
