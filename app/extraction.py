"""PDF text extraction. The only place that knows about PDF internals."""

import io

import pdfplumber

# A resume is a handful of pages. Anything past this is either not a resume or an
# attempt to burn CPU on the free tier, so we stop rather than parse it all.
MAX_PAGES = 20

PDF_MAGIC = b"%PDF-"


class UnreadablePDF(Exception):
    """The upload is not a PDF we can extract text from."""


def extract_text(data: bytes) -> str:
    """Return the visible text of a PDF, pages joined by blank lines.

    Raises UnreadablePDF when the bytes are not a parseable PDF, or when the
    file parses but holds no extractable text (scanned images, for example).
    """
    if not data.startswith(PDF_MAGIC):
        raise UnreadablePDF(
            f"file does not start with {PDF_MAGIC.decode()}; it is not a PDF. "
            "Retrying will not help — upload a real PDF."
        )

    try:
        with pdfplumber.open(io.BytesIO(data)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages[:MAX_PAGES]]
    except UnreadablePDF:
        raise
    except Exception as exc:  # pdfplumber raises a wide range of parse errors
        raise UnreadablePDF(f"could not parse the PDF: {exc}") from exc

    text = "\n\n".join(page.strip() for page in pages if page.strip())
    if not text:
        raise UnreadablePDF(
            "the PDF parsed but contains no selectable text — it is most likely a "
            "scan. Retrying will not help; an OCR'd PDF would be needed."
        )
    return text
