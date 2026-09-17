from pydantic import BaseModel, Field
from typing import List, Optional


class ExplainCodeRequest(BaseModel):
    code: str = Field(..., description="Source code snippet to explain")
    file_path: str = Field(..., description="Relative or absolute path of the file")
    language: Optional[str] = Field(None, description="Programming language of the code")


class ExplainCodeResponse(BaseModel):
    file_path: str
    language: Optional[str] = None
    purpose: str = Field(..., description="High-level purpose of the code in 1-2 sentences")
    explanation: str = Field(..., description="Detailed walkthrough of logic and behavior")
    key_points: List[str] = Field(default_factory=list, description="Notable patterns, data flow, or architectural points")
    is_truncated: bool = Field(False, description="Whether the code was truncated due to token limit")


class SummarizeFileRequest(BaseModel):
    file_path: str = Field(..., description="Path of the file being summarized")
    content: str = Field(..., description="Full or partial content of the file")
    language: Optional[str] = Field(None, description="Programming language")


class SummarizeFileResponse(BaseModel):
    file_path: str
    role: str = Field(..., description="Primary role of the file in the repository")
    summary: str = Field(..., description="Concise summary of functionality and responsibilities")
    key_exports: List[str] = Field(default_factory=list, description="Primary classes, functions, or interfaces exported")
    dependencies: List[str] = Field(default_factory=list, description="Important external libraries or local module imports")


class SuggestFixRequest(BaseModel):
    issue_id: Optional[str] = Field(None, description="Optional ID of the CodeIssue")
    code_snippet: str = Field(..., description="Code snippet containing the issue")
    file_path: str = Field(..., description="File path where the issue exists")
    line_number: int = Field(..., description="Line number of the issue")
    issue_type: str = Field(..., description="Type of issue: security, performance, bug, code-smell, etc.")
    severity: str = Field(..., description="Severity level: critical, high, medium, low")
    message: str = Field(..., description="Rule violation or issue description")
    language: Optional[str] = Field(None, description="Programming language")


class SuggestFixResponse(BaseModel):
    issue_id: Optional[str] = None
    file_path: str
    line_number: int
    original_code: str
    fixed_code: str = Field(..., description="Corrected, safe code snippet")
    explanation: str = Field(..., description="Explanation of what was fixed and how")
    why_it_matters: str = Field(..., description="Security, stability, or performance rationale")
    confidence: str = Field("high", description="Confidence level: high, medium, low")


class SuggestFixesBatchRequest(BaseModel):
    repository_id: Optional[str] = None
    issues: List[SuggestFixRequest] = Field(..., max_length=10, description="List of issues to remediate (max 10)")


class SuggestFixesBatchResponse(BaseModel):
    fixes: List[SuggestFixResponse]
    total_processed: int


class HealthResponse(BaseModel):
    status: str
    llm_provider: str
    model: str
    service: str = "reporadar-ai-service"


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[str] = None
