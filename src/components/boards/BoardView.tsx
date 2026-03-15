"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ChevronUp, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/shared/StatCard";
import { AppBreadcrumb } from "@/components/shared/AppBreadcrumb";
import { useBoardMetrics } from "@/hooks/useBoardMetrics";
import { formatMinutes, formatPct } from "@/lib/metrics";
import type { BoardSafeMetrics, BoardParticipantMetrics, BoardAggregates } from "@/types";

type Scope = "day" | "week" | "month" | "custom";

const MONDAY_START = 1;
const HANDLE_PREFIX = "@";

function formatHandle(handle: string): string {
  return `${HANDLE_PREFIX}${handle}`;
}
const SUMMARY_ANCHOR = "board-summary";
const METRICS_ANCHOR = "board-metrics";
const PARTICIPANT_ANCHOR_PREFIX = "participant-";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
];

const BAR_SEGMENTS: {
  key: "greenPct" | "yellowPct" | "redPct";
  color: string;
  label: string;
  sub: string;
}[] = [
  { key: "greenPct", color: "bg-green-activity", label: "On-target", sub: "on-target" },
  { key: "yellowPct", color: "bg-yellow-activity", label: "Re-prioritized", sub: "re-prioritized" },
  { key: "redPct", color: "bg-red-activity", label: "Interrupted", sub: "interrupted" },
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

function BarSegmentTooltip({ pct, sub }: { pct: number; sub: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none opacity-0 group-hover/segment:opacity-100 transition-opacity z-10">
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-center whitespace-nowrap">
        <p className="text-sm font-semibold text-foreground">{formatPct(pct)}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function ClassificationBar({ greenPct, yellowPct, redPct }: { greenPct: number; yellowPct: number; redPct: number }) {
  const segments = BAR_SEGMENTS
    .map((seg) => ({
      ...seg,
      pct: seg.key === "greenPct" ? greenPct : seg.key === "yellowPct" ? yellowPct : redPct,
    }))
    .filter((s) => s.pct > 0);

  return (
    <div className="flex h-6 w-full">
      {segments.map((seg, i) => (
        <div
          key={seg.key}
          className={`${seg.color} relative group/segment ${i === 0 ? "rounded-l-md" : ""} ${i === segments.length - 1 ? "rounded-r-md" : ""}`}
          style={{ width: `${seg.pct}%` }}
        >
          <BarSegmentTooltip pct={seg.pct} sub={seg.sub} />
        </div>
      ))}
    </div>
  );
}

function BoardSummaryBars({
  participants,
  aggregates,
}: {
  participants: BoardParticipantMetrics[];
  aggregates: BoardAggregates | null;
}) {
  return (
    <div id={SUMMARY_ANCHOR} className="bg-card border border-border rounded-lg p-4 space-y-3">
      <h3 className="font-bold text-foreground text-lg">Board Summary</h3>
      <div className="space-y-2">
        {aggregates && (
          <div className="flex items-center gap-3">
            <a
              href={`#${METRICS_ANCHOR}`}
              className="w-24 shrink-0 text-sm font-semibold text-foreground hover:underline"
            >
              Overall
            </a>
            <ClassificationBar
              greenPct={aggregates.greenPct.mean}
              yellowPct={aggregates.yellowPct.mean}
              redPct={aggregates.redPct.mean}
            />
          </div>
        )}
        {participants.map((p) => (
          <div key={p.identityId} className="flex items-center gap-3">
            <a
              href={`#${PARTICIPANT_ANCHOR_PREFIX}${p.identityId}`}
              className="w-24 shrink-0 text-sm text-foreground hover:underline truncate"
            >
              {formatHandle(p.handle)}
            </a>
            {p.metrics ? (
              <ClassificationBar
                greenPct={p.metrics.greenPct}
                yellowPct={p.metrics.yellowPct}
                redPct={p.metrics.redPct}
              />
            ) : (
              <span className="text-xs text-muted-foreground">No data</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BackToSummary() {
  return (
    <a
      href={`#${SUMMARY_ANCHOR}`}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
    >
      <ChevronUp className="h-3 w-3" />
      Summary
    </a>
  );
}

function ParticipantCard({ participant }: { participant: BoardParticipantMetrics }) {
  const { handle, metrics, identityId } = participant;

  return (
    <div id={`${PARTICIPANT_ANCHOR_PREFIX}${identityId}`} className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground">{formatHandle(handle)}</h3>
        <div className="flex items-center gap-3">
          {!metrics && (
            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
              No data
            </span>
          )}
          <BackToSummary />
        </div>
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
          label="On-target"
          value={formatPct(metrics.greenPct)}
          color="green"
        />
        <StatCard
          label="Re-prioritized"
          value={formatPct(metrics.yellowPct)}
          color="yellow"
        />
        <StatCard
          label="Interrupted"
          value={formatPct(metrics.redPct)}
          color="red"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricItem
          label="Context Switches"
          value={String(metrics.totalContextSwitches)}
          helpText="Total number of activity changes, excluding the first entry of each day."
        />
        <MetricItem
          label="Mean Time Between"
          value={formatMinutes(metrics.meanTimeBetweenSwitches)}
          helpText="Average time between context switches."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricItem
          label="Mean Focus"
          value={formatMinutes(metrics.meanFocusTime)}
          helpText="Average duration of stretches of the same type."
        />
        <MetricItem
          label="Mean On-target Focus"
          value={formatMinutes(metrics.meanGreenFocus)}
          helpText="Average duration of on-target stretches."
        />
        <MetricItem
          label="Mean Re-prioritized Focus"
          value={formatMinutes(metrics.meanYellowFocus)}
          helpText="Average duration of re-prioritized stretches."
        />
        <MetricItem
          label="Mean Interrupted Focus"
          value={formatMinutes(metrics.meanRedFocus)}
          helpText="Average duration of interrupted stretches."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <MetricItem
          label="Longest Block"
          value={formatMinutes(metrics.longestBlock)}
          helpText="Duration of the single longest stretch of any type."
        />
        <MetricItem
          label="Longest On-target"
          value={formatMinutes(metrics.longestGreenBlock)}
          helpText="Duration of the longest on-target stretch."
        />
        <MetricItem
          label="Longest Re-prioritized"
          value={formatMinutes(metrics.longestYellowBlock)}
          helpText="Duration of the longest re-prioritized stretch."
        />
        <MetricItem
          label="Longest Interrupted"
          value={formatMinutes(metrics.longestRedBlock)}
          helpText="Duration of the longest interrupted stretch."
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MetricItem
          label="Goal Changes"
          value={String(metrics.goalChangeCount)}
          helpText="Number of times the active goal was changed during the period."
        />
        <MetricItem
          label="Priority Changes"
          value={String(metrics.priorityChangeCount)}
          helpText="Number of times task priorities were reordered during the period."
        />
      </div>
    </div>
  );
}

function MetricItem({ label, value, helpText }: { label: string; value: string; helpText?: string }) {
  const [showHelp, setShowHelp] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (helpRef.current && !helpRef.current.contains(e.target as Node)) {
      setShowHelp(false);
    }
  }, []);

  useEffect(() => {
    if (showHelp) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showHelp, handleClickOutside]);

  return (
    <div className="bg-muted/50 rounded-md px-3 py-2 relative">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground">{value}</p>
        </div>
        {helpText && (
          <div ref={helpRef} className="relative">
            <button
              onClick={() => setShowHelp((prev) => !prev)}
              className="h-4 w-4 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/40 transition-colors flex items-center justify-center mt-0.5"
              aria-label={`Info: ${label}`}
            >
              <Info className="h-2.5 w-2.5 text-muted-foreground" />
            </button>
            {showHelp && (
              <div className="absolute right-0 top-full mt-1 bg-popover border border-border rounded-lg px-3 py-2 shadow-lg z-20 w-52">
                <p className="text-xs text-muted-foreground">{helpText}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const SUMMARY_FIELDS: { key: keyof BoardSafeMetrics; label: string; format: (v: number) => string }[] = [
  { key: "greenPct", label: "On-target %", format: formatPct },
  { key: "yellowPct", label: "Re-prioritized %", format: formatPct },
  { key: "redPct", label: "Interrupted %", format: formatPct },
  { key: "totalContextSwitches", label: "Context Switches", format: (v) => String(Math.round(v)) },
  { key: "meanTimeBetweenSwitches", label: "Mean Time Between Switches", format: formatMinutes },
  { key: "meanFocusTime", label: "Mean Focus Time", format: formatMinutes },
  { key: "longestBlock", label: "Longest Block", format: formatMinutes },
  { key: "goalChangeCount", label: "Goal Changes", format: (v) => String(Math.round(v)) },
  { key: "priorityChangeCount", label: "Priority Changes", format: (v) => String(Math.round(v)) },
];

function BoardMetrics({ aggregates }: { aggregates: BoardAggregates }) {
  return (
    <div id={METRICS_ANCHOR} className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-lg">Board Metrics</h3>
        <BackToSummary />
      </div>
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
            {SUMMARY_FIELDS.map((field) => {
              const agg = aggregates[field.key];
              return (
                <tr key={field.key} className="border-b border-border/50">
                  <td className="py-2 pr-4 text-muted-foreground">{field.label}</td>
                  <td className="py-2 px-4 text-right text-foreground font-medium">
                    {field.format(agg.mean)}
                  </td>
                  <td className="py-2 px-4 text-right text-foreground">
                    {field.format(agg.min)}
                  </td>
                  <td className="py-2 pl-4 text-right text-foreground">
                    {field.format(agg.max)}
                  </td>
                </tr>
              );
            })}
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
          <AppBreadcrumb
            crumbs={[
              { label: "Boards", href: "/boards" },
              { label: boardName },
            ]}
          />
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
            <BoardSummaryBars participants={participants} aggregates={aggregates ?? null} />

            {participants.map((p) => (
              <ParticipantCard key={p.identityId} participant={p} />
            ))}

            {aggregates && (
              <BoardMetrics aggregates={aggregates} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
