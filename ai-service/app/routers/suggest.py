from fastapi import APIRouter
from app.models.schemas import (
    SuggestFixRequest,
    SuggestFixResponse,
    SuggestFixesBatchRequest,
    SuggestFixesBatchResponse,
)
from app.services.fix_suggest import suggest_fix, suggest_fixes_batch

router = APIRouter(prefix="/api/suggest", tags=["Fix Suggestions"])


@router.post("/fix", response_model=SuggestFixResponse)
async def handle_suggest_fix(request: SuggestFixRequest):
    """
    Generates a targeted, safe code fix for an automated static analysis issue.
    """
    return await suggest_fix(request)


@router.post("/fixes/batch", response_model=SuggestFixesBatchResponse)
async def handle_suggest_fixes_batch(request: SuggestFixesBatchRequest):
    """
    Generates AI fix suggestions for multiple issues in batch (max 10).
    """
    fixes = await suggest_fixes_batch(request.issues)
    return SuggestFixesBatchResponse(
        fixes=fixes,
        total_processed=len(fixes),
    )
