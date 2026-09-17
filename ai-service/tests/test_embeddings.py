import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings

client = TestClient(app)
AUTH_HEADERS = {"X-API-Key": settings.AI_SERVICE_API_KEY}


@pytest.mark.asyncio
async def test_generate_single_embedding_endpoint():
    mock_vector = [0.1] * 1536
    with patch("app.routers.embeddings.embedding_service.generate_embedding", new_callable=AsyncMock) as mock_embed:
        mock_embed.return_value = mock_vector

        response = client.post(
            "/api/embeddings/generate",
            json={"text": "function authenticateUser(req, res) {}"},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert "embedding" in data
        assert len(data["embedding"]) == 1536
        assert data["dimensions"] == 1536


@pytest.mark.asyncio
async def test_generate_batch_embeddings_endpoint():
    mock_vectors = [[0.1] * 1536, [0.2] * 1536]
    with patch("app.routers.embeddings.embedding_service.generate_embeddings_batch", new_callable=AsyncMock) as mock_batch:
        mock_batch.return_value = mock_vectors

        response = client.post(
            "/api/embeddings/generate-batch",
            json={"texts": ["const x = 1;", "const y = 2;"]},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 2
        assert len(data["embeddings"]) == 2


@pytest.mark.asyncio
async def test_chunk_and_embed_endpoint():
    content = """
    function calculateDiscount(price: number): number {
        return price * 0.9;
    }
    """
    mock_vectors = [[0.05] * 1536]
    with patch("app.routers.embeddings.embedding_service.generate_embeddings_batch", new_callable=AsyncMock) as mock_batch:
        mock_batch.return_value = mock_vectors

        response = client.post(
            "/api/embeddings/chunk-and-embed",
            json={
                "content": content,
                "file_path": "src/services/billing.ts",
                "language": "typescript",
            },
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["total_chunks"] >= 1
        assert len(data["chunks"]) >= 1
        chunk = data["chunks"][0]
        assert "calculateDiscount" in chunk["chunk_label"] or "function" in chunk["chunk_type"]
        assert len(chunk["embedding"]) == 1536
        assert chunk["start_line"] >= 1
        assert chunk["end_line"] >= chunk["start_line"]


def test_unauthorized_access_rejected():
    response = client.post(
        "/api/embeddings/generate",
        json={"text": "some code"},
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401
