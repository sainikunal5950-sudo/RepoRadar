import React from "react";
import {
  Sparkles,
  ExternalLink,
  FileCode2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import RiskLevelBadge, { RiskLevel } from "./RiskLevelBadge";

interface PRReviewSummaryCardProps {
  summary: string;
  recommendation?: string | null;
  riskLevel: RiskLevel;
  filesChangedCount: number;
  additions: number;
  deletions: number;
  issuesCount: number;
  criticalIssuesCount: number;
  postedToGithub?: boolean;
  githubCommentUrl?: string | null;
  createdAt?: string;
}

export default function PRReviewSummaryCard({
  summary,
  recommendation,
  riskLevel,
  filesChangedCount,
  additions,
  deletions,
  issuesCount,
  criticalIssuesCount,
  postedToGithub = false,
  githubCommentUrl = null,
  createdAt,
}: PRReviewSummaryCardProps) {
  const isSafe = riskLevel === "low";
  const isCritical = riskLevel === "critical";

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] shadow-xl space-y-6">
      {/* Top Bar: Risk Level & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F1F1F]">
        <div className="flex flex-wrap items-center gap-3">
          <RiskLevelBadge riskLevel={riskLevel} size="lg" />
          {recommendation && (
            <div
              className={`px-3 py-1 rounded-lg text-xs font-mono font-medium border ${
                isCritical
                  ? "bg-red-950/30 text-red-300 border-red-500/20"
                  : isSafe
                  ? "bg-emerald-950/30 text-emerald-300 border-emerald-500/20"
                  : "bg-yellow-950/30 text-yellow-300 border-yellow-500/20"
              }`}
            >
              {recommendation}
            </div>
          )}
        </div>

        {/* Diff Stats */}
        <div className="flex items-center gap-4 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <FileCode2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>{filesChangedCount} files</span>
          </div>

          <div className="flex items-center gap-1 text-emerald-400 font-semibold">
            <span>+{additions}</span>
          </div>

          <div className="flex items-center gap-1 text-red-400 font-semibold">
            <span>-{deletions}</span>
          </div>

          {issuesCount > 0 ? (
            <div
              className={`flex items-center gap-1 ${
                criticalIssuesCount > 0 ? "text-red-400 font-bold" : "text-yellow-400"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{issuesCount} issues</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>0 issues</span>
            </div>
          )}
        </div>
      </div>

      {/* AI Summary Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-purple-400">
          <Sparkles className="w-4 h-4" />
          <span>AI Review Synthesis</span>
        </div>

        <p className="text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap font-sans">
          {summary}
        </p>
      </div>

      {/* Footer info & GitHub comment status */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#1F1F1F] text-xs font-mono text-neutral-400">
        <div>
          {createdAt && (
            <span>Reviewed at: {new Date(createdAt).toLocaleString()}</span>
          )}
        </div>

        {postedToGithub && githubCommentUrl && (
          <a
            href={githubCommentUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-purple-400 hover:text-purple-300 hover:underline"
          >
            <span>Posted to GitHub PR Comment</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
