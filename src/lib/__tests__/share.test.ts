import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/db/index", () => ({ db: {} }));
vi.mock("@/db/tables", () => ({ shareLinks: {} }));
vi.mock("@/db/helpers", () => ({ first: vi.fn() }));

import { generateShareId, resolveBaseUrl } from "../share";

describe("generateShareId", () => {
  it("is an alphanumeric string of sufficient length", () => {
    const id = generateShareId();
    expect(id.length).toBeGreaterThanOrEqual(16);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  it("produces unique values on consecutive calls", () => {
    const a = generateShareId();
    const b = generateShareId();
    expect(a).not.toBe(b);
  });
});

describe("resolveBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses INTERRUPTQ_BASE_URL env var and strips trailing slash", () => {
    vi.stubEnv("INTERRUPTQ_BASE_URL", "https://app.example.com/");
    const req = new Request("http://localhost/");
    expect(resolveBaseUrl(req)).toBe("https://app.example.com");
  });

  it("auto-detects from request headers when env var is not set", () => {
    vi.stubEnv("INTERRUPTQ_BASE_URL", "");
    const req = new Request("http://localhost/", {
      headers: {
        host: "myhost.com",
        "x-forwarded-proto": "https",
      },
    });
    expect(resolveBaseUrl(req)).toBe("https://myhost.com");
  });

  it("falls back to localhost:3099 with http when no env or host header", () => {
    vi.stubEnv("INTERRUPTQ_BASE_URL", "");
    const req = new Request("http://localhost:3099/");
    expect(resolveBaseUrl(req)).toBe("http://localhost:3099");
  });
});
