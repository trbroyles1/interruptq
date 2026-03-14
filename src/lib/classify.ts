import type { Classification, PriorityItem } from "@/types";
import { entryMatchesTicket, entryMatchesFreeText } from "./parse";

interface ClassifyInput {
  entryText: string;
  entryTickets: string[];
  isOnCall: boolean;
  onCallPrefix: string;
  sprintGoals: string[]; // ticket numbers
  priorities: PriorityItem[];
}

/**
 * Classify an activity entry as green, yellow, or red.
 *
 * When NOT on-call:
 *   - Matches a sprint goal → green
 *   - Matches a priority (not a sprint goal) → yellow
 *   - Neither → red
 *
 * When on-call:
 *   - Matches an on-call ticket (prefix match) → green
 *   - Matches a sprint goal or priority → yellow
 *   - Neither → red
 */
export function classify(input: ClassifyInput): Classification {
  const { entryText, entryTickets, isOnCall, onCallPrefix, sprintGoals, priorities } = input;

  const matchesSprintGoal = sprintGoals.some(
    (goal) => entryMatchesTicket(entryText, goal)
  );

  const matchesPriority = priorities.some((p) => {
    if (p.type === "ticket") {
      return entryMatchesTicket(entryText, p.value);
    }
    return entryMatchesFreeText(entryText, p.value);
  });

  const matchesOnCallTicket = entryTickets.some((ticket) =>
    ticket.toUpperCase().startsWith(`${onCallPrefix.toUpperCase()  }-`)
  );

  if (isOnCall) {
    if (matchesOnCallTicket) return "green";
    if (matchesSprintGoal || matchesPriority) return "yellow";
    return "red";
  } else {
    if (matchesSprintGoal) return "green";
    if (matchesPriority) return "yellow";
    return "red";
  }
}
