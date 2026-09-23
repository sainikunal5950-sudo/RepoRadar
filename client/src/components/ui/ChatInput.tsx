import React, { useState, useRef, useEffect } from "react";
import { Send, Loader2, CornerDownLeft } from "lucide-react";

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = "Ask a question about this repository's codebase...",
}: ChatInputProps) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        200
      )}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || disabled) return;
    onSendMessage(trimmed);
    setText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  return (
    <div className="relative rounded-2xl bg-[#111111] border border-[#222222] focus-within:border-purple-500/60 focus-within:ring-1 focus-within:ring-purple-500/30 transition-all p-3 shadow-2xl">
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled || isLoading}
        placeholder={disabled ? "Please index repository code first to enable chat..." : placeholder}
        maxLength={2000}
        className="w-full bg-transparent text-sm text-white placeholder-neutral-500 focus:outline-none resize-none min-h-[44px] max-h-[200px] leading-relaxed pr-12 font-sans disabled:opacity-50 disabled:cursor-not-allowed"
      />

      <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A] text-[11px] font-mono text-neutral-500">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[#1C1C1C] border border-[#2D2D2D] text-[10px] text-neutral-400">
              Enter
            </kbd>
            <span>to send</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-[#1C1C1C] border border-[#2D2D2D] text-[10px] text-neutral-400">
              Shift + Enter
            </kbd>
            <span>for new line</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span>{text.length}/2000</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() || isLoading || disabled}
            className="flex items-center justify-center p-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-30 disabled:hover:bg-purple-600 disabled:cursor-not-allowed transition-all duration-150 shadow-md cursor-pointer"
            title="Send question"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
