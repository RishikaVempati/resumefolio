import pytest
from fastapi.testclient import TestClient

from app.main import MAX_UPLOAD_BYTES, app
from tests.pdf_builder import one_page_pdf

client = TestClient(app)


def post_file(content: bytes, content_type: str = "application/pdf"):
    return client.post(
        "/api/resumes", files={"file": ("resume.pdf", content, content_type)}
    )


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_upload_shows_extracted_text():
    response = post_file(one_page_pdf("Grace Hopper grace@example.com"))
    assert response.status_code == 200
    assert "Grace Hopper grace@example.com" in response.text


def test_rejects_non_pdf_content_type():
    response = post_file(b"%PDF-1.4 whatever", content_type="text/plain")
    assert response.status_code == 415


def test_rejects_file_over_the_size_cap():
    response = post_file(b"%PDF-" + b"\x00" * MAX_UPLOAD_BYTES)
    assert response.status_code == 413


def test_rejects_empty_file():
    assert post_file(b"").status_code == 400


def test_rejects_pdf_that_cannot_be_parsed():
    assert post_file(b"%PDF-1.4\ngarbage").status_code == 422


def test_missing_file_field_is_rejected():
    assert client.post("/api/resumes").status_code == 422


@pytest.mark.parametrize("payload", ["<script>alert(1)</script>", "a & b < c"])
def test_resume_text_is_escaped_not_rendered(payload):
    """Resume text is untrusted input rendered into HTML — it must never execute."""
    response = post_file(one_page_pdf(payload))
    assert response.status_code == 200
    assert payload not in response.text
    assert "&lt;script&gt;" in response.text or "&amp;" in response.text


def test_security_headers_present():
    headers = client.get("/health").headers
    assert headers["x-content-type-options"] == "nosniff"
    assert headers["x-frame-options"] == "DENY"
