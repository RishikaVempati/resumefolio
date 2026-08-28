import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowedOrigins } from "./cors.js";

describe("allowedOrigins", () => {
  it("allows the Vite dev range the spec names", () => {
    const origins = allowedOrigins({});

    for (const port of [5173, 5174, 5175, 5176]) {
      assert.ok(origins.includes(`http://localhost:${port}`), `missing ${port}`);
    }
  });

  it("adds the deployed frontend when CLIENT_ORIGIN is set", () => {
    const origins = allowedOrigins({ CLIENT_ORIGIN: "https://resumefolio.vercel.app" });

    assert.ok(origins.includes("https://resumefolio.vercel.app"));
  });

  it("accepts a comma-separated list, so a preview URL needs no code change", () => {
    const origins = allowedOrigins({
      CLIENT_ORIGIN: "https://a.vercel.app, https://b.vercel.app",
    });

    assert.ok(origins.includes("https://a.vercel.app"));
    assert.ok(origins.includes("https://b.vercel.app"));
  });

  it("never allows an origin that was not configured", () => {
    const origins = allowedOrigins({ CLIENT_ORIGIN: "https://resumefolio.vercel.app" });

    assert.ok(!origins.includes("https://evil.example"));
  });

  it("ignores a blank CLIENT_ORIGIN rather than allowing an empty origin", () => {
    // An unset variable arrives as "" on some platforms; allowing it would be
    // an origin that matches nothing useful and looks like a bug later.
    assert.deepEqual(allowedOrigins({ CLIENT_ORIGIN: "   " }), allowedOrigins({}));
  });
});
