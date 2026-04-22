from bookbridge.ingestion.chunker import build_chunk_manifest, detect_chapter_breaks


# AC1: detect_chapter_breaks finds PART and Chapter headers
class TestDetectChapterBreaks:
    def test_finds_part_one_header(self):
        pages = {1: "Intro text", 2: "PART ONE\nStory begins"}
        breaks = detect_chapter_breaks(pages)
        assert 2 in breaks

    def test_finds_chapter_header(self):
        pages = {1: "Text", 2: "Chapter 3\nContent here"}
        breaks = detect_chapter_breaks(pages)
        assert 2 in breaks

    def test_finds_proem_header(self):
        pages = {1: "Cover page", 2: "PROEM\nSome opening text"}
        breaks = detect_chapter_breaks(pages)
        assert 2 in breaks

    def test_finds_epilogue_header(self):
        pages = {10: "Some text", 11: "EPILOGUE\nFinal words"}
        breaks = detect_chapter_breaks(pages)
        assert 11 in breaks

    def test_no_breaks_in_plain_text(self):
        pages = {1: "Hello world", 2: "More text", 3: "Even more"}
        breaks = detect_chapter_breaks(pages)
        assert len(breaks) == 0

    def test_skips_empty_pages(self):
        pages = {1: "", 2: "PART TWO\nText"}
        breaks = detect_chapter_breaks(pages)
        assert 1 not in breaks
        assert 2 in breaks

    def test_case_insensitive(self):
        pages = {1: "part three\nContent"}
        breaks = detect_chapter_breaks(pages)
        assert 1 in breaks


# AC3: build_chunk_manifest respects max_pages_per_chunk
class TestBuildChunkManifest:
    def test_empty_pages_returns_empty_manifest(self):
        manifest = build_chunk_manifest({})
        assert manifest.total_pages == 0
        assert manifest.chunks == []

    def test_single_page_produces_one_chunk(self):
        manifest = build_chunk_manifest({1: "Hello"})
        assert len(manifest.chunks) == 1
        assert manifest.chunks[0].start_page == 1
        assert manifest.chunks[0].end_page == 1

    def test_respects_max_pages_limit(self):
        pages = {i: f"Page {i}" for i in range(1, 31)}
        manifest = build_chunk_manifest(pages, max_pages_per_chunk=10)
        for chunk in manifest.chunks:
            assert chunk.page_count <= 10

    # AC4: all pages covered without gaps
    def test_all_pages_covered(self):
        pages = {i: f"Page {i}" for i in range(1, 26)}
        manifest = build_chunk_manifest(pages, max_pages_per_chunk=10)
        covered = set()
        for chunk in manifest.chunks:
            for p in range(chunk.start_page, chunk.end_page + 1):
                covered.add(p)
        assert covered == set(range(1, 26))

    # AC5: splits at chapter boundaries
    def test_splits_at_chapter_break(self):
        pages = {
            1: "Intro text",
            2: "More intro",
            3: "PART ONE\nStory begins",
            4: "Story continues",
        }
        manifest = build_chunk_manifest(pages, max_pages_per_chunk=20)
        assert len(manifest.chunks) == 2
        assert manifest.chunks[0].end_page == 2
        assert manifest.chunks[1].start_page == 3

    def test_chunk_ids_are_sequential(self):
        pages = {i: f"Page {i}" for i in range(1, 11)}
        manifest = build_chunk_manifest(pages, max_pages_per_chunk=3)
        ids = [c.chunk_id for c in manifest.chunks]
        assert ids == list(range(1, len(ids) + 1))

    def test_source_file_in_manifest(self):
        manifest = build_chunk_manifest({1: "Text"}, source_file="test.pdf")
        assert manifest.source_file == "test.pdf"

    def test_to_dict_serialization(self):
        manifest = build_chunk_manifest({1: "Hello", 2: "World"})
        d = manifest.to_dict()
        assert "source_file" in d
        assert "total_pages" in d
        assert "chunks" in d
        assert isinstance(d["chunks"], list)

    def test_front_matter_chunk_created_when_pre_chapter_pages_exist(self):
        pages = {1: "Copyright 2024", 2: "Dedication page", 3: "Chapter 1\nContent begins"}
        manifest = build_chunk_manifest(pages, max_pages_per_chunk=20)
        assert manifest.chunks[0].title == "Front Matter"
        assert manifest.chunks[0].end_page == 2
        assert manifest.chunks[1].start_page == 3

    def test_no_front_matter_when_book_starts_on_chapter_marker(self):
        pages = {1: "Chapter 1\nContent begins", 2: "More content"}
        manifest = build_chunk_manifest(pages, max_pages_per_chunk=20)
        assert manifest.chunks[0].title != "Front Matter"
        assert len(manifest.chunks) == 1

    def test_chapter_count_splits_evenly(self):
        pages = {i: f"Page {i}" for i in range(1, 61)}
        manifest = build_chunk_manifest(pages, chapter_count=3)
        assert len(manifest.chunks) == 3
        assert manifest.chunks[0].start_page == 1
        assert manifest.chunks[2].end_page == 60

    def test_chapter_count_last_chunk_absorbs_remainder(self):
        pages = {i: f"Page {i}" for i in range(1, 11)}
        manifest = build_chunk_manifest(pages, chapter_count=3)
        covered = [p for c in manifest.chunks for p in range(c.start_page, c.end_page + 1)]
        assert len(covered) == 10

    def test_chapter_count_overrides_auto_detection(self):
        pages = {1: "PART ONE\nBegins", 2: "Text", 3: "PART TWO\nBegins", 4: "Text"}
        manifest = build_chunk_manifest(pages, chapter_count=2)
        assert len(manifest.chunks) == 2


class TestExpandedPatterns:
    def test_detects_roman_numeral_ii(self):
        pages = {1: "Intro", 2: "II\nContent"}
        assert 2 in detect_chapter_breaks(pages)

    def test_detects_roman_numeral_x(self):
        pages = {1: "Text", 2: "X\nContent"}
        assert 2 in detect_chapter_breaks(pages)

    def test_detects_standalone_arabic_number(self):
        pages = {1: "Intro", 2: "7\nContent"}
        assert 2 in detect_chapter_breaks(pages)

    def test_detects_foreword(self):
        pages = {1: "FOREWORD\nText"}
        assert 1 in detect_chapter_breaks(pages)

    def test_detects_interlude(self):
        pages = {1: "INTERLUDE\nText"}
        assert 1 in detect_chapter_breaks(pages)

    def test_detects_french_chapter(self):
        pages = {1: "Chapitre 3\nContent"}
        assert 1 in detect_chapter_breaks(pages)

    def test_detects_short_allcaps_heading(self):
        pages = {1: "THE DARK FOREST\nContent begins"}
        assert 1 in detect_chapter_breaks(pages)

    def test_ignores_long_allcaps_sentence(self):
        pages = {1: "THIS IS A VERY LONG SENTENCE THAT SHOULD NOT BE A CHAPTER HEADING\nContent"}
        assert 1 not in detect_chapter_breaks(pages)
