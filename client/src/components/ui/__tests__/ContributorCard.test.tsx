import React from "react";
import { render, screen } from "@testing-library/react";
import ContributorCard, { ContributorData } from "../ContributorCard";

describe("ContributorCard Component Tests", () => {
  const mockContributor: ContributorData = {
    id: "c1",
    author_name: "Alice Developer",
    author_email: "alice@example.com",
    author_github_username: "alicedev",
    author_avatar_url: "https://avatars.githubusercontent.com/u/123",
    total_commits: 42,
    total_additions: 1250,
    total_deletions: 340,
    files_touched_count: 18,
    contribution_percentage: 55.5,
    first_commit_at: "2026-01-01T00:00:00Z",
    last_commit_at: "2026-03-01T00:00:00Z",
  };

  it("should render contributor name, avatar, username, and rank badge", () => {
    render(<ContributorCard contributor={mockContributor} rank={1} />);

    expect(screen.getByText("Alice Developer")).toBeInTheDocument();
    expect(screen.getByText("@alicedev")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("55.5%")).toBeInTheDocument();
  });

  it("should render stats including commits, touched files, additions, and deletions", () => {
    render(<ContributorCard contributor={mockContributor} />);

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("+1,250")).toBeInTheDocument();
    expect(screen.getByText("-340")).toBeInTheDocument();
  });

  it("should render initials placeholder if no avatar URL is provided", () => {
    const withoutAvatar: ContributorData = {
      ...mockContributor,
      author_name: "Bob Smith",
      author_avatar_url: null,
      author_github_username: null,
    };

    render(<ContributorCard contributor={withoutAvatar} />);

    expect(screen.getByText("BS")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });
});
