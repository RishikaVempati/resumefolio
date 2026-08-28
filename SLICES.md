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

## Slice 1 — Page state machine

**Done means:** click through home → form → preview → portfolio, with the form data
object carried along.

### What was built

| File | Purpose |
|---|---|
| `client/src/App.jsx` | `EMPTY_FORM`, the `page` state machine, and the handlers that move between views |
| `client/src/pages/Home.jsx` | Landing page: "Get Started" and the template gallery |
| `client/src/pages/ResumeForm.jsx` | Placeholder; the six real sections are slice 2 |
| `client/src/pages/ResumePreview.jsx` | Placeholder; the Gemini content is slice 3 |
| `client/src/pages/PortfolioPreview.jsx` | Placeholder; the real sections are slice 5 |

`EMPTY_FORM` is the whole point of this slice. Every page reads from one shape, so a
field renamed here is renamed everywhere:

```
personal:         name, email, phone, location, title, links
education[]:      institution, degree, field, dates, grade
skills[]:         strings
projects[]:       name, description, tech, link          ← dynamic
experience[]:     role, company, dates, highlights[]     ← dynamic
certifications[]: name, issuer, date                     ← dynamic
```

Per-entry shapes are exported alongside it (`EMPTY_PROJECT`, `EMPTY_EXPERIENCE`,
`EMPTY_EDUCATION`, `EMPTY_CERTIFICATION`) so slice 2's add-entry buttons have something
to push.

The four pages are deliberately unstyled placeholders that dump the shared object as
JSON. This slice proves the plumbing; making them look like anything is slices 2, 3 and 5.

**Deferred honestly:** `handleStartFlow` currently stores `pendingPage` and navigates.
The auth gate it is supposed to enforce arrives in slice 4 along with `AuthModal` and
`handleAuthSuccess` — writing those now would mean shipping a modal with nothing behind
it. The comment in `App.jsx` says so at the point it matters.

### How it was tested

Clicked through the running app rather than asserting from the code:

```bash
cd client && npm run build      # type/import check
cd client && npm run dev        # then click every transition
```

Path exercised: Home → select "Modern" → form → Generate → preview → View portfolio →
portfolio → Back to resume → preview.

### Result

```
dist/index.html                   0.45 kB │ gzip:  0.29 kB
dist/assets/index-CVBMkY4D.css    0.89 kB │ gzip:  0.46 kB
dist/assets/index-rl2MBSO5.js   193.46 kB │ gzip: 60.91 kB
✓ built in 59ms
```

| Step | Page indicator | Observed |
|---|---|---|
| Load | `page: home` | Hero, "Get Started", both templates; Classic shown selected |
| Click "Modern" | `page: form` | Navigated **and** template recorded in one action |
| Click "Generate" | `page: preview` | **`Template: modern`** — the landing choice survived two transitions |
| Click "View portfolio" | `page: portfolio` | Same `EMPTY_FORM` object as the form and preview showed |
| Click "Back to resume" | `page: preview` | Returned without losing state |

Browser console: **no errors or exceptions** on load or across any transition.

That `Template: modern` reading on the preview page is the real assertion here. It proves
`handleSelectTemplate` carries the landing-page choice through the form and into the
preview — spec test case **TC04**, minus the auth gate that slice 4 adds.

### Known limitations and follow-ups

- No auth gate yet. `handleStartFlow` navigates unconditionally; slice 4 makes it open
  `AuthModal` when there is no signed-in user.
- The pages are placeholders. They render JSON, not a resume.
- `pendingPage` is set but nothing consumes it until `handleAuthSuccess` exists.
- No tests. `ResumeForm` state-update tests land in slice 2 with the real inputs.

Branch `slice-1-state-machine`, stacked on `slice-0-scaffold` because PR #3 is not merged.

---

## Slice 2 — The form

**Done means:** fill in every section, add and remove entries, submit, and see the
collected data on the preview page.

### What was built

