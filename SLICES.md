# Build log

One entry per slice: what was built, how it was tested, and the actual result —
pasted output, not a summary. Every slice ends with a running system.

Repo: **https://github.com/RishikaVempati/resumefolio**
Spec: the SkillWallet project page (29 stories, all read before slice 0 began).

---

## Slice −1 — The rebuild, and why

Before slice 0 there were three slices of a **different application**: upload a PDF
resume, extract its text with `pdfplumber`, parse it with Gemini. Python, FastAPI,
Jinja2, server-rendered.

It was built from a project `CLAUDE.md` that nobody had checked against the graded
spec. When the spec was finally read, the mismatch was total:

| Spec | What had been built |
|---|---|
| User fills a structured form | User uploads a PDF |
| AI *generates* content | AI *extracts* fields from existing text |
| React.js, `App.jsx` state machine | Python Jinja templates |
| Node.js + Express | Python FastAPI |
| Auth modal + LocalStorage sessions | None — documented as "out of scope" |
| Multiple selectable templates | One — documented as "out of scope" |
| Resume preview **and** portfolio preview | Neither |

The spec's Problem Definition is unambiguous:

> "There is a need for an intelligent system that guides users through **a structured
> form** and generates polished resume content using AI."

There is no PDF upload anywhere in the spec. Worse, the old `CLAUDE.md` listed auth,
multiple templates, and JS frameworks as *forbidden* — actively steering away from
three mandatory requirements.

**Outcome:** the old work is preserved under the `pdf-approach-archived` tag (commit
`752bd7c`) and removed from `main`'s future. `.claude/CLAUDE.md` was rewritten from the
spec and now names the spec URL as the authority over itself.

**The lesson, recorded because it cost three slices:** a project instructions file is
somebody's summary of the requirements. It can be wrong. Read the source before writing
code against it.

---

## Slice 0 — React + Express scaffold

**Done means:** both dev servers run, and `/api/health` reports the model and key status.

### What was built

| File | Purpose |
|---|---|
| `server/index.js` | Express entry point: CORS, JSON cap, `/api/health`, global error handler |
| `server/.env.example` | Documents `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`, `CLIENT_ORIGIN` |
| `client/src/api.js` | The only module that knows where the backend lives |
| `client/src/App.jsx` | Temporary connectivity check. The page state machine is slice 1 |
| `client/.env.example` | Documents `VITE_API_BASE_URL` |
| `README.md` | Rewritten for the real product |
| `.gitignore` | Node; `.env` blocked, `.env.example` allowed |

Everything here is dictated by the spec rather than chosen:

| Decision | Spec source |
|---|---|
| `index.js` as the Express entry point | "implements the Express server in `index.js`" |
| CORS for `localhost:5173`–`5176` | "Configure CORS to allow requests from localhost ports 5173 to 5176" |
| 10MB JSON limit | "Parse incoming JSON payloads up to 10MB" |
| `/api/health` with model + key status | "Expose a `/api/health` endpoint returning model name and API key status" |
| Global error handler with `{ error, details }` | "returns structured JSON responses with error and details fields" |
| Frontend API base URL as an env var | "Update the frontend API base URL to point to the deployed Render backend URL" |

Two decisions made deliberately:

- **`GEMINI_MODEL` is configuration, not a constant.** The spec's own model id is already
  dead; hardcoding the next one would repeat the mistake.
- **No `routes/resume.js` stub.** It arrives in slice 3 with the real Gemini call rather
  than as an empty file now.

`/api/health` reports *whether* a key is configured, never the key.

### How it was tested

```bash
cd server && npm install && npm run dev     # terminal 1
cd client && npm install && npm run dev     # terminal 2

curl -s http://localhost:3001/api/health

curl -s -i -X OPTIONS http://localhost:3001/api/health \
  -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: GET"

curl -s -i http://localhost:3001/api/health -H "Origin: http://evil.example"

cd client && npm run build
```

### Result

Health check — this is spec test case **TC05**:

```json
{"status":"ok","model":"gemini-3.6-flash","apiKeyConfigured":true}
```

CORS from an allowed Vite origin:

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: http://localhost:5173
```

CORS from a disallowed origin: no `Access-Control-Allow-Origin` header returned, so a
browser blocks the response.

Frontend build:

```
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-D-FRm3d5.css    0.26 kB │ gzip:  0.21 kB
dist/assets/index-DKPFr9jJ.js   191.28 kB │ gzip: 60.32 kB
✓ built in 285ms
```

In the browser at `localhost:5173`, the page renders values fetched from the backend over
CORS — Status `ok`, Model `gemini-3.6-flash`, API key configured `true`. React → Express →
env is proven before any feature is built on it.

Secret check on the staged diff: `git diff --cached | grep -c <key>` → **0**.

### Model id — verified, not assumed

The spec names `gemini-1.5-flash`. Against the live API on this key:

```
gemini-1.5-flash  → 404 "models/gemini-1.5-flash is not found for API version v1beta"
gemini-2.5-flash  → 404 "no longer available to new users"
gemini-3.6-flash  → 200 "ok"
```

Measured on the same prompt and schema, `gemini-3.6-flash`:

| Thinking | Result | Tokens |
|---|---|---|
| default | 503 after 34.9s under load | 364 total, 314 thinking |
| `LOW` | 200 in 1.0s | 50 total, 0 thinking |

`LOW` will be set when generation lands in slice 3. On a free tier that gap is the
whole quota.

### Known limitations and follow-ups

- `App.jsx` is a placeholder; `EMPTY_FORM` and the state machine are slice 1.
- No tests yet. TC01–TC07 and the unit tests land with the code they cover.
- `CLIENT_ORIGIN` is wired but unused until the Vercel deployment exists.
- **Machine issue, not project code:** installing in `server/` needed `npm install --cache`
  pointed elsewhere. A root-owned file in `~/.npm/_cacache`, left by an old `sudo npm`,
  blocks writes. Fix with `sudo chown -R $(whoami) ~/.npm`.
- **Outstanding:** the Gemini API key was briefly pasted into `.env.example` (tracked) and
  has been through a chat transcript. It never entered git history — `git log --all -S<key>`
  and `git grep` both return nothing — but it should be rotated.

Commit: `3b4ff82`, branch `slice-0-scaffold`, PR #3 — awaiting review.

---

## Slice 1 — Page state machine (not started)

Planned: `EMPTY_FORM` exported from `App.jsx`, and a `page` state variable driving
`home` / `form` / `preview` / `portfolio`, with `handleStartFlow`, `handleAuthSuccess`,
`handleSelectTemplate`, and `pendingPage`.
