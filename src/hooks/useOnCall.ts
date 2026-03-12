"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useOnCall() {
  const { data, error, mutate, isLoading } = useSWR("/api/oncall", fetcher);

  const toggle = async () => {
    const res = await fetch("/api/oncall", { method: "POST" });
    if (!res.ok) throw new Error("Failed to toggle on-call");
    await mutate();
    return res.json();
  };

  return {
    isOnCall: data?.isOnCall ?? false,
    lastChanged: data?.lastChanged ?? null,
    isLoading,
    error,
    toggle,
  };
}
