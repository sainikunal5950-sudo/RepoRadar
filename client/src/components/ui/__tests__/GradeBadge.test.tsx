import React from "react";
import { render, screen } from "@testing-library/react";
import GradeBadge from "../GradeBadge";

describe("GradeBadge Component Tests", () => {
  it("should render Grade A badge correctly", () => {
    render(<GradeBadge grade="A" />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  it("should render Grade B badge correctly", () => {
    render(<GradeBadge grade="B" />);
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("should render Grade C badge correctly", () => {
    render(<GradeBadge grade="C" />);
    expect(screen.getByText("C")).toBeInTheDocument();
  });

  it("should render Grade D badge correctly", () => {
    render(<GradeBadge grade="D" />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("should render Grade F badge correctly", () => {
    render(<GradeBadge grade="F" />);
    expect(screen.getByText("F")).toBeInTheDocument();
  });
});
