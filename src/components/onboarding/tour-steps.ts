import type { DriveStep } from "driver.js";

// Tour target element IDs
export const TOUR_ID_ACTIVITY_INPUT = "activity-input";
export const TOUR_ID_SPRINT_GOALS = "sprint-goals";
export const TOUR_ID_PRIORITIES = "priorities-panel";
export const TOUR_ID_SPRINT_PANEL = "sprint-panel";
export const TOUR_ID_QUICK_PICK = "quick-pick-grid";
export const TOUR_ID_ON_CALL = "on-call-toggle";
export const TOUR_ID_BREAK = "break-button";
export const TOUR_ID_VIEW_TABS = "view-tabs";
export const TOUR_ID_SHARE = "share-button";
export const TOUR_ID_PREFERENCES = "preferences-button";
export const TOUR_ID_BOARDS = "boards-panel";

export const TOUR_STEPS: DriveStep[] = [
  {
    element: `#${TOUR_ID_ACTIVITY_INPUT}`,
    popover: {
      title: "Log Your Work",
      description:
        "Type what you're working on. Reference JIRA tickets like TIK-123 and mention people with @Name — both feed into your metrics.",
      side: "bottom",
      align: "center",
    },
  },
  {
    element: `#${TOUR_ID_QUICK_PICK}`,
    popover: {
      title: "Quick Picks",
      description:
        "One-click cards for your goals, priorities, and recent activities. The grid adapts when you're on-call.",
      side: "top",
      align: "center",
    },
  },
  {
    element: `#${TOUR_ID_SPRINT_PANEL}`,
    popover: {
      title: "Sprint Tracking",
      description:
        "Your current sprint and how many days in. When a sprint ends, use Cutover to close it and start fresh.",
      side: "right",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_SPRINT_GOALS}`,
    popover: {
      title: "Sprint Goals",
      description:
        "Add your sprint's JIRA tickets here. Any work matching a goal is classified as on-target.",
      side: "right",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_PRIORITIES}`,
    popover: {
      title: "Priorities",
      description:
        "Your current focus list. It starts matching your goals, but you can adjust it as reality shifts. Work matching a priority (but not a goal) is re-prioritized. Everything else is interrupted.",
      side: "right",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_ON_CALL}`,
    popover: {
      title: "On-Call Mode",
      description:
        "Toggle this when you're on-call. On-call tickets become your on-target work, and sprint goals shift to secondary.",
      side: "right",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_BREAK}`,
    popover: {
      title: "Breaks",
      description:
        "Step away without skewing your data. Break time is excluded from all metrics and percentages.",
      side: "right",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_VIEW_TABS}`,
    popover: {
      title: "Timeline & Reports",
      description:
        "Your activity timeline shows today's work. Switch to Reports for deeper analysis — focus time, context switches, person impact, and more across any date range.",
      side: "bottom",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_SHARE}`,
    popover: {
      title: "Share Reports",
      description:
        "Generate a temporary link to share your reports with anyone. Links expire after 24 hours — no login required for viewers.",
      side: "bottom",
      align: "end",
    },
  },
  {
    element: `#${TOUR_ID_PREFERENCES}`,
    popover: {
      title: "Preferences",
      description:
        "Set your working hours, timezone, and other settings. These directly shape how your metrics are calculated.",
      side: "left",
      align: "start",
    },
  },
  {
    element: `#${TOUR_ID_BOARDS}`,
    popover: {
      title: "Boards",
      description:
        "Join a board to compare your metrics with teammates. Only percentages are shared — never your actual hours.",
      side: "right",
      align: "start",
    },
  },
];
