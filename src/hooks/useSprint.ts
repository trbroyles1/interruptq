"use client";

import useSWR from "swr";
import type { PriorityItem } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useSprint() {
  const { data: sprint, error, mutate: mutateSprint, isLoading } = useSWR(
    "/api/sprints/current",
    fetcher
  );

  const sprintId = sprint?.id;

  const {
    data: goalsData,
    mutate: mutateGoals,
  } = useSWR(
    sprintId ? `/api/sprints/${sprintId}/goals` : null,
    fetcher
  );

  const {
    data: prioritiesData,
    mutate: mutatePriorities,
  } = useSWR(
    sprintId ? `/api/sprints/${sprintId}/priorities` : null,
    fetcher
  );

  const cutover = async (date?: string) => {
    const res = await fetch("/api/sprints/cutover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    if (!res.ok) throw new Error("Failed to cutover sprint");
    await mutateSprint();
    await mutateGoals();
    await mutatePriorities();
    return res.json();
  };

  const setGoals = async (goals: string[]) => {
    if (!sprintId) return;
    const res = await fetch(`/api/sprints/${sprintId}/goals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goals }),
    });
    if (!res.ok) throw new Error("Failed to set goals");
    await mutateGoals();
    await mutatePriorities(); // goals overwrite priorities
    return res.json();
  };

  const setPriorities = async (priorities: PriorityItem[]) => {
    if (!sprintId) return;
    const res = await fetch(`/api/sprints/${sprintId}/priorities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorities }),
    });
    if (!res.ok) throw new Error("Failed to set priorities");
    await mutatePriorities();
    return res.json();
  };

  return {
    sprint,
    goals: goalsData?.goals ?? [],
    goalsSnapshotCount: goalsData?.snapshotCount ?? 0,
    priorities: prioritiesData?.priorities ?? [],
    prioritiesSnapshotCount: prioritiesData?.snapshotCount ?? 0,
    isLoading,
    error,
    cutover,
    setGoals,
    setPriorities,
  };
}
