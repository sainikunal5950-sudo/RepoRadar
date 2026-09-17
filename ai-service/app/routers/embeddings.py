import logging
from typing import List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.services.embedding_service import embedding_service
from app.utils.code_chunker import chunk_file_for_embedding

logger = logging.getLogger("reporadar.ai.embeddings_router")

router = APIRouter(
    prefix="/api/embeddings",
    tags=["Embeddings & Code Vectorization"],
)


class SingleEmbeddingRequest(BaseModel):
    text: str = Field(..., description="Text or query string to vectorize")


class SingleEmbeddingResponse(BaseModel):
    embedding: List[float]
    dimensions: int
    model: str


class BatchEmbeddingRequest(BaseModel):
    texts: List[str] = Field(..., min_length=1, description="List of text chunks to vectorize")


class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]
    count: int
    dimensions: int
    model: str


class ChunkAndEmbedRequest(BaseModel):
    content: str = Field(..., description="Raw source code content")
    file_path: str = Field(default="", description="Repository relative file path")
    language: Optional[str] = Field(default=None, description="Language identifier (e.g., typescript, python)")


class CodeChunkWithEmbedding(BaseModel):
    chunk_text: str
    start_line: int
    end_line: int
    chunk_type: str
    chunk_label: str
    embedding: List[float]


class ChunkAndEmbedResponse(BaseModel):
    file_path: str
    language: Optional[str]
    total_chunks: int
    dimensions: int
    chunks: List[CodeChunkWithEmbedding]


@router.post("/generate", response_model=SingleEmbeddingResponse)
async def generate_single_embedding(payload: SingleEmbeddingRequest):
    """
    Generates a single vector embedding for a query or code snippet.
    """
    try:
        embedding = await embedding_service.generate_embedding(payload.text)
        return SingleEmbeddingResponse(
            embedding=embedding,
            dimensions=len(embedding),
            model=settings.EMBEDDING_MODEL,
        )
    except Exception as e:
        logger.error(f"Failed to generate single embedding: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Embedding generation failed: {str(e)}",
        )


@router.post("/generate-batch", response_model=BatchEmbeddingResponse)
async def generate_batch_embeddings(payload: BatchEmbeddingRequest):
    """
    Generates batch vector embeddings for a list of text strings.
    """
    try:
        embeddings = await embedding_service.generate_embeddings_batch(payload.texts)
        dimensions = len(embeddings[0]) if embeddings else settings.EMBEDDING_DIMENSIONS
        return BatchEmbeddingResponse(
            embeddings=embeddings,
            count=len(embeddings),
            dimensions=dimensions,
            model=settings.EMBEDDING_MODEL,
        )
    except Exception as e:
        logger.error(f"Failed to generate batch embeddings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch embedding generation failed: {str(e)}",
        )


@router.post("/chunk-and-embed", response_model=ChunkAndEmbedResponse)
async def chunk_and_embed_file(payload: ChunkAndEmbedRequest):
    """
    Splits a file into semantic code chunks, calculates embeddings for each chunk in batch,
    and returns combined chunk data with vectors.
    """
    try:
        # Step 1: Chunk source file
        raw_chunks = chunk_file_for_embedding(
            content=payload.content,
            file_path=payload.file_path,
            language=payload.language,
        )

        if not raw_chunks:
            return ChunkAndEmbedResponse(
                file_path=payload.file_path,
                language=payload.language,
                total_chunks=0,
                dimensions=settings.EMBEDDING_DIMENSIONS,
                chunks=[],
            )

        # Step 2: Extract text chunks for batch embedding
        chunk_texts = [c["chunk_text"] for c in raw_chunks]
        embeddings = await embedding_service.generate_embeddings_batch(chunk_texts)

        # Step 3: Combine metadata and embeddings
        result_chunks: List[CodeChunkWithEmbedding] = []
        for c, emb in zip(raw_chunks, embeddings):
            result_chunks.append(
                CodeChunkWithEmbedding(
                    chunk_text=c["chunk_text"],
                    start_line=c["start_line"],
                    end_line=c["end_line"],
                    chunk_type=c["chunk_type"],
                    chunk_label=c["chunk_label"],
                    embedding=emb,
                )
            )

        dimensions = len(embeddings[0]) if embeddings else settings.EMBEDDING_DIMENSIONS

        return ChunkAndEmbedResponse(
            file_path=payload.file_path,
            language=payload.language,
            total_chunks=len(result_chunks),
            dimensions=dimensions,
            chunks=result_chunks,
        )
    except Exception as e:
        logger.error(f"Failed to chunk and embed file '{payload.file_path}': {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Chunk and embed failed: {str(e)}",
        )
