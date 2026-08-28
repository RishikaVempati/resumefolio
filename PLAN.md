# Approach and plan

What we are building, how it is broken into stages, and what exists at the end.

The authority for all of this is the SkillWallet spec (29 stories, all read). This
document is the implementation plan derived from it. Where they disagree, the spec wins.

---

## 1. The end product

A public web app. A visitor lands on it, signs up, describes themselves in a form, and
gets AI-written resume content back in a design they choose — viewable both as a resume
and as a portfolio page.

The whole experience, in order:

| Step | Screen | What happens |
|---|---|---|
| 1 | **Landing** | Navbar, hero, features, a gallery of resume templates, footer. The visitor browses templates and clicks "Get Started" |
| 2 | **Auth modal** | If not signed in, a modal opens in signup mode. Sign up or log in. Details are saved to LocalStorage |
| 3 | **Resume form** | Six sections: personal details, education, skills, projects, experience, certifications. Projects, experience and certifications can have entries added and removed |
| 4 | *(generating)* | Form data goes to the Express backend, which prompts Gemini and returns written content |
| 5 | **Resume preview** | The generated resume in the chosen template. Switch templates, go back and edit, export, or jump to the portfolio — **without losing the generated content** |
| 6 | **Portfolio preview** | The same data as a portfolio page: About Me, Skills, Projects, Achievements |

Deployed: React frontend on **Vercel**, Express backend on **Render**.

### What makes it "done"

The spec's five functional requirements. All mandatory:

1. Register and log in through an auth modal with LocalStorage sessions
2. Collect personal details, education, skills, projects, experience, certifications via a structured form
3. Generate resume content with Gemini from the submitted form data
4. Multiple resume templates, user-selectable
5. Both a resume preview and a portfolio preview from the same form data

---

## 2. Architecture

```
   Browser (React on Vite, Vercel)
        │
        │  POST /api/resume   { form data }
        │  GET  /api/health
        ▼
   Express (Node, Render, port 3001)
        │  routes/resume.js formats the prompt
        ▼
   Google Gemini API
        │  generated content
        ▼
   back to the browser, rendered into the selected template
```

This matches the architecture diagram in the spec: React.js + Vite frontend → Node.js +
Express backend API server → Google Gemini, with CORS configuration and environment
variables holding the credentials.

One wording difference: the diagram labels the backend box "API Routing & Business Logic
(Express Routes & Controllers)". The spec's Epic 2 text names only `routes/resume.js`, so
route handlers hold the logic and there is no separate controllers layer — for a single
endpoint that would be ceremony. If a reviewer expects the split, it is a small change.

Three rules that follow from this shape:

- **The API key lives only on the server.** The browser never sees it. That is the entire
  reason a backend exists in this project at all.
- **The frontend knows one URL**, `VITE_API_BASE_URL`, so pointing it at the deployed
  Render backend is a config change, not a code change.
- **All state is in React.** No database. Sessions are LocalStorage. A refresh loses
  generated content, and that is an accepted limitation.

### Frontend structure

`App.jsx` is a page-based state machine — the spec is explicit about this, so it is not
a design choice we get to revisit:

```
page: "home" | "form" | "preview" | "portfolio"
```

| Piece | Job |
|---|---|
| `EMPTY_FORM` | The shared data shape, exported from `App.jsx` so every page agrees on it |
| `handleStartFlow` | Gates page access behind authentication |
| `handleAuthSuccess` | Pre-fills the form from the user, then redirects to the intended page |
| `handleSelectTemplate` | Carries the landing-page template choice into the form |
| `pendingPage` | Remembers where the user was heading when auth interrupted them |

### The data shape

One object flows through every page — form, preview, and portfolio all read from it:

```
personal:       name, email, phone, location, title, links
education[]:    institution, degree, field, dates, grade
skills[]:       plain strings
projects[]:     name, description, tech, link          ← add / remove
experience[]:   role, company, dates, highlights[]     ← add / remove
certifications[]: name, issuer, date                   ← add / remove
```

