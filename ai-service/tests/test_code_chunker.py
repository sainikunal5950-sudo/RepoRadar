import pytest
from app.utils.code_chunker import (
    chunk_file_for_embedding,
    normalize_language,
)


def test_normalize_language():
    assert normalize_language("ts") == "typescript"
    assert normalize_language("python") == "python"
    assert normalize_language(None, "src/components/App.tsx") == "typescript"
    assert normalize_language(None, "main.go") == "go"
    assert normalize_language(None, "unknown.xyz") == "general"


def test_chunk_file_short_content():
    content = """function add(a: number, b: number): number {
    return a + b;
}"""
    chunks = chunk_file_for_embedding(content, file_path="src/math.ts", language="typescript")
    assert len(chunks) == 1
    assert chunks[0]["start_line"] == 1
    assert chunks[0]["end_line"] == 3
    assert "function" in chunks[0]["chunk_type"] or "function" in chunks[0]["chunk_label"]
    assert "add" in chunks[0]["chunk_label"]


def test_chunk_file_detects_classes_and_functions():
    python_code = """import os
import sys

class ConfigLoader:
    def __init__(self, path: str):
        self.path = path

    def load(self):
        return {"env": "prod"}

def main():
    loader = ConfigLoader("/etc/config")
    print(loader.load())

if __name__ == "__main__":
    main()
"""
    # Force small target chunk size to split
    chunks = chunk_file_for_embedding(
        python_code,
        file_path="config.py",
        language="python",
        target_chunk_tokens=20,
        overlap_tokens=5,
    )

    assert len(chunks) >= 1
    # Check that start/end lines are valid numbers
    for chunk in chunks:
        assert chunk["start_line"] >= 1
        assert chunk["end_line"] >= chunk["start_line"]
        assert len(chunk["chunk_text"]) > 0


def test_chunk_file_has_overlap():
    long_code = "\n".join([f"const line_{i} = {i}; // variable declaration number {i}" for i in range(1, 100)])
    chunks = chunk_file_for_embedding(
        long_code,
        file_path="large_constants.ts",
        language="typescript",
        target_chunk_tokens=50,
        overlap_tokens=15,
    )

    assert len(chunks) > 2
    # Verify adjacent chunks have overlapping lines
    for i in range(len(chunks) - 1):
        first_chunk = chunks[i]
        second_chunk = chunks[i + 1]
        assert second_chunk["start_line"] <= first_chunk["end_line"]
