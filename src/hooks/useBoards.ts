"use client";

import useSWR from "swr";
import type { BoardMembership } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useBoards() {
  const { data, error, mutate, isLoading } = useSWR<BoardMembership[]>(
    "/api/boards/memberships",
    fetcher
  );

  const joinBoard = async (name: string) => {
    const res = await fetch("/api/boards/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error("Failed to join board");
    await mutate();
  };

  const leaveBoard = async (canonicalName: string) => {
    const res = await fetch(`/api/boards/${canonicalName}/leave`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to leave board");
    await mutate();
  };

  return {
    boards: data ?? [],
    isLoading,
    error,
    joinBoard,
    leaveBoard,
  };
}
