# CLAUDE.md — Auto Resume Portfolio Builder

## Where the requirements actually live

The graded spec is the SkillWallet project page, not this file:

https://myskillwallet.ai/dashboard/skillwallet/module/vibe-coding-with-antigravity-69e9dbc0a72b306d1be9a34c/projects/6a214e26774ac42acecf34de/-AUTO-RESUME-PORTFOLIO-BUILDER-6a91a00cb357fbb2c660f06b

All 29 stories were read in full on 2026-08-28 and this file summarises them. **When the
two disagree, the spec wins** — say so and stop rather than building from this file.

An earlier version of this file described a completely different product (upload a PDF,
extract text, parse it). Three slices were built against it before anyone checked it
against the spec. That work is archived under the `pdf-approach-archived` tag and is not
part of this project. Do not resurrect it.

## What this is

A user signs up, fills in a structured form about themselves, and Gemini generates
polished resume content from that form data. They preview it as a resume or as a
portfolio, in a template they pick.

```
sign up → structured form → Gemini generates content → resume preview / portfolio preview
```

**There is no PDF upload and no resume parsing.** The user types their details in.

## The five functional requirements, verbatim

1. Register and log in through an **authentication modal with LocalStorage-based session
   management**
2. Collect **personal details, education, skills, projects, experience, and
   certifications** via a structured form
3. Generate resume content using the **Google Gemini API based on the submitted form data**
4. Support **multiple resume templates with user-selectable designs**
5. Provide **both a resume preview and a portfolio preview** from the same form data

All five are mandatory. None is out of scope.

## The five pages

| Page | Contents |
|---|---|
| **Landing** | Navbar, Hero, Features, template gallery, Footer. "Get Started" triggers `AuthModal` if not authenticated |
| **AuthModal** | Sign-up and login modes. On success, saves the user to LocalStorage, pre-fills the form, and redirects to the originally intended page |
| **ResumeForm** | Six sections. Projects, experience and certifications are dynamic arrays with add/remove. Submits to the Express backend |
| **ResumePreview** | AI content with the selected template applied. Switch templates, return to the form to edit, export, or go to the portfolio — **all without losing generated content** |
| **PortfolioPreview** | Same form data in a portfolio layout: About Me, Skills, Projects, Achievements |

## Stack — dictated by the spec, not chosen by us

| Layer | Choice |
|---|---|
| Frontend | **React.js** on **Vite** (the spec's CORS list, ports 5173–5176, is Vite's) |
| Backend | **Node.js + Express**, `index.js` entry, routes under `/api`, port **3001** |
| LLM | **Google Gemini**, called only from the backend |
| Config | **dotenv**, `.env` inside `server/` |
| Sessions | LocalStorage. No server-side auth, no database |
| Deploy | Frontend on **Vercel**, backend on **Render** |

Two workspaces: a frontend directory and a `server/` directory, each with its own
`package.json`. Server deps: express, cors, dotenv.

**Model id:** the spec says `gemini-1.5-flash`. **Do not use it without checking.**
Verified on this project's key on 2026-08-28: `gemini-2.5-flash` 404s for new keys
("no longer available to new users"), and `gemini-3.6-flash` works. Confirm against
`ListModels` and a real call before wiring anything, and set `thinking_level` to LOW —
default thinking cost 314 thinking tokens and timed out at 34.9s under load, versus
1.0s and 50 tokens on LOW. The model id belongs in `GEMINI_MODEL`, not hardcoded.

Env vars: `GEMINI_API_KEY`, `GEMINI_MODEL`, `PORT`. The frontend's API base URL is its
own env var so it can point at the deployed Render backend.

## Architecture the spec prescribes

Not our decisions to make:

- A **page-based state machine in `App.jsx`**: `home`, `form`, `preview`, `portfolio`
- A shared **`EMPTY_FORM`** exported from `App.jsx`, so every page agrees on the data shape
- `handleStartFlow` gates page access behind authentication
- `handleAuthSuccess` pre-fills form data and redirects to the intended page
- `handleSelectTemplate` carries the landing-page template choice into the form
- **`pendingPage`** holds the originally intended destination across login
- Backend resume logic in **`routes/resume.js`**, mounted under `/api`; `index.js` is the
  Express entry point
