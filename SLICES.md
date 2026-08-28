# Build log

One entry per slice: what was built, how it was tested, and the actual result.
Every slice ends with a running, demoable system.

Live URL: **https://resumefolio-0n0k.onrender.com**
Repo: **https://github.com/RishikaVempati/resumefolio**

---

## Slice 0 — Skeleton deployed

**Done means:** a public URL returns 200.

### What was built

| File | Purpose |
|---|---|
| `app/main.py` | FastAPI app: `GET /health`, `GET /` (upload page), security-headers middleware |
| `app/templates/upload.html` | Uploader page. Tailwind via Play CDN, no build step |
| `Dockerfile` | Python 3.12 slim, runs as non-root uid 10001 |
| `render.yaml` | Render config: free plan, health check at `/health` |
| `.gitignore` | Blocks `.env`, `*.pem`, service-account JSON, and `*.pdf` |
| `.env.example` | Documents env vars one slice ahead of when code reads them |

Security decisions made here rather than retrofitted later:

- `docs_url=None, redoc_url=None` — no public Swagger UI on a production URL
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`
- container runs as a non-root user
- `*.pdf` and `samples/` git-ignored, so a real resume cannot be committed by accident

### How it was tested

```bash
.venv/bin/uvicorn app.main:app --port 8123
curl -i http://127.0.0.1:8123/health
curl -s -o /dev/null -w "status=%{http_code}\n" http://127.0.0.1:8123/
curl -i https://resumefolio-0n0k.onrender.com/health     # after deploy
```

### Result

```
GET /health  → HTTP/1.1 200 OK   {"status":"ok"}
               x-content-type-options: nosniff
               x-frame-options: DENY
               referrer-policy: no-referrer
GET /        → HTTP/1.1 200 OK   text/html   1048 bytes
GET /nope    → HTTP/1.1 404 Not Found
```

Deployed to Render from commit `64e8096`, build 24.6s, `Deploy succeeded | Live`.
Live health check returned `HTTP/2 200` with `x-render-origin-server: uvicorn`.

**Known issue observed:** for the first few minutes after the service was created,
roughly a third of requests returned `404` with header `x-render-routing: no-server`
— Render's edge had not finished propagating the route. Requests never reached our
container. It settled on its own. Not an application bug.

**Deployment note:** the service was first connected as a "Public Git Repository",
which does not support auto-deploy. It was later repointed to the GitHub provider
and `Auto-Deploy: On Commit` is now set. First push to `main` will confirm it fires.

Commits: `318e870`, `64e8096`

---

## Slice 1 — Upload → PDF text extraction

**Done means:** upload a real resume, see its text.

### What was built

| File | Purpose |
|---|---|
| `app/extraction.py` | `extract_text(bytes) -> str`. The only module that knows about PDFs |
| `app/main.py` | `POST /api/resumes` — validates the upload, extracts, renders the text |
| `app/templates/upload.html` | Working form, error state, extracted-text panel |
| `tests/pdf_builder.py` | Builds a one-page PDF in memory for tests |
| `tests/test_extraction.py` | Extraction unit tests |
| `tests/test_upload.py` | Endpoint tests |

`extract_text()` raises `UnreadablePDF` with a message stating whether a retry
would help. A scanned resume gets "no selectable text — most likely a scan",
not a bare error.

Validation at the upload boundary, the one place untrusted bytes enter:

| Check | Failure | Why |
|---|---|---|
| `content_type == application/pdf` | 415 | Cheapest rejection first |
| 5 MB cap, enforced **while streaming** | 413 | `Content-Length` is attacker-controlled; trusting it lets a 2 GB body into a 512 MB instance |
| `%PDF-` magic bytes | 422 | The declared type can claim anything |
| Empty file | 400 | Distinct from a corrupt one |
| 20-page ceiling | — | A 5,000-page PDF must not pin the free tier's CPU |

Resume text renders through Jinja2 autoescaping, so injected markup is displayed,
never executed. A test asserts this rather than assuming it.

Tests generate their PDF in memory because `.gitignore` blocks `*.pdf` — no real
resume can leak into the repo, and the tests need no fixture files or network.

### How it was tested

```bash
.venv/bin/python -m pytest tests -q
```

Then, against a running server:

```bash
curl -s -X POST -F "file=@sample-resume.pdf;type=application/pdf" \
  http://127.0.0.1:8123/api/resumes | grep -A1 "Extracted text"

curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -F "file=@sample-resume.pdf;type=text/plain" http://127.0.0.1:8123/api/resumes