| File | Purpose |
|---|---|
| `client/src/pages/ResumeForm.jsx` | All six sections, with add/remove on the dynamic ones |
| `client/src/formUpdates.js` | Pure transforms over the form shape |
| `client/src/formShape.js` | `EMPTY_FORM` and the per-entry shapes, moved out of `App.jsx` |
| `client/src/formUpdates.test.js` | Unit tests for every transform |
| `client/src/pages/ResumeForm.test.jsx` | Component tests for state updates on input |
| `client/vitest.config.js` | Vitest + jsdom |

The state transforms live in `formUpdates.js` rather than inside the component, so the
logic can be tested without rendering and the component stays a description of markup.
Every transform returns a new object — React compares by identity.

Sections are data, not markup: `PERSONAL_FIELDS` and `SECTIONS` describe the fields, and
one loop renders them. Adding a field is a line in an array.

**Dependency added:** `vitest`, `jsdom`, and Testing Library, dev-only. Vitest is the
natural fit for a Vite project — same config, same transform pipeline.

### Three bugs the tests caught

These are the reason this slice took the time it did. All three would have shipped.

**1. Circular import.** `App.jsx` imported `ResumeForm`, which imported `EMPTY_PROJECT`
back from `App.jsx`. At module-init time the shapes were `undefined`, so `addEntry`
spread `undefined` and produced `{}` — every added entry had no fields, and the
highlights textarea crashed on `undefined.join`. Fixed by moving the shapes into
`formShape.js`, which `App.jsx` re-exports so the spec's "exported from App.jsx" still
holds.

**2. Shared array reference.** `addEntry` used `{ ...emptyEntry }`, a shallow copy, so
every experience entry shared one `highlights` array — typing in one would have written
into all of them. Now `structuredClone`.

**3. Round-trip input stripping.** The skills input's value was `skills.join(", ")` and
its `onChange` re-parsed on every keystroke. Typing a comma produced an empty fragment,
which was filtered out, so the comma vanished the instant it was typed — `"React, Node"`
became `"ReactNode"`. Highlights had the same bug with spaces: `"Invented the"` became
`"Inventedthe"`.

Fixed in two ways, deliberately different:

- **Skills** keeps the raw text in local state and parses alongside it.
- **Highlights** made the split lossless — `splitLines` does not trim or filter — so
  `join("\n")` round-trips exactly. Tidying moved to `normalizeForm`, applied once at
  submit.

The second is the better pattern; skills keeps local text because `", "` cannot round-trip
through a plain split.

### How it was tested

```bash
cd client && npm test
cd client && npm run build
cd client && npm run dev      # then fill the form in the browser
```

### Result

```
Test Files  2 passed (2)
     Tests  26 passed (26)
  Duration  1.04s
```

```
dist/assets/index-CW8-DEsY.js   197.26 kB │ gzip: 62.07 kB
✓ built in 57ms
```

Filled in the browser, then submitted. The preview received exactly what was typed:

```json
{
  "personal": { "name": "Grace Hopper", "email": "grace@navy.mil", ... },
  "skills": ["COBOL", "Compilers", "Naval Systems"],
  "experience": [
    {
      "role": "Rear Admiral",
      "company": "United States Navy",
      "highlights": [
        "Invented the first compiler (A-0)",
        "Led COBOL standardization"
      ]
    }
  ]
}
```

Three skills from one comma-separated field, two highlights from two lines, spaces and
parentheses intact. Those are the exact cases that were broken before the fix, verified
in a real browser rather than only in jsdom.

Spec test case **TC06** is covered by a test: submitting with a required field empty does
not call `onSubmit`.

### Known limitations and follow-ups

- Validation is HTML `required` on name and email only. Richer validation is slice 6.
- Entries are keyed by array index. Fine while entries are only appended and removed;
  it would need stable ids if reordering is ever added.
- Skills is one comma-separated field rather than chips. Faster to fill, less pretty.
- No auth gate yet — still slice 4.

