"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  GitPullRequest,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  GitBranch,
  User,
  Calendar,
  AlertOctagon,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import PRStatusBadge from "@/components/ui/PRStatusBadge";
import PRReviewSummaryCard from "@/components/ui/PRReviewSummaryCard";
import PRIssueList, { PRIssueItem } from "@/components/ui/PRIssueList";

interface PRReviewDetailData {
  pullRequest: {
    id: string;
    repository_id: string;
    github_repo_fullname: string;
    github_pr_id: number;
    pr_number: number;
    title: string;
    author_username: string;
    status: string;
    base_branch: string;
    head_branch: string;
    github_pr_url: string;
    created_at_github: string;
    last_reviewed_at: string | null;
    review_status: string;
    error_message?: string | null;
  };
  latestReview: {
    id: string;
    risk_level: string;
    summary: string;
    recommendation?: string | null;
    issues_found: number;
    critical_issues_count: number;
    files_changed_count: number;
    additions: number;
    deletions: number;
    ai_review_text: string;
    posted_to_github: boolean;
    github_comment_url?: string | null;
    createdAt: string;
    issues: PRIssueItem[];
  } | null;
  allReviewsCount: number;
}

export default function PRReviewDetailPage() {
  const params = useParams();
  const repoId = params?.id as string;
  const prId = params?.prId as string;

  const [reviewData, setReviewData] = useState<PRReviewDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReReviewing, setIsReReviewing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadReviewDetails = useCallback(async () => {
    if (!prId) return;
    setIsLoading(true);
    setErrorMessage(null);

    const res = await apiClient<PRReviewDetailData>(`/api/pull-requests/${prId}/review`);
    if (res.success && res.data) {
      setReviewData(res.data);
    } else {
      setErrorMessage(res.error?.message || "Failed to load PR review details");
    }

    setIsLoading(false);
  }, [prId]);

  useEffect(() => {
    loadReviewDetails();
  }, [loadReviewDetails]);

  const handleReReview = async () => {
    if (!prId) return;
    setIsReReviewing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<any>(`/api/pull-requests/${prId}/re-review`, {
      method: "POST",
    });

    if (res.success) {
      setSuccessMessage("PR review successfully re-evaluated from latest GitHub diff!");
      await loadReviewDetails();
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error?.message || "Failed to re-review pull request");
    }

    setIsReReviewing(false);
  };

  const pr = reviewData?.pullRequest;
  const review = reviewData?.latestReview;

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
        <Link
          href={`/dashboard/repositories/${repoId}/pull-requests`}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Pull Requests</span>
        </Link>
        <span>/</span>
        <span className="text-white">PR #{pr?.pr_number || "..."}</span>
        <span>/</span>
        <span className="text-purple-400">AI Review Report</span>
      </div>

      {isLoading ? (
        <div className="p-16 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-xs font-mono text-neutral-400">Loading pull request analysis...</p>
        </div>
      ) : !pr ? (
        <div className="p-12 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-3">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Pull Request Not Found</h2>
          <p className="text-xs text-neutral-400">The requested pull request could not be retrieved.</p>
        </div>
      ) : (
        <>
          {/* Top Hero Banner */}
          <div className="p-6 md:p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono font-bold text-purple-400">
                    #{pr.pr_number}
                  </span>
                  <PRStatusBadge status={pr.status} />
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 border border-white/10 text-neutral-300">
                    Status: {pr.review_status}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {pr.title}
                </h1>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 pt-1">
                  <div className="flex items-center gap-1 text-white">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Author: @{pr.author_username}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-300">
                    <GitBranch className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{pr.base_branch} ← {pr.head_branch}</span>
                  </div>

                  <div className="flex items-center gap-1 text-neutral-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Opened: {new Date(pr.created_at_github).toLocaleDateString()}</span>
                  </div>

                  <a
                    href={pr.github_pr_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-purple-400 hover:text-purple-300 hover:underline"
                  >
                    <span>View on GitHub</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleReReview}
                  disabled={isReReviewing}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReReviewing ? "animate-spin" : ""}`} />
                  <span>{isReReviewing ? "Analyzing Diff..." : "Re-evaluate PR Review"}</span>
                </button>
              </div>
            </div>

            {/* Notifications */}
            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
          </div>

          {/* AI Review Summary Card */}
          {review ? (
            <div className="space-y-8">
              <PRReviewSummaryCard
                summary={review.summary}
                recommendation={review.recommendation}
                riskLevel={review.risk_level}
                filesChangedCount={review.files_changed_count}
                additions={review.additions}
                deletions={review.deletions}
                issuesCount={review.issues_found}
                criticalIssuesCount={review.critical_issues_count}
                postedToGithub={review.posted_to_github}
                githubCommentUrl={review.github_comment_url}
                createdAt={review.createdAt}
              />

              {/* Line-level Diff Issues List */}
              <PRIssueList issues={review.issues || []} />
            </div>
          ) : (
            <div className="p-12 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Review Pending or Failed</h3>
                <p className="text-xs text-neutral-400 max-w-md mx-auto">
                  {pr.error_message ||
                    "This pull request has not completed its automated AI review yet. Click 'Re-evaluate PR Review' to start analysis."}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
