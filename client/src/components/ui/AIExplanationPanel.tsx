"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  Layers,
  Cpu,
  RefreshCw,
} from "lucide-react";
import apiClient from "@/lib/api-client";

export interface AIExplanationResult {
  summary: string;
  detailed_explanation: string;
  key_points: string[];
  complexity?: string;
  suggested_improvements?: string[];
  model_used?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  codeSnippet?: string | null;
  language?: string | null;
  context?: string;
}

export default function AIExplanationPanel({
  isOpen,
  onClose,
  filePath,
  codeSnippet,
  language,
  context,
}: Props) {
  const [data, setData] = useState<AIExplanationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchExplanation = useCallback(async () => {
    if (!filePath) return;
    setIsLoading(true);
    setError(null);

    const isFullFile = !codeSnippet;
    const endpoint = isFullFile ? "/api/ai/explain-file" : "/api/ai/explain-code";
    const payload = isFullFile
      ? { file_path: filePath, language: language || "typescript", context }
      : { code: codeSnippet, language: language || "typescript", file_path: filePath, context };

    const res = await apiClient<AIExplanationResult>(endpoint, {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      setData(res.data);
    } else {
      setError(
        res.error?.message ||
          "Failed to generate AI code explanation. Please verify the AI microservice status."
      );
    }

    setIsLoading(false);
  }, [filePath, codeSnippet, language, context]);

  useEffect(() => {
    if (isOpen) {
      setData(null);
      fetchExplanation();
    }
  }, [isOpen, fetchExplanation]);

  const handleCopyExplanation = () => {
    if (!data) return;
    const textToCopy = `### AI Code Explanation for ${filePath}\n\n**Summary:**\n${data.summary}\n\n**Details:**\n${data.detailed_explanation}\n\n**Key Points:**\n${data.key_points.map((p) => `- ${p}`).join("\n")}${data.suggested_improvements?.length ? `\n\n**Suggested Improvements:**\n${data.suggested_improvements.map((s) => `- ${s}`).join("\n")}` : ""}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl bg-[#111111] border border-[#242424] shadow-2xl overflow-hidden font-sans">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950/40 via-[#161616] to-[#161616] border-b border-[#242424] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono">
                  AI Code Explanation
                </h3>
                <span className="px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[10px] font-mono uppercase">
                  {language || "code"}
                </span>
                {data?.complexity && (
                  <span className="px-2 py-0.5 rounded bg-neutral-800 border border-neutral-700 text-neutral-300 text-[10px] font-mono">
                    Complexity: {data.complexity}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 font-mono truncate max-w-md mt-0.5">
                {filePath}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {data && (
              <button
                type="button"
                onClick={handleCopyExplanation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#262626] border border-[#2E2E2E] text-neutral-300 hover:text-white text-xs font-mono transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && (
            <div className="py-16 text-center space-y-4">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-md animate-ping" />
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-purple-950/50 border border-purple-500/40 text-purple-400">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white font-mono">
                  Synthesizing Code Architecture...
                </h4>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  FastAPI AI service is parsing functions, logic flow, and architectural patterns.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 space-y-3">
              <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>AI Service Notice</span>
              </div>
              <p className="text-xs text-red-300 font-mono">{error}</p>
              <button
                type="button"
                onClick={fetchExplanation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 text-xs font-mono transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Request</span>
              </button>
            </div>
          )}

          {data && !isLoading && (
            <div className="space-y-6 animate-fadeIn">
              {/* Executive Summary */}
              <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40">
                <span className="text-[11px] uppercase tracking-wider font-bold text-purple-400 font-mono block mb-1.5">
                  Executive Summary
                </span>
                <p className="text-sm text-neutral-200 leading-relaxed font-sans">
                  {data.summary}
                </p>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Technical & Flow Breakdown</span>
                </div>
                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#222222] text-xs font-mono text-neutral-300 leading-relaxed whitespace-pre-line">
                  {data.detailed_explanation}
                </div>
              </div>

              {/* Key Bullet Points */}
              {data.key_points && data.key_points.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-neutral-300 font-mono uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Key Architectural Insights</span>
                  </div>
                  <ul className="space-y-2">
                    {data.key_points.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-lg bg-[#141414] border border-[#222222] text-xs text-neutral-200 font-sans"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-2 shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Improvements if any */}
              {data.suggested_improvements && data.suggested_improvements.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Suggested Optimizations & Refactors</span>
                  </div>
                  <ul className="space-y-2">
                    {data.suggested_improvements.map((sug, idx) => (
                      <li
                        key={idx}
                        className="p-3 rounded-lg bg-amber-950/15 border border-amber-900/30 text-xs text-amber-200 font-sans"
                      >
                        {sug}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#0A0A0A] border-t border-[#242424] flex items-center justify-between text-[11px] font-mono text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Model: {data?.model_used || "FastAPI Microservice (gpt-4o-mini)"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#1C1C1C] hover:bg-[#262626] text-neutral-300 hover:text-white transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
