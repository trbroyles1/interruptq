"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useMetrics(from: string | null, to: string | null) {
  const { data, error, isLoading } = useSWR(
    from && to ? `/api/reports?from=${from}&to=${to}` : null,
    fetcher
  );

  return {
    metrics: data ?? null,
    isLoading,
    error,
  };
}
