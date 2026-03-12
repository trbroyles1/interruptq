"use client";

import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreakButtonProps {
  isOnBreak: boolean;
  onBreak: () => void;
}

export function BreakButton({ isOnBreak, onBreak }: BreakButtonProps) {
  return (
    <button
      onClick={onBreak}
      disabled={isOnBreak}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full",
        isOnBreak
          ? "bg-gray-activity/20 text-gray-activity cursor-default"
          : "bg-card border border-border text-muted-foreground hover:bg-gray-activity/10 hover:text-gray-activity"
      )}
    >
      <Coffee className="h-4 w-4" />
      {isOnBreak ? "On Break" : "Take Break"}
    </button>
  );
}
