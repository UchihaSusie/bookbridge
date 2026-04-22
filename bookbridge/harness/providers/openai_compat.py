"""OpenAI-compatible translator provider.

Works against any `/chat/completions`-style endpoint (OpenAI, DeepSeek,
Moonshot/Kimi, Zhipu GLM, Qwen, Groq, local Ollama, ...). Config is read
from env at call time so the Worker can switch providers without a restart.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request

from bookbridge.harness.translator import (
    ExtractedTerm,
    GlossaryEntry,
    TranslateResult,
    Translator,
    TranslatorError,
    render_glossary_prompt_section,
    validate_input,
)

logger = logging.getLogger(__name__)

# Default 60 s — DeepSeek/Moonshot on long chunks can exceed this. Override
# with LLM_TIMEOUT_SECONDS env var without touching code.
DEFAULT_TIMEOUT_SECONDS: float = 60.0


def _request_timeout() -> float:
    raw = os.environ.get("LLM_TIMEOUT_SECONDS", "").strip()
    if not raw:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        v = float(raw)
        # Clamp to [5, 600] — prevents a typo like "5000" from hanging a worker
        # for 83 minutes, and a typo like "0.1" from spamming timeouts.
        return max(5.0, min(600.0, v))
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS


# Kept as a module-level constant for backwards compat with existing tests
# that patch it. Live code reads _request_timeout() so env overrides apply.
REQUEST_TIMEOUT_SECONDS: float = DEFAULT_TIMEOUT_SECONDS

_ALLOWED_CATEGORIES = frozenset({"person", "place", "organization", "technical", "general"})


class OpenAICompatTranslator(Translator):
    """POSTs to `{LLM_BASE_URL}/chat/completions` with an OpenAI-format body.

    Env vars (read per call):
      - LLM_BASE_URL — base URL including `/v1` (never taken from user input: A10/SSRF)
      - LLM_API_KEY  — bearer token (never logged)
      - LLM_MODEL    — opaque model id, echoed only in the JSON body

    Requests structured JSON output (`{"text": ..., "new_terms": [...]}`)
    so translation and term extraction happen in a single LLM call. Falls
    back gracefully when the model returns plain text (e.g. older models
    that ignore `response_format`): wraps the raw content as `.text` with
    an empty `new_terms`.
    """

    def translate(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        glossary: list[GlossaryEntry] | None = None,
    ) -> TranslateResult:
        validate_input(text, source_lang, target_lang)

        api_key = os.environ.get("LLM_API_KEY", "")
        base_url = os.environ.get("LLM_BASE_URL", "").rstrip("/")
        model = os.environ.get("LLM_MODEL", "")
        if not api_key or not base_url or not model:
            raise ValueError("LLM provider not configured")

        system_prompt = self._build_system_prompt(source_lang, target_lang, glossary)

        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }

        req = urllib.request.Request(
            url=f"{base_url}/chat/completions",
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=_request_timeout()) as resp:
                body = json.loads(resp.read())
        except urllib.error.HTTPError as exc:
            raise TranslatorError("Translation provider failed") from exc
        except urllib.error.URLError as exc:
            raise TranslatorError("Translation provider failed") from exc
        except json.JSONDecodeError as exc:
            raise TranslatorError("Translation provider failed") from exc

        try:
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise TranslatorError("Translation provider failed") from exc

        if not isinstance(content, str) or not content:
            raise TranslatorError("Translation provider failed")

        return self._parse_structured_content(content, glossary)

    @staticmethod
    def _build_system_prompt(
        source_lang: str,
        target_lang: str,
        glossary: list[GlossaryEntry] | None,
    ) -> str:
        parts = [
            f"Translate from {source_lang} to {target_lang}.",
            "Return a JSON object with two keys:",
            '  - "text": the translated text as a plain string.',
            '  - "new_terms": an array of {english, translation, category} '
            "for any proper nouns or technical terms present in the source "
            "that are NOT already listed in the glossary below. Each "
            "category MUST be one of: person, place, organization, "
            "technical, general.",
            "If no such terms are present, return an empty array for new_terms.",
            "Return ONLY the JSON object — no preamble, no fences.",
        ]
        glossary_section = render_glossary_prompt_section(glossary)
        if glossary_section:
            parts.append("")
            parts.append(glossary_section)
        return "\n".join(parts)

    @staticmethod
    def _parse_structured_content(
        content: str,
        glossary: list[GlossaryEntry] | None,
    ) -> TranslateResult:
        # Best-effort parse. A model that ignored `response_format` or emitted
        # a code fence around the JSON shouldn't crash the translation path —
        # we fall back to using the raw content as `.text` with no new_terms.
        stripped = content.strip()
        if stripped.startswith("```"):
            # Strip markdown fence like ```json ... ``` → inner payload
            stripped = stripped.strip("`")
            if stripped.startswith("json"):
                stripped = stripped[len("json") :].lstrip()

        try:
            parsed = json.loads(stripped)
        except json.JSONDecodeError:
            # The LLM sometimes uses unescaped ASCII " as speech marks inside
            # the translated text, which breaks JSON. Try a lenient extraction
            # before giving up and storing the raw JSON blob.
            import re as _re

            lenient = _re.search(
                r'"text"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"new_terms"|"\s*\})',
                stripped,
            )
            if lenient:
                extracted = (
                    lenient.group(1)
                    .replace("\\n", "\n")
                    .replace("\\t", "\t")
                    .replace('\\"', '"')
                    .replace("\\\\", "\\")
                )
                logger.warning(
                    "openai_compat: invalid JSON (%d chars) — lenient extraction recovered %d chars",
                    len(content),
                    len(extracted),
                )
                return TranslateResult(text=extracted, new_terms=[])
            logger.warning(
                "openai_compat: LLM returned non-JSON content (%d chars); "
                "falling back to plain-text translation with no new_terms. "
                "Preview: %r",
                len(content),
                content[:120],
            )
            return TranslateResult(text=content, new_terms=[])

        if not isinstance(parsed, dict) or "text" not in parsed:
            logger.warning(
                "openai_compat: LLM JSON missing 'text' key (keys: %s); "
                "falling back to plain-text translation with no new_terms.",
                sorted(parsed.keys()) if isinstance(parsed, dict) else "not a dict",
            )
            return TranslateResult(text=content, new_terms=[])

        translated = parsed.get("text")
        if not isinstance(translated, str) or not translated:
            raise TranslatorError("Translation provider failed")

        existing_lower = {g.english.lower() for g in glossary or []}
        new_terms: list[ExtractedTerm] = []
        for raw in parsed.get("new_terms") or []:
            if not isinstance(raw, dict):
                continue
            eng = raw.get("english")
            tran = raw.get("translation")
            cat = raw.get("category", "general")
            if not isinstance(eng, str) or not eng.strip():
                continue
            if not isinstance(tran, str) or not tran.strip():
                continue
            if eng.lower() in existing_lower:
                continue
            if cat not in _ALLOWED_CATEGORIES:
                cat = "general"
            new_terms.append(
                ExtractedTerm(
                    english=eng.strip(),
                    translation=tran.strip(),
                    category=cat,
                )
            )

        logger.info(
            "openai_compat: parsed LLM response — text=%d chars, new_terms=%d",
            len(translated),
            len(new_terms),
        )
        return TranslateResult(text=translated, new_terms=new_terms)