The exact field names are settled in slice 1, when `EMPTY_FORM` is written. After that
they are fixed, because every later slice reads from this shape.

---

## 3. The stages

Each slice ends with something that runs. If work stopped after any slice, what exists
still starts up and demonstrates something real.

### Slice 0 — Scaffold ✅ done

**Goal:** prove the two halves talk to each other before building anything on them.

- `server/index.js` — Express, CORS for the Vite port range, 10MB JSON cap,
  `GET /api/health`, global error handler returning `{ error, details }`
- `client/src/api.js` — the single place that knows the backend URL
- `client/src/App.jsx` — a temporary connectivity readout

**Done means:** both dev servers run and `/api/health` reports the model and whether a
key is configured.

**Verify:**
```bash
curl -s http://localhost:3001/api/health
# {"status":"ok","model":"gemini-3.6-flash","apiKeyConfigured":true}
```

Covers spec stories: Development Environment Setup, Dependency Installation, Project
Structure Creation, Configuration Setup. Satisfies **TC05**.

---

### Slice 1 — Page state machine

**Goal:** all four screens exist and you can navigate between them. No real content yet.

- `EMPTY_FORM` defined and exported from `App.jsx`
- `page` state driving `home` / `form` / `preview` / `portfolio`
- `handleStartFlow`, `handleSelectTemplate`, `pendingPage` scaffolding
- Placeholder components for each of the four pages

**Done means:** click from home through form, preview and portfolio and back, with the
form data object visibly carried along.

**Verify:** click every transition in the browser; the same object appears on each page.

Covers: Frontend Page State Machine Implementation.

---

### Slice 2 — The form

**Goal:** the user can actually enter their details.

- `ResumeForm` with all six sections
- Dynamic add/remove for projects, experience, certifications
- Controlled inputs using functional `setState` (`prev => ({...prev, ...})`) to avoid
  stale-state bugs
- On submit, the completed object is handed back to `App.jsx` and the page moves to preview

**Done means:** fill in every section, add and remove entries, submit, and see the
collected data on the preview page.

**Verify:** fill the form in the browser, add two projects, delete one, submit, confirm
what arrives matches what was typed.

Covers: Form Data Collection Implementation.

---

### Slice 3 — Gemini generation

**Goal:** the AI part. This is the slice the whole project exists for.

- `server/routes/resume.js`, mounted under `/api`
- `POST /api/resume` — validates input, formats the form data into a structured prompt,
  calls Gemini with `thinking_level: LOW`, returns the generated content
- Errors map to structured JSON; a rate limit or upstream failure says whether retrying helps
- `ResumePreview` renders the returned content
- Loading state while generating, because this call takes seconds

**Done means:** a real form submission produces real generated resume content on screen.

**Verify:**
```bash
curl -s -X POST http://localhost:3001/api/resume \
  -H 'Content-Type: application/json' -d @sample-form.json
```
and the same flow end to end in the browser.

Covers: Backend API & Gemini Integration, Component Integration. Satisfies **TC01**, **TC06**.

---

### Slice 4 — Authentication

**Goal:** the gate in front of the flow.

- `AuthModal` with signup and login modes
- User saved to LocalStorage; `currentUser` read with a lazy `useState` initialiser so
  LocalStorage is not re-read on every render
- `handleStartFlow` opens the modal when not signed in
- `handleAuthSuccess` pre-fills the form from the user and redirects to `pendingPage`

**Done means:** clicking "Get Started" while signed out opens the modal, and after signing
up you land on the page you were originally heading for, with your name already in the form.

**Verify:** in the browser, signed out, click Get Started → modal opens in signup mode →
sign up → land on the form with fields pre-filled. Reload; still signed in.

Covers: Authentication Module. Satisfies **TC02**, **TC03**.

---

