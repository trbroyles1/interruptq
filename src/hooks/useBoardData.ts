"use client";

import useSWR from "swr";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("Not found");
    return r.json();
  });

export function useBoardData(canonicalName: string) {
  const { data, error, isLoading } = useSWR(
    `/api/boards/${canonicalName}`,
    fetcher
  );

  return {
    boardName: data?.nameDisplay as string | undefined,
    nameCanonical: data?.nameCanonical as string | undefined,
    participantCount: data?.participantCount as number | undefined,
    participants: data?.participants as
      | { handle: string; identityId: number }[]
      | undefined,
    isLoading,
    notFound: !!error,
  };
}
