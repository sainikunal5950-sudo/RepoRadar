import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIFixSuggestion from "../AIFixSuggestion";
import apiClient from "@/lib/api-client";

// Mock apiClient
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("AIFixSuggestion Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show Generate AI Fix CTA when no cached fix is present", () => {
    render(
      <AIFixSuggestion
        issueId="issue-123"
        filePath="src/database.ts"
        lineNumber={42}
        issueType="security"
        severity="critical"
        message="SQL injection vulnerability detected"
        codeSnippet="const query = 'SELECT * FROM users WHERE id = ' + id;"
      />
    );

    expect(screen.getByText("AI-Powered Remediation Available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Generate AI Fix/i })).toBeInTheDocument();
  });

  it("should render cached fix immediately if provided", () => {
    const cachedFixJson = JSON.stringify({
      fixed_code: "const query = 'SELECT * FROM users WHERE id = $1';",
      explanation: "Use parameterized queries instead of string concatenation.",
      confidence: 0.98,
      why_it_matters: "Prevents arbitrary SQL command execution by attackers.",
    });

    render(
      <AIFixSuggestion
        issueId="issue-123"
        filePath="src/database.ts"
        lineNumber={42}
        issueType="security"
        severity="critical"
        message="SQL injection vulnerability detected"
        codeSnippet="const query = 'SELECT * FROM users WHERE id = ' + id;"
        cachedFix={cachedFixJson}
      />
    );

    expect(screen.getByText("Cached Fix")).toBeInTheDocument();
    expect(screen.getByText("98% Confidence")).toBeInTheDocument();
    expect(screen.getByText("const query = 'SELECT * FROM users WHERE id = $1';")).toBeInTheDocument();
    expect(screen.getByText("Prevents arbitrary SQL command execution by attackers.")).toBeInTheDocument();
  });

  it("should call API and display fix when Generate AI Fix is clicked", async () => {
    (apiClient as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        fixed_code: "const safeKey = process.env.API_KEY;",
        explanation: "Load credentials securely from environment variables.",
        confidence: 0.95,
        why_it_matters: "Avoids exposing API secrets in source control.",
      },
    });

    render(
      <AIFixSuggestion
        issueId="issue-456"
        filePath="src/config.ts"
        lineNumber={10}
        issueType="security"
        severity="high"
        message="Hardcoded secret key"
        codeSnippet="const safeKey = '12345';"
      />
    );

    const generateBtn = screen.getByRole("button", { name: /Generate AI Fix/i });
    fireEvent.click(generateBtn);

    expect(screen.getByText(/Generating AI remediation/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("const safeKey = process.env.API_KEY;")).toBeInTheDocument();
    });

    expect(screen.getByText("Load credentials securely from environment variables.")).toBeInTheDocument();
    expect(screen.getByText("95% Confidence")).toBeInTheDocument();
  });
});
