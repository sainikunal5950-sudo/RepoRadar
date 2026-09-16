import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RepositoryAnalysisPage from "../[id]/analysis/page";
import apiClient from "@/lib/api-client";
import { useParams } from "next/navigation";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/api-client");

describe("Repository Analysis Page Tests", () => {
  const mockRepoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: mockRepoId });
  });

  it("should render Static Code Analysis page header and stats", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/sample-repo",
            github_repo_url: "https://github.com/testdev/sample-repo",
          },
        });
      }
      if (url.includes("/analysis-summary")) {
        return Promise.resolve({
          success: true,
          data: {
            total_issues: 3,
            critical_count: 1,
            high_count: 1,
            medium_count: 1,
            low_count: 0,
            security_issues_count: 1,
            performance_issues_count: 1,
            bug_issues_count: 1,
            code_smell_count: 0,
            maintainability_count: 0,
          },
        });
      }
      if (url.includes("/analysis-results")) {
        return Promise.resolve({
          success: true,
          data: {
            issues: [
              {
                id: "issue-1",
                repository_id: mockRepoId,
                file_path: "src/secret.ts",
                line_number: 10,
                issue_type: "security",
                severity: "critical",
                message: "Hardcoded API key detected",
              },
            ],
            totalCount: 1,
            page: 1,
            limit: 25,
            totalPages: 1,
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryAnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Static Code Analysis")).toBeInTheDocument();
      expect(screen.getByText("testdev/sample-repo")).toBeInTheDocument();
      expect(screen.getByText("Hardcoded API key detected")).toBeInTheDocument();
      expect(screen.getByText("Re-Analyze Code")).toBeInTheDocument();
    });
  });

  it("should trigger analysis API when Re-Analyze button is clicked", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/analyze-code")) {
        return Promise.resolve({
          success: true,
          data: {
            totalIssues: 5,
            summary: {
              total_issues: 5,
              critical_count: 2,
              high_count: 1,
              medium_count: 2,
              low_count: 0,
              security_issues_count: 2,
              performance_issues_count: 1,
              bug_issues_count: 2,
              code_smell_count: 0,
              maintainability_count: 0,
            },
          },
        });
      }
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/sample-repo",
          },
        });
      }
      if (url.includes("/analysis-summary")) {
        return Promise.resolve({
          success: true,
          data: {
            total_issues: 0,
            critical_count: 0,
            high_count: 0,
            medium_count: 0,
            low_count: 0,
          },
        });
      }
      if (url.includes("/analysis-results")) {
        return Promise.resolve({
          success: true,
          data: {
            issues: [],
            totalCount: 0,
            page: 1,
            limit: 25,
            totalPages: 1,
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryAnalysisPage />);

    await waitFor(() => {
      expect(screen.getByText("Static Code Analysis")).toBeInTheDocument();
    });

    const analyzeBtn = screen.getByRole("button", { name: /run code analysis|re-analyze code/i });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        `/api/repositories/${mockRepoId}/analyze-code`,
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
