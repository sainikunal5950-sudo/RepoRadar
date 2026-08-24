import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FileViewer from "../FileViewer";

describe("FileViewer Component Tests", () => {
  it("should show empty placeholder when no file is selected", () => {
    render(
      <FileViewer
        filePath={null}
        content={null}
        language={null}
      />
    );

    expect(screen.getByText("No File Selected")).toBeInTheDocument();
  });

  it("should render file content and file path breadcrumb", () => {
    const testCode = "export const radar = () => true;";
    render(
      <FileViewer
        filePath="src/radar.ts"
        content={testCode}
        language="typescript"
        fileSize={1024}
      />
    );

    expect(screen.getByText("src/radar.ts")).toBeInTheDocument();
    expect(screen.getByText(/typescript/i)).toBeInTheDocument();
    expect(screen.getByText("radar")).toBeInTheDocument();
  });

  it("should render binary file warning when isBinary is true", () => {
    render(
      <FileViewer
        filePath="logo.png"
        content={null}
        language="binary"
        isBinary={true}
      />
    );

    expect(screen.getByText("Binary File")).toBeInTheDocument();
    expect(screen.getByText(/is a binary artifact/i)).toBeInTheDocument();
  });

  it("should copy code content when copy button is clicked", async () => {
    const testCode = "const message = 'Hello RepoRadar';";
    render(
      <FileViewer
        filePath="src/index.ts"
        content={testCode}
        language="typescript"
      />
    );

    const copyBtn = screen.getByRole("button", { name: /copy/i });
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testCode);
    expect(screen.getByText("Copied!")).toBeInTheDocument();
  });
});