- **CORS** allowing `localhost:5173`–`5176`, plus the deployed Vercel URL in production
- JSON payloads up to **10MB**
- **`/api/health`** returning the model name and `apiKeyConfigured` status
- A **global error handler** in `index.js` returning structured JSON with `error` and
  `details` fields; input validation in the resume route before calling Gemini
- Performance: lazy `useState` initialiser for `currentUser` to avoid repeated
  LocalStorage reads; functional `setState` (`prev => ({...prev, ...})`) to avoid stale state

## Test cases the spec names

| ID | Input | Expected |
|---|---|---|
| TC01 | Valid form submission, all fields | AI-generated resume shown in preview |
| TC02 | Login with valid credentials | User pre-filled in form, redirected to form page |
| TC03 | "Get Started" without login | Auth modal opens in signup mode |
| TC04 | Select template on landing page | Form opens with that template in state |
| TC05 | Health check call | JSON with model name and `apiKeyConfigured` |
| TC06 | Submit with missing required fields | Validation error handled gracefully |
| TC07 | Preview → portfolio | `PortfolioPreview` renders from the same form data |

Unit tests cover `ResumeForm` state updates on input change, and the Express resume route's
Gemini call structure and response handling.

## Build strategy — incremental, always demoable

Every slice ends with something that runs. Never leave the repo mid-refactor.

| # | Slice | Done means |
|---|---|---|
| 0 | Vite React app + Express server, `/api/health` | Both dev servers run; health reports model and `apiKeyConfigured` |
| 1 | `EMPTY_FORM` + page state machine, all four views | Click through home → form → preview → portfolio |
| 2 | `ResumeForm`, six sections, dynamic arrays | Fill it, submit, data reaches `App.jsx` |
| 3 | `/api/resume` + real Gemini generation | Real form data in, generated content in preview |
| 4 | `AuthModal`, LocalStorage, `pendingPage` gating | Sign up, land on the page you originally wanted |
| 5 | Multiple templates + portfolio preview | Switch template, both previews render from one form |
| 6 | Error handling, tests (TC01–TC07), deploy, README | Tests green, Vercel + Render live |

Do not start a slice until the previous one runs.

## Kanban and deliverables

29 tasks, all in To-Do. Move each to review as it is finished, not at the end. The Overview
tab wants a **demo link** and a **GitHub link** — both graded, along with the demo video.

## Working notes

- Tell me the current slice number at the start of each response.
- Before writing code for a slice, state the plan as one line per step with its
  verification, then run it.
- Verify by actually running things. "Working" means you hit the URL or clicked the button.
- **A slice is not verified until a real request has left the machine.** Unit tests against
  a fake passed the entire time a wrong Gemini model id was breaking every real call.
- Never commit the API key, `.env`, or real personal data. Ship a `.env.example` with empty
  values — `.env.example` is tracked and goes to GitHub, so a key pasted there is a leak.
- Always give me the curl commands to run manually. Hand me the command, don't just report
  that you ran it.

## Git workflow

- **One branch per slice**, off `main`: `slice-0-scaffold`, `slice-1-state-machine`, and so on.
- Commit frequently. Never amend a commit I have already seen.
- **A branch reaches `main` only with my explicit approval.** Push, tell me what is on it, wait.
- **Open a PR for every branch, with a real description**: what changed and why, how it was
  tested, actual pasted output, and known limitations. There is no CI, so the PR body is the
  only review artifact. Open it as soon as the branch is pushed. Opening a PR is not merging.

## Relationship to my global CLAUDE.md

My user-level `CLAUDE.md` applies in full — simplicity first, surgical diffs, verify don't
assert, tests for new functions, no invented APIs, no commits unless asked.

Where this file is stricter, this file wins:

- **The spec outranks both files.** If a requirement here contradicts the SkillWallet page,
  the SkillWallet page is right.
- **No inventing scope, and no cutting mandatory scope.** All five functional requirements
  ship. If time runs short, say so — do not quietly drop one.
