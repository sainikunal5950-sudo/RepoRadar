import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RepositoryHealthPage from "../[id]/health/page";
import apiClient from "@/lib/api-client";
import { useParams } from "next/navigation";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/api-client");

describe("Repository Health Page Tests", () => {
  const mockRepoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: mockRepoId });
  });

  it("should render health scorecard and sub-scores when data exists", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/sample-repo",
          },
        });
      }
      if (url.includes("/health") && !url.includes("/history")) {
        return Promise.resolve({
          success: true,
          data: {
            id: "h1",
            repository_id: mockRepoId,
            overall_score: 91.5,
            overall_grade: "A",
            security_score: 95,
            code_quality_score: 90,
            maintainability_score: 88,
            performance_score: 92,
            total_files_analyzed: 12,
            total_lines_of_code: 1400,
            calculated_at: new Date().toISOString(),
          },
        });
      }
      if (url.includes("/analytics/severity-distribution")) {
        return Promise.resolve({
          success: true,
          data: [{ name: "Critical", value: 1, color: "#EF4444" }],
        });
      }
      if (url.includes("/analytics/type-distribution")) {
        return Promise.resolve({
          success: true,
          data: [{ type: "Security", count: 1, color: "#EF4444" }],
        });
      }
      if (url.includes("/analytics/top-files")) {
        return Promise.resolve({
          success: true,
          data: [{ file_path: "src/app.ts", total: 1, critical: 1, high: 0, medium: 0, low: 0 }],
        });
      }
      if (url.includes("/health/history")) {
        return Promise.resolve({
          success: true,
          data: [],
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Repository Health Radar")).toBeInTheDocument();
      expect(screen.getByText("testdev/sample-repo")).toBeInTheDocument();
      expect(screen.getByText("Optimal Health")).toBeInTheDocument();
      expect(screen.getByText("Recalculate Health")).toBeInTheDocument();
    });
  });

  it("should trigger recalculate health API when button is clicked", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/calculate-health")) {
        return Promise.resolve({
          success: true,
          data: {
            id: "h2",
            overall_score: 95,
            overall_grade: "A",
            calculated_at: new Date().toISOString(),
          },
        });
      }
      if (url.includes("/health") && !url.includes("/history")) {
        return Promise.resolve({
          success: true,
          data: {
            id: "h1",
            overall_score: 85,
            overall_grade: "B",
            security_score: 85,
            code_quality_score: 85,
            maintainability_score: 85,
            performance_score: 85,
            total_files_analyzed: 5,
            calculated_at: new Date().toISOString(),
          },
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<RepositoryHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Repository Health Radar")).toBeInTheDocument();
    });

    const recalcBtn = screen.getByRole("button", { name: /recalculate health/i });
    fireEvent.click(recalcBtn);

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        `/api/repositories/${mockRepoId}/calculate-health`,
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
