import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HotspotTable, { HotspotData } from "../HotspotTable";

describe("HotspotTable Component Tests", () => {
  const mockHotspots: HotspotData[] = [
    {
      id: "h1",
      file_path: "src/services/auth.service.ts",
      change_count: 24,
      unique_authors_count: 4,
      total_additions: 450,
      total_deletions: 120,
      issue_count: 6,
      critical_issue_count: 2,
      debt_score: 95.0,
      last_modified_at: "2026-03-01T00:00:00Z",
    },
    {
      id: "h2",
      file_path: "src/utils/formatter.ts",
      change_count: 8,
      unique_authors_count: 2,
      total_additions: 80,
      total_deletions: 15,
      issue_count: 1,
      critical_issue_count: 0,
      debt_score: 35.5,
      last_modified_at: "2026-02-15T00:00:00Z",
    },
  ];

  it("should render empty state when no hotspots are present", () => {
    render(<HotspotTable hotspots={[]} repoId="repo-1" />);
    expect(screen.getByText(/No Hotspots Computed/i)).toBeInTheDocument();
  });

  it("should render table rows with file path, debt score, changes, and authors", () => {
    render(<HotspotTable hotspots={mockHotspots} repoId="repo-1" />);

    expect(screen.getByText("src/services/auth.service.ts")).toBeInTheDocument();
    expect(screen.getByText("src/utils/formatter.ts")).toBeInTheDocument();
    expect(screen.getByText("95/100")).toBeInTheDocument();
    expect(screen.getByText("35.5/100")).toBeInTheDocument();
    expect(screen.getByText("24")).toBeInTheDocument();
    expect(screen.getByText("2 critical")).toBeInTheDocument();
  });

  it("should filter files based on search input", () => {
    render(<HotspotTable hotspots={mockHotspots} repoId="repo-1" />);

    const searchInput = screen.getByPlaceholderText(/Filter files/i);
    fireEvent.change(searchInput, { target: { value: "formatter" } });

    expect(screen.getByText("src/utils/formatter.ts")).toBeInTheDocument();
    expect(screen.queryByText("src/services/auth.service.ts")).not.toBeInTheDocument();
  });
});
