"use client";

import React, { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  Lightbulb,
  ShieldAlert,
  Bug,
  Zap,
  FileCode2,
  Wrench,
  CheckCircle,
  Copy,
  Check,
} from "lucide-react";
import SeverityBadge, { SeverityLevel } from "./SeverityBadge";

export interface CodeIssueItem {
  id: string;
  repository_id: string;
  file_path: string;
  line_number: number;
  column_number?: number | null;
  issue_type: string;
  severity: SeverityLevel;
  message: string;
  suggested_fix?: string | null;
  code_snippet?: string | null;
  rule_id?: string | null;
  createdAt?: string;
}

interface Props {
  issues: CodeIssueItem[];
  isLoading?: boolean;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  security: ShieldAlert,
  bug: Bug,
  performance: Zap,
  "code-smell": FileCode2,
  maintainability: Wrench,
};

export default function IssueTable({ issues, isLoading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCopySnippet = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-8 text-center animate-pulse">
        <div className="h-6 w-48 bg-neutral-800 rounded mx-auto mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-neutral-900 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!issues || issues.length === 0) {
    return (
      <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-12 text-center">
        <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <h4 className="text-base font-bold text-white font-mono mb-1">
          No Issues Found
        </h4>
        <p className="text-xs font-mono text-neutral-400 max-w-sm mx-auto">
          No static analysis issues matched your current search and filter criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono border-collapse">
          <thead>
            <tr className="border-b border-[#1F1F1F] bg-[#161616] text-neutral-400 uppercase tracking-wider">
              <th className="py-3 px-4 w-8"></th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">File</th>
              <th className="py-3 px-4 text-center">Line</th>
              <th className="py-3 px-4">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1A]">
            {issues.map((issue) => {
              const isExpanded = expandedId === issue.id;
              const TypeIcon = TYPE_ICONS[issue.issue_type] || FileCode;

              return (
                <React.Fragment key={issue.id}>
                  <tr
                    onClick={() => toggleExpand(issue.id)}
                    className={`cursor-pointer transition-colors hover:bg-[#181818] ${
                      isExpanded ? "bg-[#181818]" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4 text-neutral-500">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-white" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <SeverityBadge severity={issue.severity} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-neutral-300 capitalize">
                        <TypeIcon className="w-3.5 h-3.5 text-neutral-400" />
                        {issue.issue_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-neutral-200 font-medium">
                      {issue.file_path}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap text-neutral-400">
                      {issue.line_number}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300 min-w-[280px]">
                      <div className="line-clamp-1">{issue.message}</div>
                    </td>
                  </tr>

                  {/* Expanded Detail View */}
                  {isExpanded && (
                    <tr className="bg-[#141414] border-b border-[#222222]">
                      <td colSpan={6} className="p-5 space-y-4">
                        {/* Rule and Full Message */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#222222]">
                          <div className="text-sm font-sans font-semibold text-white">
                            {issue.message}
                          </div>
                          {issue.rule_id && (
                            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-[11px] text-neutral-400 font-mono">
                              Rule: {issue.rule_id}
                            </span>
                          )}
                        </div>

                        {/* Suggested Fix */}
                        {issue.suggested_fix && (
                          <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-xs flex items-start gap-2.5">
                            <Lightbulb className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-emerald-300 block mb-0.5 font-sans">
                                Suggested Fix
                              </span>
                              <span className="text-emerald-200 font-mono">
                                {issue.suggested_fix}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Code Snippet */}
                        {issue.code_snippet && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-neutral-400">
                              <span>Code Snippet (Line {issue.line_number}):</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopySnippet(issue.id, issue.code_snippet!);
                                }}
                                className="inline-flex items-center gap-1 hover:text-white transition-colors"
                              >
                                {copiedId === issue.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-emerald-400">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy Snippet</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="p-3 rounded-lg bg-[#0A0A0A] border border-[#222222] text-xs text-neutral-200 font-mono overflow-x-auto whitespace-pre-wrap">
                              <code>{issue.code_snippet}</code>
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
