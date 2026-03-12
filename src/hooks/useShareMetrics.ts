"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Share link invalid or expired");
    return r.json();
  });

export function useShareMetrics(
  shareId: string,
  from: string | null,
  to: string | null
) {
  const { data, error, isLoading } = useSWR(
    from && to
      ? `/api/shares/${shareId}/reports?from=${from}&to=${to}`
      : null,
    fetcher
  );

  return {
    metrics: data ?? null,
    isLoading,
    error,
  };
}
