import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatMessage from "../ChatMessage";

jest.mock("next/link", () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  };
});

describe("ChatMessage Component", () => {
  const repoId = "repo-123";

  it("should render user message correctly", () => {
    render(
      <ChatMessage
        role="user"
        content="How does login work?"
        repoId={repoId}
      />
    );

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("How does login work?")).toBeInTheDocument();
  });

  it("should render assistant message with markdown and code blocks", () => {
    const markdownContent = `Authentication is handled in **auth controller**.

\`\`\`typescript
const token = jwt.sign(user, SECRET);
\`\`\`

- Verifies passwords
- Issues JWT token`;

    render(
      <ChatMessage
        role="assistant"
        content={markdownContent}
        citedFiles={["src/auth.ts"]}
        retrievedChunks={[
          { file_path: "src/auth.ts", start_line: 1, end_line: 25, score: 0.95 },
        ]}
        repoId={repoId}
        tokensUsed={180}
      />
    );

    expect(screen.getByText("RepoRadar Assistant")).toBeInTheDocument();
    expect(screen.getByText("auth controller")).toBeInTheDocument();
    expect(screen.getByText("typescript")).toBeInTheDocument();
    expect(screen.getByText("Verifies passwords")).toBeInTheDocument();
    expect(screen.getByText("Cited Code Sources (1)")).toBeInTheDocument();
    expect(screen.getByText("auth.ts")).toBeInTheDocument();
  });

  it("should copy message content when copy button is clicked", () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockImplementation(() => Promise.resolve()),
      },
    });

    render(
      <ChatMessage
        role="assistant"
        content="Hello world response"
        repoId={repoId}
      />
    );

    const copyBtn = screen.getByTitle("Copy message");
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "Hello world response"
    );
  });
});
