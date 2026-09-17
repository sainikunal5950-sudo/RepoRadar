from fastapi import APIRouter
from app.config import settings
from app.models.schemas import HealthResponse
from app.services.llm_client import llm_client

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
async def get_health():
    """
    Standard microservice health check
    """
    return HealthResponse(
        status="ok",
        llm_provider=settings.LLM_PROVIDER,
        model=settings.LLM_MODEL,
        service="reporadar-ai-service",
    )


@router.get("/health/llm")
async def check_llm_connection():
    """
    Verifies live connectivity to configured LLM provider
    """
    try:
        response = await llm_client.complete(
            system_prompt="You are a healthcheck bot.",
            user_prompt="Respond with the exact word 'PONG'.",
            max_tokens=10,
        )
        return {
            "status": "connected",
            "provider": settings.LLM_PROVIDER,
            "model": settings.LLM_MODEL,
            "response": response.strip(),
        }
    except Exception as e:
        return {
            "status": "disconnected",
            "provider": settings.LLM_PROVIDER,
            "model": settings.LLM_MODEL,
            "error": str(e),
        }
