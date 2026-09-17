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
