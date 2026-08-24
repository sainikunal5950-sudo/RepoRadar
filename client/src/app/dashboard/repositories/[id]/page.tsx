"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  FolderGit2,
  ExternalLink,
  Star,
  GitFork,
  AlertCircle,
  GitPullRequest,
  GitBranch,
  Calendar,
  CheckCircle2,
  Loader2,
  Sparkles,
  Github,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import LanguageChart, { LanguageItem } from "@/components/ui/LanguageChart";
import CommitTimeline, { CommitItem } from "@/components/ui/CommitTimeline";

interface RepositoryDetail {
  id: string;
  github_repo_id: number;
  github_repo_name: string;
  github_repo_fullname: string;
  github_repo_url: string;
  description: string | null;
  stars: number;
  language: string | null;
  is_selected: boolean;
  last_synced_at: string | null;
  metrics?: {
    id: string;
    stars_count: number;
    forks_count: number;
    open_issues_count: number;
    open_prs_count: number;
    default_branch: string | null;
    total_commits: number | null;
    last_commit_date: string | null;
  } | null;
  languages?: LanguageItem[];
  commits?: CommitItem[];
}

export default function RepositoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = params?.id as string;

  const [repository, setRepository] = useState<RepositoryDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRepositoryData = useCallback(async () => {
    if (!repoId) return;
    setIsLoading(true);
    setErrorMessage(null);

    const res = await apiClient<RepositoryDetail>(`/api/repositories/${repoId}/metrics`);
    if (res.success && res.data) {
      setRepository(res.data);
    } else {
      setErrorMessage(res.error?.message || "Failed to load repository telemetry");
    }
    setIsLoading(false);
  }, [repoId]);

  useEffect(() => {
    loadRepositoryData();
  }, [loadRepositoryData]);

  const handleRefreshData = async () => {
    if (!repoId) return;
    setIsRefreshing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<RepositoryDetail>(`/api/repositories/${repoId}/fetch-data`, {
      method: "POST",
    });

    if (res.success && res.data) {
      setRepository(res.data);
      setSuccessMessage("Repository metrics, languages, and commits refreshed from GitHub!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } else {
      setErrorMessage(res.error?.message || "Failed to refresh repository data");
    }

    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400 mb-3" />
        <p className="text-xs font-mono text-neutral-400">Loading repository telemetry...</p>
      </div>
    );
  }

  if (!repository) {
    return (
      <div className="py-16 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-red-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Repository Not Found</h2>
        <p className="text-xs text-neutral-400">
          {errorMessage || "The requested repository could not be located."}
        </p>
        <Link
          href="/dashboard/repositories"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Repositories</span>
        </Link>
      </div>
    );
  }

  const metrics = repository.metrics;
  const starsCount = metrics?.stars_count ?? repository.stars;
  const forksCount = metrics?.forks_count ?? 0;
  const issuesCount = metrics?.open_issues_count ?? 0;
  const prsCount = metrics?.open_prs_count ?? 0;
  const defaultBranch = metrics?.default_branch ?? "main";

  return (
    <div className="space-y-8">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/repositories" className="hover:text-white transition-colors">
          Repositories
        </Link>
        <span>/</span>
        <span className="text-white">{repository.github_repo_name}</span>
      </div>

      {/* Top Hero Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-white text-xs font-mono">
                <FolderGit2 className="w-3.5 h-3.5" />
                <span>GitHub Repository</span>
              </div>

              {repository.is_selected && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Selected for Radar</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>{repository.github_repo_fullname}</span>
            </h1>

            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              {repository.description || "No repository description provided."}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-neutral-400 pt-2">
              <a
                href={repository.github_repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-white hover:underline"
              >
                <Github className="w-3.5 h-3.5" />
                <span>View on GitHub</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>

              <div className="flex items-center gap-1.5 text-neutral-400">
                <GitBranch className="w-3.5 h-3.5" />
                <span>Branch: {defaultBranch}</span>
              </div>

              {repository.last_synced_at && (
                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    Synced: {new Date(repository.last_synced_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleRefreshData}
              disabled={isRefreshing}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs transition-all duration-200 hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Fetching Telemetry...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh GitHub Data</span>
                </>
              )}
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

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Stars */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Stars</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">{starsCount}</div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">Stargazers on GitHub</div>
        </div>

        {/* Forks */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Forks</span>
            <GitFork className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">{forksCount}</div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">Repository Network Forks</div>
        </div>

        {/* Open Issues */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Open Issues</span>
            <AlertCircle className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">{issuesCount}</div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">Awaiting Triage & Fixes</div>
        </div>

        {/* Open PRs */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Open Pull Requests</span>
            <GitPullRequest className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">{prsCount}</div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">Active Code Contributions</div>
        </div>
      </div>

      {/* Language Breakdown Section */}
      <LanguageChart languages={repository.languages || []} />

      {/* Recent Commits Timeline Section */}
      <CommitTimeline
        commits={repository.commits || []}
        repoUrl={repository.github_repo_url}
      />
    </div>
  );
}
