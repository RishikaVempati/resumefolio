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

## Slice 4 — Authentication

**Done means:** sign up, get redirected to the page you were heading for, with the form
pre-filled.

### What was built

| File | Purpose |
|---|---|
| `src/auth.js` | Register, login, sign out, and the LocalStorage reads |
| `src/components/AuthModal.jsx` | One dialog, sign-up and login modes |
| `src/App.jsx` | `handleStartFlow` gates the flow; `handleAuthSuccess` consumes `pendingPage` |

Storage keys match the spec's DevTools screenshot exactly: `registered_users` holds the
accounts, `user` holds the current session.

| Decision | Why |
|---|---|
| Pre-fill only blank fields | Signing in midway through the form must not overwrite what was typed |
| One message for unknown email and wrong password | Otherwise the form reveals which emails are registered |
| Email matched case- and space-insensitively | `ANANYA@…` and ` ananya@… ` are one account to a person |
| Every LocalStorage access in try/catch | It throws in private browsing; the app must still render |

### This is not real authentication

Accounts live in the visitor's own browser under `registered_users`, **passwords in plain
text**. Anyone can open DevTools, read every account, and sign in as any of them. There is
no server, no session, no hashing.

Hashing would be theatre here: the whole store is client-side, so anyone who can read a
hash can also edit the record. The spec asks for exactly this, and for a capstone it is
the right scope — what matters is that the README says so in a paragraph rather than
leaving someone to discover it.

### Result

```
client:  Tests 47 passed (47)
server:  ℹ pass 29
```

Live in Chrome: **TC03** — signed out, "Get Started" opened the modal in Sign Up mode and
the page did not move. **TC02** — completing signup landed on the form with Full Name and
Email already filled.

LocalStorage after signup, read from the page:

```json
{
  "registered_users": [
    { "name": "Ananya Iyer", "email": "ananya.iyer@example.in", "password": "kirana123" }
  ],
  "user": { "name": "Ananya Iyer", "email": "ananya.iyer@example.in", "password": "kirana123" }
}
```

### Two things found while building it

**Node 26 defines its own `localStorage` global** that shadows jsdom's and throws unless
the process was started with `--localstorage-file`. Every auth test failed on it until the
setup installed an in-memory store.

**A test caught the required-phone rule.** The template-choice test could not reach the
preview, because Phone Number became required in slice 3.5 and the form correctly refused
to submit. The test was wrong, not the app.

---

## Slice 5 — Two templates and the portfolio

**Done means:** the templates look genuinely different, and the portfolio is worth sharing.

### What was built

Modern is a two-column grid with an accent rule under each heading; Classic is one centred
serif column. They render **identical markup** — everything separating them lives under
`.resume--modern` / `.resume--classic`, so a third template is a block of CSS rather than
another component.

The portfolio gets the four sections the spec names — About Me, Skills, Projects,
Achievements — over a gradient hero. It reads the same generated object the resume does,
so moving between them never costs another Gemini call, which a test asserts.

`TEMPLATES` moved into `src/templates.js` so the landing gallery and the preview switcher
cannot drift apart.

### Result

```
Tests 50 passed (50)
```

Verified in Chrome with a real Gemini call: landing, loading state, Modern, Classic, and
the portfolio. Switching Modern → Classic re-rendered instantly with no second call.

### Two bugs found by using it

**A returning user got an empty form.** Pre-filling only happened in `handleAuthSuccess`,
which someone already signed in never passes through. `formData` is now seeded from the
stored user at mount too. Every existing test signed in fresh, so none could have caught it.

**The portfolio hero rendered sideways.** A bare `header { display: flex }` rule for the
app bar also matched `.portfolio__hero`, which is a `<header>` too, flexing the badge,
heading, tagline and email into one unreadable row. The tests passed the whole time,
because they assert on content and not on layout.

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

---

## Slice 7 — The six-step wizard

**Done means:** the form matches the spec's screenshots — a stepper with a progress bar,
Next/Previous, and per-step validation.

### What was built

`ResumeForm` becomes a wizard over the same six sections: Personal, Education, Skills,
Projects, Experience, Certifications. `EMPTY_FORM` and every transform in `formUpdates.js`
are untouched — this is a change to how the fields are presented, not to the data.

| Decision | Why |
|---|---|
| Next and Generate are both `submit` | The browser then validates the current step's required fields for free. Doing it by hand means reimplementing what the platform already does |
| Progress is `stepIndex / 6` | Step 1 reads 0%, step 6 reads 83%, matching the spec's screenshots exactly |
| Only completed steps are clickable | Jumping ahead would skip the required fields on Personal |
| Optional steps say so | "Nothing added yet. This step is optional." — otherwise an empty step looks broken |
| Legend is visually hidden | A two-line `<legend>` breaks the fieldset's border cutout; the visible heading is a normal block and the legend stays for screen readers |

## Slice 8 — The fuller resume

**Done means:** the resume shows the sections the spec's screenshots show, from one
Gemini call, with nothing invented.

### What was built

The generated schema grows from six fields to eleven:

| Added | Feeds |
|---|---|
| `careerObjective` | Main column, under the summary |
| `keyCompetencies` | Main column, as chips |
| `technicalSkills`, `tools`, `languages`, `softSkills` | Sidebar, four separate blocks |

The flat `skills` list is gone. The portfolio composes its chips from the four
categories instead, so the same data serves both pages without duplication.

`ResumePreview` becomes a real two-column layout: sidebar with the skill categories,
education and certifications; main column with Professional Summary, Career Objective,
Key Competencies, Work Experience and Projects. A `ListSection` helper renders nothing
at all when a list is empty, so someone who listed no spoken languages does not get an
empty heading.

