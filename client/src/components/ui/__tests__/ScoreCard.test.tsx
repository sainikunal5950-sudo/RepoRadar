import React from "react";
import { render, screen } from "@testing-library/react";
import ScoreCard from "../ScoreCard";
import { ShieldAlert } from "lucide-react";

describe("ScoreCard Component Tests", () => {
  it("should render title, score, and weight accurately", () => {
    render(
      <ScoreCard
        title="Security"
        score={94}
        weight="40%"
        icon={ShieldAlert}
        description="Security vulnerability metrics"
      />
    );

    expect(screen.getByText("Security")).toBeInTheDocument();
    expect(screen.getByText("94")).toBeInTheDocument();
    expect(screen.getByText("Weight: 40%")).toBeInTheDocument();
    expect(screen.getByText("Security vulnerability metrics")).toBeInTheDocument();
  });
});
