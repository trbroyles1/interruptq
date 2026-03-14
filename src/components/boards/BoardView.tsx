"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { useBoardMetrics } from "@/hooks/useBoardMetrics";
import { formatMinutes, formatPct } from "@/lib/metrics";
import type { BoardSafeMetrics, BoardParticipantMetrics } from "@/types";

type Scope = "day" | "week" | "month" | "custom";

const MONDAY_START = 1;

const SCOPES: { key: Scope; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
];

interface BoardViewProps {
  canonicalName: string;
  boardName: string;
  participantCount: number;
}

function getWeekRange(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day - MONDAY_START + 7) % 7;
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

function getTodayLocal(): string {
  return new Date().toISOString().split("T")[0];
}

function ParticipantCard({ participant }: { participant: BoardParticipantMetrics }) {
  const { handle, metrics } = participant;

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">{handle}</h3>
        {!metrics && (
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
            No data
          </span>
        )}
      </div>

      {metrics && <MetricsDetail metrics={metrics} />}
    </div>
  );
}

function MetricsDetail({ metrics }: { metrics: BoardSafeMetrics }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Green"
          value={formatPct(metrics.greenPct)}
          sub="focus time"
          color="green"
        />
        <StatCard
          label="Yellow"
          value={formatPct(metrics.yellowPct)}
          sub="collaborative"
          color="yellow"
        />
        <StatCard
          label="Red"
          value={formatPct(metrics.redPct)}
          sub="interruptions"
          color="red"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricItem label="Context Switches" value={String(metrics.totalContextSwitches)} />
        <MetricItem label="Mean Time Between" value={formatMinutes(metrics.meanTimeBetweenSwitches)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricItem label="Mean Focus" value={formatMinutes(metrics.meanFocusTime)} />
        <MetricItem label="Green Focus" value={formatMinutes(metrics.meanGreenFocus)} />
        <MetricItem label="Yellow Focus" value={formatMinutes(metrics.meanYellowFocus)} />
        <MetricItem label="Red Focus" value={formatMinutes(metrics.meanRedFocus)} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricItem label="Longest Block" value={formatMinutes(metrics.longestBlock)} />
        <MetricItem label="Longest Green" value={formatMinutes(metrics.longestGreenBlock)} />
        <MetricItem label="Longest Yellow" value={formatMinutes(metrics.longestYellowBlock)} />
        <MetricItem label="Longest Red" value={formatMinutes(metrics.longestRedBlock)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricItem label="Goal Changes" value={String(metrics.goalChangeCount)} />
        <MetricItem label="Priority Changes" value={String(metrics.priorityChangeCount)} />
      </div>
    </div>
  );
}

function MetricItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-md px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

const SUMMARY_FIELDS: { key: keyof BoardSafeMetrics; label: string; format: (v: number) => string }[] = [
  { key: "greenPct", label: "Green %", format: formatPct },
  { key: "yellowPct", label: "Yellow %", format: formatPct },
  { key: "redPct", label: "Red %", format: formatPct },
  { key: "totalContextSwitches", label: "Context Switches", format: (v) => String(Math.round(v)) },
  { key: "meanTimeBetweenSwitches", label: "Mean Time Between Switches", format: formatMinutes },
  { key: "meanFocusTime", label: "Mean Focus Time", format: formatMinutes },
  { key: "longestBlock", label: "Longest Block", format: formatMinutes },
  { key: "goalChangeCount", label: "Goal Changes", format: (v) => String(Math.round(v)) },
  { key: "priorityChangeCount", label: "Priority Changes", format: (v) => String(Math.round(v)) },
];

function BoardSummary({ mean, min, max }: { mean: BoardSafeMetrics; min: BoardSafeMetrics; max: BoardSafeMetrics }) {
  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h3 className="font-bold text-foreground text-lg">Board Summary</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Metric</th>
              <th className="text-right py-2 px-4 text-muted-foreground font-medium">Mean</th>
              <th className="text-right py-2 px-4 text-muted-foreground font-medium">Min</th>
              <th className="text-right py-2 pl-4 text-muted-foreground font-medium">Max</th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_FIELDS.map((field) => (
              <tr key={field.key} className="border-b border-border/50">
                <td className="py-2 pr-4 text-muted-foreground">{field.label}</td>
                <td className="py-2 px-4 text-right text-foreground font-medium">
                  {field.format(mean[field.key])}
                </td>
                <td className="py-2 px-4 text-right text-foreground">
                  {field.format(min[field.key])}
                </td>
                <td className="py-2 pl-4 text-right text-foreground">
                  {field.format(max[field.key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BoardView({ canonicalName, boardName, participantCount }: BoardViewProps) {
  const today = getTodayLocal();
  const [scope, setScope] = useState<Scope>("day");
  const [selectedDate, setSelectedDate] = useState(today);
  const [customFrom, setCustomFrom] = useState(today);
  const [customTo, setCustomTo] = useState(today);

  const { from, to } = useMemo(() => {
    const date = new Date(`${selectedDate}T12:00:00`);
    switch (scope) {
      case "day":
        return { from: selectedDate, to: selectedDate };
      case "week":
        return getWeekRange(date);
      case "month":
        return getMonthRange(date);
      case "custom":
        return { from: customFrom, to: customTo };
      default:
        return { from: selectedDate, to: selectedDate };
    }
  }, [scope, selectedDate, customFrom, customTo]);

  const { participants, aggregates, isLoading: metricsLoading } =
    useBoardMetrics(canonicalName, from, to);

  const navigate = (direction: -1 | 1) => {
    const date = new Date(`${selectedDate}T12:00:00`);
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

  const hasAnyData = participants?.some((p) => p.metrics !== null) ?? false;

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <Link
            href="/boards"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; All Boards
          </Link>
          <h1 className="text-2xl font-bold text-foreground mt-1">{boardName}</h1>
          <p className="text-sm text-muted-foreground">
            {participantCount} {participantCount === 1 ? "participant" : "participants"}
          </p>
        </div>

        {/* Scope selector */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {SCOPES.map((s) => (
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
            {scope !== "custom" && (
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
            <span className="text-xs text-muted-foreground ml-auto">
              {from} &rarr; {to}
            </span>
          </div>
        </div>

        {/* Metrics content */}
        {metricsLoading && (
          <p className="text-sm text-muted-foreground py-4">
            Loading metrics...
          </p>
        )}

        {!metricsLoading && participants && !hasAnyData && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No data for this period.
          </p>
        )}

        {!metricsLoading && participants && hasAnyData && (
          <div className="space-y-4">
            {participants.map((p) => (
              <ParticipantCard key={p.identityId} participant={p} />
            ))}

            {aggregates && (
              <BoardSummary
                mean={aggregates.mean}
                min={aggregates.min}
                max={aggregates.max}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
