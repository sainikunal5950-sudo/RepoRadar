import React, { useState } from "react";
import {
  ShieldAlert,
  FileCode,
  Tag,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import SeverityBadge, { SeverityLevel } from "./SeverityBadge";

export interface PRIssueItem {
  id: string;
  file_path: string;
  line_number: number;
  issue_type: string;
  severity: SeverityLevel;
  message: string;
  is_new_issue?: boolean;
  code_snippet?: string | null;
  suggested_fix?: string | null;
}

interface PRIssueListProps {
  issues: PRIssueItem[];
}

export default function PRIssueList({ issues }: PRIssueListProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [expandedIssues, setExpandedIssues] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIssues((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredIssues = issues.filter((issue) => {
    if (selectedSeverity === "all") return true;
    return issue.severity.toLowerCase() === selectedSeverity.toLowerCase();
  });

  const criticalCount = issues.filter((i) => i.severity.toLowerCase() === "critical").length;
  const highCount = issues.filter((i) => i.severity.toLowerCase() === "high").length;
  const mediumCount = issues.filter((i) => i.severity.toLowerCase() === "medium").length;
  const lowCount = issues.filter((i) => i.severity.toLowerCase() === "low").length;

  if (issues.length === 0) {
    return (
      <div className="p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">Clean Pull Request Diff!</h3>
        <p className="text-xs text-neutral-400 max-w-md mx-auto">
          No static analysis rule violations (security hazards, bugs, or performance bottlenecks) detected in the added lines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Diff Issues Detected</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
              {issues.length}
            </span>
          </h3>
          <p className="text-xs text-neutral-400">
            Rule violations introduced or present in the modified lines of this pull request.
          </p>
        </div>

        {/* Severity Filter Chips */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#141414] border border-[#222222]">
          <button
            type="button"
            onClick={() => setSelectedSeverity("all")}
            className={`px-3 py-1 rounded-lg text-xs font-mono transition-all ${
              selectedSeverity === "all"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            All ({issues.length})
          </button>

          {criticalCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("critical")}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedSeverity === "critical"
                  ? "bg-red-500 text-white font-semibold"
                  : "text-red-400 hover:text-red-300"
              }`}
            >
              Critical ({criticalCount})
            </button>
          )}

          {highCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("high")}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedSeverity === "high"
                  ? "bg-orange-500 text-white font-semibold"
                  : "text-orange-400 hover:text-orange-300"
              }`}
            >
              High ({highCount})
            </button>
          )}

          {mediumCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("medium")}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedSeverity === "medium"
                  ? "bg-yellow-500 text-black font-semibold"
                  : "text-yellow-400 hover:text-yellow-300"
              }`}
            >
              Medium ({mediumCount})
            </button>
          )}

          {lowCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedSeverity("low")}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all ${
                selectedSeverity === "low"
                  ? "bg-neutral-700 text-white font-semibold"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              Low ({lowCount})
            </button>
          )}
        </div>
      </div>

      {/* Issues List */}
      <div className="space-y-3">
        {filteredIssues.map((issue) => {
          const isExpanded = Boolean(expandedIssues[issue.id]);
          return (
            <div
              key={issue.id}
              className="p-4 rounded-xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SeverityBadge severity={issue.severity} />

                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-neutral-300 text-xs font-mono uppercase">
                      <Tag className="w-3 h-3" />
                      <span>{issue.issue_type}</span>
                    </span>

                    {issue.is_new_issue && (
                      <span className="px-2 py-0.5 rounded-md bg-purple-950/40 border border-purple-500/30 text-purple-300 text-xs font-mono font-medium">
                        New In PR
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-medium text-white pt-1">{issue.message}</p>
                </div>

                {/* File Location Badge */}
                <div className="flex items-center gap-2 self-start">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] border border-[#2A2A2A] text-xs font-mono text-neutral-300">
                    <FileCode className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{issue.file_path}</span>
                    <span className="text-purple-400 font-bold">:{issue.line_number}</span>
                  </div>

                  {(issue.code_snippet || issue.suggested_fix) && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(issue.id)}
                      className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                      title={isExpanded ? "Collapse snippet" : "Expand snippet"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Expandable Snippet / Suggested Fix */}
              {isExpanded && (
                <div className="space-y-2 pt-2 border-t border-[#1C1C1C] text-xs font-mono">
                  {issue.code_snippet && (
                    <div>
                      <div className="text-neutral-400 mb-1">Problematic Snippet:</div>
                      <pre className="p-3 rounded-lg bg-[#0A0A0A] border border-[#222222] text-neutral-200 overflow-x-auto">
                        {issue.code_snippet}
                      </pre>
                    </div>
                  )}

                  {issue.suggested_fix && (
                    <div>
                      <div className="text-emerald-400 flex items-center gap-1 mb-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Suggested Fix:</span>
                      </div>
                      <pre className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-emerald-300 overflow-x-auto">
                        {issue.suggested_fix}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
