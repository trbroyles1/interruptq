"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { formatMinutes, formatPct } from "@/lib/metrics";
import type { RangeMetrics } from "@/lib/metrics";
import { StatCard } from "@/components/shared/StatCard";

interface MultiDayViewProps {
  metrics: RangeMetrics & {
    goalChangeCount?: number;
    priorityChangeCount?: number;
    onCallMinutes?: number;
    onCallTicketMinutes?: number;
    goalProgress?: { goal: string; minutes: number }[];
  };
}

export function MultiDayView({ metrics }: MultiDayViewProps) {
  const chartData = metrics.dailyBreakdown.map((d) => ({
    date: d.date.slice(5), // MM-DD
    green: Math.round(d.greenMinutes),
    yellow: Math.round(d.yellowMinutes),
    red: Math.round(d.redMinutes),
    switches: d.contextSwitches,
  }));

  return (
    <div className="space-y-6">
      {/* Summary stats */}
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

      {/* Stacked bar chart */}
      {chartData.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">
            Time Distribution
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(value) => `${value}m`}
              />
              <Bar dataKey="green" stackId="a" fill="#22c55e" />
              <Bar dataKey="yellow" stackId="a" fill="#eab308" />
              <Bar dataKey="red" stackId="a" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Context switch trend */}
      {chartData.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold">
            Context Switches per Day
          </p>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="switches"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Context switch totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Total Switches</p>
          <p className="text-lg font-semibold">{metrics.totalContextSwitches}</p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Mean Time Between</p>
          <p className="text-lg font-semibold">
            {formatMinutes(metrics.meanTimeBetweenSwitches)}
          </p>
        </div>
        <div className="bg-card border border-border rounded-md p-3">
          <p className="text-xs text-muted-foreground">Daily Avg</p>
          <p className="text-lg font-semibold">
            {metrics.dailyBreakdown.length > 0
              ? Math.round(
                  metrics.totalContextSwitches / metrics.dailyBreakdown.length
                )
              : 0}
          </p>
        </div>
      </div>

      {/* Focus time by classification */}
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
            Top Activities
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

      {/* Person impact */}
      {metrics.perPerson.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">
            Person Impact
          </p>
          {metrics.perPerson.map((p, i) => (
            <div key={i} className="bg-card border border-border rounded-md p-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">@{p.person}</span>
                <span className="text-muted-foreground">
                  {formatMinutes(p.minutes)} · {p.switchCount} switches
                </span>
              </div>
              <div className="flex gap-3 mt-1 text-xs">
                <span className="text-green-activity">
                  {formatMinutes(p.greenMinutes)}
                </span>
                <span className="text-yellow-activity">
                  {formatMinutes(p.yellowMinutes)}
                </span>
                <span className="text-red-activity">
                  {formatMinutes(p.redMinutes)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sprint goal progress */}
      {metrics.goalProgress && metrics.goalProgress.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">
            Sprint Goal Progress
          </p>
          {metrics.goalProgress.map((g, i) => {
            const pct =
              metrics.totalMinutes > 0
                ? (g.minutes / metrics.totalMinutes) * 100
                : 0;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-activity">{g.goal}</span>
                  <span className="text-muted-foreground">
                    {formatMinutes(g.minutes)} ({formatPct(pct)})
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-activity rounded-full"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Priority drift */}
      {(metrics.goalChangeCount !== undefined ||
        metrics.priorityChangeCount !== undefined) && (
        <div className="bg-card border border-border rounded-md p-3 space-y-1">
          <p className="text-xs text-muted-foreground font-semibold">
            Priority Drift
          </p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-medium">{metrics.goalChangeCount ?? 0}</span>
              <span className="text-muted-foreground ml-1">goal changes</span>
            </div>
            <div>
              <span className="font-medium">
                {metrics.priorityChangeCount ?? 0}
              </span>
              <span className="text-muted-foreground ml-1">
                priority changes
              </span>
            </div>
          </div>
        </div>
      )}

      {/* On-call summary */}
      {metrics.onCallMinutes !== undefined && metrics.onCallMinutes > 0 && (
        <div className="bg-card border border-yellow-activity/30 rounded-md p-3 space-y-1">
          <p className="text-xs text-yellow-activity font-semibold">
            On-Call Summary
          </p>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="font-medium">
                {formatMinutes(metrics.onCallMinutes)}
              </span>
              <span className="text-muted-foreground ml-1">on-call time</span>
            </div>
            <div>
              <span className="font-medium">
                {formatMinutes(metrics.onCallTicketMinutes ?? 0)}
              </span>
              <span className="text-muted-foreground ml-1">
                on-call tickets
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}