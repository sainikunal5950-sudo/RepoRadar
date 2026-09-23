import React, { useState } from "react";
import {
  Bot,
  User,
  Copy,
  Check,
  Sparkles,
  Terminal,
  Quote,
  Layers,
} from "lucide-react";
import CitedFileChip from "./CitedFileChip";

export interface ChatChunkInfo {
  file_path: string;
  start_line: number;
  end_line: number;
  score?: number;
}

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citedFiles?: string[];
  retrievedChunks?: ChatChunkInfo[];
  repoId: string;
  tokensUsed?: number | null;
  createdAt?: string | Date;
}

/**
 * Custom lightweight markdown parser for code blocks, inline code, bolding, lists, and quotes.
 */
function renderFormattedContent(text: string) {
  const parts: React.ReactNode[] = [];
  const lines = text.split("\n");

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];
  let blockKey = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code fence start/end
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        parts.push(
          <CodeBlock
            key={`code-block-${blockKey++}`}
            code={codeBlockLines.join("\n")}
            language={codeBlockLang}
          />
        );
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
      } else {
        // Start code block
        inCodeBlock = true;
        codeBlockLang = line.trim().replace(/^```/, "").trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      parts.push(
        <div
          key={`quote-${i}`}
          className="flex items-start gap-2 pl-3 py-1 my-1.5 border-l-2 border-purple-500/50 bg-purple-950/20 rounded-r text-xs text-neutral-300 italic"
        >
          <Quote className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
          <span>{formatInline(line.substring(2))}</span>
        </div>
      );
      continue;
    }

    // Bullet points
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      parts.push(
        <div key={`bullet-${i}`} className="flex items-start gap-2 my-1 pl-2 text-xs leading-relaxed text-neutral-200">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
          <span>{formatInline(line.trim().substring(2))}</span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numberedMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      parts.push(
        <div key={`num-${i}`} className="flex items-start gap-2 my-1 pl-2 text-xs leading-relaxed text-neutral-200">
          <span className="font-mono text-[11px] font-semibold text-purple-400 shrink-0 min-w-[16px]">
            {numberedMatch[1]}.
          </span>
          <span>{formatInline(numberedMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      parts.push(
        <h4 key={`h3-${i}`} className="text-sm font-bold text-white mt-3 mb-1">
          {formatInline(line.substring(4))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      parts.push(
        <h3 key={`h2-${i}`} className="text-base font-bold text-white mt-4 mb-1.5 border-b border-[#222] pb-1">
          {formatInline(line.substring(3))}
        </h3>
      );
      continue;
    }

    // Empty lines
    if (!line.trim()) {
      parts.push(<div key={`blank-${i}`} className="h-2" />);
      continue;
    }

    // Regular paragraphs
    parts.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm leading-relaxed text-neutral-200 my-1">
        {formatInline(line)}
      </p>
    );
  }

  // If code block was not closed
  if (inCodeBlock && codeBlockLines.length > 0) {
    parts.push(
      <CodeBlock
        key={`code-block-${blockKey++}`}
        code={codeBlockLines.join("\n")}
        language={codeBlockLang}
      />
    );
  }

  return parts;
}

function formatInline(text: string): React.ReactNode {
  // Regex to split by bold (**...**) and inline code (`...`)
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[#1C1C1C] border border-[#2D2D2D] text-purple-300 font-mono text-[11px] mx-0.5"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-xl border border-[#2A2A2A] bg-[#0A0A0A] overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#141414] border-b border-[#222222]">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-neutral-400">
          <Terminal className="w-3 h-3 text-purple-400" />
          <span>{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <div className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed text-neutral-200">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

export default function ChatMessage({
  role,
  content,
  citedFiles = [],
  retrievedChunks = [],
  repoId,
  tokensUsed,
  createdAt,
}: ChatMessageProps) {
  const isUser = role === "user";
  const [copiedMessage, setCopiedMessage] = useState(false);

  const handleCopyFull = () => {
    navigator.clipboard.writeText(content);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Compile unique cited chunks
  const displaySources: ChatChunkInfo[] = [];
  if (retrievedChunks && retrievedChunks.length > 0) {
    retrievedChunks.forEach((c) => {
      if (!displaySources.some((s) => s.file_path === c.file_path && s.start_line === c.start_line)) {
        displaySources.push(c);
      }
    });
  } else if (citedFiles && citedFiles.length > 0) {
    citedFiles.forEach((f) => {
      if (!displaySources.some((s) => s.file_path === f)) {
        displaySources.push({ file_path: f, start_line: 1, end_line: 1 });
      }
    });
  }

  const timeString = createdAt
    ? new Date(createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div
      className={`flex items-start gap-3 my-4 group ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar Badge */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
          isUser
            ? "bg-purple-950/60 border-purple-800/60 text-purple-300"
            : "bg-[#141414] border-[#2A2A2A] text-emerald-400"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message Bubble */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 shadow-lg ${
          isUser
            ? "bg-[#181818] border border-[#2A2A2A] text-white rounded-tr-sm"
            : "bg-[#111111] border border-[#1F1F1F] text-neutral-100 rounded-tl-sm w-full"
        }`}
      >
        {/* Header (Role & Time) */}
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              {isUser ? "You" : "RepoRadar Assistant"}
              {!isUser && <Sparkles className="w-3 h-3 text-purple-400" />}
            </span>
            {timeString && (
              <span className="text-[10px] font-mono text-neutral-500">
                {timeString}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopyFull}
            title="Copy message"
            className="text-neutral-500 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer p-1"
          >
            {copiedMessage ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Message Body */}
        <div className="space-y-1">
          {isUser ? (
            <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans">
              {content}
            </p>
          ) : (
            <div>{renderFormattedContent(content)}</div>
          )}
        </div>

        {/* Cited Sources Footer (for assistant messages) */}
        {!isUser && displaySources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1C1C1C] space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-neutral-400">
              <Layers className="w-3 h-3 text-purple-400" />
              <span>Cited Code Sources ({displaySources.length})</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {displaySources.map((source, idx) => (
                <CitedFileChip
                  key={`cited-${idx}-${source.file_path}-${source.start_line}`}
                  filePath={source.file_path}
                  startLine={source.start_line}
                  endLine={source.end_line}
                  score={source.score}
                  repoId={repoId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer Meta (tokens) */}
        {!isUser && tokensUsed && (
          <div className="mt-2 text-[10px] font-mono text-neutral-600 text-right">
            ~{tokensUsed} tokens used
          </div>
        )}
      </div>
    </div>
  );
}