curl -s -X POST -F "file=@fake.pdf;type=application/pdf" \
  http://127.0.0.1:8123/api/resumes | grep "not a PDF"

curl -s -o /dev/null -w "%{http_code}\n" -X POST \
  -F "file=@big.pdf;type=application/pdf" http://127.0.0.1:8123/api/resumes
```

### Result

```
16 passed in 0.15s
```

| Case | Expected | Got |
|---|---|---|
| Valid PDF | text rendered | `Grace Hopper - grace@example.com - Rear Admiral, US Navy` |
| `type=text/plain` | 415 | 415 |
| Not a PDF | 422 + explanation | 422, "file does not start with %PDF-; it is not a PDF. Retrying will not help" |
| 6 MB file | 413 | 413 |

Test warnings: 10 `DeprecationWarning`s from Starlette calling
`asyncio.iscoroutinefunction` on Python 3.14. Third-party, not our code, and absent
in the Python 3.12 container.

**Known limitation:** `pdfplumber` extracts text, it does not do OCR. Scanned or
image-only resumes return 422. Adding OCR is out of scope for the time budget.

Commit: `ae92fd5`, branch `slice-1-pdf-extraction` — awaiting review.

---

## Slice 2 — LLM parse behind a parser interface

**Done means:** real resume in, valid JSON out.

### What was built

| File | Purpose |
|---|---|
| `app/parsing.py` | `Resume` schema, `ResumeParser` protocol, `GeminiParser`, `StubParser`, `get_parser()` |
| `app/main.py` | `POST /api/resumes` now extracts, then parses; parser injected via `Depends` |
| `app/templates/upload.html` | Parsed fields panel; raw text demoted to a `<details>` |
| `tests/test_parsing.py` | Parser unit tests, no network |
| `tests/test_upload.py` | Endpoint tests, extended for the parse step |

The schema is three fields — `name`, `email`, `summary`. It grows in slice 3.

`get_parser()` returns `GeminiParser` when `GEMINI_API_KEY` is set and `StubParser`
when it is not. Tests inject the stub through `app.dependency_overrides`, so the
suite needs no key, no network, and cannot be broken by a rate limit. The demo has
the same fallback: an expired key degrades to a fixed response instead of a 500.

Decisions worth naming:

| Decision | Why |
|---|---|
| `response_schema=Resume` + `response_mime_type=application/json` | Schema-constrained decoding. The model cannot return prose we then have to regex |
| `temperature=0` | Extraction, not writing. The same resume should give the same fields |
| Input truncated at 20,000 chars | A 20-page PDF is far more than a resume's worth of text; this bounds token cost |
| `APIError` → `ParseFailed`, surfaced as **502** | The upstream call failed, not the user's request. The message says whether a retry helps |
| `@lru_cache` on `get_parser` | The HTTP client should outlive a single request |
| System instruction forbids invention | Empty string for an absent field beats a plausible fabricated one on someone's real portfolio |

Model output is untrusted text in the page, exactly like the resume text is. A test
asserts a `<script>` tag coming back from the parser renders escaped.

### How it was tested

```bash
.venv/bin/python -m pytest tests -q
```

Then, against a running server with no key set (so, the stub):

```bash
.venv/bin/uvicorn app.main:app --port 8123

curl -s -X POST -F "file=@sample-resume.pdf;type=application/pdf" \
  http://127.0.0.1:8123/api/resumes | sed -n '/Parsed fields/,/<\/dl>/p'
```

### Result

```
34 passed in 0.32s
```

Stub path, end to end:

```html
<dt>Name</dt>    <dd>Ada Lovelace</dd>
<dt>Email</dt>   <dd>ada@example.com</dd>
<dt>Summary</dt> <dd>A mathematician and writer known for work on Charles
                     Babbage&#39;s Analytical Engine. …</dd>
```

The extracted text (`Grace Hopper grace@example.com Rear Admiral, US Navy`) still
renders below it, so the slice 1 behaviour is intact.

**Not yet verified: the live Gemini call.** No `GEMINI_API_KEY` exists on this
machine, so `GeminiParser` has only been exercised against a faked transport —
the request it builds, the truncation, every error code, and the empty-response
path are all covered by unit tests, but no real API response has been observed.
Verifying it needs a Google AI Studio key:

```bash
GEMINI_API_KEY=... .venv/bin/uvicorn app.main:app --port 8123
curl -s -X POST -F "file=@real-resume.pdf;type=application/pdf" \
  http://127.0.0.1:8123/api/resumes | sed -n '/Parsed fields/,/<\/dl>/p'
```

Until that runs, slice 2 is not signed off and stays unchecked in the README.
