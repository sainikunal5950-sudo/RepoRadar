from typing import List, Dict, Any
from app.services.llm_client import llm_client
from app.prompts.templates import get_pr_review_prompt
from app.models.schemas import PRReviewSummarizeResponse


async def summarize_pr_review(
    pr_title: str,
    files_changed: List[str],
    diff_summary: str,
    issues_found: List[Dict[str, Any]],
) -> PRReviewSummarizeResponse:
    """
    Generates a natural-language summary, risk assessment, and recommendation for a PR review.
    """
    prompt = get_pr_review_prompt(
        pr_title=pr_title,
        files_changed=files_changed,
        diff_summary=diff_summary,
        issues_found=issues_found,
    )
    system_prompt = "You are RepoRadar's automated AI Pull Request Reviewer. Provide concise, high-signal, accurate PR reviews."

    try:
        data = await llm_client.complete_json(
            system_prompt=system_prompt,
            user_prompt=prompt,
        )

        return PRReviewSummarizeResponse(
            summary=data.get(
                "summary",
                f"PR '{pr_title}' introduces changes across {len(files_changed)} file(s)."
            ),
            risk_assessment=data.get(
                "risk_assessment",
                "Automated review completed with static analysis scanning."
            ),
            recommendation=data.get(
                "recommendation",
                "Review changed files and verify test coverage before merging."
            ),
        )
    except Exception as e:
        # Fallback when LLM is offline or in mock mode
        has_critical = any(i.get("severity") == "critical" for i in issues_found)
        has_high = any(i.get("severity") == "high" for i in issues_found)
        
        if has_critical:
            rec = "Block merge: Resolve critical security/reliability issues before merging."
            risk = "Critical risks identified in changed lines requiring immediate remediation."
        elif has_high:
            rec = "Review high-severity findings before merging."
            risk = "High-severity static issues detected in pull request diff."
        elif issues_found:
            rec = "Safe to merge with minor suggestions."
            risk = "Minor rule warnings identified in modified code."
        else:
            rec = "Safe to merge."
            risk = "No static rule violations detected in changed diff lines."

        return PRReviewSummarizeResponse(
            summary=f"Pull request '{pr_title}' modifies {len(files_changed)} file(s) with {len(issues_found)} static issue(s) detected. (AI note: {str(e)})",
            risk_assessment=risk,
            recommendation=rec,
        )
