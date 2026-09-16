"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  GitCommit,
  Flame,
  Activity,
  Sparkles,
  ExternalLink,
  Github,
  TrendingUp,
  FileCode,
  ShieldAlert,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import ContributorLeaderboard from "@/components/ui/ContributorLeaderboard";
import { ContributorData } from "@/components/ui/ContributorCard";
import ActivityTimelineChart, { ActivityTimelineDataPoint } from "@/components/ui/ActivityTimelineChart";
import CommitHeatmap, { HeatmapData } from "@/components/ui/CommitHeatmap";
import HotspotTable, { HotspotData } from "@/components/ui/HotspotTable";
import TechnicalDebtCard, { TechnicalDebtItem } from "@/components/ui/TechnicalDebtCard";

interface RepositorySummary {
  id: string;
  github_repo_fullname: string;
  github_repo_url: string;
}

interface SyncSummaryResult {
  commits_synced: number;
  total_commits_in_repo: number;
  contributors_found: number;
  hotspots_computed: number;
  rate_limit_remaining: number;
}

export default function RepositoryAnalyticsPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repoInfo, setRepoInfo] = useState<RepositorySummary | null>(null);
  const [contributors, setContributors] = useState<ContributorData[]>([]);
  const [timelineData, setTimelineData] = useState<ActivityTimelineDataPoint[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [hotspots, setHotspots] = useState<HotspotData[]>([]);
  const [debtFiles, setDebtFiles] = useState<TechnicalDebtItem[]>([]);

  // State controls
  const [timelineGroupBy, setTimelineGroupBy] = useState<"day" | "week" | "month">("day");
  const [isLoading, setIsLoading] = useState(true);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgressMsg, setSyncProgressMsg] = useState<string | null>(null);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load All Analytics Telemetry
  const loadAnalyticsData = useCallback(async () => {
    if (!repoId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Repository info
      const repoRes = await apiClient<RepositorySummary>(
        `/api/repositories/${repoId}/metrics`
      );
      if (repoRes.success && repoRes.data) {
        setRepoInfo(repoRes.data);
      }

      // 2. Contributors
      const contribRes = await apiClient<ContributorData[]>(
        `/api/repositories/${repoId}/analytics/contributors`
      );
      if (contribRes.success && contribRes.data) {
        setContributors(contribRes.data);
      }

      // 3. Activity Timeline
      const timelineRes = await apiClient<ActivityTimelineDataPoint[]>(
        `/api/repositories/${repoId}/analytics/activity?groupBy=${timelineGroupBy}`
      );
      if (timelineRes.success && timelineRes.data) {
        setTimelineData(timelineRes.data);
      }

      // 4. Heatmap
      const heatmapRes = await apiClient<HeatmapData>(
        `/api/repositories/${repoId}/analytics/heatmap`
      );
      if (heatmapRes.success && heatmapRes.data) {
        setHeatmapData(heatmapRes.data);
      }

      // 5. Hotspots
      const hotspotRes = await apiClient<HotspotData[]>(
        `/api/repositories/${repoId}/analytics/hotspots?limit=30`
      );
      if (hotspotRes.success && hotspotRes.data) {
        setHotspots(hotspotRes.data);
      }

      // 6. Technical Debt risk files
      const debtRes = await apiClient<TechnicalDebtItem[]>(
        `/api/repositories/${repoId}/analytics/technical-debt`
      );
      if (debtRes.success && debtRes.data) {
        setDebtFiles(debtRes.data);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to load developer analytics for this repository."
      );
    } finally {
      setIsLoading(false);
    }
  }, [repoId, timelineGroupBy]);

  // Load timeline separately when toggling day/week/month
  const handleGroupByChange = async (newGroupBy: "day" | "week" | "month") => {
    setTimelineGroupBy(newGroupBy);
    if (!repoId) return;
    setIsTimelineLoading(true);
    try {
      const res = await apiClient<ActivityTimelineDataPoint[]>(
        `/api/repositories/${repoId}/analytics/activity?groupBy=${newGroupBy}`
      );
      if (res.success && res.data) {
        setTimelineData(res.data);
      }
    } catch {
      // Keep old timeline
    } finally {
      setIsTimelineLoading(false);
    }
  };

  useEffect(() => {
    loadAnalyticsData();
  }, [loadAnalyticsData]);

  // Handle Trigger Commit Sync
  const handleSyncCommits = async () => {
    if (!repoId) return;
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setSyncProgressMsg("Fetching commits and file diffs from GitHub API...");

    try {
      const res = await apiClient<SyncSummaryResult>(
        `/api/repositories/${repoId}/sync-commits`,
        { method: "POST" }
      );

      if (res.success && res.data) {
        setSuccessMessage(
          `Sync complete: ${res.data.commits_synced} new commits ingested (${res.data.total_commits_in_repo} total), ${res.data.contributors_found} contributors, ${res.data.hotspots_computed} hotspot files computed.`
        );
        await loadAnalyticsData();
      } else {
        setErrorMessage("Failed to sync commit data.");
      }
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Error syncing commits with GitHub API."
      );
    } finally {
      setIsSyncing(false);
      setSyncProgressMsg(null);
    }
  };

  // Aggregated Summary Metric Calculations
  const totalCommits = contributors.reduce((acc, c) => acc + c.total_commits, 0);
  const topContributor = contributors.length > 0 ? contributors[0] : null;
  const highestDebtHotspot = hotspots.length > 0 ? hotspots[0] : null;

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
        <div>
          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="inline-flex items-center gap-1.5 text-xs font-mono text-neutral-400 hover:text-white mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Repository Overview
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              <Activity className="w-7 h-7 text-blue-500" />
              Developer Analytics & Hotspots
            </h1>
            {repoInfo && (
              <a
                href={repoInfo.github_repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>{repoInfo.github_repo_fullname}</span>
                <ExternalLink className="w-3 h-3 text-neutral-500" />
              </a>
            )}
          </div>
        </div>

        {/* Sync Commits Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSyncCommits}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-800 text-white text-sm font-semibold flex items-center gap-2 transition-all shadow-sm font-mono"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Syncing Commits...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Sync Commit Data</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-sm font-mono flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-rose-200">Error</h4>
            <p className="text-xs text-rose-300 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-300 text-sm font-mono flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-emerald-200">Success</h4>
            <p className="text-xs text-emerald-300 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {syncProgressMsg && (
        <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-300 text-xs font-mono flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span>{syncProgressMsg}</span>
        </div>
      )}

      {/* Content Area */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-sm font-mono text-neutral-400">
            Analyzing repository commit patterns, contributors, and technical debt...
          </p>
        </div>
      ) : totalCommits === 0 && contributors.length === 0 ? (
        /* Empty State */
        <div className="py-16 px-6 text-center bg-neutral-900/30 border border-neutral-800 rounded-2xl max-w-xl mx-auto space-y-4">
          <GitCommit className="w-12 h-12 text-neutral-600 mx-auto" />
          <h2 className="text-xl font-bold text-white">No Commit Data Synced Yet</h2>
          <p className="text-xs text-neutral-400 font-mono leading-relaxed">
            Fetch full commit histories, author diffs, and file modification metrics from GitHub to generate contributor leaderboards, coding heatmaps, and hotspot debt scores.
          </p>
          <button
            onClick={handleSyncCommits}
            disabled={isSyncing}
            className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg font-mono inline-flex items-center gap-2"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>Sync Commits Now</span>
          </button>
        </div>
      ) : (
        /* Main Analytics Dashboard */
        <div className="space-y-8">
          {/* Summary Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Commits */}
            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-mono font-medium">Total Commits</span>
                <GitCommit className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {totalCommits.toLocaleString()}
                </span>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  Tracked repository revisions
                </p>
              </div>
            </div>

            {/* Total Contributors */}
            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-mono font-medium">Active Contributors</span>
                <Users className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold font-mono text-white">
                  {contributors.length}
                </span>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  Unique author emails recorded
                </p>
              </div>
            </div>

            {/* Most Active Contributor */}
            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-mono font-medium">Top Contributor</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold font-mono text-white truncate block">
                  {topContributor ? topContributor.author_name : "N/A"}
                </span>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  {topContributor
                    ? `${topContributor.total_commits} commits (${topContributor.contribution_percentage}%)`
                    : "No data"}
                </p>
              </div>
            </div>

            {/* Highest Debt Hotspot */}
            <div className="p-5 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 mb-2">
                <span className="text-xs font-mono font-medium">Peak Debt Hotspot</span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <span className="text-base sm:text-lg font-bold font-mono text-rose-400 truncate block">
                  {highestDebtHotspot ? highestDebtHotspot.file_path : "None"}
                </span>
                <p className="text-[11px] text-neutral-500 font-mono mt-1">
                  {highestDebtHotspot
                    ? `Debt score ${highestDebtHotspot.debt_score}/100 &bull; ${highestDebtHotspot.change_count} edits`
                    : "Zero hotspot risk"}
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Contributor Leaderboard */}
          <section className="space-y-4">
            <ContributorLeaderboard contributors={contributors} />
          </section>

          {/* Section 2: Activity Timeline & Heatmap */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActivityTimelineChart
              data={timelineData}
              groupBy={timelineGroupBy}
              onGroupByChange={handleGroupByChange}
              isLoading={isTimelineLoading}
            />

            <CommitHeatmap data={heatmapData} />
          </div>

          {/* Section 3: Technical Debt Priority Cards */}
          {debtFiles.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                  <h3 className="text-lg font-semibold text-white">
                    Technical Debt Risk Areas ({debtFiles.length})
                  </h3>
                </div>
                <p className="text-xs font-mono text-neutral-400 hidden sm:block">
                  High-churn files cross-referenced with code issues
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {debtFiles.slice(0, 6).map((item) => (
                  <TechnicalDebtCard key={item.id} debtItem={item} repoId={repoId} />
                ))}
              </div>
            </section>
          )}

          {/* Section 4: Hotspots & Churn Table */}
          <section className="space-y-4">
            <HotspotTable hotspots={hotspots} repoId={repoId} />
          </section>
        </div>
      )}
    </div>
  );
}
