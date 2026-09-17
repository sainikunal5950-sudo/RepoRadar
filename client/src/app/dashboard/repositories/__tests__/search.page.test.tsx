import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepositoryCodeSearchPage from "../[id]/search/page";
import apiClient from "@/lib/api-client";
import { useParams } from "next/navigation";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  },
}));



jest.mock("@/lib/api-client");

describe("Repository Code Search Page Tests", () => {
  const mockRepoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: mockRepoId });
  });

  it("should render Search page and fetch indexing status on mount", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/search-repo",
            github_repo_name: "search-repo",
          },
        });
      }
      if (url.includes("/index-status")) {
        return Promise.resolve({
          success: true,
          data: {
            indexing_status: "completed",
            total_chunks_indexed: 42,
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryCodeSearchPage />);

    await waitFor(() => {
      expect(screen.getByText("Code Vector Search")).toBeInTheDocument();
      expect(screen.getByText("Vector Indexed")).toBeInTheDocument();
      expect(screen.getByText("42")).toBeInTheDocument();
    });
  });

  it("should execute code vector search and display search results", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: { id: mockRepoId, github_repo_fullname: "testdev/search-repo" },
        });
      }
      if (url.includes("/index-status")) {
        return Promise.resolve({
          success: true,
          data: { indexing_status: "completed", total_chunks_indexed: 42 },
        });
      }
      if (opts?.method === "POST" && url.includes("/search-code")) {
        return Promise.resolve({
          success: true,
          data: {
            query: "jwt auth",
            total_results: 1,
            search_mode: "atlas_vector_search",
            results: [
              {
                id: "res1",
                file_path: "src/auth/jwt.ts",
                start_line: 1,
                end_line: 15,
                chunk_text: "export const verifyToken = () => {};",
                chunk_type: "function",
                chunk_label: "function verifyToken",
                language: "typescript",
                score: 0.95,
              },
            ],
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryCodeSearchPage />);

    const searchInput = screen.getByPlaceholderText(/ask about this codebase/i);
    fireEvent.change(searchInput, { target: { value: "jwt auth" } });

    const searchButton = screen.getByRole("button", { name: /^search$/i });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining(`/api/repositories/${mockRepoId}/search-code`),
        expect.objectContaining({ method: "POST" })
      );
      expect(screen.getByText("src/auth/jwt.ts")).toBeInTheDocument();
      expect(screen.getByText("95% match")).toBeInTheDocument();
    });
  });
});