Branch `slice-2-resume-form`.

---

## Slice 3 — Gemini generation

**Done means:** a real form submission produces real generated resume content on screen.

### What was built

| File | Purpose |
|---|---|
| `server/routes/resume.js` | `POST /api/resume`, mounted under `/api` |
| `server/routes/prompt.js` | System instruction, prompt builder, request validation |
| `server/routes/resumeSchema.js` | Response schema and validation of what comes back |
| `server/routes/resume.test.js` | 16 tests, no network |
| `client/src/api.js` | `generateResume()` |
| `client/src/pages/ResumePreview.jsx` | Renders the generated resume |
| `client/src/pages/PortfolioPreview.jsx` | Renders About Me, Skills, Projects, Achievements |
| `client/src/App.jsx` | Holds generated content, loading and error state |

**One call feeds both previews.** The response carries `summary` and `experience` for the
resume, `about` and `achievements` for the portfolio, and shares the rest. Generating
twice would double both the latency and the quota.

**Generated content lives in `App.jsx`, not in `ResumePreview`.** The spec requires
switching template or moving to the portfolio without losing content, so it has to sit
above both pages.

**Validation happens before the call.** A form with a name but nothing else is rejected
with 400 and never reaches Gemini — spending quota to discover there is nothing to write
from would be wasteful.

The prompt omits empty sections entirely, so the model is not invited to fill them. The
system instruction's first rule is that nothing may be invented.

### The response is validated, not trusted

`validateGenerated` checks the shape by hand even though the request declares a schema.
That is not defensive habit: in the archived project, a schema-constrained response came
back with fields the schema never declared. A declared schema is not a guarantee.

### How it was tested

```bash
cd server && npm test          # node --test, no network
cd client && npm test
curl -s -X POST http://localhost:3001/api/resume \
  -H 'Content-Type: application/json' -d @sample-form.json
```

### Result

```
server:  ℹ tests 16   ℹ pass 16   ℹ fail 0
client:  Test Files 2 passed   Tests 26 passed
```

A real call with Indian sample data — Ananya Iyer, Bengaluru, PES University, Zeta
Systems, Kirana Ledger — returned:

```
summary:  "Frontend Developer with experience building payments dashboards and web
           applications using React, TypeScript, and Node.js..."
about:    "I am a Frontend Developer based in Bengaluru with a background in Computer
           Science from PES University..."
bullets:  "Rebuilt the payments dashboard used by 40 merchants"
          "Cut first page load from 4.2s to under a second"
projects: "Kirana Ledger — Billing and khata app for neighbourhood shops"
achievements: "Cut first page load from 4.2s to under a second at Zeta Systems"
```

Every fact traces to the input. The numbers (40 merchants, 4.2s) are the candidate's own,
and no employer, tool or metric was invented.

Validation, verified live:

```
POST with a name and nothing else → 400
"Add at least one skill, project, role or qualification — there is nothing to write from yet."
```

CORS preflight now matches the options in the spec's screenshot:

```
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST
Access-Control-Allow-Headers: Content-Type
```

### The free tier has a hard daily cap

Discovered by hitting it:

```
429 RESOURCE_EXHAUSTED
"Quota exceeded for metric: generate_content_free_tier_requests, limit: 20,
 model: gemini-3.6-flash"
quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier
```

**20 requests per day, per model, per project.** Two consequences:

- The quota is *per model*, so switching `GEMINI_MODEL` gets a fresh allowance. That is a
  workaround, not a fix.
- Roughly 20 generations a day across all testing and demoing. The demo must be
  rehearsed sparingly, and re-recording several times in one day will exhaust it.

`GEMINI_MODEL` is now `gemini-3.5-flash-lite`: it answered in **7.8s** against
`gemini-3.6-flash`'s **37.7s** on the same input, with output of comparable quality, and
its quota bucket is untouched. `gemini-3.6-flash` remains a one-line switch.

