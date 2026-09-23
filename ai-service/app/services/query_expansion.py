import logging
from app.services.llm_client import llm_client
from app.prompts.templates import get_query_expansion_prompt

logger = logging.getLogger("reporadar.ai.query_expansion")


async def expand_query(question: str) -> str:
    """
    Expands a user question into keyword-rich search terms for vector search retrieval.
    If LLM expansion fails or question is already very specific, gracefully falls back
    to the original question.
    """
    cleaned = question.strip()
    if not cleaned or len(cleaned) < 5:
        return cleaned

    try:
        prompt = get_query_expansion_prompt(cleaned)
        expanded = await llm_client.complete(
            system_prompt="You are a search query optimizer. Return only the concise expanded search keywords on a single line.",
            user_prompt=prompt,
            max_tokens=60,
            temperature=0.0,
        )
        expanded_clean = expanded.strip().replace("\n", " ").replace('"', "")
        if expanded_clean and len(expanded_clean) > 2:
            return expanded_clean
        return cleaned
    except Exception as e:
        logger.warning(f"Query expansion failed, using original query: {e}")
        return cleaned
