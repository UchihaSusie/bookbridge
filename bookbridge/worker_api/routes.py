"""FastAPI route handlers wrapping bookbridge ingestion and harness modules."""

import logging
import re
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Form, HTTPException, UploadFile

from bookbridge.harness import get_translator
from bookbridge.harness.translator import (
    ExtractedTerm,
    GlossaryEntry,
    TranslateResult,
    TranslatorError,
    render_glossary_prompt_section,
)
from bookbridge.ingestion.chunker import build_chunk_manifest
from bookbridge.ingestion.pdf_reader import extract_pages
from bookbridge.worker_api.callback import (
    post_glossary_callback,
    post_worker_callback,
)
from bookbridge.worker_api.models import (
    ChunkData,
    GlossaryTermInput,
    HealthResponse,
    JobStatusResponse,
    SummarizeRequest,
    SummarizeResponse,
    TranslateChunkAsyncRequest,
    TranslateChunkRequest,
    TranslateChunkResponse,
)

logger = logging.getLogger(__name__)


def _to_glossary_entries(
    inputs: list[GlossaryTermInput] | None,
) -> list[GlossaryEntry] | None:
    if not inputs:
        return None
    return [
        GlossaryEntry(
            english=i.english,
            translation=i.translation,
            category=i.category,
            approved=i.approved,
        )
        for i in inputs
    ]


router = APIRouter()

MAX_PDF_BYTES = 50 * 1024 * 1024  # 50 MB

# In-memory job store — used only by /parse for the deprecated async polling path.
# /translate/chunk is now synchronous and does not write here (ref issue #52).
_jobs: dict[str, dict] = {}

# Tight character set so arbitrary URL-unsafe or injection-flavoured values are
# rejected before reaching the translator or callback. Accepts UUIDs and CUIDs.
JOB_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{8,128}$")


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok")


@router.post("/parse", response_model=TranslateChunkResponse)
def parse(
    file: UploadFile,
    chapter_count: int | None = Form(default=None),
) -> TranslateChunkResponse:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")
    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=422, detail="Only PDF files are accepted.")

    data = file.file.read(MAX_PDF_BYTES + 1)
    if len(data) > MAX_PDF_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds maximum allowed size (50 MB).")

    if chapter_count is not None and chapter_count <= 0:
        raise HTTPException(status_code=422, detail="chapter_count must be a positive integer.")

    tmp_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(data)
            tmp_path = Path(tmp.name)
        pages = extract_pages(tmp_path)

        if chapter_count is not None and chapter_count > len(pages):
            raise HTTPException(
                status_code=422,
                detail=f"chapter_count ({chapter_count}) exceeds total pages ({len(pages)}).",
            )

        manifest = build_chunk_manifest(
            pages, source_file=file.filename, chapter_count=chapter_count
        )
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=422, detail="Could not read the uploaded PDF.")
    finally:
        if tmp_path is not None:
            tmp_path.unlink(missing_ok=True)

    chunks = [
        ChunkData(
            chunk_id=c.chunk_id,
            title=c.title,
            start_page=c.start_page,
            end_page=c.end_page,
            page_count=c.page_count,
            content="\n\n".join(pages.get(p, "") for p in range(c.start_page, c.end_page + 1)),
        )
        for c in manifest.chunks
    ]
    if not chunks:
        raise HTTPException(
            status_code=422,
            detail="No chapter markers found in the PDF.",
        )

    job_id = str(uuid.uuid4())
    _jobs[job_id] = {"status": "completed", "chunks": chunks, "error": None}
    return TranslateChunkResponse(job_id=job_id, status="completed", chunks=chunks)


