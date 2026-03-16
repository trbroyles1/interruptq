"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Settings, LogOut, Navigation } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Preferences, DayOfWeek, WorkingHours } from "@/types";

interface PreferencesPanelProps {
  readonly preferences: Preferences | null;
  readonly onSave: (updates: Partial<Preferences>) => Promise<void>;
  readonly onReplayTour?: () => void;
}

const SECTION_LABEL_SCHEDULE = "Schedule";
const SECTION_LABEL_GENERAL = "General";

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const DAY_ORDER: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export function PreferencesPanel({ preferences, onSave, onReplayTour }: PreferencesPanelProps) {
  const [open, setOpen] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const { disconnect } = useAuth();

  if (!preferences) return null;

  const handleWorkingHoursChange = async (
    day: DayOfWeek,
    field: "enabled" | "start" | "end",
    value: boolean | string
  ) => {
    const wh: WorkingHours = { ...preferences.workingHours };
    wh[day] = { ...wh[day], [field]: value };
    await onSave({ workingHours: wh });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setConfirmDisconnect(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button
            id="preferences-button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            aria-label="Preferences"
          />
        }
      >
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferences</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
          {/* Left column: Schedule */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {SECTION_LABEL_SCHEDULE}
            </h3>
            {DAY_ORDER.map((day) => {
              const schedule = preferences.workingHours[day];
              return (
                <div key={day} className="flex items-center gap-2">
                  <Switch
                    checked={schedule.enabled}
                    onCheckedChange={(v) =>
                      handleWorkingHoursChange(day, "enabled", v)
                    }
                    aria-label={DAY_LABELS[day]}
                  />
                  <span className="text-sm w-20">{DAY_LABELS[day]}</span>
                  {schedule.enabled && (
                    <>
                      <Input
                        type="time"
                        value={schedule.start}
                        onChange={(e) =>
                          handleWorkingHoursChange(day, "start", e.target.value)
                        }
                        className="h-7 w-24 text-xs"
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <Input
                        type="time"
                        value={schedule.end}
                        onChange={(e) =>
                          handleWorkingHoursChange(day, "end", e.target.value)
                        }
                        className="h-7 w-24 text-xs"
                      />
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right column: General */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {SECTION_LABEL_GENERAL}
            </h3>

            {/* Handle */}
            <HandleField
              value={preferences.handle ?? ""}
              onSave={(value: string) => onSave({ handle: value || null })}
            />

            {/* On-Call Prefix */}
            <div className="space-y-2">
              <Label htmlFor="oncall-prefix" className="text-sm font-semibold">
                On-Call Ticket Prefix
              </Label>
              <Input
                id="oncall-prefix"
                value={preferences.onCallPrefix}
                onChange={(e) => onSave({ onCallPrefix: e.target.value })}
                className="h-8 text-sm"
              />
            </div>

            {/* Quick Pick Counts */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Quick-Pick Counts</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Recent (normal)</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={preferences.quickPickRecentCount}
                    onChange={(e) =>
                      onSave({ quickPickRecentCount: Number.parseInt(e.target.value) || 10 })
                    }
                    className="h-7 w-16 text-sm text-center"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">On-call tickets</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={preferences.quickPickOncallTicketCount}
                    onChange={(e) =>
                      onSave({
                        quickPickOncallTicketCount: Number.parseInt(e.target.value) || 5,
                      })
                    }
                    className="h-7 w-16 text-sm text-center"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Recent other (on-call)</span>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={preferences.quickPickOncallOtherCount}
                    onChange={(e) =>
                      onSave({
                        quickPickOncallOtherCount: Number.parseInt(e.target.value) || 5,
                      })
                    }
                    className="h-7 w-16 text-sm text-center"
                  />
                </div>
              </div>
            </div>

            {/* Week Start Day */}
            <div className="space-y-2">
              <Label htmlFor="week-start-day" className="text-sm font-semibold">
                Week Start Day
              </Label>
              <select
                id="week-start-day"
                value={preferences.weekStartDay}
                onChange={(e) =>
                  onSave({ weekStartDay: Number.parseInt(e.target.value) })
                }
                className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={6}>Saturday</option>
              </select>
            </div>

            {/* Timezone */}
            <TimezoneSelect
              value={preferences.timezone}
              onChange={(tz) => onSave({ timezone: tz })}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between sm:items-center">
          <Button
            variant="outline"
            onClick={() => {
              setOpen(false);
              onReplayTour?.();
            }}
          >
            <Navigation className="h-4 w-4 mr-2" />
            Replay onboarding tour
          </Button>

          {!confirmDisconnect ? (
            <Button
              variant="outline"
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={() => setConfirmDisconnect(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Are you sure? You will need your token to reconnect.
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await disconnect();
                }}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDisconnect(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const MAX_HANDLE_LENGTH = 32;

function HandleField({
  value,
  onSave,
}: {
  value: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  const handleBlur = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed !== value) {
      onSave(trimmed);
    }
  }, [draft, value, onSave]);

  return (
    <div className="space-y-2">
      <Label htmlFor="handle" className="text-sm font-semibold">
        Handle
      </Label>
      <p className="text-xs text-muted-foreground">
        Your display name on boards
      </p>
      <Input
        id="handle"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleBlur}
        maxLength={MAX_HANDLE_LENGTH}
        placeholder="Enter a handle..."
        className="h-8 text-sm"
      />
    </div>
  );
}

// Common timezones shown at the top of the list for quick access
const COMMON_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Vancouver",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];

function TimezoneSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (tz: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(false);

  const allTimezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return COMMON_TIMEZONES;
    }
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return COMMON_TIMEZONES;
    const lower = filter.toLowerCase();
    return allTimezones.filter((tz) => tz.toLowerCase().includes(lower));
  }, [filter, allTimezones]);

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Timezone</Label>
      {open ? (
        <>
          <Input
            type="text"
            placeholder="Search timezones..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onBlur={(e) => {
              // Don't close if clicking a timezone option
              if (e.relatedTarget?.closest("[data-tz-list]")) return;
              setOpen(false);
              setFilter("");
            }}
            autoFocus
            className="h-8 text-sm"
          />
          <div
            data-tz-list
            className="max-h-48 overflow-y-auto rounded-md border border-input bg-background"
          >
            {filtered.map((tz) => (
              <button
                key={tz}
                type="button"
                onClick={() => {
                  onChange(tz);
                  setFilter("");
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground ${
                  tz === value
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                }`}
              >
                {tz.replace(/_/g, " ")}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">No timezones found</p>
            )}
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-8 w-full rounded-md border border-input bg-background px-3 text-sm text-left text-foreground hover:bg-accent/50 transition-colors"
        >
          {value.replace(/_/g, " ")}
        </button>
      )}
    </div>
  );
}
