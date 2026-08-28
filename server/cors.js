/**
 * Which origins may call this API.
 *
 * The spec names localhost 5173–5176, which is Vite's range when the default
 * port is taken. `CLIENT_ORIGIN` adds the deployed Vercel URL in production.
 *
 * Kept out of index.js so it can be tested: getting this wrong either breaks
 * the deployed frontend or opens the API to any site on the internet, and
 * neither is visible from reading the config.
 */

const DEV_ORIGINS = [5173, 5174, 5175, 5176].map((port) => `http://localhost:${port}`);

export function allowedOrigins(env = process.env) {
  const configured = env.CLIENT_ORIGIN?.trim();
  // Support a comma-separated list, so a preview deployment can be added
  // without a code change.
  const extra = configured
    ? configured.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [];

  return [...DEV_ORIGINS, ...extra];
}