### Slice 5 — Templates and portfolio

**Goal:** the two requirements that make the output feel like a product.

- Multiple resume templates, selectable from the landing page gallery and switchable
  from the preview
- `handleSelectTemplate` wiring the landing choice through to the form and preview
- `PortfolioPreview` — About Me, Skills, Projects, Achievements, from the same data
- Switching template or moving between previews **must not** discard generated content

**Done means:** switch templates on a generated resume and see it re-render instantly;
move to the portfolio view and back without regenerating.

**Verify:** generate once, then switch templates twice and navigate preview ↔ portfolio;
confirm no second Gemini call is made and no content is lost.

Covers: user-selectable templates, portfolio preview. Satisfies **TC04**, **TC07**.

---

### Slice 6 — Hardening, tests, deployment

**Goal:** ship it.

- Input validation in the resume route before calling Gemini
- Error and empty states throughout the UI
- Tests: `ResumeForm` state updates on input change; the resume route's Gemini call
  structure and response handling; the seven spec test cases TC01–TC07
- Deploy frontend to Vercel, backend to Render with `GEMINI_API_KEY`, `GEMINI_MODEL`,
  `PORT` set in the dashboard
- Add the deployed Vercel origin to the backend CORS allow-list
- README, demo video, demo and GitHub links added to the project Overview
- All 29 Kanban cards moved

**Done means:** the live URL works end to end, tests pass, links submitted.

**Verify:** hit the deployed backend's `/api/health` and confirm `apiKeyConfigured: true`,
then run the whole flow against the live frontend.

Covers: Epic 3 (Performance, Security, Error Handling), Epic 4 (all testing stories),
Epic 5 (all deployment stories), Conclusion.

---

## 4. Test cases

The spec names seven. Each lands with the slice that makes it possible:

| ID | Input | Expected | Slice |
|---|---|---|---|
| TC01 | Valid form submission, all fields | AI-generated resume in preview | 3 |
| TC02 | Login with valid credentials | User pre-filled, redirected to form | 4 |
| TC03 | "Get Started" without login | Auth modal opens in signup mode | 4 |
| TC04 | Select template on landing page | Form opens with template in state | 5 |
| TC05 | Health check call | JSON with model and `apiKeyConfigured` | 0 ✅ |
| TC06 | Submit with missing required fields | Validation error handled gracefully | 3 |
| TC07 | Preview → portfolio | Portfolio renders from same form data | 5 |

---

## 5. Deliverables

| Item | Where | Status |
|---|---|---|
| Public GitHub repo | github.com/RishikaVempati/resumefolio | exists, currently private |
| Live demo URL | Vercel + Render | slice 6 |
| Demo video | recorded walkthrough | slice 6 |
| Demo link on project Overview | SkillWallet | slice 6 |
| GitHub link on project Overview | SkillWallet | slice 6 |
| 29 Kanban cards moved | SkillWallet | as each slice completes |

---

## 6. Deliberately not building

From the spec's own Conclusion, these are named as *future* scope. They are not part of
this project:

- PDF export of the generated resume
- Cloud storage of resumes
- Expanded template library beyond what slice 5 delivers

And not in the spec at all, so out of scope: real server-side authentication, a database,
resume file upload of any kind, job-description matching, analytics.

---

## 7. Known risks

| Risk | Mitigation |
|---|---|
| Gemini model ids age out — the spec's `gemini-1.5-flash` already 404s | Model is `GEMINI_MODEL` config, not a constant. Re-verify with a real call before each demo |
| Free-tier rate limits and 503s under load | `thinking_level: LOW` cuts tokens ~7×; errors say whether retrying helps |
| Render free tier cold start, 30–50s | Warm the URL before recording the demo; note it in the README |
| Generated content lost on refresh | Accepted limitation, documented. Fixing it means persistence, which is out of scope |
| LocalStorage auth is not real security | Accepted and documented; it is what the spec asks for |
