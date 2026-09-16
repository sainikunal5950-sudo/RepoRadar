import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreGauge from "../ScoreGauge";

describe("ScoreGauge Component Tests", () => {
  it("should render score correctly within SVG gauge", () => {
    render(<ScoreGauge score={85} />);
    expect(screen.getByText("85")).toBeInTheDocument();
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("should clamp scores between 0 and 100", () => {
    const { rerender } = render(<ScoreGauge score={120} />);
    expect(screen.getByText("100")).toBeInTheDocument();

    rerender(<ScoreGauge score={-15} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
