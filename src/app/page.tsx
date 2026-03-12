"use client";

import { useCallback, useState } from "react";
import { ActivityInput } from "@/components/activity/ActivityInput";
import { CurrentActivity } from "@/components/activity/CurrentActivity";
import { QuickPickGrid } from "@/components/activity/QuickPickGrid";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { SprintPanel } from "@/components/sprint/SprintPanel";
import { GoalsList } from "@/components/sprint/GoalsList";
import { PrioritiesList } from "@/components/sprint/PrioritiesList";
import { OnCallToggle } from "@/components/shared/OnCallToggle";
import { BreakButton } from "@/components/shared/BreakButton";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { useActivities } from "@/hooks/useActivities";
import { useAutoBreak } from "@/hooks/useAutoBreak";
import { useSprint } from "@/hooks/useSprint";
import { useOnCall } from "@/hooks/useOnCall";
import { usePreferences } from "@/hooks/usePreferences";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportingPanel } from "@/components/reporting/ReportingPanel";

export default function Home() {
  const today = new Date().toISOString().split("T")[0];
  const { activities, createActivity, startBreak, mutate: mutateActivities } = useActivities(today);
  const {
    sprint,
    goals,
    goalsSnapshotCount,
    priorities,
    prioritiesSnapshotCount,
    cutover,
    setGoals,
    setPriorities,
  } = useSprint();
  const { isOnCall, toggle: toggleOnCall } = useOnCall();
  const { preferences, updatePreferences } = usePreferences();
  const { status: saveStatus, wrap } = useSaveStatus();

  const [activeView, setActiveView] = useState<"timeline" | "report">("timeline");

  const handleSubmit = useCallback(
    async (text: string) => {
      await wrap(async () => {
        await createActivity(text);
      });
    },
    [wrap, createActivity]
  );

  const handleQuickPick = useCallback(
    async (text: string) => {
      await wrap(async () => {
        await createActivity(text);
      });
    },
    [wrap, createActivity]
  );

  // Current (last) activity
  const currentActivity =
    activities.length > 0 ? activities[activities.length - 1] : null;

  const isOnBreak = currentActivity?.classification === "break";

  // Auto-break at end of workday
  useAutoBreak(currentActivity, preferences, startBreak);

  // Past activities (all except last, reversed for display)
  const pastActivities = activities.length > 1
    ? [...activities.slice(0, -1)].reverse()
    : [];

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border flex flex-col bg-card">
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h1 className="text-lg font-bold">InterruptQ</h1>
          <PreferencesPanel
            preferences={preferences}
            onSave={async (updates) => {
              await wrap(async () => {
                await updatePreferences(updates);
              });
            }}
          />
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {/* On-Call Toggle */}
            <OnCallToggle
              isOnCall={isOnCall}
              onToggle={async () => {
                await wrap(async () => {
                  await toggleOnCall();
                  await mutateActivities();
                });
              }}
            />

            <BreakButton
              isOnBreak={isOnBreak}
              onBreak={async () => {
                await wrap(async () => {
                  await startBreak();
                });
              }}
            />

            <Separator />

            {/* Sprint Info */}
            <SprintPanel
              sprint={sprint}
              onCutover={async (date) => {
                await wrap(async () => {
                  await cutover(date);
                });
              }}
            />

            <Separator />

            {/* Sprint Goals */}
            <GoalsList
              goals={goals}
              snapshotCount={goalsSnapshotCount}
              onSave={async (newGoals) => {
                await wrap(async () => {
                  await setGoals(newGoals);
                });
              }}
            />

            <Separator />

            {/* Priorities */}
            <PrioritiesList
              priorities={priorities}
              snapshotCount={prioritiesSnapshotCount}
              sprintGoals={goals}
              onSave={async (newPriorities) => {
                await wrap(async () => {
                  await setPriorities(newPriorities);
                });
              }}
            />
          </div>
        </ScrollArea>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Activity Entry Area */}
        <div className="p-4 border-b border-border space-y-3">
          <ActivityInput onSubmit={handleSubmit} />

          {currentActivity && (
            <CurrentActivity
              text={currentActivity.text}
              classification={currentActivity.classification}
              startTime={currentActivity.timestamp}
            />
          )}
        </div>

        {/* Quick-Pick Grid */}
        <div className="p-4 border-b border-border">
          <QuickPickGrid
            isOnCall={isOnCall}
            onCallPrefix={preferences?.onCallPrefix ?? "CALL"}
            sprintGoals={goals}
            priorities={priorities}
            recentActivities={activities.filter((a: { classification: string }) => a.classification !== "break")}
            quickPickRecentCount={preferences?.quickPickRecentCount ?? 10}
            quickPickOncallTicketCount={
              preferences?.quickPickOncallTicketCount ?? 5
            }
            quickPickOncallOtherCount={
              preferences?.quickPickOncallOtherCount ?? 5
            }
            onPick={handleQuickPick}
          />
        </div>

        {/* Activity Timeline / Reports */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 px-4 pt-3 pb-2">
            <button
              onClick={() => setActiveView("timeline")}
              className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                activeView === "timeline"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setActiveView("report")}
              className={`text-sm font-medium px-3 py-1 rounded-md transition-colors ${
                activeView === "report"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reports
            </button>
          </div>

          <ScrollArea className="flex-1 px-4 pb-4">
            {activeView === "timeline" ? (
              <div className="space-y-1">
                {pastActivities.length === 0 && !currentActivity && (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No activities yet today. Start by typing what you&apos;re working on.
                  </p>
                )}
                {pastActivities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    text={activity.text}
                    classification={activity.classification}
                    timestamp={activity.timestamp}
                    durationMinutes={activity.durationMinutes}
                    tickets={activity.tickets}
                    tags={activity.tags}
                  />
                ))}
              </div>
            ) : (
              <ReportingPanel
                sprint={sprint}
                weekStartDay={preferences?.weekStartDay ?? 1}
              />
            )}
          </ScrollArea>
        </div>
      </main>

      {/* Save Indicator */}
      <SaveIndicator status={saveStatus} />
    </div>
  );
}
