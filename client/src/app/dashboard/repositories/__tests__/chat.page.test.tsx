import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RepositoryChatPage from "../[id]/chat/page";
import apiClient from "@/lib/api-client";
import { useParams } from "next/navigation";

// Mock scrollIntoView
window.HTMLElement.prototype.scrollIntoView = jest.fn();

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

describe("Repository Chat Page Tests", () => {
  const mockRepoId = "65d75cf9e1d84f23b890abce";

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({ id: mockRepoId });
  });

  it("should render Chat page and empty state on mount", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/chat-repo",
            github_repo_name: "chat-repo",
            indexing_status: "completed",
            total_chunks_indexed: 50,
          },
        });
      }
      if (url.includes("/conversations")) {
        return Promise.resolve({
          success: true,
          data: [],
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryChatPage />);

    await waitFor(() => {
      expect(screen.getByText("AI Chat Assistant")).toBeInTheDocument();
      expect(screen.getByText("Chat with chat-repo")).toBeInTheDocument();
      expect(screen.getByText("Code Indexed")).toBeInTheDocument();
      expect(screen.getByText("Authentication Flow")).toBeInTheDocument();
    });
  });

  it("should send question and render assistant response with citations", async () => {
    (apiClient as jest.Mock).mockImplementation((url: string, opts?: any) => {
      if (url.includes("/metrics")) {
        return Promise.resolve({
          success: true,
          data: {
            id: mockRepoId,
            github_repo_fullname: "testdev/chat-repo",
            github_repo_name: "chat-repo",
            indexing_status: "completed",
            total_chunks_indexed: 50,
          },
        });
      }
      if (url.includes("/conversations") && !opts) {
        return Promise.resolve({
          success: true,
          data: [],
        });
      }
      if (opts?.method === "POST" && url.includes("/chat")) {
        return Promise.resolve({
          success: true,
          data: {
            conversationId: "conv-999",
            answer: "Authentication is implemented in `src/auth.ts:1-20` using tokens.",
            citedFiles: ["src/auth.ts"],
            retrievedChunks: [
              {
                file_path: "src/auth.ts",
                start_line: 1,
                end_line: 20,
                score: 0.96,
              },
            ],
            tokensUsed: 140,
            messageId: "msg-123",
          },
        });
      }
      return Promise.resolve({ success: true, data: {} });
    });

    render(<RepositoryChatPage />);

    await waitFor(() => {
      expect(screen.getByText("Chat with chat-repo")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(/Ask a question about this repository/i);
    fireEvent.change(input, { target: { value: "Where is authentication?" } });

    const sendBtn = screen.getByTitle("Send question");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("Where is authentication?")).toBeInTheDocument();
      expect(screen.getByText(/Authentication is implemented in/i)).toBeInTheDocument();
      expect(screen.getByText("auth.ts")).toBeInTheDocument();
      expect(screen.getByText("Cited Code Sources (1)")).toBeInTheDocument();
    });
  });
});
