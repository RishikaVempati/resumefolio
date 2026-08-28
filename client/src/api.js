// One place that knows where the backend lives. In production this points at the
// deployed Render URL via VITE_API_BASE_URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request(path, options) {
  const response = await fetch(`${BASE_URL}/api${path}`, options);
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // The backend's error handler always sends { error, details }.
    throw new Error(body?.error ?? `${response.status} ${response.statusText}`);
  }
  return body;
}

export function getHealth() {
  return request("/health");
}
