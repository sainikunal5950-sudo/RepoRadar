import React from "react";
import { render, screen } from "@testing-library/react";
import AnalysisSummary, { AnalysisSummaryData } from "../AnalysisSummary";

describe("AnalysisSummary Component Tests", () => {
  const mockSummary: AnalysisSummaryData = {
    id: "65d75cf9e1d84f23b890abcd",
    repository_id: "65d75cf9e1d84f23b890abce",
    total_issues: 15,
    critical_count: 2,
    high_count: 4,
    medium_count: 6,
    low_count: 3,
    security_issues_count: 2,
    performance_issues_count: 3,
    bug_issues_count: 5,
    code_smell_count: 4,
    maintainability_count: 1,
    analysis_completed_at: "2026-09-10T12:00:00Z",
  };

  it("should show empty state when summary is null", () => {
    render(<AnalysisSummary summary={null} />);
    expect(
      screen.getByText(/No analysis summary available yet/i)
    ).toBeInTheDocument();
  });

  it("should render total issues and severity counts", () => {
    render(<AnalysisSummary summary={mockSummary} />);
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Critical")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Security")).toBeInTheDocument();
  });
});
