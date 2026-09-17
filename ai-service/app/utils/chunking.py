from typing import List, Tuple


def estimate_tokens(text: str) -> int:
    """
    Rough estimate of token count (approx. 4 characters per token).
    """
    if not text:
        return 0
    return max(1, len(text) // 4)


def truncate_code_safely(content: str, max_chars: int = 12000) -> Tuple[str, bool]:
    """
    Truncates code to max_chars along line boundaries if needed.
    Returns (content, is_truncated).
    """
    if len(content) <= max_chars:
        return content, False

    lines = content.splitlines(keepends=True)
    accumulated: List[str] = []
    current_length = 0

    for line in lines:
        if current_length + len(line) > max_chars:
            break
        accumulated.append(line)
        current_length += len(line)

    truncated_text = "".join(accumulated) + "\n\n/* ... [Content truncated to fit context limits] ... */"
    return truncated_text, True


def chunk_code(content: str, max_chars: int = 12000) -> List[str]:
    """
    Splits large code files into manageable chunks attempting to split on
    class/function definitions or block boundaries.
    """
    if len(content) <= max_chars:
        return [content]

    lines = content.splitlines(keepends=True)
    chunks: List[str] = []
    current_chunk: List[str] = []
    current_length = 0

    for line in lines:
        line_len = len(line)
        # If adding this line exceeds max_chars and we have accumulated lines
        if current_length + line_len > max_chars and current_chunk:
            chunks.append("".join(current_chunk))
            current_chunk = [line]
            current_length = line_len
        else:
            current_chunk.append(line)
            current_length += line_len

    if current_chunk:
        chunks.append("".join(current_chunk))

    return chunks
