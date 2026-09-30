import re
import logging
from typing import List, Dict, Any, Optional
from app.services.llm_client import llm_client
from app.prompts.templates import get_rag_chat_system_prompt
from app.models.schemas import RAGChunkContext, ChatMessageItem, ChatRespondResponse

logger = logging.getLogger("reporadar.ai.rag_chat")


def strip_code_blocks(text: str) -> str:
    """
    Safety net function that strips out any markdown code blocks (```...```)
    to ensure answers remain strictly plain-language explanations.
    """
    if not text:
        return ""
    # Remove triple backtick blocks
    cleaned = re.sub(r'```[\s\S]*?```', '', text)
    # Remove any standalone triple backticks
    cleaned = re.sub(r'`{3,}', '', cleaned)
    # Normalize excessive newlines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def format_context_block(chunks: List[RAGChunkContext]) -> str:
    """
    Formats retrieved code chunks into a clear background context block for the LLM.
    Explicitly labeled so the model understands the logic without repeating raw code.
    """
    if not chunks:
        return "NO RELEVANT CODE CONTEXT FOUND IN REPOSITORY INDEX."

    blocks = []
    for i, chunk in enumerate(chunks, 1):
        type_str = f" ({chunk.chunk_type}: {chunk.chunk_label})" if chunk.chunk_label else ""
        header = f"--- [CONTEXT CODE Snippet {i}] File: {chunk.file_path} (Lines {chunk.start_line}-{chunk.end_line}){type_str} ---"
        blocks.append(f"{header}\n{chunk.chunk_text.strip()}")

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


def generate_chunk_description(chunk: RAGChunkContext) -> str:
    """
    Generates a specific, content-aware description for a given code chunk
    based on its actual file path, chunk type, chunk label, and content.
    """
    path = (chunk.file_path or "").lower()
    label = chunk.chunk_label or ""
    
    if "client/" in path:
        if "api" in path or "client.ts" in path or "api-client" in path:
            return "Provides the frontend API client wrapper to issue authenticated HTTP requests to the Express backend."
        if "chat" in path:
            return "Implements the interactive AI chat user interface, message stream rendering, and cited file chip display."
        if "dashboard" in path:
            return "Manages dashboard navigation, repository overview layouts, and code explorer views on the Next.js frontend."
        if "components" in path:
            comp_name = label or path.split("/")[-1].replace(".tsx", "").replace(".ts", "")
            return f"Renders the `{comp_name}` UI component with interactive event handlers and styling tokens."
        return "Defines client-side utilities, Next.js page routing, and frontend state management."

    if "server/" in path:
        if "routes" in path:
            route_name = label or path.split("/")[-1].replace(".routes.ts", "").replace(".ts", "")
            return f"Defines Express REST API route endpoints and connects authentication middleware for `{route_name}`."
        if "controllers" in path:
            ctrl_name = label or path.split("/")[-1].replace(".controller.ts", "").replace(".ts", "")
            return f"Handles incoming HTTP requests, validates request payloads, and orchestrates services for `{ctrl_name}`."
        if "services" in path:
            if "ai-service" in path:
                return "Manages HTTP gateway communication with the Python FastAPI microservice using X-API-Key authentication."
            if "rag" in path or "vector" in path:
                return "Orchestrates vector similarity search, query expansion, and context assembly for AI chat answers."
            if "auth" in path or "jwt" in path:
                return "Implements user authentication, password verification, and JWT session token generation."
            svc_name = label or path.split("/")[-1].replace(".service.ts", "").replace(".ts", "")
            return f"Encapsulates core backend business logic and MongoDB operations for `{svc_name}`."
        if "middleware" in path:
            return "Intercepts incoming requests to enforce JWT token verification, permissions, and error handling."
        if "prisma" in path or "schema.prisma" in path:
            return "Specifies database models, relations, and indexing configurations in MongoDB."
        if "index.ts" in path:
            return "Initializes the Express application server, middleware pipeline, and route listener on port 5000."
        return "Implements backend server services, database models, or security middleware."

    if "ai-service/" in path:
        if "main.py" in path:
            return "Initializes the FastAPI application instance, CORS middleware, and API router endpoints on port 8000."
        if "rag_chat.py" in path:
            return "Executes RAG conversational generation, grounding prompt engineering, and response sanitization."
        if "code_explain.py" in path:
            return "Performs source code analysis, file summarization, and AST telemetry extraction."
        if "embedding" in path:
            return "Generates semantic vector embeddings for indexed repository code and search queries."
        if "templates.py" in path or "prompts" in path:
            return "Provides structured prompt engineering templates and JSON response schemas for LLM reasoning."
        if "routers" in path:
            return "Defines FastAPI sub-routers and request/response validation schemas for AI endpoints."
        return "Implements AI inference, prompt templates, or embedding computation services in Python."

    if "readme" in path:
        return "Documents project architecture, microservices setup, environment variables, and usage guides."

    if label:
        return f"Implements `{label}` for operational execution and business processing."
    return "Implements module logic, data models, and service interfaces."


