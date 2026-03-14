"use client";

import { ShareBanner } from "./ShareBanner";
import { ShareReportingPanel } from "./ShareReportingPanel";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Sprint, PriorityItem } from "@/types";

interface ShareViewProps {
  shareId: string;
  sprint: Sprint | null;
  goals: string[];
  priorities: PriorityItem[];
  isOnCall: boolean;
  expiresAt: string | null;
  timezone: string;
  weekStartDay: number;
}

export function ShareView({
  shareId,
  sprint,
  goals,
  priorities,
  isOnCall,
  expiresAt,
  timezone,
  weekStartDay,
}: ShareViewProps) {
  return (
    <div className="flex flex-col h-screen">
      <ShareBanner expiresAt={expiresAt} />

      <div className="flex flex-1 overflow-hidden">
        {/* Read-only sidebar context */}
        <aside className="w-64 border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border">
            <h1 className="text-lg font-bold">InterruptQ</h1>
            <p className="text-xs text-muted-foreground mt-1">Shared report view</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-5">
              {/* On-call status (read-only) */}
              <div>
                <p className="text-xs text-muted-foreground font-semibold mb-1">
                  On-Call Status
                </p>
                <span
                  className={`text-sm font-medium ${
                    isOnCall ? "text-yellow-500" : "text-muted-foreground"
                  }`}
                >
                  {isOnCall ? "On-Call" : "Off-Call"}
                </span>
              </div>

              {/* Sprint info (read-only) */}
              {sprint && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">
                    Current Sprint
                  </p>
                  <p className="text-sm">
                    Sprint {sprint.ordinal}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {sprint.startDate} – {sprint.endDate ?? "now"}
                  </p>
                </div>
              )}

              {/* Sprint goals (read-only) */}
              {goals.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">
                    Sprint Goals
                  </p>
                  <ul className="space-y-1">
                    {goals.map((goal) => (
                      <li
                        key={goal}
                        className="text-sm font-mono bg-muted/50 rounded px-2 py-0.5"
                      >
                        {goal}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Priorities (read-only) */}
              {priorities.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-1">
                    Priorities
                  </p>
                  <ul className="space-y-1">
                    {priorities.map((p) => (
                      <li
                        key={`${p.type}-${p.value}`}
                        className="text-sm bg-muted/50 rounded px-2 py-0.5"
                      >
                        {typeof p === "string" ? p : p.value}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Report area */}
        <main className="flex-1 overflow-hidden">
          <ScrollArea className="h-full p-4">
            <ShareReportingPanel shareId={shareId} sprint={sprint} timezone={timezone} weekStartDay={weekStartDay} />
          </ScrollArea>
        </main>
      </div>
    </div>
  );
}
