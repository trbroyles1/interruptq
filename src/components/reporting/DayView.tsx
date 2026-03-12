"use client";

import { useState } from "react";
import { formatMinutes, formatPct } from "@/lib/metrics";
import type { RangeMetrics } from "@/lib/metrics";

interface DayViewProps {
  metrics: RangeMetrics & {
    onCallMinutes?: number;
    onCallTicketMinutes?: number;
    goalProgress?: { goal: string; minutes: number }[];
  };
}

export function DayView({ metrics }: DayViewProps) {
  const [mode, setMode] = useState<"timeline" | "aggregate">("timeline");

  const dayActivities =
    metrics.dailyBreakdown.length > 0
      ? metrics.dailyBreakdown[0].activities
      : [];

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("timeline")}
          className={`text-xs px-2 py-1 rounded ${
            mode === "timeline"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setMode("aggregate")}
          className={`text-xs px-2 py-1 rounded ${
            mode === "aggregate"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground"
          }`}
        >
          Aggregate
        </button>
      </div>

      {mode === "timeline" ? (
        <TimelineView activities={dayActivities} />
      ) : (
        <AggregateView metrics={metrics} />
      )}
    </div>
  );
}

function TimelineView({
  activities,
}: {
  activities: { text: string; classification: string; timestamp: string; durationMinutes: number }[];
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No activities for this day.
      </p>
    );
  }

  const maxDuration = Math.max(...activities.map((a) => a.durationMinutes), 1);

  return (
    <div className="space-y-1">
      {activities.map((a, i) => {
        const widthPct = Math.max(5, (a.durationMinutes / maxDuration) * 100);
        const time = new Date(a.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const colorClass =
          a.classification === "green"
            ? "bg-green-activity"
            : a.classification === "yellow"
              ? "bg-yellow-activity"
              : "bg-red-activity";

        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-12 shrink-0">
              {time}
            </span>
            <div
              className={`h-6 rounded ${colorClass} flex items-center px-2 min-w-0`}
              style={{ width: `${widthPct}%`, opacity: 0.8 }}
            >
              <span className="text-xs text-white truncate">{a.text}</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {formatMinutes(a.durationMinutes)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function AggregateView({ metrics }: { metrics: RangeMetrics }) {
  return (
    <div className="space-y-4">
      {/* Classification summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="On-target"
          value={formatMinutes(metrics.greenMinutes)}
          sub={formatPct(metrics.greenPct)}
          color="green"
        />
        <StatCard
          label="Re-prioritized"
          value={formatMinutes(metrics.yellowMinutes)}
          sub={formatPct(metrics.yellowPct)}
          color="yellow"
        />
        <StatCard
          label="Interrupted"
          value={formatMinutes(metrics.redMinutes)}
          sub={formatPct(metrics.redPct)}
          color="red"
        />
      </div>

      {/* Context switches */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Context Switches</p>
          <p className="text-lg font-semibold">{metrics.totalContextSwitches}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Mean Time Between</p>
          <p className="text-lg font-semibold">
            {formatMinutes(metrics.meanTimeBetweenSwitches)}
          </p>
        </div>
      </div>

      {/* Focus time */}
      <div className="bg-card border border-border rounded-md p-3 space-y-2">
        <p className="text-xs text-muted-foreground font-semibold">
          Mean Focus Time
        </p>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <span className="text-green-activity">
              {formatMinutes(metrics.meanGreenFocus)}
            </span>
            <p className="text-xs text-muted-foreground">on-target</p>
          </div>
          <div>
            <span className="text-yellow-activity">
              {formatMinutes(metrics.meanYellowFocus)}
            </span>
            <p className="text-xs text-muted-foreground">re-prioritized</p>
          </div>
          <div>
            <span className="text-red-activity">
              {formatMinutes(metrics.meanRedFocus)}
            </span>
            <p className="text-xs text-muted-foreground">interrupted</p>
          </div>
        </div>
      </div>

      {/* Top activities */}
      {metrics.perActivity.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">
            Activities by Time
          </p>
          {metrics.perActivity.slice(0, 10).map((a, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm py-0.5"
            >
              <span className="truncate flex-1 mr-2">{a.text}</span>
              <span className="text-muted-foreground shrink-0">
                {formatMinutes(a.minutes)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Per-person */}
      {metrics.perPerson.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">
            Time by Person
          </p>
          {metrics.perPerson.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-sm py-0.5"
            >
              <span>@{p.person}</span>
              <span className="text-muted-foreground">
                {formatMinutes(p.minutes)} · {p.switchCount} switches
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: "green" | "yellow" | "red";
}) {
  const colorClass =
    color === "green"
      ? "border-green-activity/30 text-green-activity"
      : color === "yellow"
        ? "border-yellow-activity/30 text-yellow-activity"
        : "border-red-activity/30 text-red-activity";

  return (
    <div className={`bg-card border rounded-md p-3 ${colorClass}`}>
      <p className="text-xs opacity-70">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs opacity-70">{sub}</p>
    </div>
  );
}
