import React from "react";
import { render, screen } from "@testing-library/react";
import CitedFileChip from "../CitedFileChip";

jest.mock("next/link", () => {
  return function MockLink({ children, href }: any) {
    return <a href={href}>{children}</a>;
  };
});

describe("CitedFileChip Component", () => {
  it("should render file name, directory, and line range", () => {
    render(
      <CitedFileChip
        filePath="src/services/auth.service.ts"
        startLine={15}
        endLine={40}
        score={0.92}
        repoId="repo-123"
      />
    );

    expect(screen.getByText("auth.service.ts")).toBeInTheDocument();
    expect(screen.getByText("src/services/")).toBeInTheDocument();
    expect(screen.getByText("L15-40")).toBeInTheDocument();
    expect(screen.getByText("(92%)")).toBeInTheDocument();

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute(
      "href",
      "/dashboard/repositories/repo-123/code?file=src%2Fservices%2Fauth.service.ts&startLine=15"
    );
  });
});
