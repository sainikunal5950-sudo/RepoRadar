from fastapi import APIRouter
from app.models.schemas import PRReviewSummarizeRequest, PRReviewSummarizeResponse
from app.services.pr_review import summarize_pr_review

router = APIRouter(prefix="/api/pr-review", tags=["Pull Request Review"])


@router.post("/summarize", response_model=PRReviewSummarizeResponse)
async def handle_summarize_pr_review(request: PRReviewSummarizeRequest):
    """
    Summarizes pull request diff, evaluates detected static issues, and generates risk recommendations.
    """
    issues_dict_list = [issue.model_dump() for issue in request.issues_found]
    return await summarize_pr_review(
        pr_title=request.pr_title,
        files_changed=request.files_changed,
        diff_summary=request.diff_summary,
        issues_found=issues_dict_list,
    )
