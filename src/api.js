// One place that knows where the backend lives. In production this points at the
// deployed Render URL via VITE_API_BASE_URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

async function request(path, options) {
  let response;

  try {
    response = await fetch(`${BASE_URL}/api${path}`, options);
  } catch {
    // fetch rejects with "Failed to fetch" for every network-level failure —
    // server down, DNS, CORS, offline. The browser deliberately does not say
    // which. That message means nothing to someone using the app, so say what
    // it actually implies and where to look.
    throw new Error(
      `Could not reach the server at ${BASE_URL}. ` +
        "Check that the API is running, or that it has finished waking up if it " +
        "has been idle, then try again."
    );
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    // The backend's error handler always sends { error, details }.
    const message = body?.error ?? `${response.status} ${response.statusText}`;
    throw new Error(body?.details ? `${message} ${body.details}` : message);
  }
  return body;
}

export function getHealth() {
  return request("/health");
}

export async function generateResume(formData) {
  const { generated } = await request("/generate-resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });
  return generated;
}
