"use client";

import { cn } from "@/lib/utils";
import type { Classification } from "@/types";

interface ClassificationBadgeProps {
  classification: Classification;
  size?: "sm" | "md";
}

const labels: Record<Classification, string> = {
  green: "On-target",
  yellow: "Re-prioritized",
  red: "Interrupted",
};

export function ClassificationBadge({
  classification,
  size = "sm",
}: ClassificationBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-3 py-1 text-sm",
        classification === "green" && "bg-green-activity/20 text-green-activity",
        classification === "yellow" && "bg-yellow-activity/20 text-yellow-activity",
        classification === "red" && "bg-red-activity/20 text-red-activity"
      )}
    >
      <span
        className={cn(
          "mr-1.5 h-2 w-2 rounded-full",
          classification === "green" && "bg-green-activity",
          classification === "yellow" && "bg-yellow-activity",
          classification === "red" && "bg-red-activity"
        )}
      />
      {labels[classification]}
    </span>
  );
}
