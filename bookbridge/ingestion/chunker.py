"""Smart document chunker with chapter boundary detection.

Detects structural boundaries (parts, chapters, prologues) in page text
and splits documents into manageable chunks for translation.
"""

import re

from bookbridge.ingestion.models import ChunkInfo, ChunkManifest

CHAPTER_PATTERNS: list[re.Pattern[str]] = [
    # English structural markers
    re.compile(r"^\s*PART\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|\d+)", re.IGNORECASE),
    re.compile(r"^\s*BOOK\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|\d+)", re.IGNORECASE),
    re.compile(r"^\s*Chapter\s+\d+", re.IGNORECASE),
    re.compile(r"^\s*(PROEM|EPILOGUE|PROLOGUE|APPENDIX|INTERLUDE|CODA)\b", re.IGNORECASE),
    re.compile(r"^\s*(AFTERWORD|FOREWORD|INTRODUCTION|PREFACE)\b", re.IGNORECASE),
    # Roman numerals I–XXXIX standing alone on a line
    re.compile(
        r"^\s*(?=[MDCLXVImdclxvi])M{0,4}(?:CM|CD|D?C{0,3})(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})\s*$"
    ),
    # Standalone Arabic chapter number (1–999 alone on a line)
    re.compile(r"^\s*\d{1,3}\s*$"),
    # Foreign-language chapter markers
    re.compile(r"^\s*Chapitre\s+", re.IGNORECASE),  # French
    re.compile(r"^\s*Kapitel\s+", re.IGNORECASE),  # German
    re.compile(r"^\s*Cap[ií]tulo\s+", re.IGNORECASE),  # Spanish / Portuguese
    re.compile(r"^\s*Capitolo\s+", re.IGNORECASE),  # Italian
]

HEADER_SCAN_LINES: int = 3
MAX_TITLE_LENGTH: int = 80
_ALLCAPS_WORD = re.compile(r"^[A-Z][A-Z\s\-']{1,39}$")


def _is_short_allcaps_heading(line: str) -> bool:
    """Return True for short all-caps lines that look like unnumbered chapter headings.

    Requires 2–4 words, all-uppercase, no digits — avoids matching body sentences
    that happen to be capitalised.
    """
    stripped = line.strip()
    if not stripped or not _ALLCAPS_WORD.match(stripped):
        return False
    words = stripped.split()
    return 2 <= len(words) <= 4 and all(w.isupper() for w in words)


def _has_chapter_marker(text: str) -> bool:
    """Check if a page's opening lines contain a chapter marker."""
    first_lines = text.strip().split("\n")[:HEADER_SCAN_LINES]
    for line in first_lines:
        if any(pattern.search(line) for pattern in CHAPTER_PATTERNS):
            return True
        if _is_short_allcaps_heading(line):
            return True
    return False


def detect_chapter_breaks(pages: dict[int, str]) -> set[int]:
    """Find page numbers where new chapters or structural sections begin.

    Scans the first few lines of each page for structural markers
    like 'PART ONE', 'Chapter 3', 'PROEM', roman numerals, etc.
    """
    return {
        page_num for page_num, text in pages.items() if text.strip() and _has_chapter_marker(text)
    }


def build_chunk_manifest(
    pages: dict[int, str],
    max_pages_per_chunk: int = 20,
    source_file: str = "",
    chapter_count: int | None = None,
) -> ChunkManifest:
    """Build a chunk manifest by splitting pages at chapter boundaries.

    When `chapter_count` is given, skips auto-detection and divides pages
    into that many equal-sized chunks. Otherwise prefers detected chapter
    boundaries and falls back to max_pages_per_chunk.
    Pages before the first chapter marker are grouped as "Front Matter".
    """
    if not pages:
        return ChunkManifest(source_file=source_file, total_pages=0, chunks=[])

    sorted_pages = sorted(pages.keys())
    total = len(sorted_pages)

    # Manual mode: equal splits by chapter count
    if chapter_count is not None:
        pages_per_chunk = max(1, total // chapter_count)
        chunks: list[ChunkInfo] = []
        for i in range(chapter_count):
            start_idx = i * pages_per_chunk
            end_idx = total if i == chapter_count - 1 else (i + 1) * pages_per_chunk
            chunk_pages = sorted_pages[start_idx:end_idx]
            if not chunk_pages:
                break
            chunks.append(
                ChunkInfo(
                    chunk_id=i + 1,
                    title=_extract_title(pages, chunk_pages[0]),
                    start_page=chunk_pages[0],
                    end_page=chunk_pages[-1],
                    page_count=len(chunk_pages),
                )
            )
        return ChunkManifest(source_file=source_file, total_pages=total, chunks=chunks)

    # Auto-detect mode
    breaks = detect_chapter_breaks(pages)
    first_break = min(breaks) if breaks else None

    chunks = []
    chunk_id = 1
    chunk_start = sorted_pages[0]

    for i, page_num in enumerate(sorted_pages):
        pages_in_chunk = page_num - chunk_start + 1
        is_last = i == len(sorted_pages) - 1
        next_is_break = not is_last and sorted_pages[i + 1] in breaks
        at_size_limit = pages_in_chunk >= max_pages_per_chunk

        if is_last or next_is_break or at_size_limit:
            is_front_matter = (
                first_break is not None
                and chunk_start == sorted_pages[0]
                and chunk_start < first_break
            )
            title = "Front Matter" if is_front_matter else _extract_title(pages, chunk_start)
            chunks.append(
                ChunkInfo(
                    chunk_id=chunk_id,
                    title=title,
                    start_page=chunk_start,
                    end_page=page_num,
                    page_count=pages_in_chunk,
                )
            )
            chunk_id += 1
            if not is_last:
                chunk_start = sorted_pages[i + 1]

    return ChunkManifest(
        source_file=source_file,
        total_pages=len(pages),
        chunks=chunks,
    )


def _extract_title(pages: dict[int, str], start_page: int) -> str:
    """Extract a title from the first page of a chunk."""
    text = pages.get(start_page, "")
    if not text.strip():
        return f"Chunk starting at page {start_page}"
    first_line = text.strip().split("\n")[0].strip()
    if not first_line:
        return f"Chunk starting at page {start_page}"
    if len(first_line) > MAX_TITLE_LENGTH:
        return first_line[: MAX_TITLE_LENGTH - 3] + "..."
    return first_line