@router.post("/translate/chunk", response_model=TranslateChunkResponse)
def translate_chunk(body: TranslateChunkRequest) -> TranslateChunkResponse:
    """Translate a chunk synchronously via the configured harness provider."""
    try:
        translator = get_translator()
    except ValueError as exc:
        logger.error("translator configuration error: %s", exc)
        raise HTTPException(status_code=500, detail="Translation provider misconfigured") from exc

    try:
        result = translator.translate(
            text=body.source_text,
            source_lang="en",
            target_lang=body.target_lang,
            glossary=_to_glossary_entries(body.glossary),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except TranslatorError as exc:
        logger.warning("translator provider returned no result: %s", exc)
        raise HTTPException(status_code=502, detail="Translation provider failed") from exc
    except Exception as exc:
        logger.exception("translator raised unexpected error: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Translation provider failed") from exc

    return TranslateChunkResponse(
        job_id=str(uuid.uuid4()),
        status="completed",
        translation=result.text,
    )


def _translate_with_user_creds(
    source_text: str,
    target_lang: str,
    glossary: list[GlossaryEntry] | None,
    context: str | None,
    llm_creds: dict,
) -> TranslateResult:
    """Translate using per-user credentials via chat_completion.

    Asks for structured JSON output ({"text": ..., "new_terms": [...]})
    so both translation AND term extraction happen in a single LLM call.
    Falls back gracefully when a model ignores response_format and returns
    plain text — in that case new_terms is empty and the raw content
    becomes TranslateResult.text.
    """
    import json as _json

    from bookbridge.worker_api.llm import chat_completion
    from bookbridge.worker_api.models import LLMCredentials

    creds = LLMCredentials(**llm_creds)

    prompt_parts = [
        f"Translate from en to {target_lang}.",
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
        prompt_parts.append("")
        prompt_parts.append(glossary_section)

    text_to_translate = source_text
    if context:
        text_to_translate = (
            "[Translation context — use for consistency, do not translate this section]\n"
            f"{context}\n"
            "[End of context — translate only the text below]\n\n"
            f"{source_text}"
        )

    raw_content = chat_completion(
        system_prompt="\n".join(prompt_parts),
        user_content=text_to_translate,
        llm=creds,
        response_format={"type": "json_object"},
    )

    # Best-effort parse. A model that ignored response_format shouldn't crash
    # the translation path — we fall back to raw text with no new_terms.
    stripped = raw_content.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.startswith("json"):
            stripped = stripped[len("json") :].lstrip()

    try:
        parsed = _json.loads(stripped)
    except _json.JSONDecodeError:
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
                "user-creds path: invalid JSON — lenient extraction recovered %d chars",
                len(extracted),
            )
            return TranslateResult(text=extracted, new_terms=[])
        logger.warning("user-creds path: LLM returned non-JSON, using raw text")
        return TranslateResult(text=raw_content, new_terms=[])

    if not isinstance(parsed, dict) or "text" not in parsed:
        logger.warning("user-creds path: LLM JSON missing 'text' key")
        return TranslateResult(text=raw_content, new_terms=[])

    translated = parsed.get("text")
    if not isinstance(translated, str) or not translated:
        logger.warning("user-creds path: LLM 'text' field empty or non-string")
        return TranslateResult(text=raw_content, new_terms=[])

    existing_lower = {g.english.lower() for g in glossary or []}
    new_terms: list[ExtractedTerm] = []
    allowed_categories = {"person", "place", "organization", "technical", "general"}
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
        if cat not in allowed_categories:
            cat = "general"
        new_terms.append(
            ExtractedTerm(
                english=eng.strip(),
                translation=tran.strip(),
                category=cat,
            )
        )

    logger.info(
        "user-creds path: parsed LLM response — text=%d chars, new_terms=%d",
        len(translated),
        len(new_terms),
    )
    return TranslateResult(text=translated, new_terms=new_terms)


def _translate_with_server_creds(
    source_text: str,
    target_lang: str,
    glossary: list[GlossaryEntry] | None,
    context: str | None,
) -> TranslateResult:
    """Translate using the server-wide Translator protocol.

    Used when the caller has no per-user LLM credentials (server-env path).
    The configured provider (mock / openai_compat / ...) returns a
    TranslateResult with both text and new_terms — extraction happens as a
    side-output of the translation call.
    """
    translator = get_translator()
    text_to_translate = source_text
    if context:
        text_to_translate = (
            "[Translation context — use for consistency, do not translate this section]\n"
            f"{context}\n"
            "[End of context — translate only the text below]\n\n"
            f"{source_text}"
        )
    return translator.translate(
        text=text_to_translate,
        source_lang="en",
        target_lang=target_lang,
        glossary=glossary,
    )


def translate_and_callback(
    job_id: str,
    source_text: str,
    target_lang: str,
    project_id: str | None = None,
    glossary: list[GlossaryEntry] | None = None,
    context: str | None = None,
    llm_creds: dict | None = None,
) -> None:
    """Background-task worker: translate and POST results back to Next.js.

    Never raises — any exception is caught and reported via the callback as
    FAILED with a generic error, so the BFF poller surfaces it cleanly.

    If the translator produces new_terms (server-creds path only) AND the
    caller supplied a project_id, those terms are POSTed to the glossary
    callback for insertion under the merge rule (exists → skip).
    """
    try:
        if llm_creds and llm_creds.get("llm_api_key"):
            result = _translate_with_user_creds(
                source_text, target_lang, glossary, context, llm_creds
            )
        else:
            result = _translate_with_server_creds(source_text, target_lang, glossary, context)
    except Exception as exc:
        logger.warning(
            "background translation failed for job %s: %s",
            job_id,
            type(exc).__name__,
        )
        post_worker_callback({"job_id": job_id, "status": "FAILED", "error": "Translation failed"})
        return

    if project_id and result.new_terms:
        post_glossary_callback(
            project_id=project_id,
            terms=[
                {
                    "english": t.english,
                    "translation": t.translation,
                    "category": t.category,
                }
                for t in result.new_terms
            ],
        )

    summary_text = None
    try:
        from bookbridge.worker_api.llm import chat_completion
        from bookbridge.worker_api.models import LLMCredentials

        system_prompt = (
            "Summarize the following text in 100 words or fewer. "
            "Write a concise, informative summary suitable as a chapter overview. "
            "Return only the summary text in English."
        )

        creds = None
        if llm_creds and llm_creds.get("llm_api_key"):
            creds = LLMCredentials(**llm_creds)

        content = chat_completion(
            system_prompt=system_prompt,
            user_content=source_text[:8000],
            llm=creds,
            timeout=60,
        )
        summary_text = content.strip()
    except Exception as exc:
        logger.warning(
            "summarize during translation failed for job %s: %s: %s",
            job_id,
            type(exc).__name__,
            exc,
        )

    payload = {
        "job_id": job_id,
        "status": "SUCCEEDED",
        "translated_content": result.text,
    }
    if summary_text:
        payload["summary"] = summary_text

    post_worker_callback(payload)


@router.post("/translate/chunk/async", status_code=202)
def translate_chunk_async(
    body: TranslateChunkAsyncRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    """Accept translation job, return 202 immediately, run work in background.

    The background task POSTs the translation result back to Next.js via
    post_worker_callback, and any extracted glossary terms via
    post_glossary_callback (when project_id is provided).
    """
    if not JOB_ID_PATTERN.match(body.job_id):
        raise HTTPException(status_code=400, detail="Invalid job_id format")

    background_tasks.add_task(
        translate_and_callback,
        body.job_id,
        body.source_text,
        body.target_lang,
        body.project_id,
        _to_glossary_entries(body.glossary),
        body.context,
        body.llm.model_dump() if body.llm else None,
    )
    return {"job_id": body.job_id, "status": "accepted"}


@router.get("/job/{job_id}", response_model=JobStatusResponse)
def get_job(job_id: str) -> JobStatusResponse:
    job = _jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        error=job.get("error"),
        chunks=job.get("chunks"),
    )


@router.post("/summarize", response_model=SummarizeResponse)
def summarize(body: SummarizeRequest) -> SummarizeResponse:
    """Generate a short summary of the given text using the configured LLM."""
    from bookbridge.worker_api.llm import chat_completion

    system_prompt = (
        f"Summarize the following text in {body.max_words} words or fewer. "
        "Write a concise, informative summary suitable as a chapter overview. "
        "Return only the summary text."
    )
    try:
        content = chat_completion(
            system_prompt=system_prompt,
            user_content=body.text[:8000],
            llm=body.llm,
            timeout=30,
        )
    except ValueError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("summarize failed: %s", type(exc).__name__)
        raise HTTPException(status_code=502, detail="Summarization failed") from exc

    return SummarizeResponse(summary=content.strip())
