"use client";

import { ClassificationBadge } from "@/components/shared/ClassificationBadge";
import type { Classification } from "@/types";

interface ActivityCardProps {
  text: string;
  classification: Classification;
  timestamp: string;
  durationMinutes: number;
  tickets: string[];
  tags: string[];
}

export function ActivityCard({
  text,
  classification,
  timestamp,
  durationMinutes,
  tickets,
  tags,
}: ActivityCardProps) {
  const time = new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const duration =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${Math.round(durationMinutes % 60)}m`
      : `${Math.round(durationMinutes)}m`;

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="text-xs text-muted-foreground w-12 pt-0.5 shrink-0">
        {time}
      </div>
      <div
        className={`w-1.5 h-full min-h-[2rem] rounded-full shrink-0 ${
          classification === "green"
            ? "bg-green-activity"
            : classification === "yellow"
              ? "bg-yellow-activity"
              : classification === "break"
                ? "bg-gray-activity"
                : "bg-red-activity"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm">{text}</span>
          <ClassificationBadge classification={classification} size="sm" />
        </div>
        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
          <span>{duration}</span>
          {tickets.length > 0 && (
            <span className="text-primary">{tickets.join(", ")}</span>
          )}
          {tags.length > 0 && (
            <span className="text-muted-foreground">
              {tags.map((t) => `@${t}`).join(" ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
