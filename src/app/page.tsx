"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityInput } from "@/components/activity/ActivityInput";
import { CurrentActivity } from "@/components/activity/CurrentActivity";
import { QuickPickGrid } from "@/components/activity/QuickPickGrid";
import { ActivityCard } from "@/components/activity/ActivityCard";
import { SprintPanel } from "@/components/sprint/SprintPanel";
import { GoalsList } from "@/components/sprint/GoalsList";
import { PrioritiesList } from "@/components/sprint/PrioritiesList";
import { BoardsPanel } from "@/components/boards/BoardsPanel";
import { OnCallToggle } from "@/components/shared/OnCallToggle";
import { BreakButton } from "@/components/shared/BreakButton";
import { SaveIndicator } from "@/components/shared/SaveIndicator";
import { AppLogo } from "@/components/shared/AppLogo";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { WelcomeScreen } from "@/components/auth/WelcomeScreen";
import { useAuth } from "@/hooks/useAuth";
import { useActivities } from "@/hooks/useActivities";
import { useAutoBreak } from "@/hooks/useAutoBreak";
import { useSprint } from "@/hooks/useSprint";
import { useOnCall } from "@/hooks/useOnCall";
import { usePreferences } from "@/hooks/usePreferences";
import { useSaveStatus } from "@/hooks/useSaveStatus";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ReportingPanel } from "@/components/reporting/ReportingPanel";
import { ShareLinkManager } from "@/components/share/ShareLinkManager";
import { todayInTz } from "@/lib/timezone";
import { WelcomeDialog } from "@/components/onboarding";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";

export default function Home() {
  const { connected, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }

  if (!connected) {
    return <WelcomeScreen />;
  }

  return <AppView />;
}

function AppView() {
  const { preferences, updatePreferences } = usePreferences();

  // Derive timezone-aware "today" — fall back to browser TZ while prefs load
  const timezone = useMemo(
    () => preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    [preferences?.timezone]
  );
  const today = useMemo(() => todayInTz(timezone), [timezone]);

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
  const { status: saveStatus, wrap } = useSaveStatus();

  const [activeView, setActiveView] = useState<"timeline" | "report">("timeline");
  const [quickPickCollapsed, setQuickPickCollapsed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const { startTour } = useOnboardingTour({
    onComplete: () => {
      void updatePreferences({ tourCompleted: true });
    },
  });

  useEffect(() => {
    if (preferences && preferences.tourCompleted === false) {
      setShowWelcome(true);
    }
  }, [preferences]);

  const handleTakeTour = useCallback(() => {
    setShowWelcome(false);
    setQuickPickCollapsed(false);
    setTimeout(() => startTour(), 300);
  }, [startTour]);

  const handleSkipTour = useCallback(async () => {
    setShowWelcome(false);
    await updatePreferences({ tourCompleted: true });
  }, [updatePreferences]);

  const handleReplayTour = useCallback(() => {
    setQuickPickCollapsed(false);
    setTimeout(() => startTour(), 300);
  }, [startTour]);

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
          <AppLogo />
          <PreferencesPanel
            preferences={preferences}
            onSave={async (updates) => {
              await wrap(async () => {
                await updatePreferences(updates);
              });
            }}
            onReplayTour={handleReplayTour}
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
              timezone={timezone}
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

            <Separator />

            <BoardsPanel
              handle={preferences?.handle ?? null}
              wrap={wrap}
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
              timezone={timezone}
            />
          )}
        </div>

        {/* Quick-Pick Grid */}
        <div className="relative">
          {!quickPickCollapsed && (
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
          )}
          <div className="border-b border-border flex justify-center">
            <button
              onClick={() => setQuickPickCollapsed((c) => !c)}
              className="px-3 py-0.5 text-muted-foreground hover:text-foreground transition-colors text-xs"
              title={quickPickCollapsed ? "Show quick picks" : "Hide quick picks"}
            >
              {quickPickCollapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        {/* Activity Timeline / Reports */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div id="view-tabs" className="flex items-center gap-2 px-4 pt-3 pb-2">
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
            <div className="ml-auto">
              <ShareLinkManager />
            </div>
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
                    timezone={timezone}
                  />
                ))}
              </div>
            ) : (
              <ReportingPanel
                sprint={sprint}
                weekStartDay={preferences?.weekStartDay ?? 1}
                timezone={timezone}
              />
            )}
          </ScrollArea>
        </div>
      </main>

      {/* Save Indicator */}
      <SaveIndicator status={saveStatus} />

      {/* Onboarding Tour */}
      <WelcomeDialog
        open={showWelcome}
        onTakeTour={handleTakeTour}
        onSkip={handleSkipTour}
      />
    </div>
  );
}