### The categories are a sorting, not new information

Splitting one skills list into four raises the obvious risk: the model filling gaps.
The first run produced `React Native` and `AWS` in the categories, neither of which was
in the skills list — but both **were** in the input: `React Native` from the project's
tech field, `AWS` from the certification. Not invention, but also not what the prompt
had asked for.

Rather than tightening the prompt to forbid it, the instruction now describes what is
actually wanted: technologies named **anywhere** in the input may be categorised —
skills, project tech, roles, certifications — and nothing else may be added. A
technology someone clearly works with belongs on their resume even if they forgot to
repeat it in the skills box.

Verified after the change by checking every categorised entry against the submitted
form:

```
technicalSkills  ['React', 'TypeScript', 'PostgreSQL', 'React Native', 'SQLite']
tools            ['Git', 'AWS']
languages        ['Hindi', 'Tamil']
softSkills       ['Mentoring']

anything NOT traceable to the form: none
```

`SQLite` was picked up from the project too. `Hindi` and `Tamil` went to languages and
not to technical skills, which is the categorisation the prompt is most likely to get
wrong.

### How it was tested

```bash
npm test
npm run build
npm run dev     # then clicked all six steps in Chrome

npm --prefix server test
npm test
npm run dev     # then a real generation in Chrome
```

### Result

```
Tests  56 passed (56)
build  ✓ built in 59ms
```

In the browser:

| Step | Observed |
|---|---|
| 1 | "Step 1 / 6 — Personal", **0%**, dot 1 filled, Next shown, Generate absent |
| Next with Phone empty | **Did not advance** — the browser focused the empty required field |
| 6 | "Step 6 / 6 — Certifications", **83%**, ticks on steps 1–5, **Generate Resume** |

New tests: starts at step 1 and 0%; will not advance while a required field is empty
(TC06, now enforced per step rather than only at the end); advances once filled; reaches
83% on the last step where Next becomes Generate; Previous keeps what was entered; step 1
Previous leaves the form; a step not yet reached is disabled.

The existing form tests were rewritten around a `goTo(step)` helper, since fields that
used to be on one page are now spread across six.

### Known limitations

- Progress counts steps visited, not fields completed, so skipping optional steps still
  shows 83% at the end.
- No draft persistence: a refresh mid-wizard loses everything, same as before.
- The step dots are small tap targets on a phone.

server:  ℹ tests 36   ℹ pass 36   ℹ fail 0
client:  Tests 50 passed (50)
```

Live generation, 8.8s, rendered in both templates. Modern shows the sidebar and main
column side by side; Classic stacks them.

### A bug found by looking

In Classic the sidebar rendered **before** the Professional Summary — the aside comes
first in the DOM so Modern can place it in the left column, and a single-column layout
inherits that order. A resume that opens with a skills inventory rather than a summary
reads badly. Fixed with `order` on the flex children, in Classic and in Modern's mobile
breakpoint. Every test passed throughout: they assert on content, not sequence.

### Known limitations

- `keyCompetencies` is the one field that is genuinely derived rather than restated. It
  is constrained to the supplied input, but it is the most likely place for drift, and
  worth a glance before sharing a generated resume.
- Language detection depends on the model recognising a spoken language. An unusual one
  listed among frameworks may land in `technicalSkills`, which the prompt makes the
  deliberate fallback.
- Still no Resume Score, which appears in the screenshots but in no written story.

---

## Slice 9 — Landing page and a visual identity

**Done means:** the app looks like a product rather than an unstyled form.

### The design decision that shapes everything else

**Dark chrome, light paper.** The app — landing, wizard, toolbars, modal — is dark, which
is what the spec's screenshots show. The resume and portfolio stay on **white**.

That split is not decoration. A resume is a document: it gets printed, screenshotted and
pasted into applications, so a dark one would be wrong everywhere it ends up. The white
sheet floating on a dark page also does the work of making the output feel like the
artefact rather than part of the interface.

Two `--paper-*` tokens sit alongside the chrome tokens so the boundary is explicit in the
CSS rather than a series of one-off overrides.

### What was built

| Piece | Detail |
|---|---|
| Navbar | Brand mark, Login and Get Started when signed out; name and Sign out when signed in |
| Hero | Status badge, gradient headline, two calls to action |
| Hero art | A mock resume in **pure CSS** — no image to load, stays sharp at any size |
| Features | Four cards, each naming something real: no invented facts, one form for two views, switch templates without regenerating, done in a minute |
| Templates | The existing gallery, restyled |
| Footer | What the project is, and that nothing is stored on a server |

One accent, one gradient, and a single reused glow, rather than a different treatment per
section. Two soft radial lights are fixed behind the whole page so flat sections still
have depth.

### How it was tested

```bash
npm test
npm run build
npm run dev     # then the whole flow in Chrome, signed out
```

### Result

```
Tests  56 passed (56)
build  ✓ built
```

Checked in the browser: landing, auth modal over a blurred backdrop, the wizard on dark,
and a real generated resume — white paper against the dark page, which is the pairing the
whole scheme rests on.

Two tests needed updating: the hero call to action is now "Generate my resume", and
"Get Started" moved to the navbar where it only exists while signed out. A signed-in test
could no longer find it.

### Known limitations

- The feature icons are emoji. They render differently across platforms; real SVG icons
  would be steadier but add a dependency or a sprite to maintain.
- No light-mode option. The dark chrome is fixed, and someone reading in bright sunlight
  has no way to change it.
- The hero art is decorative and marked `aria-hidden`; it does not preview the user's own
  content, which a more finished product would do.
