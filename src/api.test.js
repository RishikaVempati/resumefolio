import { afterEach, describe, expect, it, vi } from "vitest";
import { generateResume, getHealth } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("when the server cannot be reached", () => {
  it("explains what happened instead of saying 'Failed to fetch'", async () => {
    // This is what the browser throws for a down server, DNS failure, CORS
    // rejection or being offline — it never says which.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(getHealth()).rejects.toThrow(/could not reach the server/i);
    await expect(getHealth()).rejects.toThrow(/try again/i);
  });

  it("names the address it tried, so a wrong base URL is visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(generateResume({})).rejects.toThrow(/localhost:3001/);
  });
});

describe("when the server answers with an error", () => {
  it("uses the backend's message and its retry advice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        json: async () => ({
          error: "Gemini is rate limited or busy right now.",
          details: "Wait a few seconds and generate again.",
        }),
      })
    );

    await expect(generateResume({})).rejects.toThrow(
      "Gemini is rate limited or busy right now. Wait a few seconds and generate again."
    );
  });

  it("falls back to the status when the body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: "Bad Gateway",
        json: async () => {
          throw new Error("not json");
        },
      })
    );

    await expect(generateResume({})).rejects.toThrow("502 Bad Gateway");
  });
});

describe("on success", () => {
  it("returns the generated object", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ generated: { summary: "Written." } }),
      })
    );

    await expect(generateResume({})).resolves.toEqual({ summary: "Written." });
  });
});
