"use client";

import useSWR from "swr";
import type { BoardParticipantMetrics, BoardAggregates } from "@/types";

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
  const { data, isLoading } = useSWR(
    from && to
      ? `/api/boards/${canonicalName}/metrics?from=${from}&to=${to}`
      : null,
    fetcher
  );

  return {
    participants: data?.participants as BoardParticipantMetrics[] | undefined,
    aggregates: data?.aggregates as BoardAggregates | null | undefined,
    isLoading,
  };
}
