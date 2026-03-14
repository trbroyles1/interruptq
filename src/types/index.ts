export type Classification = "green" | "yellow" | "red" | "break";

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface DaySchedule {
  enabled: boolean;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
}

export type WorkingHours = Record<DayOfWeek, DaySchedule>;

export interface Preferences {
  id: number;
  workingHours: WorkingHours;
  onCallPrefix: string;
  quickPickRecentCount: number;
  quickPickOncallTicketCount: number;
  quickPickOncallOtherCount: number;
  weekStartDay: number; // 0=Sun, 1=Mon, ...
  timezone: string; // IANA timezone identifier, e.g. "America/New_York"
  handle?: string | null;
}

export interface Board {
  id: number;
  nameCanonical: string;
  nameDisplay: string;
  createdAt: string;
}

export interface BoardMembership {
  id: number;
  boardId: number;
  boardNameCanonical: string;
  boardNameDisplay: string;
  joinedAt: string;
}

export interface BoardSafeMetrics {
  greenPct: number;
  yellowPct: number;
  redPct: number;
  totalContextSwitches: number;
  meanTimeBetweenSwitches: number;
  meanFocusTime: number;
  meanGreenFocus: number;
  meanYellowFocus: number;
  meanRedFocus: number;
  longestBlock: number;
  longestGreenBlock: number;
  longestYellowBlock: number;
  longestRedBlock: number;
  goalChangeCount: number;
  priorityChangeCount: number;
}

export interface BoardParticipantMetrics {
  handle: string;
  identityId: number;
  metrics: BoardSafeMetrics | null;
}

export interface BoardAggregateField {
  mean: number;
  min: number;
  max: number;
}

export type BoardAggregates = Record<keyof BoardSafeMetrics, BoardAggregateField>;

export interface Sprint {
  id: number;
  ordinal: number;
  startDate: string;
  endDate: string | null;
}

export interface Activity {
  id: number;
  timestamp: string;
  text: string;
  tickets: string[];
  tags: string[];
  classification: Classification;
  sprintId: number | null;
  onCallAtTime: boolean;
}

export interface ActivityWithDuration extends Activity {
  durationMinutes: number;
}

export interface PriorityItem {
  type: "ticket" | "text";
  value: string;
}

export interface SprintGoalSnapshot {
  id: number;
  sprintId: number;
  timestamp: string;
  goals: string[];
}

export interface PrioritySnapshot {
  id: number;
  sprintId: number;
  timestamp: string;
  priorities: PriorityItem[];
}

