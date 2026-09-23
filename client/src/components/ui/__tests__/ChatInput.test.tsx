import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ChatInput from "../ChatInput";

describe("ChatInput Component", () => {
  it("should render placeholder and handle typing", () => {
    const handleSend = jest.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(
      /Ask a question about this repository's codebase/i
    );
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: "Where is auth defined?" } });
    expect(textarea).toHaveValue("Where is auth defined?");
  });

  it("should trigger onSendMessage on Enter key press", () => {
    const handleSend = jest.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(
      /Ask a question about this repository's codebase/i
    );
    fireEvent.change(textarea, { target: { value: "Where is auth defined?" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(handleSend).toHaveBeenCalledWith("Where is auth defined?");
  });

  it("should NOT trigger onSendMessage on Shift+Enter", () => {
    const handleSend = jest.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(
      /Ask a question about this repository's codebase/i
    );
    fireEvent.change(textarea, { target: { value: "Line 1" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
  });

  it("should trigger onSendMessage when send button is clicked", () => {
    const handleSend = jest.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} />);

    const textarea = screen.getByPlaceholderText(
      /Ask a question about this repository's codebase/i
    );
    fireEvent.change(textarea, { target: { value: "What does this repo do?" } });

    const sendBtn = screen.getByTitle("Send question");
    fireEvent.click(sendBtn);

    expect(handleSend).toHaveBeenCalledWith("What does this repo do?");
  });

  it("should disable input when disabled prop is true", () => {
    const handleSend = jest.fn();
    render(<ChatInput onSendMessage={handleSend} isLoading={false} disabled={true} />);

    const textarea = screen.getByPlaceholderText(
      /Please index repository code first/i
    );
    expect(textarea).toBeDisabled();
  });
});
