import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import IssueTable, { CodeIssueItem } from "../IssueTable";

describe("IssueTable Component Tests", () => {
  const mockIssues: CodeIssueItem[] = [
    {
      id: "issue-1",
      repository_id: "repo-1",
      file_path: "src/api/auth.ts",
      line_number: 24,
      column_number: 1,
      issue_type: "security",
      severity: "critical",
      message: "Hardcoded API key detected in source code",
      suggested_fix: "Move credentials into environment variables",
      code_snippet: "const apiKey = 'AKIA1234567890ABCDEF';",
      rule_id: "security/hardcoded-aws-key",
    },
    {
      id: "issue-2",
      repository_id: "repo-1",
      file_path: "src/utils/calc.ts",
      line_number: 12,
      issue_type: "bug",
      severity: "medium",
      message: "Variable 'unused' is declared but never read",
      suggested_fix: "Remove the unused variable",
      code_snippet: "const unused = 42;",
      rule_id: "bug/unused-variable",
    },
  ];

  it("should show empty placeholder when no issues are present", () => {
    render(<IssueTable issues={[]} />);
    expect(screen.getByText(/No Issues Found/i)).toBeInTheDocument();
  });

  it("should render table headers and issue rows", () => {
    render(<IssueTable issues={mockIssues} />);

    expect(screen.getByText("src/api/auth.ts")).toBeInTheDocument();
    expect(screen.getByText("src/utils/calc.ts")).toBeInTheDocument();
    expect(screen.getByText("Hardcoded API key detected in source code")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("should expand issue details on row click", () => {
    render(<IssueTable issues={mockIssues} />);

    // Initially suggested fix is not visible
    expect(screen.queryByText(/Move credentials into environment variables/i)).not.toBeInTheDocument();

    // Click row
    const row = screen.getByText("Hardcoded API key detected in source code");
    fireEvent.click(row);

    // After click, suggested fix and code snippet are visible
    expect(screen.getByText(/Move credentials into environment variables/i)).toBeInTheDocument();
    expect(screen.getByText(/const apiKey = 'AKIA1234567890ABCDEF';/i)).toBeInTheDocument();
  });
});
