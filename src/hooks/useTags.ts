"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useTags(query?: string) {
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  const { data, error, mutate } = useSWR<string[]>(
    `/api/tags${params}`,
    fetcher
  );

  return {
    tags: data ?? [],
    error,
    mutate,
  };
}
