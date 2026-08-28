import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRetryable, retryDelayFromError, withRetry } from "./retry.js";

/** Records what was waited for, so tests assert on delays without spending them. */
function fakeClock() {
  const slept = [];
  let current = 0;
  return {
    slept,
    sleep: async (ms) => {
      slept.push(ms);
      current += ms;
    },
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
}

const failWith = (status) => Object.assign(new Error(`boom ${status}`), { status });

describe("isRetryable", () => {
  it("retries transient upstream failures", () => {
    for (const status of [429, 500, 502, 503, 504]) {
      assert.equal(isRetryable(failWith(status)), true, `${status} should retry`);
    }
  });

  it("does not retry failures that will fail again", () => {
    for (const status of [400, 401, 403, 404]) {
      assert.equal(isRetryable(failWith(status)), false, `${status} should not retry`);
    }
  });
});

describe("retryDelayFromError", () => {
  it("reads Google's RetryInfo hint", () => {
    const error = new Error(
      "You exceeded your current quota. Please retry in 40.502276381s."
    );
    assert.equal(retryDelayFromError(error), 40503);
  });

  it("returns null when there is no hint", () => {
    assert.equal(retryDelayFromError(new Error("nope")), null);
  });
});

describe("withRetry", () => {
  it("returns the result without waiting when the first attempt works", async () => {
    const clock = fakeClock();

    const result = await withRetry(async () => "ok", { ...clock });

    assert.equal(result, "ok");
    assert.deepEqual(clock.slept, []);
  });

  it("retries a 503 and returns the eventual success", async () => {
    const clock = fakeClock();
    let calls = 0;

    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw failWith(503);
        return "recovered";
      },
      { ...clock, baseDelayMs: 1000 }
    );

    assert.equal(result, "recovered");
    assert.equal(calls, 3);
    assert.equal(clock.slept.length, 2, "should have waited between attempts");
  });

  it("backs off exponentially with jitter inside the expected band", async () => {
    const clock = fakeClock();

    await assert.rejects(
      withRetry(async () => { throw failWith(503); }, { ...clock, baseDelayMs: 1000 })
    );

    const [first, second] = clock.slept;
    // Jitter is 50–100% of the exponential value: 500–1000, then 1000–2000.
    assert.ok(first >= 500 && first <= 1000, `first delay ${first}`);
    assert.ok(second >= 1000 && second <= 2000, `second delay ${second}`);
  });

  it("gives up immediately on an error that will not succeed later", async () => {
    const clock = fakeClock();
    let calls = 0;

    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw failWith(400);
        },
        { ...clock }
      ),
      /boom 400/
    );

    assert.equal(calls, 1, "a 400 must not be retried");
    assert.deepEqual(clock.slept, []);
  });

  it("does not wait when the upstream asks for longer than the budget", async () => {
    const clock = fakeClock();
    let calls = 0;

    // This is the real quota-exhausted case: Google says "retry in 40s" and our
    // budget is 45s. Waiting would leave the user on a spinner for no reason.
    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw Object.assign(
            new Error("Quota exceeded. Please retry in 40.5s."),
            { status: 429 }
          );
        },
        { ...clock, budgetMs: 30_000 }
      )
    );

    assert.equal(calls, 1);
    assert.deepEqual(clock.slept, [], "should not sleep past the budget");
  });

  it("stops retrying once the budget is spent by slow failures", async () => {
    const clock = fakeClock();
    let calls = 0;

    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          // Each attempt itself burns 30s, as a real 503 did.
          clock.advance(30_000);
          throw failWith(503);
        },
        { ...clock, attempts: 5, budgetMs: 45_000 }
      )
    );

    assert.equal(calls, 2, "the budget should stop this well before 5 attempts");
  });

  it("attaches the attempt count to the error it throws", async () => {
    const clock = fakeClock();

    await withRetry(async () => { throw failWith(503); }, { ...clock, attempts: 2 })
      .then(
        () => assert.fail("should have thrown"),
        (error) => assert.equal(error.attempts, 2)
      );
  });
});
