from pathlib import Path

from fastapi import Depends, FastAPI, Request, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates

from app.extraction import UnreadablePDF, extract_text
from app.parsing import ParseFailed, ResumeParser, get_parser

TEMPLATES_DIR = Path(__file__).parent / "templates"

# Resumes are small. This bounds memory on a 512 MB free-tier instance and is
# enforced while streaming, since Content-Length is attacker-controlled.
MAX_UPLOAD_BYTES = 5 * 1024 * 1024
CHUNK_BYTES = 64 * 1024

app = FastAPI(title="resumefolio", docs_url=None, redoc_url=None)
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Baseline hardening. The app serves user-derived content on a public URL,
    so these ship from slice 0 rather than being retrofitted later."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


@app.get("/health")
async def health() -> JSONResponse:
    return JSONResponse({"status": "ok"})


@app.get("/", response_class=HTMLResponse)
async def upload_page(request: Request) -> HTMLResponse:
    return templates.TemplateResponse(request, "upload.html")


async def _read_capped(upload: UploadFile) -> bytes:
    """Read the upload, refusing anything over MAX_UPLOAD_BYTES.

    Reads incrementally so an oversized file is rejected without ever being held
    in memory in full.
    """
    chunks: list[bytes] = []
    total = 0
    while chunk := await upload.read(CHUNK_BYTES):
        total += len(chunk)
        if total > MAX_UPLOAD_BYTES:
            raise ValueError(
                f"file exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit"
            )
        chunks.append(chunk)
    return b"".join(chunks)


@app.post("/api/resumes", response_class=HTMLResponse)
async def create_resume(
    request: Request,
    file: UploadFile,
    parser: ResumeParser = Depends(get_parser),
) -> HTMLResponse:
    """Slice 2: extract the text, parse it into fields, show them."""
    if file.content_type != "application/pdf":
        return _error(request, f"Expected a PDF, got {file.content_type!r}.", 415)

    try:
        data = await _read_capped(file)
    except ValueError as exc:
        return _error(request, str(exc), 413)

    if not data:
        return _error(request, "The uploaded file is empty.", 400)

    try:
        text = extract_text(data)
    except UnreadablePDF as exc:
        return _error(request, str(exc), 422)

    try:
        resume = parser.parse(text)
    except ParseFailed as exc:
        return _error(request, str(exc), 502)

    # Jinja2 autoescapes, so resume text renders as text and never as markup.
    return templates.TemplateResponse(
        request, "upload.html", {"resume": resume, "extracted_text": text}
    )


def _error(request: Request, message: str, status: int) -> HTMLResponse:
    return templates.TemplateResponse(
        request, "upload.html", {"error": message}, status_code=status
    )
