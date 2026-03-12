"use client";

import useSWR from "swr";
import type { Preferences } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePreferences() {
  const { data, error, mutate, isLoading } = useSWR<Preferences>(
    "/api/preferences",
    fetcher
  );

  const updatePreferences = async (updates: Partial<Preferences>) => {
    const res = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update preferences");
    await mutate();
    return res.json();
  };

  return {
    preferences: data ?? null,
    isLoading,
    error,
    updatePreferences,
  };
}
