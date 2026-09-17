import json
import re
import logging
from typing import Optional, Dict, Any
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

import httpx
from app.config import settings

logger = logging.getLogger("reporadar.ai.llm_client")


def extract_json(raw_text: str) -> Dict[str, Any]:
    """
    Extracts and parses JSON from raw LLM output, handling markdown fences and leading/trailing text.
    """
    cleaned = raw_text.strip()

    # Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
        cleaned = cleaned.strip()

    # Attempt direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fallback: search for first '{' and last '}'
        match = re.search(r"(\{.*\})", cleaned, re.DOTALL)
        if match:
            return json.loads(match.group(1))
        raise ValueError(f"Failed to parse valid JSON from LLM response: {raw_text[:200]}...")


class LLMClient:
    def __init__(self):
        self.provider = (settings.LLM_PROVIDER or "openai").lower()
        self.model = settings.LLM_MODEL
        self.openai_client = None
        self.anthropic_client = None

        if self.provider == "openai" and settings.OPENAI_API_KEY:
            from openai import AsyncOpenAI
            self.openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        elif self.provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            from anthropic import AsyncAnthropic
            self.anthropic_client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    async def complete(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """
        Executes a prompt completion with exponential backoff retries.
        """
        tokens = max_tokens or settings.MAX_TOKENS
        temp = temperature if temperature is not None else settings.TEMPERATURE

        if self.provider == "anthropic":
            if not self.anthropic_client:
                raise RuntimeError("Anthropic API key is not configured")
            
            response = await self.anthropic_client.messages.create(
                model=self.model,
                max_tokens=tokens,
                temperature=temp,
                system=system_prompt,
                messages=[{"role": "user", "content": user_prompt}],
            )
            return response.content[0].text

        else:
            # Default to OpenAI
            if not self.openai_client:
                raise RuntimeError("OpenAI API key is not configured")

            response = await self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                max_tokens=tokens,
                temperature=temp,
            )
            return response.choices[0].message.content or ""

    async def complete_json(
        self,
        system_prompt: str,
        user_prompt: str,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Executes a prompt completion and safely deserializes the returned JSON payload.
        """
        json_system_prompt = (
            f"{system_prompt}\n\nIMPORTANT: You must respond ONLY with a strictly valid JSON object. "
            f"Do not include any other text, reasoning, or markdown code fences outside the JSON."
        )

        raw_completion = await self.complete(
            system_prompt=json_system_prompt,
            user_prompt=user_prompt,
            max_tokens=max_tokens,
            temperature=temperature,
        )

        return extract_json(raw_completion)


llm_client = LLMClient()
