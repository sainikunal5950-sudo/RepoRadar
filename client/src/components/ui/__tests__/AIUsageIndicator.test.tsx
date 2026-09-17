import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIUsageIndicator from "../AIUsageIndicator";
import apiClient from "@/lib/api-client";

// Mock apiClient
jest.mock("@/lib/api-client", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("AIUsageIndicator Component Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should show initial AI Ready badge before data resolves", () => {
    (apiClient as jest.Mock).mockReturnValueOnce(new Promise(() => {}));
    render(<AIUsageIndicator />);

    expect(screen.getByText("AI Ready")).toBeInTheDocument();
  });

  it("should render quota button and open popover with details on click", async () => {
    (apiClient as jest.Mock).mockResolvedValueOnce({
      success: true,
      data: {
        used_in_last_hour: 12,
        limit_per_hour: 50,
        remaining: 38,
        reset_at: new Date(Date.now() + 3600000).toISOString(),
        lifetime_requests: 124,
        total_tokens_used: 85200,
      },
    });

    render(<AIUsageIndicator />);

    await waitFor(() => {
      expect(screen.getByText("38/50")).toBeInTheDocument();
    });

    // Click to open popover
    const triggerBtn = screen.getByTitle("AI Hourly Usage & Quota");
    fireEvent.click(triggerBtn);

    expect(screen.getByText("AI LLM Microservice")).toBeInTheDocument();

    expect(screen.getByText(/12 \/ 50 used \(24%\)/i)).toBeInTheDocument();
    expect(screen.getByText("124")).toBeInTheDocument();
    expect(screen.getByText("85,200")).toBeInTheDocument();
  });
});
