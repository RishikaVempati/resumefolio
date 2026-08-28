# resumefolio

> Capstone project: **Auto Resume Portfolio Builder** (Generative AI, Intermediate).

Upload a resume PDF, get back a shareable portfolio web page generated from it.

```
PDF upload → text extraction → LLM structured parse → JSON → HTML template → shareable URL
```

## Status

Built in deployable slices. Current: **slice 2 — LLM parse**.

| # | Slice | State |
|---|---|---|
| 0 | FastAPI app, `/health`, upload page, Dockerfile | ✅ |
| 1 | Upload → PDF text extraction | ✅ |
| 2 | LLM parse behind a `ResumeParser` interface | ☐ |
| 3 | Full schema + portfolio template | ☐ |
| 4 | Validation, rate limiting, tests, CI | ☐ |
| 5 | Demo video, docs | ☐ |

## Run locally

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
cp .env.example .env          # fill in when slices 2+ need it
.venv/bin/uvicorn app.main:app --reload
```

Then http://127.0.0.1:8000 — and `curl http://127.0.0.1:8000/health`.

With Docker:

```bash
docker build -t resumefolio . && docker run -p 8000:8000 resumefolio
```

## Scope

The official estimate for this brief is ~20 hours. This is built in ~5. That is a
deliberate trade: **one narrow vertical slice finished properly** beats a wide,
half-working surface. Everything cut is listed below rather than hidden.

### Known limitations

- **No accounts.** A portfolio link is the only handle on it — a user cannot return
  to edit or delete their portfolio. Correct scope call here; wrong for a real product.
- **Tailwind via Play CDN**, not a build step. Not intended for production traffic;
  the fix is a real Tailwind build.
- **Render free tier cold starts.** The service sleeps after ~15 min idle and takes
  30–50s to wake. Fix is a paid instance.
- **PDF only.** No DOCX, no plain text.
- **No OCR.** `pdfplumber` reads embedded text; a scanned resume is rejected with a 422.
