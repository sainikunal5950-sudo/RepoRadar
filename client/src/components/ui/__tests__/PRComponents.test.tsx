import React from "react";
import { render, screen } from "@testing-library/react";
import PRStatusBadge from "../PRStatusBadge";
import RiskLevelBadge from "../RiskLevelBadge";
import PRReviewSummaryCard from "../PRReviewSummaryCard";
import PRIssueList from "../PRIssueList";

describe("Pull Request UI Components", () => {
  describe("PRStatusBadge", () => {
    it("renders Open status correctly", () => {
      render(<PRStatusBadge status="open" />);
      expect(screen.getByText("Open")).toBeInTheDocument();
    });

    it("renders Merged status correctly", () => {
      render(<PRStatusBadge status="merged" />);
      expect(screen.getByText("Merged")).toBeInTheDocument();
    });

    it("renders Closed status correctly", () => {
      render(<PRStatusBadge status="closed" />);
      expect(screen.getByText("Closed")).toBeInTheDocument();
    });
  });

  describe("RiskLevelBadge", () => {
    it("renders critical risk level with correct text", () => {
      render(<RiskLevelBadge riskLevel="critical" />);
      expect(screen.getByText("Critical Risk")).toBeInTheDocument();
    });

    it("renders high risk level with correct text", () => {
      render(<RiskLevelBadge riskLevel="high" />);
      expect(screen.getByText("High Risk")).toBeInTheDocument();
    });

    it("renders medium risk level with correct text", () => {
      render(<RiskLevelBadge riskLevel="medium" />);
      expect(screen.getByText("Medium Risk")).toBeInTheDocument();
    });

    it("renders low risk level with correct text", () => {
      render(<RiskLevelBadge riskLevel="low" />);
      expect(screen.getByText("Low Risk")).toBeInTheDocument();
    });
  });

  describe("PRReviewSummaryCard", () => {
    it("renders summary, recommendation and diff stats correctly", () => {
      render(
        <PRReviewSummaryCard
          summary="This PR updates authentication middleware and adds rate limits."
          recommendation="Safe to merge"
          riskLevel="low"
          filesChangedCount={3}
          additions={45}
          deletions={12}
          issuesCount={0}
          criticalIssuesCount={0}
        />
      );

      expect(screen.getByText("This PR updates authentication middleware and adds rate limits.")).toBeInTheDocument();
      expect(screen.getByText("Safe to merge")).toBeInTheDocument();
      expect(screen.getByText("+45")).toBeInTheDocument();
      expect(screen.getByText("-12")).toBeInTheDocument();
      expect(screen.getByText("3 files")).toBeInTheDocument();
      expect(screen.getByText("0 issues")).toBeInTheDocument();
    });
  });

  describe("PRIssueList", () => {
    it("renders clean state when no issues are present", () => {
      render(<PRIssueList issues={[]} />);
      expect(screen.getByText("Clean Pull Request Diff!")).toBeInTheDocument();
    });

    it("renders issue items with file path, line number and severity", () => {
      const mockIssues = [
        {
          id: "issue-1",
          file_path: "src/auth/jwt.ts",
          line_number: 42,
          issue_type: "security",
          severity: "critical" as const,
          message: "Hardcoded JWT secret key detected in source code.",
          is_new_issue: true,
        },
      ];

      render(<PRIssueList issues={mockIssues} />);
      expect(screen.getByText("Diff Issues Detected")).toBeInTheDocument();
      expect(screen.getByText("Hardcoded JWT secret key detected in source code.")).toBeInTheDocument();
      expect(screen.getByText("src/auth/jwt.ts")).toBeInTheDocument();
      expect(screen.getByText(":42")).toBeInTheDocument();
      expect(screen.getByText("New In PR")).toBeInTheDocument();
    });
  });
});
