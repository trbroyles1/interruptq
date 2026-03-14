"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { useShareMetrics } from "@/hooks/useShareMetrics";
import { AggregateView } from "@/components/reporting/DayView";
import { MultiDayView } from "@/components/reporting/MultiDayView";
import { todayInTz } from "@/lib/timezone";
import type { Sprint } from "@/types";

type Scope = "day" | "week" | "sprint" | "month" | "custom";

interface ShareReportingPanelProps {
  shareId: string;
  sprint: Sprint | null;
  timezone: string;
  weekStartDay?: number;
}

function getWeekRange(date: Date, weekStartDay: number) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - weekStartDay + 7) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - diff);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

function getMonthRange(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return {
    from: start.toISOString().split("T")[0],
    to: end.toISOString().split("T")[0],
  };
}

export function ShareReportingPanel({
  shareId,
  sprint,
  timezone,
  weekStartDay = 1,
}: ShareReportingPanelProps) {
  const today = todayInTz(timezone);
  const [scope, setScope] = useState<Scope>("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const { from, to } = useMemo(() => {
    const date = new Date(`${selectedDate  }T12:00:00`);
    switch (scope) {
      case "day":
        return { from: selectedDate, to: selectedDate };
      case "week":
        return getWeekRange(date, weekStartDay);
      case "sprint":
        if (sprint) {
          return {
            from: sprint.startDate,
            to: sprint.endDate ?? today,
          };
        }
        return { from: today, to: today };
      case "month":
        return getMonthRange(date);
      case "custom":
        return { from: customFrom, to: customTo };
      default:
        return { from: selectedDate, to: selectedDate };
    }
  }, [scope, selectedDate, sprint, weekStartDay, customFrom, customTo, today]);

  const { metrics, isLoading } = useShareMetrics(shareId, from, to);

  const navigate = (direction: -1 | 1) => {
    const date = new Date(`${selectedDate  }T12:00:00`);
    switch (scope) {
      case "day":
        date.setDate(date.getDate() + direction);
        break;
      case "week":
        date.setDate(date.getDate() + direction * 7);
        break;
      case "month":
        date.setMonth(date.getMonth() + direction);
        break;
    }
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const scopes: { key: Scope; label: string }[] = [
    { key: "day", label: "Day" },
    { key: "week", label: "Week" },
    { key: "sprint", label: "Sprint" },
    { key: "month", label: "Month" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div className="space-y-4">
      {/* Scope selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {scopes.map((s) => (
          <button
            key={s.key}
            onClick={() => setScope(s.key)}
            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
              scope === s.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Date navigation */}
      <div className="flex items-center gap-2">
        {scope !== "sprint" && scope !== "custom" && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="h-7 w-7 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-7 w-36 text-xs"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(1)}
              className="h-7 w-7 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}
        {scope === "custom" && (
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-7 w-36 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-7 w-36 text-xs"
            />
          </div>
        )}
        {scope === "sprint" && sprint && (
          <span className="text-xs text-muted-foreground">
            Sprint {sprint.ordinal}: {sprint.startDate} –{" "}
            {sprint.endDate ?? "now"}
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {from} → {to}
        </span>
        {metrics && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={async () => {
              const res = await fetch(
                `/api/shares/${shareId}/export?from=${from}&to=${to}`
              );
              const text = await res.text();
              await navigator.clipboard.writeText(text);
            }}
          >
            <Copy className="h-3 w-3" />
            Copy
          </Button>
        )}
      </div>

      {/* Report content */}
      {isLoading && (
        <p className="text-sm text-muted-foreground py-4">
          Loading metrics...
        </p>
      )}

      {metrics && !isLoading && (
        <>
          {scope === "day" ? (
            /* Share view: aggregate only, no timeline */
            <AggregateView metrics={metrics} />
          ) : (
            <MultiDayView metrics={metrics} />
          )}
        </>
      )}
    </div>
  );
}
