import logging
from typing import List, Optional
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger("reporadar.ai.embedding_service")

# Max text length in chars before truncation (~7,500 tokens)
MAX_EMBEDDING_INPUT_CHARS = 30000


class EmbeddingService:
    def __init__(self):
        self.provider = (settings.EMBEDDING_PROVIDER or "openai").lower()
        self.model = settings.EMBEDDING_MODEL or "text-embedding-3-small"
        self.dimensions = settings.EMBEDDING_DIMENSIONS or 1536
        self.openai_client = None
        self.local_model = None

        if self.provider == "openai" and settings.OPENAI_API_KEY:
            from openai import AsyncOpenAI
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
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

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def generate_embedding(self, text: str) -> List[float]:
        """
        Generates an embedding vector for a single text string.
        """
        sanitized = self._sanitize_input(text)
        if not sanitized.strip():
            # Return zero vector of appropriate dimension for empty input
            return [0.0] * self.dimensions

        if self.provider == "local":
            if not self.local_model:
                self._init_local_model()
            if not self.local_model:
                raise RuntimeError("Local embedding model is not initialized or sentence-transformers is missing")
            
            # SentenceTransformer encode
            embedding = self.local_model.encode(sanitized, convert_to_tensor=False)
            return [float(x) for x in embedding]

        # Default: OpenAI
        if not self.openai_client:
            if settings.OPENAI_API_KEY:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            else:
                raise RuntimeError("OpenAI API key is not configured for embedding generation")

        response = await self.openai_client.embeddings.create(
            input=sanitized,
            model=self.model,
        )
        return response.data[0].embedding

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generates embedding vectors for a batch of text chunks.
        """
        if not texts:
            return []

        sanitized_texts = [self._sanitize_input(t) for t in texts]
        # Replace completely empty strings with placeholder so embedding API does not error
        processed_texts = [t if t.strip() else " " for t in sanitized_texts]

        if self.provider == "local":
            if not self.local_model:
                self._init_local_model()
            if not self.local_model:
                raise RuntimeError("Local embedding model is not initialized")

            embeddings = self.local_model.encode(
                processed_texts,
                batch_size=32,
                show_progress_bar=False,
                convert_to_tensor=False,
            )
            return [[float(x) for x in emb] for emb in embeddings]

        # OpenAI batch embeddings
        if not self.openai_client:
            if settings.OPENAI_API_KEY:
                from openai import AsyncOpenAI
                self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            else:
                raise RuntimeError("OpenAI API key is not configured for embedding generation")

        response = await self.openai_client.embeddings.create(
            input=processed_texts,
            model=self.model,
        )
        # Sort embeddings by index to guarantee ordering matches input list
        sorted_data = sorted(response.data, key=lambda x: x.index)
        return [item.embedding for item in sorted_data]


embedding_service = EmbeddingService()
