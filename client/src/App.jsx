import { useEffect, useState } from "react";
import { getHealth } from "./api";

/**
 * Slice 0: the scaffold. This screen exists to prove the frontend can reach the
 * backend and that the backend has a key, before any feature is built on top.
 * The page state machine (home / form / preview / portfolio) lands in slice 1.
 */
export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getHealth().then(setHealth).catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>Auto Resume + Portfolio Builder</h1>
      <p>Scaffold running. Backend connectivity check:</p>

      {error && <p role="alert">Backend unreachable: {error}</p>}

      {health && (
        <dl>
          <dt>Status</dt>
          <dd>{health.status}</dd>
          <dt>Model</dt>
          <dd>{health.model ?? "not configured"}</dd>
          <dt>API key configured</dt>
          <dd>{String(health.apiKeyConfigured)}</dd>
        </dl>
      )}

      {!health && !error && <p>Checking…</p>}
    </main>
  );
}
