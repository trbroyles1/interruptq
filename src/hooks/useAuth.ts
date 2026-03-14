"use client";

import useSWR, { mutate as globalMutate } from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

async function generate(): Promise<{ token: string }> {
  const res = await fetch("/api/auth/generate", { method: "POST" });
  const body = await res.json();
  return { token: body.token };
}

export function useAuth() {
  const { data, error, isLoading, mutate } = useSWR("/api/auth/status", fetcher);

  const connected = data?.connected === true;

  async function connect(token: string): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/auth/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: body.error || "Token not recognized" };
    }

    // Clear all SWR caches and revalidate auth status
    await globalMutate(() => true, undefined, { revalidate: false });
    await mutate();
    return { ok: true };
  }

  async function confirmGenerated(): Promise<void> {
    // Clear all SWR caches and revalidate auth status to transition into the app
    await globalMutate(() => true, undefined, { revalidate: false });
    await mutate();
  }

  async function disconnect(): Promise<void> {
    await fetch("/api/auth/disconnect", { method: "POST" });

    // Clear all SWR caches
    await globalMutate(() => true, undefined, { revalidate: false });
    await mutate();
  }

  return {
    connected,
    isLoading,
    error,
    connect,
    generate,
    confirmGenerated,
    disconnect,
  };
}
