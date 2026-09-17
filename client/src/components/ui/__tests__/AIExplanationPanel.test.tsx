import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIExplanationPanel from "../AIExplanationPanel";
import apiClient from "@/lib/api-client";

// Mock apiClient
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("AIExplanationPanel Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not render when isOpen is false", () => {
    render(
      <AIExplanationPanel
        isOpen={false}
        onClose={jest.fn()}
        filePath="src/auth.ts"
      />
    );

    expect(screen.queryByText("AI Code Explanation")).not.toBeInTheDocument();
  });

  it("should render explanation data when API returns success", async () => {
    (apiClient as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        summary: "This file handles JWT token verification and user authentication.",
        detailed_explanation: "The module exports authenticateRequest which parses Bearer tokens.",
        key_points: ["Stateless token validation", "Environment variable secret usage"],
        complexity: "Moderate",
        suggested_improvements: ["Add token revocation checks"],
        model_used: "gpt-4o-mini",
      },
    });

    render(
      <AIExplanationPanel
        isOpen={true}
        onClose={jest.fn()}
        filePath="src/auth.ts"
        codeSnippet="export const authenticate = () => {};"
        language="typescript"
      />
    );

    expect(screen.getByText(/Synthesizing Code Architecture.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("This file handles JWT token verification and user authentication.")
      ).toBeInTheDocument();
    });

    expect(screen.getByText("Stateless token validation")).toBeInTheDocument();
    expect(screen.getByText("Complexity: Moderate")).toBeInTheDocument();
    expect(screen.getByText("Add token revocation checks")).toBeInTheDocument();
  });

  it("should call onClose when close button is clicked", async () => {
    const handleClose = jest.fn();
    (apiClient as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        summary: "Summary text",
        detailed_explanation: "Details",
        key_points: ["Point 1"],
      },
    });

    render(
      <AIExplanationPanel
        isOpen={true}
        onClose={handleClose}
        filePath="src/test.ts"
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Summary text")).toBeInTheDocument();
    });

    const closeBtn = screen.getByRole("button", { name: "Close" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
