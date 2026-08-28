# resumefolio

> Capstone: **Auto Resume + Portfolio Builder** (Vibe coding with Antigravity).

Sign up, fill in a structured form about yourself, and Google Gemini generates polished
resume content from it. Preview it as a resume or as a portfolio, in a template you pick.

```
sign up → structured form → Gemini generates content → resume preview / portfolio preview
```

## Status

Built in deployable slices. Current: **slice 5 — templates and portfolio**.

| # | Slice | State |
|---|---|---|
| 0 | Vite React client + Express server, `/api/health` | ✅ |
| 1 | `EMPTY_FORM` + page state machine (home/form/preview/portfolio) | ✅ |
| 2 | `ResumeForm` — six sections, dynamic arrays | ✅ |
| 3 | `/api/generate-resume` + Gemini generation, with retry | ✅ |
| 4 | `AuthModal`, LocalStorage sessions, `pendingPage` gating | ✅ |
| 5 | Multiple templates + portfolio preview | ☐ |
| 6 | Error handling, tests, deployment | ☐ |

## Stack

| Layer | Choice |
|---|---|
| Frontend | React on Vite (repo root) |
| Backend | Node + Express (`server/`), routes under `/api` |
| AI | Google Gemini, called only from the backend |
| Config | dotenv |
| Sessions | LocalStorage — no database |
| Deploy | Frontend on Vercel, backend on Render |

## Run locally

Two terminals. Backend first:

```bash
cd server
cp .env.example .env        # then paste your Gemini key into it
npm install
npm run dev                 # http://localhost:3001
```

Frontend, from the repo root:

```bash
npm install
npm run dev                 # http://localhost:5173
```

Verify the two are talking:

```bash
curl -s http://localhost:3001/api/health
# {"status":"ok","model":"gemini-3.5-flash-lite","apiKeyConfigured":true}
```

`apiKeyConfigured: false` means `server/.env` has no `GEMINI_API_KEY`.

## Getting a Gemini API key

1. Go to https://aistudio.google.com/apikey and sign in
2. **Create API key**, pick or create a Google Cloud project
3. Copy it into `server/.env` as `GEMINI_API_KEY`

Free tier, no card needed. Never paste a key into `.env.example` — that file is tracked
and goes to GitHub.

## Known deviations from the spec

- **Model.** The spec names `gemini-1.5-flash`. It returns
  `404 models/gemini-1.5-flash is not found for API version v1beta` on a current key, so
  this project uses **`gemini-3.5-flash-lite`**, verified with a real call (`gemini-3.6-flash` also works but was ~5x slower). The model is
  configured through `GEMINI_MODEL`, not hardcoded, so changing it is a one-line edit.
- Thinking will be set to `LOW` for generation. Measured on this key: default thinking
  spent 314 thinking tokens and returned 503 after 34.9s under load, versus 1.0s and 50
  tokens on `LOW`.

## Known limitations

- **LocalStorage "auth" is not real authentication.** Accounts live in the visitor's own
  browser under the `registered_users` key, passwords included, in plain text. Anyone can
  open DevTools, read every account and sign in as any of them. There is no server, no
  session and no hashing. The spec asks for exactly this ("LocalStorage-based session
  management") and for a capstone it is the right scope — but it is a demonstration of a
  sign-in flow, not a security boundary, and must not be reused for real users.
- **No persistence.** Generated content lives in React state. A refresh loses it.
- **Render free tier cold starts** — the backend sleeps after ~15 min idle and takes
  30–50s to wake. Warm it before recording the demo.

## History

An earlier version of this repo implemented a different product — upload a PDF resume and
extract its fields — built against a project brief that did not match the graded spec. It
is preserved under the `pdf-approach-archived` tag.
