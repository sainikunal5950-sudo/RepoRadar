import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.models.schemas import RAGChunkContext, ChatMessageItem
from app.services.rag_chat import format_context_block, extract_cited_files, generate_chat_response
from app.services.query_expansion import expand_query
from app.prompts.templates import get_rag_chat_system_prompt, get_query_expansion_prompt

client = TestClient(app)
VALID_API_KEY = settings.AI_SERVICE_API_KEY


def test_format_context_block_empty():
    res = format_context_block([])
    assert "NO RELEVANT CODE CONTEXT FOUND" in res


def test_format_context_block_populated():
    chunks = [
        RAGChunkContext(
            file_path="src/auth/jwt.ts",
            start_line=10,
            end_line=25,
            chunk_text="export function verifyToken(token: string) { ... }",
            chunk_type="function",
            chunk_label="verifyToken",
        )
    ]
    res = format_context_block(chunks)
    assert "src/auth/jwt.ts" in res
    assert "Lines 10-25" in res
    assert "verifyToken" in res
    assert "export function verifyToken" in res


def test_extract_cited_files_explicit_and_fallback():
    chunks = [
        RAGChunkContext(
            file_path="src/controllers/auth.ts",
            start_line=1,
            end_line=20,
            chunk_text="code",
        ),
        RAGChunkContext(
            file_path="src/models/user.ts",
            start_line=1,
            end_line=20,
            chunk_text="code",
        ),
    ]

    # Explicit mention of auth.ts in answer
    answer = "Authentication is handled in `src/controllers/auth.ts` on line 5."
    cited = extract_cited_files(answer, chunks)
    assert "src/controllers/auth.ts" in cited

    # No specific file mention -> returns all contributing context chunks
    answer_generic = "The authentication system checks passwords against encrypted hashes."
    cited_all = extract_cited_files(answer_generic, chunks)
    assert "src/controllers/auth.ts" in cited_all
    assert "src/models/user.ts" in cited_all


def test_rag_system_prompt_grounding_rules():
    prompt = get_rag_chat_system_prompt()
    assert "EXCLUSIVELY" in prompt or "exclusively" in prompt
    assert "I don't have enough context" in prompt
    assert "cite" in prompt.lower()


@pytest.mark.asyncio
@patch("app.services.llm_client.llm_client.complete_chat", new_callable=AsyncMock)
async def test_generate_chat_response_service(mock_llm):
    mock_llm.return_value = "The JWT authentication is verified in `src/auth/jwt.ts:15-20` using HMAC SHA-256."

    chunks = [
        RAGChunkContext(
            file_path="src/auth/jwt.ts",
            start_line=10,
            end_line=30,
            chunk_text="export const verify = (t) => jwt.verify(t, SECRET);",
        )
    ]
    history = [
        ChatMessageItem(role="user", content="Hello"),
        ChatMessageItem(role="assistant", content="Hi! How can I help?"),
    ]

    res = await generate_chat_response(
        question="How does token verification work?",
        retrieved_chunks=chunks,
        conversation_history=history,
    )

    assert "src/auth/jwt.ts" in res.answer
    assert "src/auth/jwt.ts" in res.cited_files
    assert res.retrieved_chunks_count == 1
    assert res.tokens_used is not None
    assert mock_llm.called


@pytest.mark.asyncio
@patch("app.services.llm_client.llm_client.complete", new_callable=AsyncMock)
async def test_query_expansion_service(mock_llm):
    mock_llm.return_value = "user authentication login verify password jwt"
    res = await expand_query("how does login work")
    assert "authentication" in res


def test_chat_respond_endpoint_unauthorized():
    response = client.post(
        "/api/chat/respond",
        json={"question": "Where is auth handled?"},
    )
    assert response.status_code == 401


@patch("app.routers.chat.generate_chat_response", new_callable=AsyncMock)
def test_chat_respond_endpoint_success(mock_rag):
    from app.models.schemas import ChatRespondResponse
    mock_rag.return_value = ChatRespondResponse(
        answer="Database connection pool is initialized in `src/lib/db.ts:10-30`.",
        cited_files=["src/lib/db.ts"],
        retrieved_chunks_count=1,
        tokens_used=120,
    )

    response = client.post(
        "/api/chat/respond",
        json={
            "question": "Where is the db pool initialized?",
            "retrieved_chunks": [
                {
                    "file_path": "src/lib/db.ts",
                    "start_line": 1,
                    "end_line": 35,
                    "chunk_text": "export const db = new MongoClient();",
                }
            ],
            "conversation_history": [],
        },
        headers={"X-API-Key": VALID_API_KEY},
    )

    assert response.status_code == 200
    data = response.json()
    assert "src/lib/db.ts" in data["answer"]
    assert "src/lib/db.ts" in data["cited_files"]
    assert data["retrieved_chunks_count"] == 1


@patch("app.routers.chat.expand_query", new_callable=AsyncMock)
def test_expand_query_endpoint_success(mock_expand):
    mock_expand.return_value = "jwt token verification authorization"

    response = client.post(
        "/api/chat/expand-query",
        json={"question": "how are tokens checked?"},
        headers={"X-API-Key": VALID_API_KEY},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["original_query"] == "how are tokens checked?"
    assert data["expanded_query"] == "jwt token verification authorization"


def test_strip_code_blocks():
    from app.services.rag_chat import strip_code_blocks
    raw = "Here is the explanation:\n```typescript\nconst a = 10;\n```\nIt works by validating input."
    cleaned = strip_code_blocks(raw)
    assert "```" not in cleaned
    assert "const a = 10;" not in cleaned
    assert "Here is the explanation:" in cleaned
    assert "It works by validating input." in cleaned


def test_synthesize_heuristic_answer_no_code_blocks():
    from app.services.rag_chat import synthesize_heuristic_answer
    chunks = [
        RAGChunkContext(
            file_path="src/auth.ts",
            start_line=1,
            end_line=20,
            chunk_text="export function auth() { return true; }",
            chunk_type="function",
            chunk_label="auth",
        )
    ]
    answer = synthesize_heuristic_answer("Explain auth", chunks)
    assert "```" not in answer
    assert "export function auth" not in answer
    assert "src/auth.ts" in answer

