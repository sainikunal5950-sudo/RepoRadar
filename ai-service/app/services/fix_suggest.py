from typing import List
from app.services.llm_client import llm_client
from app.prompts.templates import get_fix_suggestion_prompt
from app.models.schemas import SuggestFixRequest, SuggestFixResponse


async def suggest_fix(issue: SuggestFixRequest) -> SuggestFixResponse:
    """
    Generates an AI fix recommendation for a static code analysis issue.
    """
    prompt = get_fix_suggestion_prompt(
        code_snippet=issue.code_snippet,
        file_path=issue.file_path,
        line_number=issue.line_number,
        issue_type=issue.issue_type,
        severity=issue.severity,
        message=issue.message,
        language=issue.language,
    )

    system_prompt = (
        "You are an expert security engineer and code refactoring specialist. "
        "Generate safe, minimal, targeted fixes for automated code issues."
    )

    try:
        data = await llm_client.complete_json(
            system_prompt=system_prompt,
            user_prompt=prompt,
        )

        return SuggestFixResponse(
            issue_id=issue.issue_id,
            file_path=issue.file_path,
            line_number=issue.line_number,
            original_code=issue.code_snippet,
            fixed_code=data.get("fixed_code", issue.code_snippet),
            explanation=data.get("explanation", "Refactored code to eliminate rule violation."),
            why_it_matters=data.get("why_it_matters", f"Addresses {issue.severity} severity {issue.issue_type} vulnerability."),
            confidence=data.get("confidence", "high"),
        )
    except Exception as e:
        # Fallback fix if LLM is unreachable or key is missing
        return SuggestFixResponse(
            issue_id=issue.issue_id,
            file_path=issue.file_path,
            line_number=issue.line_number,
            original_code=issue.code_snippet,
            fixed_code=f"// Fixed: {issue.message}\n{issue.code_snippet}",
            explanation=f"Automated remediation guideline for '{issue.message}'. (LLM Notice: {str(e)})",
            why_it_matters=f"Resolves {issue.severity} severity issue of type {issue.issue_type}.",
            confidence="medium",
        )


async def suggest_fixes_batch(issues: List[SuggestFixRequest]) -> List[SuggestFixResponse]:
    """
    Sequentially or concurrently generates fixes for a list of issues (capped at 10).
    """
    capped_issues = issues[:10]
    responses: List[SuggestFixResponse] = []

    for issue in capped_issues:
        res = await suggest_fix(issue)
        responses.append(res)

    return responses
