"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  FolderGit2,
  CheckCircle2,
  Github,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Loader2,
  ExternalLink,
  Code2,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import ScoreGauge from "@/components/ui/ScoreGauge";
import GradeBadge from "@/components/ui/GradeBadge";

interface HealthOverviewRepoItem {
  id: string;
  github_repo_name: string;
  github_repo_fullname: string;
  github_repo_url: string;
  language: string | null;
  stars: number;
  critical_issues_count: number;
  total_issues_count: number;
  health: {
    id: string;
    overall_score: number;
    overall_grade: string;
    code_quality_score: number;
    security_score: number;
    maintainability_score: number;
    performance_score: number;
    total_files_analyzed: number;
    calculated_at: string;
  } | null;
}

interface HealthOverviewResponse {
  averageHealthScore: number | null;
  totalCriticalIssues: number;
  analyzedRepositoriesCount: number;
  totalSelectedRepositories: number;
  repositories: HealthOverviewRepoItem[];
}

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const [overview, setOverview] = useState<HealthOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const loadHealthOverview = useCallback(async () => {
    setIsLoading(true);
    const res = await apiClient<HealthOverviewResponse>(
      "/api/repositories/health-overview"
    );
    if (res.success && res.data) {
      setOverview(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (session) {
      loadHealthOverview();
    }
  }, [session, loadHealthOverview]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadHealthOverview();
    setNotification("Repository health overview refreshed!");
    setTimeout(() => setNotification(null), 3000);
    setIsRefreshing(false);
  };

  const hasGithub = Boolean(
    session?.user?.github_username || session?.user?.github_id
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
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
              Authenticated Account: <span className="text-white">{session?.user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#2A2A2A] hover:border-neutral-600 text-white transition-all disabled:opacity-50 cursor-pointer"
            >
              {isRefreshing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Radar</span>
                </>
              )}
            </button>

            <Link
              href="/dashboard/repositories"
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 transition-all shadow-md cursor-pointer"
            >
              <span>Manage Repositories</span>
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

      {/* Global Health Summary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Average Health Score */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-neutral-400 block mb-1">
              Average Health Score
            </span>
            <div className="text-3xl font-bold font-mono text-white">
              {isLoading
                ? "..."
                : overview?.averageHealthScore !== null && overview?.averageHealthScore !== undefined
                ? `${overview.averageHealthScore}/100`
                : "N/A"}
            </div>
            <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
              Across selected active codebases
            </span>
          </div>
          {overview?.averageHealthScore !== null && overview?.averageHealthScore !== undefined && (
            <ScoreGauge score={overview.averageHealthScore} size={70} strokeWidth={7} />
          )}
        </div>

        {/* Total Critical Vulnerabilities */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-neutral-400 block mb-1">
              Critical Vulnerabilities
            </span>
            <div className={`text-3xl font-bold font-mono ${overview?.totalCriticalIssues ? "text-red-400" : "text-white"}`}>
              {isLoading ? "..." : overview?.totalCriticalIssues ?? 0}
            </div>
            <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
              High-priority security risks
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-red-950/30 border border-red-900/40">
            <ShieldAlert className="w-6 h-6 text-red-400" />
          </div>
        </div>

        {/* Analyzed Repositories */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase text-neutral-400 block mb-1">
              Monitored Repositories
            </span>
            <div className="text-3xl font-bold font-mono text-white">
              {isLoading
                ? "..."
                : `${overview?.analyzedRepositoriesCount ?? 0} / ${overview?.totalSelectedRepositories ?? 0}`}
            </div>
            <span className="text-[11px] font-mono text-neutral-500 mt-1 block">
              Analyzed vs Selected
            </span>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-900/40">
            <Activity className="w-6 h-6 text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Selected Repositories Health Grid (Sorted Worst-First) */}
      <div className="space-y-5">
        <div className="flex items-center justify-between border-b border-[#1F1F1F] pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              Selected Radar Repositories
            </h2>
            <span className="text-xs font-mono text-neutral-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#262626]">
              Ranked Worst-First
            </span>
          </div>

          <Link
            href="/dashboard/repositories"
            className="text-xs font-mono text-neutral-400 hover:text-white transition-colors"
          >
            Configure Selection →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-[#111111] border border-[#1F1F1F]" />
            ))}
          </div>
        ) : !overview?.repositories || overview.repositories.length === 0 ? (
          <div className="p-12 rounded-2xl bg-[#111111] border border-[#1F1F1F] text-center space-y-4">
            <FolderGit2 className="w-10 h-10 text-neutral-600 mx-auto" />
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                No Selected Repositories
              </h3>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto font-mono">
                Select GitHub repositories to enable continuous static code analysis and health scorecard tracking.
              </p>
            </div>
            <Link
              href="/dashboard/repositories"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-bold font-mono hover:bg-neutral-200 transition-all"
            >
              <span>Go to Repository Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {overview.repositories.map((repo) => {
              const isDegraded =
                repo.health?.overall_grade === "D" || repo.health?.overall_grade === "F";

              return (
                <div
                  key={repo.id}
                  className={`p-6 rounded-2xl bg-[#111111] border transition-all duration-300 flex flex-col justify-between space-y-5 ${
                    isDegraded
                      ? "border-red-900/60 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                      : "border-[#1F1F1F] hover:border-neutral-600"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Name + Grade Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="truncate">
                        <h3 className="text-base font-bold text-white truncate font-mono">
                          {repo.github_repo_name}
                        </h3>
                        <span className="text-xs text-neutral-500 truncate block font-mono">
                          {repo.github_repo_fullname}
                        </span>
                      </div>

                      {repo.health ? (
                        <GradeBadge grade={repo.health.overall_grade} size="md" />
                      ) : (
                        <span className="px-2 py-1 rounded bg-neutral-900 text-neutral-500 text-[10px] font-mono border border-neutral-800">
                          Unanalyzed
                        </span>
                      )}
                    </div>

                    {/* Score Gauge & Critical Issues Pill */}
                    {repo.health ? (
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3">
                          <ScoreGauge score={repo.health.overall_score} size={64} strokeWidth={6} />
                          <div>
                            <span className="text-xs font-bold text-white font-mono block">
                              Score: {repo.health.overall_score}/100
                            </span>
                            <span className="text-[11px] text-neutral-400 font-mono">
                              {repo.health.total_files_analyzed} files scanned
                            </span>
                          </div>
                        </div>

                        {repo.critical_issues_count > 0 && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs font-mono">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                            <span>{repo.critical_issues_count} Critical</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-neutral-900/50 border border-neutral-800 text-xs font-mono text-neutral-400 text-center">
                        Static code analysis pending.
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#1F1F1F] text-xs font-mono">
                    <Link
                      href={`/dashboard/repositories/${repo.id}/health`}
                      className="inline-flex items-center gap-1.5 text-white font-bold hover:text-emerald-400 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>View Health Report</span>
                    </Link>

                    <Link
                      href={`/dashboard/repositories/${repo.id}/analysis`}
                      className="text-neutral-400 hover:text-white transition-colors"
                    >
                      Inspect Issues →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
