"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  GitPullRequest,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Settings,
  ChevronRight,
  GitBranch,
  User,
  PlusCircle,
  MinusCircle,
  AlertOctagon,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import PRStatusBadge from "@/components/ui/PRStatusBadge";
import RiskLevelBadge from "@/components/ui/RiskLevelBadge";

interface PullRequestItem {
  id: string;
  repository_id: string;
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
  latest_review?: {
    id: string;
    risk_level: string;
    summary: string;
    recommendation?: string | null;
    issues_found: number;
    critical_issues_count: number;
    files_changed_count: number;
    additions: number;
    deletions: number;
    posted_to_github: boolean;
    github_comment_url?: string | null;
    createdAt: string;
  } | null;
}

interface RepositoryDetail {
  id: string;
  github_repo_name: string;
  github_repo_fullname: string;
  github_repo_url: string;
  webhook_id: number | null;
  pr_comments_enabled: boolean;
}

export default function RepositoryPullRequestsPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repository, setRepository] = useState<RepositoryDetail | null>(null);
  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTogglingWebhook, setIsTogglingWebhook] = useState(false);
  const [isTogglingComments, setIsTogglingComments] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!repoId) return;
    setIsLoading(true);
    setErrorMessage(null);

    // Fetch repository metrics/details
    const repoRes = await apiClient<RepositoryDetail>(`/api/repositories/${repoId}/metrics`);
    if (repoRes.success && repoRes.data) {
      setRepository(repoRes.data);
    }

    // Fetch pull requests
    const prsRes = await apiClient<PullRequestItem[]>(`/api/repositories/${repoId}/pull-requests`);
    if (prsRes.success && prsRes.data) {
      setPullRequests(prsRes.data);
    } else if (!repoRes.success) {
      setErrorMessage(repoRes.error?.message || "Failed to load pull requests");
    }

    setIsLoading(false);
  }, [repoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleWebhook = async () => {
    if (!repoId || !repository) return;
    setIsTogglingWebhook(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const isEnabled = Boolean(repository.webhook_id);
    const endpoint = isEnabled
      ? `/api/repositories/${repoId}/webhook/disable`
      : `/api/repositories/${repoId}/webhook/enable`;

    const res = await apiClient<any>(endpoint, { method: "POST" });

    if (res.success) {
      setRepository((prev) =>
        prev
          ? {
              ...prev,
              webhook_id: isEnabled ? null : res.data?.webhookId || 1,
            }
          : null
      );
      setSuccessMessage(
        isEnabled
          ? "Automated PR Reviews disabled. GitHub webhook removed."
          : "Automated PR Reviews enabled! GitHub webhook registered."
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error?.message || "Failed to update webhook setting");
    }

    setIsTogglingWebhook(false);
  };

  const handleToggleComments = async () => {
    if (!repoId || !repository) return;
    setIsTogglingComments(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const nextState = !repository.pr_comments_enabled;
    const res = await apiClient<any>(`/api/repositories/${repoId}/webhook/toggle-comments`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: nextState }),
    });

    if (res.success) {
      setRepository((prev) =>
        prev ? { ...prev, pr_comments_enabled: nextState } : null
      );
      setSuccessMessage(
        nextState
          ? "AI review comments will be posted to GitHub pull requests."
          : "GitHub PR comment posting disabled."
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error?.message || "Failed to update commenting setting");
    }

    setIsTogglingComments(false);
  };

  const isWebhookActive = Boolean(repository?.webhook_id);

  return (
    <div className="space-y-8 pb-16">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
        <Link
          href={`/dashboard/repositories/${repoId}`}
          className="hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repository</span>
        </Link>
        <span>/</span>
        <span className="text-white">{repository?.github_repo_name || "Repository"}</span>
        <span>/</span>
        <span className="text-purple-400">Pull Requests</span>
      </div>

      {/* Hero Header */}
      <div className="p-6 md:p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-mono">
                <GitPullRequest className="w-3.5 h-3.5" />
                <span>Automated PR Radar</span>
              </div>

              {isWebhookActive ? (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Webhook Active</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-neutral-800 text-neutral-400 text-xs font-mono">
                  <span>Webhook Inactive</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>Pull Request AI Reviews</span>
            </h1>

            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              Real-time automated code reviews triggered by GitHub webhooks. Evaluates diffs on changed lines using Module 7 static rule engines and generates AI risk assessments with actionable recommendations.
            </p>
          </div>

          {/* Action Settings Toggles */}
          <div className="flex flex-col gap-3 min-w-[260px] p-4 rounded-xl bg-[#161616] border border-[#242424]">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Automated Reviews</div>
                <div className="text-[10px] text-neutral-400">Listen for PR webhooks</div>
              </div>
              <button
                type="button"
                onClick={handleToggleWebhook}
                disabled={isTogglingWebhook || !repository}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isWebhookActive ? "bg-purple-600" : "bg-neutral-800"
                } disabled:opacity-50`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isWebhookActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-4 pt-2 border-t border-[#222222]">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-white">Post PR Comments</div>
                <div className="text-[10px] text-neutral-400">Comment back on GitHub</div>
              </div>
              <button
                type="button"
                onClick={handleToggleComments}
                disabled={isTogglingComments || !isWebhookActive || !repository}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  repository?.pr_comments_enabled ? "bg-emerald-600" : "bg-neutral-800"
                } disabled:opacity-50`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    repository?.pr_comments_enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
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

      {/* PR List Container */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Synced Pull Requests</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
              {pullRequests.length}
            </span>
          </h2>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#161616] hover:bg-[#222222] border border-[#262626] text-xs text-neutral-300 hover:text-white transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-3">
            <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto" />
            <p className="text-xs font-mono text-neutral-400">Loading pull requests & reviews...</p>
          </div>
        ) : pullRequests.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
              <GitPullRequest className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">No Pull Requests Recorded Yet</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                {isWebhookActive
                  ? "Open or push commits to a pull request on your GitHub repository. RepoRadar will automatically review the diff in real-time."
                  : "Enable 'Automated Reviews' above to register the GitHub webhook and begin reviewing pull requests."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pullRequests.map((pr) => {
              const review = pr.latest_review;
              return (
                <div
                  key={pr.id}
                  className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all space-y-4"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-mono font-bold text-purple-400">
                          #{pr.pr_number}
                        </span>
                        <Link
                          href={`/dashboard/repositories/${repoId}/pull-requests/${pr.id}`}
                          className="text-base font-bold text-white hover:text-purple-300 hover:underline transition-colors"
                        >
                          {pr.title}
                        </Link>
                        <PRStatusBadge status={pr.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 pt-1">
                        <div className="flex items-center gap-1 text-neutral-300">
                          <User className="w-3 h-3 text-neutral-400" />
                          <span>{pr.author_username}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <GitBranch className="w-3 h-3 text-neutral-400" />
                          <span>{pr.base_branch} ← {pr.head_branch}</span>
                        </div>

                        <a
                          href={pr.github_pr_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-neutral-400 hover:text-white hover:underline"
                        >
                          <span>GitHub PR</span>
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                      </div>
                    </div>

                    {/* Review Status & Link Button */}
                    <div className="flex items-center gap-3 self-start md:self-center">
                      {review ? (
                        <RiskLevelBadge riskLevel={review.risk_level} size="sm" />
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {pr.review_status}
                        </span>
                      )}

                      <Link
                        href={`/dashboard/repositories/${repoId}/pull-requests/${pr.id}`}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
                      >
                        <span>View Review</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Review Summary Snippet */}
                  {review && (
                    <div className="p-3.5 rounded-xl bg-[#161616] border border-[#222222] space-y-2 text-xs">
                      <div className="flex items-center justify-between text-neutral-400 font-mono">
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400">+{review.additions}</span>
                          <span className="text-red-400">-{review.deletions}</span>
                          <span>{review.files_changed_count} files</span>
                          <span className={review.issues_found > 0 ? "text-yellow-400" : "text-emerald-400"}>
                            {review.issues_found} issues ({review.critical_issues_count} critical)
                          </span>
                        </div>

                        {review.posted_to_github && (
                          <span className="text-purple-400 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>Commented on PR</span>
                          </span>
                        )}
                      </div>

                      <p className="text-neutral-300 line-clamp-2">{review.summary}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
