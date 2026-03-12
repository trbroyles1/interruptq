"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useActivities(date?: string) {
  const params = date ? `?date=${date}` : "";
  const { data, error, mutate, isLoading } = useSWR(
    `/api/activities${params}`,
    fetcher,
    { refreshInterval: 30000 } // refresh every 30s for ongoing duration
  );

  const createActivity = async (text: string) => {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Failed to create activity");
    const activity = await res.json();
    await mutate();
    return activity;
  };

  const startBreak = async () => {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBreak: true }),
    });
    if (!res.ok) throw new Error("Failed to start break");
    const activity = await res.json();
    await mutate();
    return activity;
  };

  return {
    activities: data ?? [],
    isLoading,
    error,
    createActivity,
    startBreak,
    mutate,
  };
}
