# resumefolio

> Capstone: **Auto Resume + Portfolio Builder** (Vibe coding with Antigravity).

Sign up, fill in a structured form about yourself, and Google Gemini generates polished
resume content from it. Preview it as a resume or as a portfolio, in a template you pick.

```
sign up → structured form → Gemini generates content → resume preview / portfolio preview
```

## Status

Built in deployable slices. Current: **slice 6 — hardening and deployment**.

| # | Slice | State |
|---|---|---|
| 0 | Vite React client + Express server, `/api/health` | ✅ |
| 1 | `EMPTY_FORM` + page state machine (home/form/preview/portfolio) | ✅ |
| 2 | `ResumeForm` — six sections, dynamic arrays | ✅ |
| 3 | `/api/generate-resume` + Gemini generation, with retry | ✅ |
| 4 | `AuthModal`, LocalStorage sessions, `pendingPage` gating | ✅ |
| 5 | Multiple templates + portfolio preview | ✅ |
| 6 | Error handling, tests, deployment | ◐ config ready, deploy pending |

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

**You need:** Node 20 or newer (`node --version`), and a free Google Gemini API key —
see [Getting a Gemini API key](#getting-a-gemini-api-key) below.

First, get the code. Skip this if you already have it:

```bash
git clone https://github.com/RishikaVempati/resumefolio.git
cd resumefolio
```

Everything below runs from that folder — **the repo root**. If you cloned into a
differently named directory, or already had the project, use your own path.

### One command

```bash
npm run setup               # installs both halves
cp server/.env.example server/.env
#   → paste your Gemini key into GEMINI_API_KEY

npm start                   # runs the API and the web app together
```

Then open **http://localhost:5173**.

`npm start` runs both processes in one terminal, prefixing each line with `[api]` or
`[web]` so you can tell them apart:

```
[api] 🚀  AI Resume Builder API (Gemini)
[api]     Server : http://localhost:3001
[api]     Model  : gemini-3.5-flash-lite
[api]     API Key: ✅ Configured
[web]   ➜  Local:   http://localhost:5173/
```

`API Key: ❌ Missing` means the key did not reach `server/.env`. The app still runs and
every page is clickable — only generating returns an error instead of a resume.

**Why two processes at all?** The web app is a static site; the API is a Node server that
holds the Gemini key. The key must never reach the browser, so it lives in a process the
browser cannot see. Deployed, these are two hosts — the frontend on Vercel, the backend on
Render — and a visitor just opens one URL. Locally you are running both yourself.

### Or two terminals, if you prefer

```bash
cd server && npm install && npm run dev     # terminal 1 → :3001
npm install && npm run dev                  # terminal 2 → :5173, from the repo root
```

### Check the two halves are talking

```bash
curl -s http://localhost:3001/api/health
# {"status":"ok","model":"gemini-3.5-flash-lite","apiKeyConfigured":true}
```

### Try it

Open http://localhost:5173 in a **private window** to see what a first-time visitor sees.
Accounts live in your own browser, so a normal window will remember you.

1. Click **Generate my resume** — you are not signed in, so the sign-up modal opens
2. Create an account with any email and a password of at least 6 characters
   (it is stored in your own browser; see the limitations below)
3. Fill in the six steps. Only Name, Email and Phone are required — the rest are optional,
   but the more you give it the less the AI has to work with
4. **Generate Resume**. It takes a few seconds
5. Switch between **Modern** and **Classic**, then open **View portfolio** — both come from
   the same single AI call, so neither costs another wait

## Running the tests

```bash
npm test                    # frontend, 56 tests, Vitest
npm --prefix server test    # backend, 36 tests, node --test
npm run build               # production build
```

Neither suite needs an API key or a network connection: the frontend mocks the API module,
and the backend injects a fake Gemini client. That is deliberate — tests that need a live
key would fail on a rate limit rather than on a bug.

## Getting a Gemini API key

1. Go to https://aistudio.google.com/apikey and sign in
2. **Create API key**, pick or create a Google Cloud project
3. Copy it into `server/.env` as `GEMINI_API_KEY`

Free tier, no card needed. Never paste a key into `.env.example` — that file is tracked
and goes to GitHub.

## Deploying

Frontend on **Vercel**, backend on **Render**, as the spec's Deployment Architecture
story describes. Both read from this one repository.

### 1. Backend — Render

1. New → Web Service → connect this repo
2. **Root Directory:** `server`
3. Build command `npm ci`, start command `npm start` (both already in `render.yaml`)
4. Environment variables:

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | your key from [AI Studio](https://aistudio.google.com/apikey) |
   | `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
   | `CLIENT_ORIGIN` | the Vercel URL from step 2 — set this *after* the frontend exists |

   Do **not** set `PORT`. Render injects its own and probes that port; overriding it
   makes the app listen somewhere the platform is not looking. The code already reads
   `process.env.PORT`.

5. Confirm the deploy:

   ```bash
   curl -s https://<your-service>.onrender.com/api/health
   # {"status":"ok","model":"gemini-3.5-flash-lite","apiKeyConfigured":true}
   ```

   `apiKeyConfigured: false` means the key is missing from the Render environment.

### 2. Frontend — Vercel

1. New Project → import this repo, root directory left at the repository root
2. Framework preset **Vite**; build `npm run build`, output `dist` (already in `vercel.json`)
3. Environment variable:

   | Key | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-service>.onrender.com` |

4. Deploy, then go back to Render and set `CLIENT_ORIGIN` to the Vercel URL. Without
   it the browser blocks every API call as a CORS error — the request never reaches
   the backend, so the Render logs will look completely clean while the app is broken.

### 3. Check it end to end

Open the Vercel URL, sign up, fill the form, generate. If generation fails, the
message says whether retrying will help.

## Before recording the demo

- **Warm the backend.** Render's free tier spins down after ~15 minutes idle and takes
  30–50s to wake. Hit `/api/health` first, or the first click of the demo is a long
  wait on a blank screen.
- **Mind the quota.** The Gemini free tier allows **20 requests per day, per model**.
  A few rehearsals plus the recording can exhaust it. If it runs out, switching
  `GEMINI_MODEL` gives a fresh allowance, because the quota is per model.
- Sign out first, so the demo shows the auth modal.

## Known deviations from the spec

- **Model.** The spec names `gemini-1.5-flash`. It returns
  `404 models/gemini-1.5-flash is not found for API version v1beta` on a current key, so
  this project uses **`gemini-3.5-flash-lite`**, verified with a real call (`gemini-3.6-flash` also works but was ~5x slower). The model is
  configured through `GEMINI_MODEL`, not hardcoded, so changing it is a one-line edit.
- Thinking will be set to `LOW` for generation. Measured on this key: default thinking
  spent 314 thinking tokens and returned 503 after 34.9s under load, versus 1.0s and 50
  tokens on `LOW`.

## Known limitations

- **Signing out clears your answers.** Accounts and form data live in the browser, so
  signing out wipes the form and the generated resume — otherwise the next person to use
  that browser would start with your details in the fields. There is no "save my draft".
- **LocalStorage "auth" is not real authentication.** Accounts live in the visitor's own
  browser under the `registered_users` key, passwords included, in plain text. Anyone can
  open DevTools, read every account and sign in as any of them. There is no server, no
  session and no hashing. The spec asks for exactly this ("LocalStorage-based session
  management") and for a capstone it is the right scope — but it is a demonstration of a
  sign-in flow, not a security boundary, and must not be reused for real users.
- **No persistence.** Generated content lives in React state. A refresh loses it.
- **Render free tier cold starts** — the backend sleeps after ~15 min idle and takes
  30–50s to wake. Warm it before recording the demo.


