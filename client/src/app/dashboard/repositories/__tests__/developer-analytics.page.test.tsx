import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RepositoryAnalyticsPage from "../[id]/analytics/page";
import apiClient from "@/lib/api-client";
import { useParams } from "next/navigation";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/api-client");

describe("Repository Developer Analytics Page Tests", () => {
  const mockRepoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: mockRepoId });
  });

  it("should render Developer Analytics header, summary stats, and subcomponents when data exists", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/radar-core",
            github_repo_url: "https://github.com/testdev/radar-core",
          },
        });
      }
      if (url.includes("/analytics/contributors")) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: "c1",
              author_name: "Alice Engineer",
              author_email: "alice@example.com",
              author_github_username: "aliceeng",
              total_commits: 25,
              total_additions: 1200,
              total_deletions: 300,
              files_touched_count: 14,
              contribution_percentage: 62.5,
              first_commit_at: "2026-01-01T00:00:00Z",
              last_commit_at: "2026-03-01T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/analytics/activity")) {
        return Promise.resolve({
          success: true,
          data: [
            { date: "2026-02-15", commit_count: 5, additions: 200, deletions: 50 },
          ],
        });
      }
      if (url.includes("/analytics/heatmap")) {
        return Promise.resolve({
          success: true,
          data: {
            matrix: Array.from({ length: 7 }, () => Array(24).fill(0)),
            points: [],
            maxCount: 3,
            totalCommits: 25,
          },
        });
      }
      if (url.includes("/analytics/hotspots")) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: "h1",
              file_path: "src/server/auth.ts",
              change_count: 18,
              unique_authors_count: 3,
              total_additions: 400,
              total_deletions: 80,
              issue_count: 4,
              critical_issue_count: 1,
              debt_score: 88.0,
              last_modified_at: "2026-03-01T00:00:00Z",
            },
          ],
        });
      }
      if (url.includes("/analytics/technical-debt")) {
        return Promise.resolve({
          success: true,
          data: [
            {
              id: "debt1",
              file_path: "src/server/auth.ts",
              debt_score: 88.0,
              change_count: 18,
              unique_authors_count: 3,
              issue_count: 4,
              critical_issue_count: 1,
              risk_level: "critical",
              reason: "Modified 18 times by 3 authors with 4 issues (1 critical).",
            },
          ],
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<RepositoryAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Developer Analytics & Hotspots/i)).toBeInTheDocument();
    });

    // Check summary statistics and cards
    expect(screen.getAllByText("Alice Engineer").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("src/server/auth.ts").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Debt score 88\/100/i)).toBeInTheDocument();
  });


  it("should trigger commit sync API when Sync Commit Data button is clicked", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.includes("/sync-commits") && opts?.method === "POST") {
        return Promise.resolve({
          success: true,
          data: {
            commits_synced: 12,
            total_commits_in_repo: 37,
            contributors_found: 2,
            hotspots_computed: 5,
            rate_limit_remaining: 4950,
          },
        });
      }
      return Promise.resolve({ success: true, data: [] });
    });

    render(<RepositoryAnalyticsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Sync Commit Data/i)).toBeInTheDocument();
    });

    const syncBtn = screen.getByText(/Sync Commit Data/i);
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(screen.getByText(/Sync complete: 12 new commits ingested/i)).toBeInTheDocument();
    });
  });
});
