import re
import logging
from typing import List, Dict, Any, Optional
from app.services.llm_client import llm_client
from app.prompts.templates import get_rag_chat_system_prompt
from app.models.schemas import RAGChunkContext, ChatMessageItem, ChatRespondResponse

logger = logging.getLogger("reporadar.ai.rag_chat")


def format_context_block(chunks: List[RAGChunkContext]) -> str:
    """
    Formats retrieved code chunks into a clear, structured context string for the LLM.
    """
    if not chunks:
        return "NO RELEVANT CODE CONTEXT FOUND IN REPOSITORY INDEX."

    blocks = []
    for i, chunk in enumerate(chunks, 1):
        type_str = f" ({chunk.chunk_type}: {chunk.chunk_label})" if chunk.chunk_label else ""
        header = f"--- [Snippet {i}] File: `{chunk.file_path}` (Lines {chunk.start_line}-{chunk.end_line}){type_str} ---"
        blocks.append(f"{header}\n```\n{chunk.chunk_text.strip()}\n```")

    return "\n\n".join(blocks)


def extract_cited_files(answer: str, chunks: List[RAGChunkContext]) -> List[str]:
    """
    Identifies which files were cited in the answer or were in the primary retrieved context.
    Ensures deduplicated, ordered list of referenced file paths.
    """
    cited: List[str] = []
    chunk_files = [c.file_path for c in chunks if c.file_path]

    # Check if answer specifically mentions any file paths
    for file_path in chunk_files:
        if file_path not in cited:
            # Check full path or basename match in answer
            basename = file_path.split("/")[-1]
            if file_path in answer or (len(basename) > 4 and basename in answer):
                cited.append(file_path)

    # If the answer is grounded and doesn't explicitly mention file paths by string,
    # include all top chunk files that contributed to the context
    if not cited and chunks:
        for c in chunks:
            if c.file_path not in cited:
                cited.append(c.file_path)

    return cited


def detect_chunk_lang(file_path: str) -> str:
    ext = file_path.split(".")[-1].lower() if "." in file_path else ""
    mapping = {
        "ts": "typescript",
        "tsx": "typescript",
        "js": "javascript",
        "jsx": "javascript",
        "py": "python",
        "json": "json",
        "md": "markdown",
        "html": "html",
        "css": "css",
        "sql": "sql",
        "prisma": "prisma",
        "yaml": "yaml",
        "yml": "yaml",
    }
    return mapping.get(ext, "plaintext")


def synthesize_heuristic_answer(question: str, chunks: List[RAGChunkContext]) -> str:
    """
    Synthesizes a structured, Markdown-formatted codebase answer directly from
    retrieved vector chunks when OpenAI API key is unavailable or in mock mode.
    """
    if not chunks:
        return (
            f"### Repository Analysis for: *\"{question}\"*\n\n"
            "⚠️ No directly matching code chunks were retrieved for this query. "
            "Please ensure the repository has been indexed or try searching with specific component or function names."
        )

    files = list(dict.fromkeys([c.file_path for c in chunks if c.file_path]))
    
    parts = [
        f"### Codebase Answer for: *\"{question}\"*\n",
        f"Based on repository indexing and vector similarity search, **{len(chunks)} relevant code block(s)** were identified across **{len(files)} file(s)**:\n"
    ]

    for i, chunk in enumerate(chunks[:4], 1):
        type_desc = f" ({chunk.chunk_type}: `{chunk.chunk_label}`)" if chunk.chunk_label else ""
        lang = detect_chunk_lang(chunk.file_path)
        parts.append(
            f"#### {i}. `{chunk.file_path}` (Lines {chunk.start_line}–{chunk.end_line}){type_desc}\n"
            f"```{lang}\n{chunk.chunk_text.strip()}\n```\n"
        )

    parts.append(
        "**Context Summary:**\n"
        f"- **Primary Files Involved:** {', '.join([f'`{f}`' for f in files])}\n"
        "- The code snippets above define the logic, state management, and handlers relevant to your question.\n\n"
        "> 💡 *Tip: To enable conversational GPT-4o-mini generation, provide an active OpenAI API key in `ai-service/.env`.*"
    )

    return "\n".join(parts)


async def generate_chat_response(
    question: str,
    retrieved_chunks: List[RAGChunkContext],
    conversation_history: Optional[List[ChatMessageItem]] = None,
) -> ChatRespondResponse:
    """
    Executes context-grounded RAG answer generation using low-temperature LLM inference.
    Falls back gracefully to heuristic context synthesis if API keys are missing or invalid.
    """
    context_str = format_context_block(retrieved_chunks)
    system_prompt = get_rag_chat_system_prompt()

    # Construct the user prompt combining context + current question
    user_prompt = f"""RELEVANT CODEBASE CONTEXT:
{context_str}

DEVELOPER QUESTION:
{question}

Please answer the developer's question directly based ONLY on the codebase context above. If referencing specific code, include file paths and line ranges."""

    # Build conversation messages list
    messages: List[Dict[str, str]] = []

    if conversation_history:
        # Keep up to the last 10 messages for conversation continuity
        trimmed_history = conversation_history[-10:]
        for msg in trimmed_history:
            messages.append({"role": msg.role, "content": msg.content})

    # Add the current turn
    messages.append({"role": "user", "content": user_prompt})

    try:
        from app.config import get_current_settings
        current_cfg = get_current_settings()
        if not current_cfg.OPENAI_API_KEY or current_cfg.OPENAI_API_KEY.startswith("mock-"):
            answer = synthesize_heuristic_answer(question, retrieved_chunks)
            cited_files = list(dict.fromkeys([c.file_path for c in retrieved_chunks if c.file_path]))
            return ChatRespondResponse(
                answer=answer,
                cited_files=cited_files,
                retrieved_chunks_count=len(retrieved_chunks),
                tokens_used=max(1, len(answer) // 4),
            )

        raw_answer = await llm_client.complete_chat(
            system_prompt=system_prompt,
            messages=messages,
            temperature=0.15,
            max_tokens=1500,
        )

        answer = raw_answer.strip()
        cited_files = extract_cited_files(answer, retrieved_chunks)

        # Estimate tokens (approx 4 chars per token)
        total_text_len = len(system_prompt) + sum(len(m["content"]) for m in messages) + len(answer)
        estimated_tokens = max(1, total_text_len // 4)

        return ChatRespondResponse(
            answer=answer,
            cited_files=cited_files,
            retrieved_chunks_count=len(retrieved_chunks),
            tokens_used=estimated_tokens,
        )

    except Exception as e:
        logger.warning(f"RAG chat LLM call encountered error ({e}). Using offline heuristic synthesis.")
        answer = synthesize_heuristic_answer(question, retrieved_chunks)
        cited_files = list(dict.fromkeys([c.file_path for c in retrieved_chunks if c.file_path]))
        return ChatRespondResponse(
            answer=answer,
            cited_files=cited_files,
            retrieved_chunks_count=len(retrieved_chunks),
            tokens_used=max(1, len(answer) // 4),
        )


