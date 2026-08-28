"""Resume text -> structured fields.

The parser sits behind a Protocol with two implementations. Tests and the demo
run on StubParser, so neither needs a network call, an API key, or luck with a
rate limit. GeminiParser is the real one.
"""

import os
from functools import lru_cache
from typing import Protocol

from google import genai
from google.genai import errors, types
from pydantic import BaseModel

# Flash is the cheapest model on the free tier that reliably honours a response
# schema, which is what keeps the output parseable.
MODEL = "gemini-2.5-flash"

# A 20-page PDF can be far more text than a resume's worth. Bound what we send:
# it caps token cost and stops a padded upload from driving the bill.
MAX_INPUT_CHARS = 20_000

INSTRUCTION = """You extract fields from resume text.

Return only what the resume actually states. Never invent a name, an email, or an
accomplishment. If a field is genuinely absent, return an empty string for it.

summary: two or three sentences, in the third person, describing who this person
is professionally. Draw it from the resume; do not embellish."""


class Resume(BaseModel):
    """Slice 2's schema. It grows to the full portfolio shape in slice 3."""

    name: str
    email: str
    summary: str


class ParseFailed(Exception):
    """The resume text could not be turned into a Resume."""


class ResumeParser(Protocol):
    def parse(self, text: str) -> Resume: ...


class StubParser:
    """A fixed response. Used by tests and whenever GEMINI_API_KEY is unset."""

    def parse(self, text: str) -> Resume:
        return Resume(
            name="Ada Lovelace",
            email="ada@example.com",
            summary=(
                "A mathematician and writer known for work on Charles Babbage's "
                "Analytical Engine. Wrote the first published algorithm intended "
                "for a machine."
            ),
        )


class GeminiParser:
    def __init__(self, api_key: str, model: str = MODEL) -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def parse(self, text: str) -> Resume:
        try:
            response = self._client.models.generate_content(
                model=self._model,
                contents=text[:MAX_INPUT_CHARS],
                config=types.GenerateContentConfig(
                    system_instruction=INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=Resume,
                    temperature=0,
                ),
            )
        except errors.APIError as exc:
            retry = "Retrying in a moment may help." if exc.code >= 429 else (
                "Retrying will not help."
            )
            raise ParseFailed(
                f"Gemini rejected the request (HTTP {exc.code}). {retry}"
            ) from exc

        parsed = response.parsed
        if not isinstance(parsed, Resume):
            # Schema-constrained decoding can still come back empty when the model
            # stops early — a safety block or the token ceiling.
            raise ParseFailed(
                "Gemini returned no usable JSON for this resume. Retrying may help."
            )
        return parsed


@lru_cache(maxsize=1)
def get_parser() -> ResumeParser:
    """The real parser when a key is configured, the stub otherwise.

    Cached because GeminiParser holds an HTTP client that should outlive one request.
    """
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    return GeminiParser(api_key) if api_key else StubParser()
