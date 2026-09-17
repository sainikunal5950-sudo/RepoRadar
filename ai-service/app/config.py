from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    LLM_PROVIDER: str = "openai"  # "openai" or "anthropic"
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o-mini"
    MAX_TOKENS: int = 2000
    TEMPERATURE: float = 0.2

    # Embeddings Configuration (Module 11)
    EMBEDDING_PROVIDER: str = "openai"  # "openai" or "local"
    EMBEDDING_MODEL: str = "text-embedding-3-small"  # or "all-MiniLM-L6-v2"
    EMBEDDING_DIMENSIONS: int = 1536  # 1536 for text-embedding-3-small, 384 for all-MiniLM-L6-v2

    AI_SERVICE_API_KEY: str = "reporadar-ai-service-secret-key-change-in-production"
    PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


