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


class RAGChunkContext(BaseModel):
    file_path: str = Field(..., description="File path of the code snippet")
    start_line: int = Field(..., description="Start line number in the source file")
    end_line: int = Field(..., description="End line number in the source file")
    chunk_text: str = Field(..., description="Code snippet content")
    chunk_type: Optional[str] = Field(None, description="Type of chunk (function, class, block)")
    chunk_label: Optional[str] = Field(None, description="Symbol name or label")
    score: Optional[float] = Field(None, description="Similarity score (0.0 - 1.0)")


class ChatMessageItem(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatRespondRequest(BaseModel):
    question: str = Field(..., description="User's natural language question")
    retrieved_chunks: List[RAGChunkContext] = Field(
        default_factory=list,
        description="Top-k code chunks retrieved from vector search"
    )
    conversation_history: List[ChatMessageItem] = Field(
        default_factory=list,
        description="Previous turns of conversation for multi-turn context"
    )


class ChatRespondResponse(BaseModel):
    answer: str = Field(..., description="Context-grounded assistant response")
    cited_files: List[str] = Field(
        default_factory=list,
        description="List of file paths cited or referenced in the response"
    )
    retrieved_chunks_count: int = Field(
        0,
        description="Number of context chunks supplied for this answer"
    )
    tokens_used: Optional[int] = Field(
        None,
        description="Estimated token usage for the chat completion"
    )


class ExpandQueryRequest(BaseModel):
    question: str = Field(..., description="User question to expand for semantic search")


class ExpandQueryResponse(BaseModel):
    original_query: str
    expanded_query: str

