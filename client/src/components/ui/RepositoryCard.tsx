"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FolderGit2,
  Star,
  GitFork,
  AlertCircle,
  GitPullRequest,
  ExternalLink,
  ArrowRight,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import apiClient from "@/lib/api-client";

export interface RepositoryData {
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
    stars_count: number;
    forks_count: number;
    open_issues_count: number;
    open_prs_count: number;
    default_branch: string | null;
    total_commits: number | null;
    last_commit_date: string | null;
  } | null;
  languages?: Array<{
    language: string;
    bytes: number;
    percentage: number;
  }>;
}

interface Props {
  repo: RepositoryData;
  onRefresh?: (updatedRepo: RepositoryData) => void;
}

export function RepositoryCard({ repo, onRefresh }: Props) {
  const [isFetching, setIsFetching] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const metrics = repo.metrics;
  const starsCount = metrics?.stars_count ?? repo.stars;
  const forksCount = metrics?.forks_count ?? 0;
  const issuesCount = metrics?.open_issues_count ?? 0;
  const prsCount = metrics?.open_prs_count ?? 0;

  const handleFetchData = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFetching(true);
    setMessage(null);

    const res = await apiClient<RepositoryData>(
      `/api/repositories/${repo.id}/fetch-data`,
      { method: "POST" }
    );

    if (res.success && res.data) {
      if (onRefresh) onRefresh(res.data);
      setMessage("Telemetry updated!");
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage(res.error?.message || "Fetch failed");
      setTimeout(() => setMessage(null), 4000);
    }

    setIsFetching(false);
  };

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all duration-200 flex flex-col justify-between space-y-5">
      <div className="space-y-3">
        {/* Top bar: Fullname & External Link & Refresh Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FolderGit2 className="w-4 h-4 text-neutral-400 shrink-0" />
            <Link
              href={`/dashboard/repositories/${repo.id}`}
              className="text-sm font-bold text-white hover:underline truncate"
            >
              {repo.github_repo_fullname}
            </Link>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleFetchData}
              disabled={isFetching}
              title="Refresh repository telemetry from GitHub"
              className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2A2A2A] text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-white" : ""}`} />
            </button>
            <a
              href={repo.github_repo_url}
              target="_blank"
              rel="noreferrer"
              title="Open repository on GitHub"
              className="p-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] border border-[#2A2A2A] text-neutral-400 hover:text-white transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Status notification toast */}
        {message && (
          <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 animate-fadeIn">
            <CheckCircle2 className="w-3 h-3" />
            <span>{message}</span>
          </div>
        )}

        {/* Description */}
        <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
          {repo.description || "No repository description provided."}
        </p>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-2 pt-2 text-center font-mono">
          <div className="p-2 rounded-xl bg-[#161616] border border-[#222222]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-500 mb-0.5">
              <Star className="w-3 h-3 text-amber-400" />
              <span>Stars</span>
            </div>
            <span className="text-xs font-bold text-white">{starsCount}</span>
          </div>

          <div className="p-2 rounded-xl bg-[#161616] border border-[#222222]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-500 mb-0.5">
              <GitFork className="w-3 h-3 text-neutral-400" />
              <span>Forks</span>
            </div>
            <span className="text-xs font-bold text-white">{forksCount}</span>
          </div>

          <div className="p-2 rounded-xl bg-[#161616] border border-[#222222]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-500 mb-0.5">
              <AlertCircle className="w-3 h-3 text-neutral-400" />
              <span>Issues</span>
            </div>
            <span className="text-xs font-bold text-white">{issuesCount}</span>
          </div>

          <div className="p-2 rounded-xl bg-[#161616] border border-[#222222]">
            <div className="flex items-center justify-center gap-1 text-[10px] text-neutral-500 mb-0.5">
              <GitPullRequest className="w-3 h-3 text-emerald-400" />
              <span>PRs</span>
            </div>
            <span className="text-xs font-bold text-white">{prsCount}</span>
          </div>
        </div>

        {/* Language snippet bar if languages exist */}
        {repo.languages && repo.languages.length > 0 && (
          <div className="pt-2">
            <div className="h-1.5 w-full rounded-full bg-[#1F1F1F] overflow-hidden flex">
              {repo.languages.slice(0, 4).map((l, idx) => {
                const colors = ["bg-blue-400", "bg-emerald-400", "bg-amber-400", "bg-purple-400"];
                return (
                  <div
                    key={l.language}
                    style={{ width: `${l.percentage}%` }}
                    className={`h-full ${colors[idx % colors.length]}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 mt-1.5">
              <span>{repo.languages[0].language} ({repo.languages[0].percentage}%)</span>
              {repo.languages.length > 1 && (
                <span>+{repo.languages.length - 1} more</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between">
        <span className="text-[10px] font-mono text-neutral-500">
          {repo.last_synced_at
            ? `Synced ${new Date(repo.last_synced_at).toLocaleDateString()}`
            : "Never synced"}
        </span>

        <Link
          href={`/dashboard/repositories/${repo.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-neutral-300 transition-colors group"
        >
          <span>View Details</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

export default RepositoryCard;
