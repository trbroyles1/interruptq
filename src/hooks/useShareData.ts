"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Share link invalid or expired");
    return r.json();
  });

export function useShareData(shareId: string) {
  const { data, error, isLoading } = useSWR(
    `/api/shares/${shareId}/context`,
    fetcher
  );

  return {
    sprint: data?.sprint ?? null,
    goals: data?.goals ?? [],
    priorities: data?.priorities ?? [],
    isOnCall: data?.isOnCall ?? false,
    expiresAt: data?.expiresAt ?? null,
    timezone: data?.timezone ?? "America/New_York",
    weekStartDay: data?.weekStartDay ?? 1,
    isLoading,
    isExpired: !!error,
  };
}
