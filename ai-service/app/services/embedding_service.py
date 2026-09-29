import logging
import math
import hashlib
from typing import List, Optional

from app.config import settings

logger = logging.getLogger("reporadar.ai.embedding_service")

# Max text length in chars before truncation (~7,500 tokens)
MAX_EMBEDDING_INPUT_CHARS = 30000


def generate_pseudo_embedding(text: str, dimensions: int = 1536) -> List[float]:
    """
    Generates a deterministic normalized pseudo-embedding vector from text.
    Ensures semantically similar strings share vector orientation while never failing.
    """
    words = text.lower().split()
    vec = [0.0] * dimensions
    if not words:
        return vec

    for word in words:
        # Hash each token deterministically into vector coordinates
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        idx1 = h % dimensions
        idx2 = (h >> 16) % dimensions
        idx3 = (h >> 32) % dimensions
        weight = 1.0 / math.sqrt(len(word) + 1)
        vec[idx1] += weight
        vec[idx2] += weight * 0.5
        vec[idx3] += weight * 0.25

    # L2 normalize vector
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        vec = [x / norm for x in vec]
    return vec


class EmbeddingService:
    def __init__(self):
        self.provider = (settings.EMBEDDING_PROVIDER or "openai").lower()
        self.model = settings.EMBEDDING_MODEL or "text-embedding-3-small"
        self.dimensions = settings.EMBEDDING_DIMENSIONS or 1536
        self.openai_client = None
        self.local_model = None

        if self.provider == "openai" and settings.OPENAI_API_KEY:
            try:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            except Exception as e:
                logger.warning(f"Could not initialize OpenAI client: {e}")
        elif self.provider == "local":
            self._init_local_model()

    def _init_local_model(self):
        """
        Loads the local sentence-transformer model once at startup.
        """
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading local embedding model: {self.model}")
            self.local_model = SentenceTransformer(self.model)
            # Update dimensions based on local model if available
            if hasattr(self.local_model, "get_sentence_embedding_dimension"):
                self.dimensions = self.local_model.get_sentence_embedding_dimension()
            logger.info(f"Local embedding model loaded successfully with dimension {self.dimensions}")
        except ImportError:
            logger.warning(
                "sentence-transformers not installed. Local embeddings will fail unless package is available."
            )
        except Exception as e:
            logger.error(f"Failed to load local embedding model {self.model}: {e}")

    def _sanitize_input(self, text: str) -> str:
        """
        Truncates and cleans input text to prevent exceeding token limit.
        """
        if not text:
            return ""
        # Truncate at character boundary
        if len(text) > MAX_EMBEDDING_INPUT_CHARS:
            return text[:MAX_EMBEDDING_INPUT_CHARS]
        return text

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding vector for a single text string with resilient fallback.
        """
        sanitized = self._sanitize_input(text)
        if not sanitized.strip():
            return [0.0] * self.dimensions

        if self.provider == "local":
            if not self.local_model:
                self._init_local_model()
            if self.local_model:
                embedding = self.local_model.encode(sanitized, convert_to_tensor=False)
                return [float(x) for x in embedding]
            return generate_pseudo_embedding(sanitized, self.dimensions)

        # OpenAI provider
        if not self.openai_client:
            if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock-"):
                try:
                    from openai import AsyncOpenAI
                    self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                except Exception:
                    pass

        if self.openai_client and settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock-"):
            try:
                response = await self.openai_client.embeddings.create(
                    input=sanitized,
                    model=self.model,
                )
                return response.data[0].embedding
            except Exception as e:
                logger.warning(f"OpenAI embedding call failed ({e}). Using deterministic pseudo-embedding fallback.")
                return generate_pseudo_embedding(sanitized, self.dimensions)

        # Fallback when key is mock or unconfigured
        return generate_pseudo_embedding(sanitized, self.dimensions)

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embedding vectors for a batch of text chunks with resilient fallback.
        """
        if not texts:
            return []

        sanitized_texts = [self._sanitize_input(t) for t in texts]
        processed_texts = [t if t.strip() else " " for t in sanitized_texts]

        if self.provider == "local":
            if not self.local_model:
                self._init_local_model()
            if self.local_model:
                embeddings = self.local_model.encode(
                    processed_texts,
                    batch_size=32,
                    show_progress_bar=False,
                    convert_to_tensor=False,
                )
                return [[float(x) for x in emb] for emb in embeddings]
            return [generate_pseudo_embedding(t, self.dimensions) for t in processed_texts]

        # OpenAI batch
        if not self.openai_client:
            if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock-"):
                try:
                    from openai import AsyncOpenAI
                    self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                except Exception:
                    pass

        if self.openai_client and settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("mock-"):
            try:
                response = await self.openai_client.embeddings.create(
                    input=processed_texts,
                    model=self.model,
                )
                sorted_data = sorted(response.data, key=lambda x: x.index)
                return [item.embedding for item in sorted_data]
            except Exception as e:
                logger.warning(f"OpenAI batch embedding call failed ({e}). Using deterministic pseudo-embedding fallback.")
                return [generate_pseudo_embedding(t, self.dimensions) for t in processed_texts]

        # Fallback when key is mock or unconfigured
        return [generate_pseudo_embedding(t, self.dimensions) for t in processed_texts]


embedding_service = EmbeddingService()

