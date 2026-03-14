import { describe, it, expect, vi } from "vitest";

vi.mock("@/db/index", () => ({ db: {} }));
vi.mock("@/db/tables", () => ({ identities: {} }));
vi.mock("@/db/helpers", () => ({ first: vi.fn(), run: vi.fn() }));

import { generateToken, hashToken } from "../identity";

describe("generateToken", () => {
  it("starts with the iqt- prefix", () => {
    expect(generateToken()).toMatch(/^iqt-/);
  });

  it("has a random alphanumeric suffix after the prefix", () => {
    const token = generateToken();
    const randomPart = token.slice("iqt-".length);
    expect(randomPart.length).toBeGreaterThanOrEqual(16);
    expect(randomPart).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("produces unique values on consecutive calls", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });
});

describe("hashToken", () => {
  it("returns a 64-character hex string", () => {
    const hash = hashToken("anything");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(hashToken("test")).toBe(hashToken("test"));
  });

  it("must remain SHA-256 for compatibility with stored hashes", () => {
    expect(hashToken("test")).toBe(
      "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
    );
  });
});
