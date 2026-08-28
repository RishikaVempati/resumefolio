import pytest

from app.extraction import UnreadablePDF, extract_text
from tests.pdf_builder import one_page_pdf


def test_extracts_text_from_a_pdf():
    assert extract_text(one_page_pdf("Ada Lovelace")) == "Ada Lovelace"


@pytest.mark.parametrize(
    "data, reason",
    [
        (b"", "empty file"),
        (b"not a pdf at all", "plain text"),
        (b"\x89PNG\r\n\x1a\n" + b"\x00" * 40, "a PNG pretending to be an upload"),
        (b"%PDF-1.4\ntruncated", "PDF header but corrupt body"),
    ],
)
def test_rejects_non_pdf_input(data, reason):
    with pytest.raises(UnreadablePDF):
        extract_text(data)


def test_rejects_pdf_with_no_selectable_text():
    """A scanned resume parses fine but yields nothing. Say so, don't return ''."""
    with pytest.raises(UnreadablePDF, match="no selectable text"):
        extract_text(one_page_pdf(""))
