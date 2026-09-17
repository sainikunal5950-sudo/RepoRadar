import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import CodeSearchResult from "../CodeSearchResult";

// Mock Prism highlightAll
jest.mock("prismjs", () => ({
  highlightAll: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  };
});





describe("CodeSearchResult Component", () => {
  const defaultProps = {
    id: "emb-123",
    repositoryId: "repo-456",
    filePath: "src/auth/jwt.ts",
    startLine: 10,
    endLine: 25,
    chunkText: "export function verifyToken() {\n  return true;\n}",
    chunkType: "function",
    chunkLabel: "function verifyToken",
    language: "typescript",
    score: 0.94,
  };

  it("should render file path, line numbers, label, and relevance badge", () => {
    render(<CodeSearchResult {...defaultProps} />);

    expect(screen.getByText("src/auth/jwt.ts")).toBeInTheDocument();
    expect(screen.getByText("L10-25")).toBeInTheDocument();
    expect(screen.getByText("function verifyToken")).toBeInTheDocument();
    expect(screen.getByText("94% match")).toBeInTheDocument();
    expect(screen.getByText("function")).toBeInTheDocument();
  });

  it("should handle copy to clipboard", () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(<CodeSearchResult {...defaultProps} />);
    const copyButton = screen.getByRole("button", { name: /copy/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      defaultProps.chunkText
    );
  });
});