Latency measured through the SDK was far worse than the same request over raw REST
(43.9s vs 1.9s with identical thinking-token counts), which points at throttling as the
daily cap approached rather than at the SDK itself. Worth re-measuring on a fresh quota.

`thinkingLevel: LOW` is set, and the tests assert it is sent.

### Known limitations and follow-ups

- **No retry or backoff.** A 429 or 503 surfaces as a 503 with "try again" and a button.
  Automatic backoff belongs in slice 6.
- One 503 "high demand" was seen from `gemini-3.5-flash-lite`; a manual retry 15s later
  succeeded. The error path handled it correctly, which is itself a live test of it.
- Generated content is lost on refresh. Persistence is out of scope.
- Templates only change a CSS class so far; the two real designs are slice 5.
- The spec contains **code snippets as images** that text extraction cannot read. The CORS
  options above came from one. Others may exist and should be checked visually.

Branch `slice-3-gemini-generation`.

---

## Slice 3.5 — Align with the spec's screenshots

The spec's stories embed code and UI screenshots. Text extraction cannot read images,
so everything up to slice 3 came from the prose alone. The screenshots contradicted
several choices.

| Corrected | From | Was |
|---|---|---|
| Frontend at the repo root, `server/` nested | Folder tree screenshot | `client/` + `server/` |
| Default template `"modern"` | `App.jsx` snippet | `"classic"` |
| `currentUser` (lazy), `isAuthOpen`, `authMode` | `App.jsx` snippet | only `pendingPage` |
| Full Name\*, Email\*, Phone\*, Address, LinkedIn, GitHub | Form screenshot | invented title/location/links |
| `POST /api/generate-resume` | Network tab | `/api/resume` |
| Startup banner, `.env.example` layout | Terminal + editor screenshots | plainer versions |

Structural corrections were taken immediately because every later file references
them; the 6-step wizard and richer resume layout are additive and can follow.

**Not taken:** the wizard form, the two-column resume with Career Objective / Key
Competencies / Resume Score, and Download PDF — which the spec's own Conclusion lists
as *future* scope, contradicting the preview screenshot.

Commit `42fde1e`.

---

## Slice 3.6 — Retry with backoff

**Done means:** a transient upstream failure recovers without the user seeing an error.

### Why this jumped the queue

The free tier returned 503 "high demand" three times in one afternoon, twice in a row
on the same request. Without a retry the demo is a coin flip: a mentor clicking
Generate could simply get an error.

### What was built

`server/routes/retry.js` — `withRetry(operation, options)`.

| Decision | Why |
|---|---|
| Retry 429, 500, 502, 503, 504 | Transient. A 400 or 404 will fail identically next time |
| **Never** retry an exhausted daily quota | It will still be exhausted in two seconds, and retrying spends more of a quota that is already gone |
| Exponential backoff with jitter | So simultaneous clients do not retry in lockstep |
| Honour Google's `"retry in 40.5s"` hint | It has already said when it will be free |
| A wall-clock **budget**, not just an attempt count | A failing attempt can itself take 30s. Three attempts without a budget is two minutes on a spinner |
| `sleep` and `now` injected | Tests run instantly and deterministically |

### Two bugs found while building it

**1. The daily-cap advice never appeared.** `decorate()` overwrote `error.message`
*before* checking it for "quota", so the branch could never be true. Caught by the
test asserting the message, not by reading the code.

**2. A failing test hung the whole suite.** Each test closed its own server at the
end, so a test that failed earlier left a listening handle and `node --test` waited
forever — no output at all, just a timeout. Servers are now collected and closed in
`after()`. The suite went from hanging past 120s to finishing in 0.2s.

### How it was tested

```bash
npm --prefix server test
npm test
curl -s -X POST http://localhost:3001/api/generate-resume \
  -H 'Content-Type: application/json' -d @sample-form.json
```

### Result

