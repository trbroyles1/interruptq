import { describe, it, expect, vi } from "vitest";

vi.mock("../identity", () => ({
  resolveIdentity: vi.fn(),
  updateLastSeen: vi.fn(),
}));

import { setCookieHeader, clearCookieHeader, isSecureRequest } from "../auth";

describe("setCookieHeader", () => {
  it("builds a non-secure cookie header", () => {
    const header = setCookieHeader("tok123", false);
    expect(header).toContain("iqt_token=tok123");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Max-Age=315360000");
    expect(header).not.toContain("Secure");
  });

  it("builds a secure cookie header", () => {
    const header = setCookieHeader("tok123", true);
    expect(header).toContain("iqt_token=tok123");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain("Max-Age=315360000");
    expect(header).toContain("Secure");
  });
});

describe("clearCookieHeader", () => {
  it("builds a header that clears the cookie", () => {
    const header = clearCookieHeader();
    expect(header).toContain("iqt_token=");
    expect(header).toContain("Max-Age=0");
  });
});

describe("isSecureRequest", () => {
  it("returns true when x-forwarded-proto is https", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-proto": "https" },
    });
    expect(isSecureRequest(req)).toBe(true);
  });

  it("returns false when x-forwarded-proto is http", () => {
    const req = new Request("http://localhost/", {
      headers: { "x-forwarded-proto": "http" },
    });
    expect(isSecureRequest(req)).toBe(false);
  });

  it("returns true when URL uses https and no forwarded header", () => {
    const req = new Request("https://example.com/");
    expect(isSecureRequest(req)).toBe(true);
  });

  it("returns false when URL uses http and no forwarded header", () => {
    const req = new Request("http://example.com/");
    expect(isSecureRequest(req)).toBe(false);
  });
});
