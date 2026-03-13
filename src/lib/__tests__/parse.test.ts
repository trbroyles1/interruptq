import { describe, it, expect } from "vitest";
import { parseEntry, entryMatchesTicket, entryMatchesFreeText } from "../parse";

describe("parseEntry", () => {
  it("extracts a single ticket and uppercases it", () => {
    const result = parseEntry("Fix proj-1 bug");
    expect(result.tickets).toEqual(["PROJ-1"]);
    expect(result.tags).toEqual([]);
  });

  it("extracts multiple tickets", () => {
    const result = parseEntry("Link PROJ-1 to CORE-42");
    expect(result.tickets).toEqual(["PROJ-1", "CORE-42"]);
  });

  it("deduplicates tickets regardless of case", () => {
    const result = parseEntry("proj-1 and PROJ-1 again");
    expect(result.tickets).toEqual(["PROJ-1"]);
  });

  it("extracts a single @tag", () => {
    const result = parseEntry("Paired with @Robert");
    expect(result.tags).toEqual(["Robert"]);
  });

  it("extracts multiple @tags", () => {
    const result = parseEntry("@Alice and @Bob reviewed");
    expect(result.tags).toEqual(["Alice", "Bob"]);
  });

  it("deduplicates tags case-insensitively, keeping first occurrence", () => {
    const result = parseEntry("@Alice and @alice");
    expect(result.tags).toEqual(["Alice"]);
  });

  it("extracts tickets and tags together", () => {
    const result = parseEntry("PROJ-1 reviewed by @Alice");
    expect(result.tickets).toEqual(["PROJ-1"]);
    expect(result.tags).toEqual(["Alice"]);
  });

  it("returns empty arrays when no matches", () => {
    const result = parseEntry("just a normal sentence");
    expect(result.tickets).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("returns empty arrays for empty string", () => {
    const result = parseEntry("");
    expect(result.tickets).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it("extracts tags with hyphens and underscores", () => {
    const result = parseEntry("@first-last and @under_score");
    expect(result.tags).toEqual(["first-last", "under_score"]);
  });
});

describe("entryMatchesTicket", () => {
  it("returns true when ticket is present", () => {
    expect(entryMatchesTicket("Working on PROJ-1 today", "PROJ-1")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(entryMatchesTicket("Working on proj-1 today", "PROJ-1")).toBe(true);
  });

  it("requires word boundary (not a substring)", () => {
    expect(entryMatchesTicket("XPROJ-1 is wrong", "PROJ-1")).toBe(false);
  });

  it("returns false when ticket is absent", () => {
    expect(entryMatchesTicket("nothing here", "PROJ-1")).toBe(false);
  });
});

describe("entryMatchesFreeText", () => {
  it("returns true for exact match", () => {
    expect(entryMatchesFreeText("Code review", "Code review")).toBe(true);
  });

  it("matches case-insensitively", () => {
    expect(entryMatchesFreeText("code review", "Code Review")).toBe(true);
  });

  it("trims whitespace before comparing", () => {
    expect(entryMatchesFreeText("  Code review  ", "Code review")).toBe(true);
  });

  it("returns false for partial/substring match", () => {
    expect(entryMatchesFreeText("Code review session", "Code review")).toBe(false);
  });
});
