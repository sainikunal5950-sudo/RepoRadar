import re
from typing import List, Dict, Any, Optional

# Regex definitions for language-aware block detection
LANGUAGE_PATTERNS = {
    "python": [
        (r"^(?:async\s+def|def)\s+([a-zA-Z_][a-zA-Z0-9_]*)", "function"),
        (r"^class\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
    "javascript": [
        (r"^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)", "function"),
        (r"^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>", "function"),
        (r"^(?:export\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
    "typescript": [
        (r"^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_][a-zA-Z0-9_]*)", "function"),
        (r"^(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>", "function"),
        (r"^(?:export\s+)?(?:interface|type)\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
        (r"^(?:export\s+)?(?:abstract\s+)?class\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
        (r"^(?:export\s+)?enum\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
    "go": [
        (r"^func\s+(?:\([^)]+\)\s+)?([a-zA-Z_][a-zA-Z0-9_]*)", "function"),
        (r"^type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+struct", "class"),
        (r"^type\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+interface", "class"),
    ],
    "java": [
        (r"^(?:public|protected|private|static|\s)+[\w<>\[\]]+\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*(?:throws\s+[\w,\s]+)?\s*\{?", "function"),
        (r"^(?:public|protected|private|static|\s)*(?:class|interface|enum|record)\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
    "rust": [
        (r"^(?:pub(?:\([^)]+\))?\s+)?(?:async\s+)?fn\s+([a-zA-Z_][a-zA-Z0-9_]*)", "function"),
        (r"^(?:pub(?:\([^)]+\))?\s+)?(?:struct|enum|trait|impl)\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
    "cpp": [
        (r"^(?:[\w:*&<>]+\s+)+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{?", "function"),
        (r"^(?:class|struct)\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
    "c": [
        (r"^(?:[\w:*&<>]+\s+)+([a-zA-Z_][a-zA-Z0-9_]*)\s*\([^)]*\)\s*\{?", "function"),
        (r"^(?:struct|typedef\s+struct)\s+([a-zA-Z_][a-zA-Z0-9_]*)", "class"),
    ],
}


def normalize_language(language: Optional[str], file_path: str = "") -> str:
    """
    Normalizes language name based on extension or language parameter.
    """
    if language:
        lang = language.lower().strip()
        if lang in ["ts", "tsx", "typescript"]:
            return "typescript"
        if lang in ["js", "jsx", "javascript", "node"]:
            return "javascript"
        if lang in ["py", "python"]:
            return "python"
        if lang in ["go", "golang"]:
            return "go"
        if lang in ["java"]:
            return "java"
        if lang in ["rs", "rust"]:
            return "rust"
        if lang in ["cpp", "c++", "cc", "cxx"]:
            return "cpp"
        if lang in ["c"]:
            return "c"
        return lang

    # Infer from file_path extension
    ext = file_path.lower().split(".")[-1] if "." in file_path else ""
    ext_map = {
        "ts": "typescript",
        "tsx": "typescript",
        "js": "javascript",
        "jsx": "javascript",
        "py": "python",
        "go": "go",
        "java": "java",
        "rs": "rust",
        "cpp": "cpp",
        "cc": "cpp",
        "cxx": "cpp",
        "h": "c",
        "hpp": "cpp",
        "c": "c",
    }
    return ext_map.get(ext, "general")


def chunk_file_for_embedding(
    content: str,
    file_path: str = "",
    language: Optional[str] = None,
    target_chunk_tokens: int = 300,  # ~1200 chars
    overlap_tokens: int = 60,        # ~240 chars (~20% overlap)
    min_chunk_lines: int = 4,
) -> List[Dict[str, Any]]:
    """
    Splits file content into semantically meaningful chunks with line numbers,
    labels, and ~20% overlap.
    """
    if not content or not content.strip():
        return []

    lines = content.splitlines()
    total_lines = len(lines)
    if total_lines == 0:
        return []

    lang = normalize_language(language, file_path)
    patterns = LANGUAGE_PATTERNS.get(lang, [])

    # Step 1: Detect semantic boundaries (line numbers where classes or functions start)
    boundaries: List[Dict[str, Any]] = []

    for idx, line in enumerate(lines):
        trimmed = line.strip()
        if not trimmed or trimmed.startswith(("//", "#", "/*", "*")):
            continue

        for pat, chunk_type in patterns:
            match = re.search(pat, trimmed)
            if match:
                symbol_name = match.group(1) if match.groups() else ""
                label = f"{chunk_type} {symbol_name}" if symbol_name else chunk_type
                boundaries.append({
                    "line_idx": idx,
                    "chunk_type": chunk_type,
                    "label": label,
                })
                break

    # If file is short enough, return as single chunk
    approx_chars = len(content)
    max_single_chunk_chars = target_chunk_tokens * 4
    if approx_chars <= max_single_chunk_chars:
        return [{
            "chunk_text": content.strip(),
            "start_line": 1,
            "end_line": total_lines,
            "chunk_type": boundaries[0]["chunk_type"] if boundaries else "module",
            "chunk_label": boundaries[0]["label"] if boundaries else (file_path.split("/")[-1] if file_path else "main"),
        }]

    # Step 2: Slice file using boundaries or sliding window with 20% overlap
    chunks: List[Dict[str, Any]] = []
    target_chunk_chars = target_chunk_tokens * 4
    overlap_chars = overlap_tokens * 4

    # Calculate average chars per line to compute line overlap
    avg_chars_per_line = max(1, approx_chars // max(1, total_lines))
    overlap_line_count = max(2, overlap_chars // avg_chars_per_line)

    current_start_line = 0  # 0-indexed

    while current_start_line < total_lines:
        accumulated_chars = 0
        current_end_line = current_start_line
        detected_type = "block"
        detected_label = ""

        # Find if a semantic boundary starts within or near current chunk
        for b in boundaries:
            if current_start_line <= b["line_idx"] < current_start_line + 15:
                detected_type = b["chunk_type"]
                detected_label = b["label"]
                break

        while current_end_line < total_lines:
            line_len = len(lines[current_end_line]) + 1
            if accumulated_chars + line_len > target_chunk_chars and (current_end_line - current_start_line) >= min_chunk_lines:
                # If we're at a good breaking point (e.g. blank line or boundary), break
                if not lines[current_end_line].strip() or (current_end_line < total_lines - 1 and any(b["line_idx"] == current_end_line for b in boundaries)):
                    break
                # If chunk is getting significantly past target size, force break
                if accumulated_chars + line_len > int(target_chunk_chars * 1.3):
                    break

            accumulated_chars += line_len
            current_end_line += 1

        # Prevent empty or single zero-range chunks
        if current_end_line == current_start_line:
            current_end_line = min(total_lines, current_start_line + 1)

        chunk_lines = lines[current_start_line:current_end_line]
        chunk_text = "\n".join(chunk_lines).strip()

        if chunk_text:
            start_num = current_start_line + 1
            end_num = current_end_line
            fallback_label = f"{file_path.split('/')[-1] if file_path else 'code'}:L{start_num}-L{end_num}"
            label = detected_label if detected_label else fallback_label

            chunks.append({
                "chunk_text": chunk_text,
                "start_line": start_num,
                "end_line": end_num,
                "chunk_type": detected_type,
                "chunk_label": label,
            })

        if current_end_line >= total_lines:
            break

        # Advance start line applying ~20% line overlap
        next_start = current_end_line - overlap_line_count
        if next_start <= current_start_line:
            next_start = current_start_line + max(1, (current_end_line - current_start_line) // 2)
        current_start_line = min(next_start, total_lines - 1)

    return chunks
