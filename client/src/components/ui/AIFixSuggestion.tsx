"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  Lightbulb,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import apiClient from "@/lib/api-client";

export interface AIFixResponse {
  fixed_code: string;
  explanation: string;
  confidence: number;
  why_it_matters?: string;
  breaking_changes?: boolean;
  model_used?: string;
  cached?: boolean;
}

interface Props {
  issueId: string;
  filePath: string;
  lineNumber: number;
  issueType: string;
  severity: string;
  message: string;
  codeSnippet?: string | null;
  ruleId?: string | null;
  cachedFix?: string | null;
}

export default function AIFixSuggestion({
  issueId,
  filePath,
  lineNumber,
  issueType,
  severity,
  message,
  codeSnippet,
  ruleId,
  cachedFix,
}: Props) {
  const [fixData, setFixData] = useState<AIFixResponse | null>(() => {
    if (cachedFix) {
      try {
        const parsed = JSON.parse(cachedFix);
        return { ...parsed, cached: true };
      } catch {
        return {
          fixed_code: cachedFix,
          explanation: "Pre-generated fix for this issue.",
          confidence: 0.9,
          cached: true,
        };
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAIFix = async () => {
    setIsLoading(true);
    setError(null);

    const res = await apiClient<AIFixResponse>("/api/ai/suggest-fix", {
      method: "POST",
      body: JSON.stringify({
        issue_id: issueId,
        file_path: filePath,
        code_snippet: codeSnippet || "// Code snippet not provided",
        issue_type: issueType,
        severity,
        message,
        rule_id: ruleId || undefined,
        line_number: lineNumber,
      }),
    });

    if (res.success && res.data) {
      setFixData(res.data);
    } else {
      setError(
        res.error?.message ||
          "Failed to generate AI fix suggestion. Please verify the AI microservice is running."
      );
    }

    setIsLoading(false);
  };

  const handleCopyCode = () => {
    if (!fixData?.fixed_code) return;
    navigator.clipboard.writeText(fixData.fixed_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If no fix loaded yet, render trigger CTA
  if (!fixData && !isLoading && !error) {
    return (
      <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-white font-mono block">
              AI-Powered Remediation Available
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              Generate an intelligent, contextual fix using the AI microservice.
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchAIFix}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-semibold transition-colors cursor-pointer shadow-md shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate AI Fix</span>
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-5 rounded-xl bg-[#0E0E0E] border border-purple-500/30 flex items-center justify-center gap-3">
        <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
        <span className="text-xs font-mono text-neutral-300">
          Generating AI remediation with FastAPI microservice...
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/40 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
        <button
          type="button"
          onClick={fetchAIFix}
          className="px-2.5 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer shrink-0"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!fixData) return null;

  const confidencePercent = Math.round((fixData.confidence || 0.9) * 100);

  return (
    <div className="p-4 rounded-xl bg-[#0E0E0E] border border-purple-500/40 space-y-3.5 font-sans">
      {/* Top Banner with Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-purple-500/10 text-purple-400">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white font-mono">
            AI Remediation
          </span>
          {fixData.cached && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
              <Zap className="w-3 h-3" />
              Cached Fix
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-purple-950/50 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-semibold">
            {confidencePercent}% Confidence
          </span>

          {fixData.breaking_changes && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
              <AlertTriangle className="w-3 h-3" />
              Potential Breaking Change
            </span>
          )}

          <button
            type="button"
            onClick={fetchAIFix}
            title="Regenerate fix"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Why It Matters & Explanation */}
      <div className="space-y-2 text-xs">
        {fixData.why_it_matters && (
          <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-900/30 text-neutral-200">
            <span className="font-bold text-indigo-300 block mb-0.5 font-mono text-[11px]">
              Why this matters:
            </span>
            <p className="leading-relaxed">{fixData.why_it_matters}</p>
          </div>
        )}

        <div className="text-neutral-300 leading-relaxed font-sans">
          <span className="font-semibold text-white font-mono text-[11px] block mb-1">
            Remediation Explanation:
          </span>
          <p>{fixData.explanation}</p>
        </div>
      </div>

      {/* Remediated Code Block */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Recommended Replacement Code:
          </span>

          <button
            type="button"
            onClick={handleCopyCode}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C1C1C] hover:bg-[#262626] border border-[#2E2E2E] text-neutral-300 hover:text-white transition-colors cursor-pointer text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Fixed Code</span>
              </>
            )}
          </button>
        </div>

        <pre className="p-3.5 rounded-lg bg-[#050505] border border-emerald-900/40 text-xs text-emerald-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
          <code>{fixData.fixed_code}</code>
        </pre>
      </div>
    </div>
  );
}
