/**
 * Bounded retry for the Gemini call.
 *
 * The free tier returns 503 "high demand" often enough that a single attempt is
 * not good enough for a live demo — three were seen in one afternoon of testing.
 * A 429 means the quota is exhausted and is worth one short wait at most.
 *
 * Everything is bounded by a wall-clock budget rather than an attempt count
 * alone, because a failing call can itself take 30s or more. Without the budget,
 * three attempts could leave someone staring at a spinner for two minutes.
 */

const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export const DEFAULT_OPTIONS = {
  attempts: 3,
  baseDelayMs: 1000,
  // The whole operation, including the failed attempts themselves. Past this we
  // stop trying and report the failure, however many attempts are left.
  budgetMs: 45_000,
};

/**
 * A 429 from the daily cap will still be a 429 in two seconds. Retrying it
 * wastes the user's time and, worse, spends more of the quota that is already
 * gone. A momentary 503 is the opposite: worth another go.
 */
export function isQuotaExhausted(error) {
  return /quota|RESOURCE_EXHAUSTED/i.test(error?.message ?? "");
}

export function isRetryable(error) {
  if (isQuotaExhausted(error)) return false;
  return RETRYABLE.has(error?.status ?? error?.code);
}

/**
 * Google sends a RetryInfo hint like "Please retry in 40.502276381s" when a
 * quota is exhausted. Honouring it avoids hammering an endpoint that has already
 * said when it will be free — and if the wait is longer than our budget, that is
 * a clear signal not to wait at all.
 */
export function retryDelayFromError(error) {
  const match = /retry in (\d+(?:\.\d+)?)s/i.exec(error?.message ?? "");
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

function backoffMs(attempt, baseDelayMs) {
  // Exponential, with jitter so simultaneous clients do not retry in lockstep.
  const exponential = baseDelayMs * 2 ** (attempt - 1);
  return Math.round(exponential * (0.5 + Math.random() * 0.5));
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Call `operation`, retrying transient failures. Returns its result, or throws
 * the last error with `attempts` attached so the caller can report honestly.
 *
 * `sleep` and `now` are injectable so tests run instantly and deterministically.
 */
export async function withRetry(operation, options = {}) {
  const { attempts, baseDelayMs, budgetMs, sleep = wait, now = Date.now } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const startedAt = now();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation(attempt);
    } catch (error) {
      lastError = error;

      if (!isRetryable(error) || attempt === attempts) break;

      const hinted = retryDelayFromError(error);
      const delay = hinted ?? backoffMs(attempt, baseDelayMs);
      const elapsed = now() - startedAt;

      // Only wait if the wait plus a plausible next attempt still fits.
      if (elapsed + delay >= budgetMs) break;

      await sleep(delay);
    }
  }

  lastError.attempts = attempts;
  throw lastError;
}
