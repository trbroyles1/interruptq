"use client";

import { use } from "react";
import { useShareData } from "@/hooks/useShareData";
import { ShareView } from "@/components/share/ShareView";
import { ShareExpired } from "@/components/share/ShareExpired";

export default function SharePage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = use(params);
  const { sprint, goals, priorities, isOnCall, expiresAt, isLoading, isExpired } =
    useShareData(shareId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (isExpired) {
    return <ShareExpired />;
  }

  return (
    <ShareView
      shareId={shareId}
      sprint={sprint}
      goals={goals}
      priorities={priorities}
      isOnCall={isOnCall}
      expiresAt={expiresAt}
    />
  );
}
