"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  FolderGit2,
  CheckCircle2,
  Github,
  ArrowRight,
  Sparkles,
  Star,
  GitFork,
  AlertCircle,
  GitPullRequest,
  RefreshCw,
  Loader2,
  Plus,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import RepositoryCard, { RepositoryData } from "@/components/ui/RepositoryCard";

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<RepositoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadRepositories = useCallback(async () => {
    setIsLoading(true);
    const res = await apiClient<RepositoryData[]>("/api/repositories");
    if (res.success && res.data) {
      setRepositories(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      loadRepositories();
    }
  }, [session, loadRepositories]);

  // Selected repositories
  const selectedRepos = useMemo(
    () => repositories.filter((r) => r.is_selected),
    [repositories]
  );

  // Aggregate Metrics calculation across selected repositories
  const aggregateStats = useMemo(() => {
    const reposToCalculate = selectedRepos.length > 0 ? selectedRepos : repositories;

    let totalStars = 0;
    let totalForks = 0;
    let totalIssues = 0;
    let totalPRs = 0;
    const languages = new Set<string>();

    reposToCalculate.forEach((r) => {
      totalStars += r.metrics?.stars_count ?? r.stars ?? 0;
      totalForks += r.metrics?.forks_count ?? 0;
      totalIssues += r.metrics?.open_issues_count ?? 0;
      totalPRs += r.metrics?.open_prs_count ?? 0;
      if (r.language) languages.add(r.language);
    });

    return {
      totalStars,
      totalForks,
      totalIssues,
      totalPRs,
      languageCount: languages.size,
    };
  }, [repositories, selectedRepos]);

  // Refresh telemetry for all selected repositories
  const handleRefreshAllSelected = async () => {
    const targetRepos = selectedRepos.length > 0 ? selectedRepos : repositories;
    if (targetRepos.length === 0) return;

    setIsRefreshingAll(true);
    setNotification(null);

    let successCount = 0;
    for (const repo of targetRepos) {
      const res = await apiClient<RepositoryData>(
        `/api/repositories/${repo.id}/fetch-data`,
        { method: "POST" }
      );
      if (res.success && res.data) {
        successCount++;
        setRepositories((prev) =>
          prev.map((r) => (r.id === repo.id ? res.data! : r))
        );
      }
    }

    setNotification(`Refreshed telemetry for ${successCount} repositories!`);
    setTimeout(() => setNotification(null), 4000);
    setIsRefreshingAll(false);
  };

  const handleCardRefresh = (updatedRepo: RepositoryData) => {
    setRepositories((prev) =>
      prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r))
    );
  };

  const hasGithub = Boolean(
    session?.user?.github_username || session?.user?.github_id
  );

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-b from-[#141414] to-[#0D0D0D] border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>NextAuth + Express JWT Connected</span>
              </div>
              {hasGithub && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white text-xs font-mono">
                  <Github className="w-3.5 h-3.5" />
                  <span>@{session?.user?.github_username}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Welcome back, {session?.user?.name || "Developer"}
            </h1>
            <p className="text-sm text-neutral-400 mt-1 font-mono">
              Authenticated Email: <span className="text-white">{session?.user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefreshAllSelected}
              disabled={isRefreshingAll || repositories.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#2A2A2A] hover:border-neutral-600 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRefreshingAll ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Syncing Telemetry...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Telemetry</span>
                </>
              )}
            </button>

            <Link
              href="/dashboard/repositories"
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 transition-all shadow-md cursor-pointer"
            >
              <span>Manage Repos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {notification && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
        )}
      </div>

      {/* Aggregated Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Stars */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Aggregated Stars</span>
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {isLoading ? "..." : aggregateStats.totalStars}
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">
            Across {selectedRepos.length > 0 ? `${selectedRepos.length} Selected` : `${repositories.length} Total`}
          </div>
        </div>

        {/* Total Forks */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Aggregated Forks</span>
            <GitFork className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {isLoading ? "..." : aggregateStats.totalForks}
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">
            Across Active Repositories
          </div>
        </div>

        {/* Open Issues */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Open Issues</span>
            <AlertCircle className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {isLoading ? "..." : aggregateStats.totalIssues}
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">
            Pending Resolution
          </div>
        </div>

        {/* Open PRs */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Open Pull Requests</span>
            <GitPullRequest className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {isLoading ? "..." : aggregateStats.totalPRs}
          </div>
          <div className="mt-2 text-[10px] text-neutral-500 font-mono">
            Active Review Pipeline
          </div>
        </div>
      </div>

      {/* Selected Repositories Overview Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Selected Radar Repositories
            </h2>
            <span className="text-xs font-mono text-neutral-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#262626]">
              {selectedRepos.length} Active
            </span>
          </div>

          <Link
            href="/dashboard/repositories"
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors inline-flex items-center gap-1"
          >
            <span>Manage Selection</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-500 mb-3" />
            <p className="text-xs font-mono text-neutral-400">Loading repositories telemetry...</p>
          </div>
        ) : selectedRepos.length === 0 ? (
          <div className="py-14 px-6 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto">
              <FolderGit2 className="w-6 h-6 text-neutral-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No repositories selected for radar analysis</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto mt-1">
                Go to the Repositories page to select which repositories RepoRadar should monitor and analyze.
              </p>
            </div>
            <Link
              href="/dashboard/repositories"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Select Repositories Now</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {selectedRepos.map((repo) => (
              <RepositoryCard
                key={repo.id}
                repo={repo}
                onRefresh={handleCardRefresh}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
