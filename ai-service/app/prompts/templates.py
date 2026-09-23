from typing import Optional, List


def get_code_explain_prompt(code: str, file_path: str, language: Optional[str] = None) -> str:
    lang_hint = f" ({language})" if language else ""
    return f"""You are an expert software engineer analyzing source code for the RepoRadar platform.

Analyze the following code from file `{file_path}`{lang_hint}:

```
{code}
```

Provide a structured, developer-focused explanation in strictly valid JSON format with the following keys:
- "purpose": A clear, concise 1-2 sentence statement of what this code accomplishes.
- "explanation": A detailed, easy-to-read explanation of key functions, control flow, algorithms, and logic.
- "key_points": A JSON array of 3 to 6 bullet points highlighting architectural patterns, data structures, state handling, or potential edge cases.

Respond ONLY with the JSON object. Do not include markdown code fences or other preamble.
"""


def get_file_summary_prompt(content: str, file_path: str, language: Optional[str] = None) -> str:
    lang_hint = f" ({language})" if language else ""
    return f"""You are an expert software architect reviewing a repository source file.

Summarize the purpose and architectural role of the file `{file_path}`{lang_hint}:

```
{content}
```

Provide a structured file summary in strictly valid JSON format with the following keys:
- "role": The primary architectural role of this file in the project (e.g., "API Controller", "Database Model", "Auth Middleware", "Utility Helper", "React UI Component").
- "summary": A concise 2-4 sentence summary of what this file contains, its key responsibilities, and how it interacts with the rest of the application.
- "key_exports": A JSON array of main exported functions, classes, types, or variables.
- "dependencies": A JSON array of key libraries or local modules imported.

Respond ONLY with the JSON object. Do not include markdown code fences.
"""


def get_fix_suggestion_prompt(
    code_snippet: str,
    file_path: str,
    line_number: int,
    issue_type: str,
    severity: str,
    message: str,
    language: Optional[str] = None,
) -> str:
    lang_hint = f" ({language})" if language else ""
    return f"""You are an expert security engineer and code refactoring specialist.

An automated static analysis rule detected an issue in `{file_path}`{lang_hint} at line {line_number}:
- **Issue Type:** {issue_type}
- **Severity:** {severity}
- **Rule Message:** {message}

Problematic Code Snippet:
```
{code_snippet}
```

Task:
Generate a safe, minimal, production-ready fix for this specific issue. Do NOT rewrite unrelated code. Maintain original indentation and style.

Respond in strictly valid JSON with the following keys:
- "fixed_code": The complete corrected code replacement for the snippet.
- "explanation": Clear step-by-step description of how the fix resolves the problem.
- "why_it_matters": Technical explanation of the security, reliability, or performance risk prevented by this fix.
- "confidence": "high", "medium", or "low" based on how certain and self-contained the fix is.

Respond ONLY with the valid JSON object.
"""


def get_architecture_summary_prompt(file_tree_summary: str, key_file_summaries: str) -> str:
    return f"""You are a principal software architect reviewing a codebase structure.

File Tree:
{file_tree_summary}

Key Module Summaries:
{key_file_summaries}

Provide a high-level repository architecture summary in strictly valid JSON format with keys:
- "architecture_pattern": (e.g. "MVC Express with Next.js App Router", "Clean Architecture Microservice", etc.)
- "tech_stack_summary": Concise summary of languages, frameworks, and datastores.
- "core_components": JSON array of main subsystems and their responsibilities.
- "architecture_strengths": JSON array of 2-4 observed positive architectural decisions.
- "potential_risks": JSON array of 2-4 architectural bottlenecks or risk areas.

Respond ONLY with the valid JSON object.
"""


def get_rag_chat_system_prompt() -> str:
    return """You are RepoRadar AI, an expert software engineer and technical assistant chatting with a developer about their codebase.

CRITICAL GROUNDING RULES:
1. Ground your answer EXCLUSIVELY in the provided code snippets and context. Do NOT speculate, assume external implementation details, or invent classes, functions, or file paths not present in the context.
2. If the provided code snippets do NOT contain enough information to answer the question, explicitly state: "I don't have enough context in the indexed codebase to answer that." Never hallucinate answers from general programming knowledge about what code "usually" does.
3. Always cite relevant files and line ranges when referring to specific logic (e.g. `[src/auth.ts:12-45]`).
4. Write clear, technical, concise markdown answers. Use fenced code blocks with language identifiers where appropriate.
5. If the user asks a follow-up question, use the conversation history for context while maintaining strict grounding on the provided code snippets.
"""


def get_query_expansion_prompt(question: str) -> str:
    return f"""You are a code search query optimizer for a semantic repository search engine.

Transform the following user question into 1 to 3 concise, keyword-rich search terms suitable for semantic embedding vector retrieval across source code files:

User Question: "{question}"

Instructions:
- Extract key architectural components, technical concepts, verbs, functions, or filenames implied by the question.
- Do not output explanations or full sentences.
- Respond ONLY with a single line containing the expanded search query terms.

Expanded Query:"""


def get_pr_review_prompt(
    pr_title: str,
    files_changed: List[str],
    diff_summary: str,
    issues_found: List[dict],
) -> str:
    files_str = "\n".join([f"- {f}" for f in files_changed[:25]])
    issues_str = ""
    if issues_found:
        issues_str = "\n".join(
            [
                f"- [{i.get('severity', 'medium').upper()}] {i.get('filePath')}:{i.get('lineNumber')} - {i.get('message')}"
                for i in issues_found[:15]
            ]
        )
    else:
        issues_str = "No static analysis rule violations detected in changed lines."

    return f"""You are RepoRadar's automated AI Pull Request Reviewer.
Your goal is to provide a concise, high-signal, skimmable PR review for engineers.

PR Title: "{pr_title}"

Files Changed ({len(files_changed)} files):
{files_str}

Diff Summary of Added / Modified Lines:
```
{diff_summary[:4000]}
```

Static Code Issues Detected in Changed Lines:
{issues_str}

Task:
Analyze the PR diff and detected issues. Generate a structured JSON response with:
- "summary": A concise 2-3 sentence overview in plain language explaining what this PR accomplishes and its architectural impact.
- "risk_assessment": A 1-2 sentence assessment highlighting potential risks, security concerns, or architectural regressions (or why it looks clean).
- "recommendation": A single clear actionable recommendation (e.g., "Safe to merge", "Review security issues before merging", "Requires changes before merge", "Approve with minor suggestions").

Respond ONLY with valid JSON with keys "summary", "risk_assessment", and "recommendation". Do not include markdown code fences or other text.
"""


