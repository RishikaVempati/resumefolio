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

## Slice 3 — Gemini generation (not started)

Planned: `server/routes/resume.js` mounted under `/api`, `POST /api/resume` formatting the
form data into a prompt, calling Gemini with `thinking_level: LOW`, and returning generated
content for `ResumePreview` to render.
