import React from "react";
import { render, screen } from "@testing-library/react";
import SeverityBadge from "../SeverityBadge";

describe("SeverityBadge Component Tests", () => {
  it("should render Critical badge correctly", () => {
    render(<SeverityBadge severity="critical" />);
    expect(screen.getByText(/Critical/i)).toBeInTheDocument();
  });

  it("should render High badge correctly", () => {
    render(<SeverityBadge severity="high" />);
    expect(screen.getByText(/High/i)).toBeInTheDocument();
  });

  it("should render Medium badge correctly", () => {
    render(<SeverityBadge severity="medium" />);
    expect(screen.getByText(/Medium/i)).toBeInTheDocument();
  });

  it("should render Low badge correctly", () => {
    render(<SeverityBadge severity="low" />);
    expect(screen.getByText(/Low/i)).toBeInTheDocument();
  });
});
