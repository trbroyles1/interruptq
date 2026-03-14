"use client";

import { use } from "react";
import Link from "next/link";
import { useBoardData } from "@/hooks/useBoardData";
import { BoardView } from "@/components/boards/BoardView";

export default function BoardPage({
  params,
}: {
  params: Promise<{ canonicalName: string }>;
}) {
  const { canonicalName } = use(params);
  const { boardName, participantCount, isLoading, notFound } =
    useBoardData(canonicalName);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
        <p className="text-muted-foreground text-sm">Board not found.</p>
        <Link
          href="/boards"
          className="text-sm text-primary hover:underline"
        >
          Back to all boards
        </Link>
      </div>
    );
  }

  return (
    <BoardView
      canonicalName={canonicalName}
      boardName={boardName!}
      participantCount={participantCount!}
    />
  );
}
