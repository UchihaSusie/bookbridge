from bookbridge.ingestion.pdf_reader import (
    clean_page_text,
    detect_running_headers,
    is_noise_line,
    is_noise_page,
    is_running_header,
)


# AC5: detect_running_headers finds repeated header/footer lines
class TestDetectRunningHeaders:
    def test_finds_repeated_first_line(self):
        pages = {i: f"Book Title\nContent of page {i}." for i in range(1, 20)}
        assert "Book Title" in detect_running_headers(pages)

    def test_ignores_unique_lines(self):
        pages = {i: f"Unique line {i}\nBody text here." for i in range(1, 20)}
        headers = detect_running_headers(pages)
        assert not any("Unique line" in h for h in headers)

    def test_returns_empty_for_too_few_pages(self):
        pages = {1: "Header\nContent", 2: "Header\nContent", 3: "Header\nContent"}
        assert detect_running_headers(pages) == set()

    def test_extra_headers_stripped_by_clean_page_text(self):
        text = "Running Header\nActual content here."
        cleaned = clean_page_text(text, extra_headers={"Running Header"})
        assert "Running Header" not in cleaned
        assert "Actual content here." in cleaned


# AC1: is_noise_line detects OCR garbage
class TestIsNoiseLine:
    def test_empty_string_is_not_noise(self):
        assert is_noise_line("") is False

    def test_short_garbage_is_noise(self):
        assert is_noise_line("x") is True
        assert is_noise_line("..") is True

    def test_normal_text_is_not_noise(self):
        assert is_noise_line("The city was quiet that evening.") is False

    def test_high_symbol_ratio_is_noise(self):
        assert is_noise_line("@#$%^&*()!!!???") is True

    def test_borderline_ratio_passes(self):
        assert is_noise_line("abc!!!") is False


# AC2: is_running_header matches author/title headers
class TestIsRunningHeader:
    def test_author_name(self):
        assert is_running_header("  CHINA MIEVILLE  ") is True

    def test_book_title(self):
        assert is_running_header("EMBASSYTOWN") is True

    def test_ocr_variation(self):
        assert is_running_header("EMBA SYTOWN") is True

    def test_numbered_header(self):
        assert is_running_header("42 CHINA MI") is True

    def test_normal_text_not_header(self):
        assert is_running_header("She walked to the embassy.") is False

    def test_partial_match_not_header(self):
        assert is_running_header("I love China.") is False


# AC3: clean_page_text removes headers and normalizes whitespace
class TestCleanPageText:
    def test_removes_author_header(self):
        text = "CHINA MIEVILLE\nShe walked home."
        cleaned = clean_page_text(text)
        assert "CHINA MIEVILLE" not in cleaned
        assert "She walked home." in cleaned

    def test_removes_title_header(self):
        text = "Some text.\nEMBASSYTOWN\nMore text."
        cleaned = clean_page_text(text)
        assert "EMBASSYTOWN" not in cleaned

    def test_collapses_multiple_spaces(self):
        assert "word word" in clean_page_text("word    word")

    def test_replaces_tabs_with_spaces(self):
        assert "word word" in clean_page_text("word\tword")

    def test_strips_result(self):
        assert clean_page_text("  \n  hello  \n  ") == "hello"


# AC4: is_noise_page identifies mostly garbage pages
class TestIsNoisePage:
    def test_empty_page_is_noise(self):
        assert is_noise_page("") is True

    def test_normal_text_not_noise(self):
        text = "This is a paragraph.\nWith real sentences.\nAnd meaning."
        assert is_noise_page(text) is False

    def test_mostly_garbage_is_noise(self):
        text = "@#$\n!!!\n???\nok\n%%%"
        assert is_noise_page(text) is True

    def test_single_good_line_in_garbage(self):
        text = "@#$\n!!!\nA real sentence here.\n???\n%%%\n&&&"
        assert is_noise_page(text) is True
