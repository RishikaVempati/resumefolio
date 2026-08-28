# CLAUDE.md — Auto Resume Portfolio Builder

## What this is

A capstone project. Upload a resume PDF, get back a shareable portfolio web page generated from it.

Single flow, end to end:

```
PDF upload → text extraction → LLM structured parse → JSON → HTML template → shareable URL
```

## Hard constraints — read these before suggesting anything

- **Total budget is ~5 hours.** This is the dominant constraint. It outranks elegance, completeness, and every "while we're here" improvement.
- The official scope estimate is 20 hours. **We are not building 20 hours of scope.** We are building one narrow vertical slice, finished properly. That tradeoff is deliberate and is documented in the README.
- Deliverables: public GitHub repo + a recorded demo video for mentor review.
- Every completed user story gets moved to `review` on the Kanban board as we go, not at the end.

## Build strategy — incremental deployable slices

Work in slices. **Every slice must end with a running, demoable system.** Never leave the repo mid-refactor. If the clock ran out right now, whatever exists should be submittable.

| # | Slice | Done means |
|---|---|---|
| 0 | Skeleton deployed: FastAPI app, `/health`, static upload page, Dockerfile | Public URL returns 200 |
| 1 | Upload → PDF text extraction → dump raw text on page (no LLM yet) | Upload a real resume, see its text |
| 2 | LLM parse into a 3-field schema (name, email, summary) behind the parser interface | Real resume in, valid JSON out |
| 3 | Full schema + real portfolio template | Output looks like a portfolio, not a debug dump |
| 4 | Hardening: validation, 429 backoff, rate limiting, tests, CI | `pytest` green, CI passing |
| 5 | Demo video, README, Kanban cards moved | Submitted |

**The cut line is after slice 2.** At that point the project is complete and submittable. Slices 3–5 are quality, not existence. If we are behind, we ship from the cut line rather than leaving slice 3 half-done.

Do not start a slice until the previous one is deployed and verified working.

## Stack

| Layer | Choice |
|---|---|
| Backend | Python + FastAPI |
| PDF extraction | `pdfplumber` — better layout handling than `pypdf` |
| LLM | Gemini Flash / Flash-Lite via `google-genai`, Google AI Studio free tier |
| Templating | Jinja2, server-rendered |
| Styling | Tailwind via Play CDN — one script tag, no build step |
| Storage | Supabase Postgres |
| Tests | `pytest`, parameterized, using the stub parser |
| Deploy | Docker container on Render free tier |

Standard library and framework built-ins where possible. Adding a dependency is a decision worth naming out loud.

## Frontend — where design effort goes

There are two frontends and they matter very unequally:

| Surface | Who sees it | Effort |
|---|---|---|
| Uploader page | The user, for ten seconds, once | Minimal. File input, spinner, error state. |
| **Generated portfolio** | Everyone the user shares it with | **This is the product. Design effort goes here.** |

A reviewer spends seconds on the uploader and minutes on the portfolio output. Do not spend time making the uploader pretty.

No JS framework. There is almost no client state, and React with default styling looks worse than clean HTML with good typography. Design quality comes from typography, spacing, and hierarchy — not from the framework.

For the portfolio template: one strong typeface pairing, generous whitespace, clear hierarchy, one accent color. That is the whole brief.

Known tradeoff to document in the README: the Tailwind Play CDN is not intended for production traffic. The fix is a proper build step. Naming this is better than hiding it.

## Architecture decisions already made

**The parser goes behind an interface.** Two implementations from slice 2 onward:

```python
class ResumeParser(Protocol):
    def parse(self, text: str) -> Resume: ...
```

- `GeminiParser` — real API call
- `StubParser` — returns a fixed fielded response

Non-negotiable. Tests run without a network call, and the demo survives a rate limit or dead key mid-recording.

**Storage goes behind two functions**, `save_portfolio` and `get_portfolio`. No Supabase calls scattered through route handlers. Same reasoning as the parser: swappable and mockable.

