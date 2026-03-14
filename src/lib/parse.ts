/**
 * Parse activity entry text to extract ticket references and @-tagged people.
 */

// Match JIRA-style ticket refs like TIK-789, CALL-456 as whole tokens
const TICKET_REGEX = /\b([A-Z][A-Z0-9]+-\d+)\b/gi;

// Match @-tagged names like @Robert, @Jeryl
const TAG_REGEX = /@([A-Za-z][A-Za-z0-9_-]*)/g;

export interface ParsedEntry {
  tickets: string[];
  tags: string[];
}

export function parseEntry(text: string): ParsedEntry {
  const tickets: string[] = [];
  const tags: string[] = [];

  let match: RegExpExecArray | null;

  // Extract tickets (uppercase normalized)
  TICKET_REGEX.lastIndex = 0;
  while ((match = TICKET_REGEX.exec(text)) !== null) {
    const ticket = match[1].toUpperCase();
    if (!tickets.includes(ticket)) {
      tickets.push(ticket);
    }
  }

  // Extract @-tags
  TAG_REGEX.lastIndex = 0;
  while ((match = TAG_REGEX.exec(text)) !== null) {
    const tag = match[1];
    if (!tags.some((t) => t.toLowerCase() === tag.toLowerCase())) {
      tags.push(tag);
    }
  }

  return { tickets, tags };
}

/**
 * Check if entry text contains a specific ticket reference as a whole token.
 */
export function entryMatchesTicket(entryText: string, ticket: string): boolean {
  const regex = new RegExp(`\\b${escapeRegex(ticket)}\\b`, "i");
  return regex.test(entryText);
}

/**
 * Check if entry text is an exact match to a free-text priority string.
 */
export function entryMatchesFreeText(
  entryText: string,
  priority: string,
): boolean {
  return entryText.trim().toLowerCase() === priority.trim().toLowerCase();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
