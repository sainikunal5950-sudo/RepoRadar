from app.utils.chunking import estimate_tokens, truncate_code_safely, chunk_code


def test_estimate_tokens():
    assert estimate_tokens("") == 0
    assert estimate_tokens("hello world") == 2
    assert estimate_tokens("a" * 400) == 100


def test_truncate_code_safely_no_truncation():
    code = "def hello():\n    return 'world'\n"
    res, is_truncated = truncate_code_safely(code, max_chars=100)
    assert res == code
    assert is_truncated is False


def test_truncate_code_safely_with_truncation():
    code = "line1\nline2\nline3\nline4\nline5\n"
    res, is_truncated = truncate_code_safely(code, max_chars=12)
    assert is_truncated is True
    assert "truncated" in res


def test_chunk_code():
    code = "line1\nline2\nline3\nline4\nline5\n"
    chunks = chunk_code(code, max_chars=12)
    assert len(chunks) > 1
    assert "".join(chunks) == code
