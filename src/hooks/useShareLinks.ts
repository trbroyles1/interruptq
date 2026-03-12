"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useShareLinks() {
  const { data, error, isLoading, mutate } = useSWR("/api/shares", fetcher);

  const links = Array.isArray(data) ? data : [];

  async function createLink(): Promise<{ url: string } | { error: string }> {
    const res = await fetch("/api/shares", { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      return { error: body.error || "Failed to create share link" };
    }
    await mutate();
    return { url: body.url };
  }

  async function revokeLink(shareId: string): Promise<void> {
    await fetch(`/api/shares/${shareId}`, { method: "DELETE" });
    await mutate();
  }

  return {
    links,
    isLoading,
    error,
    createLink,
    revokeLink,
  };
}
