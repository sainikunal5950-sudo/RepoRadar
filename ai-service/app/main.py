import time
import logging
from fastapi import FastAPI, Request, HTTPException, Security, Depends, status
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.routers import health, explain, suggest, embeddings

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("reporadar.ai.main")

# Security API Key header
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)


async def verify_api_key(api_key: str = Security(api_key_header)):
    """
    Ensures internal-only callers (Express server) provide the configured shared secret.
    """
    if not api_key or api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key authentication header",
        )
    return api_key


app = FastAPI(
    title="RepoRadar AI Service",
    description="Dedicated microservice for LLM-powered code explanation, summarization, issue remediation, and vector embeddings.",
    version="1.0.0",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """
    Request duration & status logging middleware
    """
    start_time = time.time()
    response = await call_next(request)
    duration = int((time.time() - start_time) * 1000)
    logger.info(
        f"{request.method} {request.url.path} - {response.status_code} ({duration}ms)"
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Centralized JSON exception handler
    """
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "AI Service Internal Error",
            "detail": str(exc),
        },
    )


# Mount health endpoints (unauthenticated for cluster/docker health probes)
app.include_router(health.router)

# Mount API endpoints (protected with X-API-Key dependency)
app.include_router(
    explain.router,
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    suggest.router,
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    embeddings.router,
    dependencies=[Depends(verify_api_key)],
)



@app.get("/")
async def root():
    return {
        "service": "RepoRadar AI Service",
        "status": "online",
        "docs": "/docs",
    }
