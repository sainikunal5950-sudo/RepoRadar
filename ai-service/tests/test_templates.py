from app.prompts.templates import (
    get_code_explain_prompt,
    get_file_summary_prompt,
    get_fix_suggestion_prompt,
    get_architecture_summary_prompt,
)


def test_code_explain_prompt():
    prompt = get_code_explain_prompt(
        code="const x = 1;",
        file_path="src/index.ts",
        language="typescript",
    )
    assert "src/index.ts" in prompt
    assert "const x = 1;" in prompt
    assert "purpose" in prompt
    assert "key_points" in prompt


def test_fix_suggestion_prompt():
    prompt = get_fix_suggestion_prompt(
        code_snippet="const key = '12345';",
        file_path="src/auth.ts",
        line_number=10,
        issue_type="security",
        severity="critical",
        message="Hardcoded credentials",
        language="typescript",
    )
    assert "Hardcoded credentials" in prompt
    assert "src/auth.ts" in prompt
    assert "fixed_code" in prompt
    assert "confidence" in prompt
