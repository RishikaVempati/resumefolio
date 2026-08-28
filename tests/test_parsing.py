import pytest
from google.genai import errors

from app.parsing import (
    GeminiParser,
    ParseFailed,
    Resume,
    StubParser,
    get_parser,
)


def test_stub_returns_a_complete_resume():
    resume = StubParser().parse("any text at all")
    assert resume.name and resume.email and resume.summary


def test_stub_is_fixed_regardless_of_input():
    """The demo and the tests depend on the stub never varying."""
    assert StubParser().parse("one") == StubParser().parse("two")


class FakeModels:
    def __init__(self, result):
        self._result = result
        self.calls = []

    def generate_content(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self._result, Exception):
            raise self._result
        return self._result


class FakeResponse:
    def __init__(self, parsed):
        self.parsed = parsed


class FakeClient:
    """Stands in for genai.Client, whose `models` is a read-only property."""

    def __init__(self, models):
        self.models = models


def gemini_with(result) -> tuple[GeminiParser, FakeModels]:
    """A GeminiParser wired to a fake transport — no key, no network."""
    parser = GeminiParser("test-key")
    models = FakeModels(result)
    parser._client = FakeClient(models)
    return parser, models


def test_gemini_returns_the_parsed_resume():
    expected = Resume(name="Grace Hopper", email="grace@example.com", summary="Rear Admiral.")
    parser, models = gemini_with(FakeResponse(expected))

    assert parser.parse("resume text") == expected
    assert models.calls[0]["contents"] == "resume text"
    assert models.calls[0]["config"].response_schema is Resume


def test_gemini_truncates_oversized_input():
    parser, models = gemini_with(FakeResponse(Resume(name="a", email="b", summary="c")))
    parser.parse("x" * 50_000)
    assert len(models.calls[0]["contents"]) == 20_000


@pytest.mark.parametrize(
    "code,retryable",
    [(400, False), (403, False), (404, False), (429, True), (500, True), (503, True)],
)
def test_gemini_api_errors_become_parse_failed_with_retry_guidance(code, retryable):
    parser, _ = gemini_with(errors.APIError(code, {"error": {"message": "nope"}}))

    with pytest.raises(ParseFailed) as caught:
        parser.parse("resume text")

    message = str(caught.value)
    assert str(code) in message
    assert ("may help" in message) is retryable


def test_gemini_raises_when_no_json_comes_back():
    parser, _ = gemini_with(FakeResponse(None))
    with pytest.raises(ParseFailed):
        parser.parse("resume text")


@pytest.mark.parametrize(
    "key,expected",
    [(None, StubParser), ("", StubParser), ("   ", StubParser), ("real-key", GeminiParser)],
)
def test_get_parser_uses_the_real_parser_only_with_a_key(monkeypatch, key, expected):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    if key is not None:
        monkeypatch.setenv("GEMINI_API_KEY", key)
    get_parser.cache_clear()

    assert isinstance(get_parser(), expected)

    get_parser.cache_clear()
