import "dotenv/config";
import cors from "cors";
import express from "express";

const PORT = process.env.PORT || 3001;

// Vite picks the next free port when one is taken, so the dev server can land
// anywhere in this range. CLIENT_ORIGIN carries the deployed Vercel URL.
const DEV_ORIGINS = [5173, 5174, 5175, 5176].map((p) => `http://localhost:${p}`);
const allowedOrigins = process.env.CLIENT_ORIGIN
  ? [...DEV_ORIGINS, process.env.CLIENT_ORIGIN]
  : DEV_ORIGINS;

const app = express();

app.use(cors({ origin: allowedOrigins }));
// Resume form data with several dynamic sections is still small, but this bounds
// what an oversized payload can do to the free-tier instance.
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    model: process.env.GEMINI_MODEL,
    // Report whether a key is configured, never the key itself.
    apiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  });
});

// Global error handler. Every failure leaves as structured JSON so the frontend
// never has to parse an HTML error page.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    details: err.details ?? null,
  });
});

app.listen(PORT, () => {
  console.log(`server listening on http://localhost:${PORT}`);
});
