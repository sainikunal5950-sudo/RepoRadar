import AppError from "../lib/AppError";

export interface AIExplainCodeRequest {
  code: string;
  filePath: string;
  language?: string;
}

export interface AIExplainCodeResponse {
  file_path: string;
  language?: string;
  purpose: string;
  explanation: string;
  key_points: string[];
  is_truncated: boolean;
}

export interface AISummarizeFileRequest {
  content: string;
  filePath: string;
  language?: string;
}

export interface AISummarizeFileResponse {
  file_path: string;
  role: string;
  summary: string;
  key_exports: string[];
  dependencies: string[];
}

export interface AISuggestFixRequest {
  issueId?: string;
  codeSnippet: string;
  filePath: string;
  lineNumber: number;
  issueType: string;
  severity: string;
  message: string;
  language?: string;
}

export interface AISuggestFixResponse {
  issue_id?: string;
  file_path: string;
  line_number: number;
  original_code: string;
  fixed_code: string;
  explanation: string;
  why_it_matters: string;
  confidence: string;
}

export interface AISuggestFixesBatchRequest {
  repositoryId?: string;
  issues: AISuggestFixRequest[];
}

export interface AISuggestFixesBatchResponse {
  fixes: AISuggestFixResponse[];
  total_processed: number;
}

export interface AIHealthResponse {
  status: string;
  llm_provider: string;
  model: string;
  service: string;
}

export class AIServiceClient {
  private baseUrl: string;
  private apiKey: string;
  private timeoutMs: number;

  constructor() {
    this.baseUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
    this.apiKey =
      process.env.AI_SERVICE_API_KEY ||
      "reporadar-ai-service-secret-key-change-in-production";
    this.timeoutMs = 60000; // 60s timeout for LLM inference
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-API-Key": this.apiKey,
      ...((options.headers as Record<string, string>) || {}),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: await response.text() };
        }

        const msg =
          errorData.detail ||
          errorData.error ||
          `AI service responded with HTTP ${response.status}`;
        throw new AppError(
          `AI Service Error: ${msg}`,
          response.status === 401 ? 502 : response.status,
          "AI_SERVICE_ERROR"
        );
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      if (error.name === "AbortError") {
        throw new AppError(
          "AI microservice request timed out after 60s",
          504,
          "AI_SERVICE_TIMEOUT"
        );
      }
      throw new AppError(
        `Failed to reach AI microservice at ${this.baseUrl}: ${error.message}`,
        503,
        "AI_SERVICE_UNAVAILABLE"
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Health check for AI service
   */
  async checkAIHealth(): Promise<AIHealthResponse> {
    return this.request<AIHealthResponse>("/health", { method: "GET" });
  }

  /**
   * Explains a code snippet
   */
  async explainCode(req: AIExplainCodeRequest): Promise<AIExplainCodeResponse> {
    return this.request<AIExplainCodeResponse>("/api/explain/code", {
      method: "POST",
      body: JSON.stringify({
        code: req.code,
        file_path: req.filePath,
        language: req.language,
      }),
    });
  }

  /**
   * Summarizes an entire source file
   */
  async summarizeFile(
    req: AISummarizeFileRequest
  ): Promise<AISummarizeFileResponse> {
    return this.request<AISummarizeFileResponse>("/api/explain/file", {
      method: "POST",
      body: JSON.stringify({
        content: req.content,
        file_path: req.filePath,
        language: req.language,
      }),
    });
  }

  /**
   * Generates a fix for a single code issue
   */
  async suggestFix(req: AISuggestFixRequest): Promise<AISuggestFixResponse> {
    return this.request<AISuggestFixResponse>("/api/suggest/fix", {
      method: "POST",
      body: JSON.stringify({
        issue_id: req.issueId,
        code_snippet: req.codeSnippet,
        file_path: req.filePath,
        line_number: req.lineNumber,
        issue_type: req.issueType,
        severity: req.severity,
        message: req.message,
        language: req.language,
      }),
    });
  }

  /**
   * Generates fixes for a batch of code issues (max 10)
   */
  async suggestFixesBatch(
    req: AISuggestFixesBatchRequest
  ): Promise<AISuggestFixesBatchResponse> {
    return this.request<AISuggestFixesBatchResponse>("/api/suggest/fixes/batch", {
      method: "POST",
      body: JSON.stringify({
        repository_id: req.repositoryId,
        issues: req.issues.map((i) => ({
          issue_id: i.issueId,
          code_snippet: i.codeSnippet,
          file_path: i.filePath,
          line_number: i.lineNumber,
          issue_type: i.issueType,
          severity: i.severity,
          message: i.message,
          language: i.language,
        })),
      }),
    });
  }
}

export const aiServiceClient = new AIServiceClient();
export default aiServiceClient;