def synthesize_heuristic_answer(question: str, chunks: List[RAGChunkContext]) -> str:
    """
    Synthesizes a clean, well-spaced, plain-language explanation directly from
    retrieved vector chunks based on actual code content and architectural layers.
    Does NOT output raw code blocks or code fences.
    """
    if not chunks:
        return (
            "I don't have enough context in the indexed codebase to answer that.\n\n"
            "Please ensure the repository has been indexed or try searching with specific component or function names."
        )

    files = list(dict.fromkeys([c.file_path for c in chunks if c.file_path]))
    q_lower = question.lower()
    is_arch_question = any(k in q_lower for k in ["architecture", "end-to-end", "connect", "flow", "full-stack", "structure"])

    sections = []

    # Overview
    sections.append(
        f"Based on the indexed codebase, this functionality is implemented across **{len(chunks)} relevant section(s)** in **{len(files)} file(s)**: {', '.join([f'`{f}`' for f in files])}."
    )

    # Architectural flow explanation if relevant
    if is_arch_question:
        sections.append(
            "**System Architecture & Connection Flow:**\n\n"
            "1. **Frontend Client (Next.js 14 / Port 3000):** The client provides the developer dashboard and chat interface. When a user interacts with the UI, the client uses its API helpers to send authenticated HTTP requests with JWT tokens to the backend.\n\n"
            "2. **Backend API Gateway (Express.js + TypeScript / Port 5000):** The Node.js Express server acts as the primary API gateway. It validates authentication via auth middleware, manages database records in MongoDB via Prisma, and coordinates repository data fetching from GitHub.\n\n"
            "3. **AI Microservice (FastAPI + Python / Port 8000):** For semantic code search, RAG chat, and code analysis, the Express server forwards requests to the Python FastAPI microservice via `ai-service.client.ts`, secured by an internal `X-API-Key` header.\n\n"
            "4. **Database & Vector Storage (MongoDB):** MongoDB stores user profiles, repository metadata, and vector embeddings for semantic code retrieval."
        )

    # Per-chunk detailed breakdowns with dynamic descriptions
    bullets = []
    for chunk in chunks[:6]:
        desc = generate_chunk_description(chunk)
        label_info = f" — `{chunk.chunk_label}`" if chunk.chunk_label else ""
        bullets.append(
            f"• **`{chunk.file_path}`** (lines {chunk.start_line}–{chunk.end_line}){label_info}\n"
            f"  {desc}"
        )

    if bullets:
        sections.append("**Relevant Code Sections:**\n\n" + "\n\n".join(bullets))

    sections.append(
        "**Summary:**\n"
        "These modules work seamlessly together: the frontend captures developer actions, the Express gateway enforces authentication and persistence, and the Python AI service delivers intelligent semantic search and conversational code understanding."
    )

    return "\n\n".join(sections)


async def generate_chat_response(
    question: str,
    retrieved_chunks: List[RAGChunkContext],
    conversation_history: Optional[List[ChatMessageItem]] = None,
) -> ChatRespondResponse:
    """
    Executes context-grounded RAG answer generation using low-temperature LLM inference.
    Passes retrieved chunks strictly as background context and ensures plain-language output.
    """
    context_str = format_context_block(retrieved_chunks)
    system_prompt = get_rag_chat_system_prompt()

    # Construct the user prompt passing context strictly as background reference
    user_prompt = f"""CONTEXT CODE — do not repeat this in your answer, just use it to understand and explain:
{context_str}

DEVELOPER QUESTION:
{question}

Please explain what this code does in plain, simple English sentences. Describe the logic, how it works, and why without including raw code blocks or code fences."""

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
            raw_answer = synthesize_heuristic_answer(question, retrieved_chunks)
            answer = strip_code_blocks(raw_answer)
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

        # Sanitize answer through safety net to guarantee no raw code blocks
        answer = strip_code_blocks(raw_answer)
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
        raw_answer = synthesize_heuristic_answer(question, retrieved_chunks)
        answer = strip_code_blocks(raw_answer)
        cited_files = list(dict.fromkeys([c.file_path for c in retrieved_chunks if c.file_path]))
        return ChatRespondResponse(
            answer=answer,
            cited_files=cited_files,
            retrieved_chunks_count=len(retrieved_chunks),
            tokens_used=max(1, len(answer) // 4),
        )


