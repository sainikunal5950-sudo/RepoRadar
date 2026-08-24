import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepositoryCodeExplorerPage from "../[id]/code/page";
import apiClient from "@/lib/api-client";
import { useParams } from "next/navigation";

jest.mock("next/navigation", () => ({
  useParams: jest.fn(),
}));

jest.mock("@/lib/api-client");

describe("Repository Code Explorer Page Tests", () => {
  const mockRepoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: mockRepoId });
  });

  it("should render Code Explorer page and fetch tree on load", async () => {
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
      if (url.includes("/files/tree")) {
        return Promise.resolve({
          success: true,
          data: {
            tree: [
              {
                name: "src",
                path: "src",
                type: "folder",
                children: [
                  {
                    name: "app.ts",
                    path: "src/app.ts",
                    type: "file",
                    file_id: "f1",
                    size: 300,
                    language: "typescript",
                  },
                ],
              },
            ],
            total_files: 1,
            total_dirs: 1,
            updated_at: new Date().toISOString(),
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryCodeExplorerPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/testdev\/sample-repo/i)[0]).toBeInTheDocument();
      expect(screen.getByText("app.ts")).toBeInTheDocument();
    });
  });

  it("should trigger fetch code API when Fetch & Index button is clicked", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (opts?.method === "POST" && url.includes("/fetch-code")) {
        return Promise.resolve({
          success: true,
          data: {
            indexed_files: 12,
            total_dirs: 3,
            tree: [],
          },
        });
      }
      return Promise.resolve({ success: true, data: { tree: [], total_files: 0, total_dirs: 0 } });
    });

    render(<RepositoryCodeExplorerPage />);

    await waitFor(() => {
      expect(screen.getAllByText(/fetch & index code|fetch code now/i)[0]).toBeInTheDocument();
    });

    const fetchBtn = screen.getAllByText(/fetch & index code|fetch code now/i)[0].closest("button")!;
    fireEvent.click(fetchBtn);

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        expect.stringContaining(`/api/repositories/${mockRepoId}/fetch-code`),
        expect.objectContaining({ method: "POST" })
      );
    });
  });
});
