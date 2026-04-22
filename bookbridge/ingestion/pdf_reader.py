"""PDF text extraction and cleaning utilities.

Provides functions for extracting text from PDF files and cleaning
OCR artifacts, running headers, and noise pages.
"""

import re
from collections import Counter
from pathlib import Path

RUNNING_HEADER_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^\s*CHINA\s+MI[A-Z\^£$]*V[A-Z\^£$]*[LI][A-Z\^£$]*E?\s*$", re.IGNORECASE),
    re.compile(r"^\s*EMBA.{0,3}S?Y?\s*TOWN\s*$", re.IGNORECASE),
    re.compile(r"^\s*EMBA.{0,3}SYTOWN\s+\d+\s*$", re.IGNORECASE),
    re.compile(r"^\s*\d{1,3}\s+CHINA\s+MI", re.IGNORECASE),
]

NOISE_THRESHOLD: float = 0.6
MIN_LINE_LENGTH: int = 3
MIN_ALPHA_RATIO: float = 0.3
HEADER_REPEAT_THRESHOLD: float = 0.25
HEADER_MAX_LENGTH: int = 60


def is_noise_line(line: str) -> bool:
    """Check if a line is OCR garbage.

    A line is considered noise if it is shorter than MIN_LINE_LENGTH characters
    or has an alphabetic character ratio below MIN_ALPHA_RATIO.
    Empty strings are not noise.
    """
    stripped = line.strip()
    if not stripped:
        return False
    if len(stripped) < MIN_LINE_LENGTH:
        return True
    alpha_count = sum(1 for c in stripped if c.isalpha())
    return alpha_count / len(stripped) < MIN_ALPHA_RATIO


def is_running_header(line: str) -> bool:
    """Check if a line matches known running header patterns."""
    return any(pattern.match(line) for pattern in RUNNING_HEADER_PATTERNS)


def detect_running_headers(
    pages: dict[int, str], threshold: float = HEADER_REPEAT_THRESHOLD
) -> set[str]:
    """Find lines repeated at page boundaries that are likely running headers or footers.

    Collects the first and last non-empty line of every page, then returns
    those that appear on at least `threshold` fraction of pages (min 3 pages).
    """
    if len(pages) < 4:
        return set()

    candidates: list[str] = []
    for text in pages.values():
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        if lines:
            candidates.append(lines[0])
            if len(lines) > 1:
                candidates.append(lines[-1])

    if not candidates:
        return set()

    min_count = max(3, int(len(pages) * threshold))
    counts = Counter(candidates)
    return {
        line
        for line, count in counts.items()
        if count >= min_count and 0 < len(line) < HEADER_MAX_LENGTH
    }


def is_noise_page(text: str) -> bool:
    """Determine if a page is mostly OCR garbage or scan artifacts.

    Returns True if the page is empty or if more than NOISE_THRESHOLD
    of its non empty lines are noise.
    """
    lines = [line for line in text.split("\n") if line.strip()]
    if not lines:
        return True
    noise_count = sum(1 for line in lines if is_noise_line(line))
    return noise_count / len(lines) > NOISE_THRESHOLD


def clean_page_text(text: str, extra_headers: set[str] | None = None) -> str:
    """Clean a single page of extracted text.

    Removes running headers, replaces tabs with spaces, and collapses
    multiple consecutive spaces. Pass `extra_headers` to also strip
    heuristically detected repeated lines.
    """
    lines = text.split("\n")
    cleaned: list[str] = []
    for line in lines:
        if is_running_header(line):
            continue
        if extra_headers and line.strip() in extra_headers:
            continue
        line = line.replace("\t", " ")
        line = re.sub(r"  +", " ", line)
        cleaned.append(line)
    return "\n".join(cleaned).strip()


def extract_pages(pdf_path: Path) -> dict[int, str]:
    """Extract and clean text from each page of a PDF.

    Two-pass: first extracts all raw text, then detects repeated
    header/footer lines across the whole document before cleaning.
    Returns a dict mapping 1-based page numbers to cleaned text strings.
    Noise pages are included with empty string values.
    """
    import pdfplumber

    raw: dict[int, str] = {}
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            raw[i + 1] = page.extract_text() or ""

    running_headers = detect_running_headers(raw)

    pages: dict[int, str] = {}
    for page_num, text in raw.items():
        cleaned = clean_page_text(text, extra_headers=running_headers)
        pages[page_num] = "" if is_noise_page(cleaned) else cleaned
    return pages
