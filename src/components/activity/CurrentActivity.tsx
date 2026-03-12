"use client";

import { useEffect, useState } from "react";
import { ClassificationBadge } from "@/components/shared/ClassificationBadge";
import type { Classification } from "@/types";

interface CurrentActivityProps {
  text: string;
  classification: Classification;
  startTime: string;
}

export function CurrentActivity({
  text,
  classification,
  startTime,
}: CurrentActivityProps) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const start = new Date(startTime).getTime();
      const now = Date.now();
      const diffMs = now - start;
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      if (hours > 0) {
        setElapsed(`${hours}h ${mins}m`);
      } else {
        setElapsed(`${mins}m`);
      }
    };

    update();
    const interval = setInterval(update, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [startTime]);

  const formattedTime = new Date(startTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-card border border-border">
      <div
        className={`w-2 h-12 rounded-full ${
          classification === "green"
            ? "bg-green-activity"
            : classification === "yellow"
              ? "bg-yellow-activity"
              : "bg-red-activity"
        }`}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{text}</span>
          <ClassificationBadge classification={classification} />
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          Started {formattedTime} · {elapsed}
        </div>
      </div>
    </div>
  );
}
