"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
import {
  FileCode,
  Copy,
  Check,
  ExternalLink,
  Tag,
  Sparkles,
  Layers,
} from "lucide-react";


export interface CodeSearchResultProps {
  id: string;
  repositoryId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  chunkText: string;
  chunkType: string;
  chunkLabel: string;
  language: string | null;
  score: number;
}

export function CodeSearchResult({
  repositoryId,
  filePath,
  startLine,
  endLine,
  chunkText,
  chunkType,
  chunkLabel,
  language,
  score,
}: CodeSearchResultProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Prism.highlightAll();
  }, [chunkText, language]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(chunkText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const percentageScore = Math.round(Math.max(0, Math.min(1, score)) * 100);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (pct >= 60) return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    return "text-neutral-400 bg-neutral-800/60 border-neutral-700/40";
  };

  const getScoreBarColor = (pct: number) => {
    if (pct >= 80) return "bg-gradient-to-r from-emerald-500 to-teal-400";
    if (pct >= 60) return "bg-gradient-to-r from-blue-500 to-cyan-400";
    return "bg-neutral-500";
  };

  const prismLang = language || "typescript";
  const lines = chunkText.split("\n");

  const explorerUrl = `/dashboard/repositories/${repositoryId}/code?file=${encodeURIComponent(
    filePath
  )}&startLine=${startLine}&endLine=${endLine}`;

  return (
    <div className="group rounded-2xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all duration-200 overflow-hidden shadow-lg">
      {/* Top Header */}
      <div className="px-5 py-3.5 bg-[#161616] border-b border-[#1F1F1F] flex flex-wrap items-center justify-between gap-3">
        {/* File and Lines */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-neutral-300">
            <FileCode className="w-4 h-4 text-neutral-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white truncate max-w-md">
                {filePath}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-white/5 border border-white/10 text-neutral-400">
                <span className="opacity-60 text-[10px]">#</span>
                <span>
                  L{startLine}-{endLine}
                </span>
              </span>
            </div>
            {chunkLabel && chunkLabel !== filePath && (
              <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5 mt-0.5">
                <Tag className="w-3 h-3 text-purple-400 shrink-0" />
                <span className="truncate">{chunkLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-3">
          {/* Chunk Type Badge */}
          <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-[11px] uppercase tracking-wider">
            {chunkType || "block"}
          </span>

          {/* Relevance Score Indicator */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end gap-1">
              <div className="w-16 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${getScoreBarColor(percentageScore)}`}
                  style={{ width: `${percentageScore}%` }}
                />
              </div>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold ${getScoreColor(
                percentageScore
              )}`}
            >
              {percentageScore}% match
            </span>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1F1F1F] hover:bg-[#2A2A2A] border border-[#2E2E2E] text-neutral-300 hover:text-white transition-colors text-xs font-mono cursor-pointer"
            title="Copy code chunk"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>

          {/* Jump to File Button */}
          <Link
            href={explorerUrl}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors text-xs font-semibold"
          >
            <span>View File</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Code Snippet Container */}
      <div className="p-4 bg-[#0A0A0A] font-mono text-xs flex overflow-x-auto leading-relaxed select-text">
        {/* Gutter Line Numbers */}
        <div className="pr-4 select-none text-right text-neutral-600 border-r border-white/5 font-mono shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="h-5">
              {startLine + i}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <div className="pl-4 flex-1 overflow-x-auto">
          <pre className="!bg-transparent !p-0 !m-0 font-mono">
            <code className={`language-${prismLang}`}>{chunkText}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default CodeSearchResult;
