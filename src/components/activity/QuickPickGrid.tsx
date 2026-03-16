"use client";

import { cn } from "@/lib/utils";
import type { PriorityItem, ActivityWithDuration } from "@/types";

interface QuickPickGridProps {
  isOnCall: boolean;
  onCallPrefix: string;
  sprintGoals: string[];
  priorities: PriorityItem[];
  recentActivities: ActivityWithDuration[];
  quickPickRecentCount: number;
  quickPickOncallTicketCount: number;
  quickPickOncallOtherCount: number;
  onPick: (text: string) => void;
}

export function QuickPickGrid({
  isOnCall,
  onCallPrefix,
  sprintGoals,
  priorities,
  recentActivities,
  quickPickRecentCount,
  quickPickOncallTicketCount,
  quickPickOncallOtherCount,
  onPick,
}: QuickPickGridProps) {
  // Deduplicate recent activities by text
  const seen = new Set<string>();
  const uniqueRecent = recentActivities.filter((a) => {
    const key = a.text.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Priority items that aren't already in sprint goals
  const extraPriorities = priorities.filter(
    (p) =>
      p.type === "text" ||
      !sprintGoals.some(
        (g) => g.toLowerCase() === p.value.toLowerCase()
      )
  );

  if (isOnCall) {
    // On-call layout
    const onCallTickets = uniqueRecent
      .filter((a) =>
        a.tickets.some((t: string) =>
          t.toUpperCase().startsWith(`${onCallPrefix.toUpperCase()  }-`)
        )
      )
      .slice(0, quickPickOncallTicketCount);

    const otherRecent = uniqueRecent
      .filter(
        (a) =>
          !a.tickets.some((t: string) =>
            t.toUpperCase().startsWith(`${onCallPrefix.toUpperCase()  }-`)
          ) &&
          !sprintGoals.some((g) =>
            a.text.toUpperCase().includes(g.toUpperCase())
          ) &&
          !priorities.some((p) =>
            p.type === "ticket"
              ? a.text.toUpperCase().includes(p.value.toUpperCase())
              : a.text.toLowerCase() === p.value.toLowerCase()
          )
      )
      .slice(0, quickPickOncallOtherCount);

    return (
      <div id="quick-pick-grid" className="space-y-4">
        {onCallTickets.length > 0 && (
          <Section title="Recent On-Call Tickets">
            {onCallTickets.map((a) => (
              <PickCard
                key={a.id}
                text={a.text}
                variant="oncall"
                onClick={() => onPick(a.text)}
              />
            ))}
          </Section>
        )}
        {sprintGoals.length > 0 && (
          <Section title="Sprint Goals">
            {sprintGoals.map((goal) => (
              <PickCard
                key={goal}
                text={goal}
                variant="goal"
                onClick={() => onPick(goal)}
              />
            ))}
          </Section>
        )}
        {extraPriorities.length > 0 && (
          <Section title="Priorities">
            {extraPriorities.map((p, i) => (
              <PickCard
                key={`${p.value}-${i}`}
                text={p.value}
                variant="priority"
                onClick={() => onPick(p.value)}
              />
            ))}
          </Section>
        )}
        {otherRecent.length > 0 && (
          <Section title="Recent Other">
            {otherRecent.map((a) => (
              <PickCard
                key={a.id}
                text={a.text}
                variant="recent"
                onClick={() => onPick(a.text)}
              />
            ))}
          </Section>
        )}
      </div>
    );
  }

  // Normal (not on-call) layout
  const recentOther = uniqueRecent
    .filter(
      (a) =>
        !sprintGoals.some((g) =>
          a.text.toUpperCase().includes(g.toUpperCase())
        ) &&
        !priorities.some((p) =>
          p.type === "ticket"
            ? a.text.toUpperCase().includes(p.value.toUpperCase())
            : a.text.toLowerCase() === p.value.toLowerCase()
        )
    )
    .slice(0, quickPickRecentCount);

  return (
    <div id="quick-pick-grid" className="space-y-4">
      {sprintGoals.length > 0 && (
        <Section title="Sprint Goals">
          {sprintGoals.map((goal) => (
            <PickCard
              key={goal}
              text={goal}
              variant="goal"
              onClick={() => onPick(goal)}
            />
          ))}
        </Section>
      )}
      {extraPriorities.length > 0 && (
        <Section title="Priorities">
          {extraPriorities.map((p, i) => (
            <PickCard
              key={`${p.value}-${i}`}
              text={p.value}
              variant="priority"
              onClick={() => onPick(p.value)}
            />
          ))}
        </Section>
      )}
      {recentOther.length > 0 && (
        <Section title="Recent Other">
          {recentOther.map((a) => (
            <PickCard
              key={a.id}
              text={a.text}
              variant="recent"
              onClick={() => onPick(a.text)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2">
        {title}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {children}
      </div>
    </div>
  );
}

function PickCard({
  text,
  variant,
  onClick,
}: {
  text: string;
  variant: "goal" | "priority" | "recent" | "oncall";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium text-left truncate transition-colors border",
        variant === "goal" &&
          "bg-green-activity/10 border-green-activity/30 hover:bg-green-activity/20 text-green-activity",
        variant === "priority" &&
          "bg-yellow-activity/10 border-yellow-activity/30 hover:bg-yellow-activity/20 text-yellow-activity",
        variant === "oncall" &&
          "bg-yellow-activity/10 border-yellow-activity/30 hover:bg-yellow-activity/20 text-yellow-activity",
        variant === "recent" &&
          "bg-card border-border hover:bg-accent text-foreground"
      )}
    >
      {text}
    </button>
  );
}
