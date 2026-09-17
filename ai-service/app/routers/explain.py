from fastapi import APIRouter
from app.models.schemas import (
    ExplainCodeRequest,
    ExplainCodeResponse,
    SummarizeFileRequest,
    SummarizeFileResponse,
)
from app.services.code_explain import explain_code, summarize_file

router = APIRouter(prefix="/api/explain", tags=["Code Explanation"])


@router.post("/code", response_model=ExplainCodeResponse)
async def handle_explain_code(request: ExplainCodeRequest):
    """
    Analyzes and explains a code snippet in plain, developer-friendly language.
    """
    return await explain_code(
        code=request.code,
        file_path=request.file_path,
        language=request.language,
    )


@router.post("/file", response_model=SummarizeFileResponse)
async def handle_summarize_file(request: SummarizeFileRequest):
    """
    Summarizes an entire source file's role and architecture in the project.
    """
    return await summarize_file(
        content=request.content,
        file_path=request.file_path,
        language=request.language,
    )
