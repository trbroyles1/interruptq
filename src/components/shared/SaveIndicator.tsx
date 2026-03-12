"use client";

import { cn } from "@/lib/utils";

interface SaveIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

export function SaveIndicator({ status }: SaveIndicatorProps) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 px-3 py-1.5 rounded-md text-sm font-medium transition-opacity duration-300 z-50",
        status === "saving" && "bg-muted text-muted-foreground animate-pulse",
        status === "saved" && "bg-green-activity/20 text-green-activity",
        status === "error" && "bg-destructive/20 text-destructive"
      )}
    >
      {status === "saving" && "Saving..."}
      {status === "saved" && "Saved"}
      {status === "error" && "Save failed"}
    </div>
  );
}