**Supabase is Postgres only.** No auth, no storage buckets, no realtime. Those are all out of scope.

Storage is Supabase rather than SQLite because Render's free tier has an ephemeral filesystem — a redeploy or restart would wipe local SQLite and silently break every portfolio URL already shared. That failure mode is unacceptable when a mentor may click a link days after watching the demo.

**Endpoints:**
- `POST /api/resumes` — upload and parse
- `GET  /p/{token}` — rendered portfolio, public
- `GET  /health`

**Portfolio tokens must be random and unguessable.** Use `secrets.token_urlsafe(12)`. Never sequential integers — `/p/1`, `/p/2` lets anyone enumerate every resume ever uploaded, exposing real names, emails, and work history.

**Schema grows with the slices.** Slice 2 is three fields. Slice 3 expands to `name, contact, summary, experience[], education[], skills[], projects[]`. Do not build the full schema early.

## Access model

No accounts, no login. A user hits the app URL, uploads a PDF, receives a portfolio link, and shares it. That link is the distribution mechanism.

The consequence: a user cannot return to edit, update, or delete their portfolio. This is the correct scope call for the capstone and must be stated as a known limitation in the README.

**Render free tier cold starts:** services spin down after ~15 minutes idle and take 30–50 seconds to wake. Warm the URL before recording the demo, and note the limitation in the README with the paid tier as the fix.

## Explicitly out of scope

Do not build these, do not suggest them, do not leave hooks for them:

- User accounts, auth, sessions
- Multiple portfolio templates or a template picker
- An editor for the parsed resume
- Custom domains
- Resume file formats other than PDF
- Analytics, admin panels, any dashboard
- Job description matching or ATS scoring
- Microservices, message queues, or any distributed anything
- A JS frontend framework or any frontend build step

If a request seems to need one of these, say so and stop rather than building it.

## Future features — only if slices 0–5 are all done with real time to spare

In priority order. Pick one, complete it, stop.

1. **DOCX input** alongside PDF. Highest value per hour, isolated change at the extraction layer.
2. **Download portfolio as static HTML.** Small, and makes the demo stronger.
3. **Second portfolio template** with a picker.
4. **Inline editing** of parsed fields before rendering. Biggest of the four, real state management.

Anything here gets its own branch and must not destabilize a working slice.

## Relationship to my global CLAUDE.md

My user-level `CLAUDE.md` still applies in full — simplicity first, surgical diffs, verify don't assert, tests for new functions, no invented APIs, no commits unless asked.

Two places this file is deliberately stricter, and this file wins:

- **Scope refusals are harder here.** The out-of-scope list is absolute for the duration of this project, even if adding something would be trivial.
- **Ship over polish at the cut line.** If slice 2 works and time is short, stop. Do not start slice 3 to make it nicer.

Flag it if anything in this file seems to contradict the global agreement in some way I have not anticipated.

## Working notes

- Tell me the current slice number at the start of each response.
- Before writing code for a slice, state the plan as one line per step with its verification, then run it.
- Verify by actually running things. "Deployed and working" means you hit the URL.
- Never commit the API key, Supabase credentials, `.env`, or any real resume PDF used for testing. Ship a `.env.example`.
- Always give me the curl commands to run manually, so I can execute them myself and
  understand what is happening. Don't just report that you verified something — hand me
  the command that lets me verify it too.

## Git workflow

- **One branch per slice.** Branch off `main` before writing any code for a slice:
  `slice-1-pdf-extraction`, `slice-2-llm-parse`, and so on.
- **Commit frequently, and never amend a commit I have already seen.** Each slice gets
  its own new commit (or several). Do not fold new work into an existing commit.
- **A branch reaches `main` only with my explicit approval.** Push the branch, tell me
  what is on it, then wait. Do not merge or open-and-merge a PR on your own.