```
server:  ℹ tests 29   ℹ pass 29   ℹ fail 0   duration_ms 111
client:  Test Files 2 passed   Tests 26 passed (26)
```

Live call, after the retry landed:

```
http=200 latency=1.4s
summary: "Frontend Developer with experience building scalable payment dashboards
          and web applications. Skilled in React, TypeScript, Node.js, PostgreSQL."
bullets: "Rebuilt the payments dashboard used by 40 merchants"
         "Cut first page load from 4.2s to under a second"
```

This run also re-verified slice 3.5's endpoint rename and new personal field names
end to end, which had been left unverified when the API was returning 503s.

New tests: transient 503 retried then succeeded (3 calls, 200 out); attempt limit
reached reports "after 3 attempts"; exhausted quota is **not** retried and explains
the daily cap; a 404 is not retried; backoff delays fall inside the jitter band; the
budget stops retrying when attempts are slow.

### Known limitations

- Retry is server-side only. The frontend shows one spinner throughout and cannot
  tell "still trying" from "slow" — a "retrying…" state would be better.
- `budgetMs` is 45s. On a cold Render instance the first request may exceed that.

---

## Slice 4 — Authentication (not started)

Planned: `AuthModal` with signup and login, `currentUser` in LocalStorage read via a lazy
`useState` initialiser, `handleStartFlow` gating, and `handleAuthSuccess` consuming
`pendingPage`.

---

## Slice 6 — Hardening and deployment config

**Done means:** the live URL works end to end. **Config is done; the deploy itself needs
Rakesh's Vercel and Render accounts.**

### What was built

| File | Purpose |
|---|---|
| `render.yaml` | Backend service: `rootDir: server`, health check at `/api/health`, env vars declared with `sync: false` so no secret is committed |
| `vercel.json` | Frontend: Vite preset, `npm run build`, `dist` |
| `server/cors.js` | The allow-list, extracted so it can be tested |
| `server/cors.test.js` | Five tests for it |
| `README.md` | Step-by-step deployment, and a pre-demo checklist |

`engines: { node: ">=20" }` on both packages, so Render and Vercel do not pick an older
runtime than the code assumes.

**CORS moved into its own module.** Getting it wrong either breaks the deployed frontend
or opens the API to any site on the internet, and neither is visible from reading the
config. It now supports a comma-separated `CLIENT_ORIGIN`, so adding a preview URL needs
no code change.

### How it was tested

```bash
npm --prefix server test
npm test
npm run build

CLIENT_ORIGIN=https://resumefolio.vercel.app npm --prefix server start

curl -s -i -X OPTIONS http://localhost:3001/api/generate-resume \
  -H "Origin: https://resumefolio.vercel.app" -H "Access-Control-Request-Method: POST"

curl -s -i -X OPTIONS http://localhost:3001/api/generate-resume \
  -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST"
```

### Result

```
client:  Tests 50 passed (50)
server:  ℹ tests 34   ℹ pass 34   ℹ fail 0
build:   ✓ built
```

Production CORS, both directions:

```
Origin: https://resumefolio.vercel.app  → 204, Access-Control-Allow-Origin: https://resumefolio.vercel.app
Origin: https://evil.example            → 204, no Access-Control-Allow-Origin header
```

The second is the one that matters: with no allow-origin header the browser discards
the response, so an unlisted site cannot read this API.

### The trap worth naming

If `CLIENT_ORIGIN` is not set on Render after the frontend deploys, every call is blocked
by the browser as a CORS failure. The request never reaches the backend, so **the Render
logs stay completely clean while the app is broken**. The README says this at the step
where it happens rather than in a troubleshooting section.

### Not done, and why

- **The deploy itself.** Connecting Vercel and Render needs Rakesh's accounts; the
  config, env var names and verification commands are ready for him to run.
- **Demo video, and moving the 29 Kanban cards.** Both are his to do.
- **The repository is still private** and must be made public before submission.
