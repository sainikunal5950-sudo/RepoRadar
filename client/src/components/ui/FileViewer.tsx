"use client";

import React, { useEffect, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-go";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-css";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import { Copy, Check, FileCode, AlertCircle, Loader2, Sparkles } from "lucide-react";
import AIExplanationPanel from "./AIExplanationPanel";

interface Props {
  filePath: string | null;
  content: string | null;
  language: string | null;
  fileSize?: number;
  isLoading?: boolean;
  isBinary?: boolean;
}

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function FileViewer({
  filePath,
  content,
  language,
  fileSize,
  isLoading,
  isBinary,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);

  useEffect(() => {
    if (content) {
      Prism.highlightAll();
    }
  }, [content, language]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!filePath) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-[#0E0E0E] border border-[#1F1F1F] text-center">
        <FileCode className="w-10 h-10 text-neutral-600 mb-3" />
        <h4 className="text-sm font-bold text-white font-mono">No File Selected</h4>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          Select a file from the explorer on the left to inspect its code contents and syntax.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-[#0E0E0E] border border-[#1F1F1F]">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-500 mb-3" />
        <p className="text-xs font-mono text-neutral-400">Loading {filePath}...</p>
      </div>
    );
  }

  if (isBinary) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-[#0E0E0E] border border-[#1F1F1F] text-center">
        <AlertCircle className="w-10 h-10 text-amber-500/80 mb-3" />
        <h4 className="text-sm font-bold text-white font-mono">Binary File</h4>
        <p className="text-xs text-neutral-400 mt-1 max-w-sm">
          {filePath} is a binary artifact and cannot be rendered as text.
        </p>
      </div>
    );
  }

  const prismLang = language || "plaintext";
  const lines = (content || "").split("\n");

  return (
    <div className="h-full flex flex-col rounded-2xl bg-[#0E0E0E] border border-[#1F1F1F] overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-4 py-3 bg-[#141414] border-b border-[#1F1F1F] flex items-center justify-between gap-4">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="text-xs font-mono font-bold text-white truncate">
            {filePath}
          </span>
        </div>

        {/* Action and Badges */}
        <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
          {fileSize !== undefined && (
            <span className="text-neutral-500 text-[11px]">
              {formatBytes(fileSize)}
            </span>
          )}

          <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-neutral-300 text-[11px] uppercase">
            {language || "code"}
          </span>

          <button
            type="button"
            onClick={() => setIsExplainOpen(true)}
            disabled={!content}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 hover:bg-purple-900/60 border border-purple-500/30 text-purple-300 hover:text-purple-200 transition-colors cursor-pointer"
            title="Explain code with AI microservice"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[11px] font-semibold">Explain Code</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={!content}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1C1C1C] hover:bg-[#262626] border border-[#2E2E2E] text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Editor Viewport with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed flex bg-[#0A0A0A] select-text">
        {/* Line Numbers Gutter */}
        <div className="pr-4 select-none text-right text-neutral-600 border-r border-white/5 font-mono shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="h-5">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <div className="pl-4 flex-1 overflow-x-auto">
          <pre className="!bg-transparent !p-0 !m-0 font-mono">
            <code className={`language-${prismLang}`}>
              {content || "// Empty file"}
            </code>
          </pre>
        </div>
      </div>

      {/* AI Code Explanation Modal */}
      <AIExplanationPanel
        isOpen={isExplainOpen}
        onClose={() => setIsExplainOpen(false)}
        filePath={filePath}
        codeSnippet={content}
        language={language}
      />
    </div>
  );
}

export default FileViewer;

