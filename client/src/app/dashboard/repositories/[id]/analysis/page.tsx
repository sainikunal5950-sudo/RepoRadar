"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FolderGit2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderTree,
  ExternalLink,
  Github,
  Search,
  Filter,
  Layers,
  Sparkles,
  ShieldCheck,
  Code2,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import AnalysisSummary, { AnalysisSummaryData } from "@/components/ui/AnalysisSummary";
import IssueTable, { CodeIssueItem } from "@/components/ui/IssueTable";

interface RepositorySummary {
  id: string;
  github_repo_fullname: string;
  github_repo_url: string;
}

interface AnalysisResultsResponse {
  issues: CodeIssueItem[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function RepositoryAnalysisPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repoInfo, setRepoInfo] = useState<RepositorySummary | null>(null);
  const [summary, setSummary] = useState<AnalysisSummaryData | null>(null);
  const [issues, setIssues] = useState<CodeIssueItem[]>([]);
  const [totalIssuesCount, setTotalIssuesCount] = useState<number>(0);

  // Filters & Search
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  // Loading & Action states
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingIssues, setIsLoadingIssues] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Fetch Repository Info & Analysis Summary
  const loadSummaryData = useCallback(async () => {
    if (!repoId) return;
    setIsLoadingSummary(true);
    setErrorMessage(null);

    // Fetch repository basic metrics / info
    const repoRes = await apiClient<RepositorySummary>(
      `/api/repositories/${repoId}/metrics`
    );
    if (repoRes.success && repoRes.data) {
      setRepoInfo(repoRes.data);
    }

    // Fetch analysis summary
    const summaryRes = await apiClient<AnalysisSummaryData>(
      `/api/repositories/${repoId}/analysis-summary`
    );
    if (summaryRes.success && summaryRes.data) {
      setSummary(summaryRes.data);
    }

    setIsLoadingSummary(false);
  }, [repoId]);

  // 2. Fetch Filtered Issues
  const loadIssues = useCallback(async () => {
    if (!repoId) return;
    setIsLoadingIssues(true);

    const queryParams = new URLSearchParams();
    if (severityFilter) queryParams.append("severity", severityFilter);
    if (typeFilter) queryParams.append("issueType", typeFilter);
    if (searchQuery.trim()) queryParams.append("search", searchQuery.trim());
    queryParams.append("page", String(currentPage));
    queryParams.append("limit", "25");

    const res = await apiClient<AnalysisResultsResponse>(
      `/api/repositories/${repoId}/analysis-results?${queryParams.toString()}`
    );

    if (res.success && res.data) {
      setIssues(res.data.issues || []);
      setTotalIssuesCount(res.data.totalCount || 0);
      setTotalPages(res.data.totalPages || 1);
    } else {
      setIssues([]);
    }

    setIsLoadingIssues(false);
  }, [repoId, severityFilter, typeFilter, searchQuery, currentPage]);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Handle Triggering / Re-running Analysis
  const handleTriggerAnalysis = async () => {
    if (!repoId) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<{
      summary: AnalysisSummaryData;
      totalIssues: number;
    }>(`/api/repositories/${repoId}/analyze-code`, {
      method: "POST",
    });

    if (res.success && res.data) {
      setSummary(res.data.summary);
      setSuccessMessage(
        `Code analysis complete! Detected ${res.data.totalIssues} static issue(s).`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      // Reload issues with current filters
      loadIssues();
    } else {
      setErrorMessage(
        res.error?.message || "Failed to run static code analysis"
      );
    }

    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="p-2 rounded-xl bg-[#111111] border border-[#1F1F1F] text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-white" />
              <h1 className="text-xl font-bold font-mono text-white tracking-tight">
                Static Code Analysis
              </h1>
            </div>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              {repoInfo?.github_repo_fullname || "Repository Analysis Dashboard"}
            </p>
          </div>
        </div>

        {/* View Switcher / Tabs */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="px-3 py-1.5 rounded-lg border border-[#222222] bg-[#141414] text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            Telemetry & Commits
          </Link>
          <Link
            href={`/dashboard/repositories/${repoId}/code`}
            className="px-3 py-1.5 rounded-lg border border-[#222222] bg-[#141414] text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            Code Explorer
          </Link>
          <button
            onClick={handleTriggerAnalysis}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-black font-mono text-xs font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning Repository...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{summary ? "Re-Analyze Code" : "Run Code Analysis"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/50 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="text-xs font-mono text-red-300 font-semibold block">
              Analysis Notice
            </span>
            <span className="text-xs font-mono text-red-400">{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/50 flex items-center gap-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-mono text-emerald-300">
            {successMessage}
          </span>
        </div>
      )}

      {/* Rolled-up Summary Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 font-semibold">
            Analysis Overview
          </h2>
        </div>
        <AnalysisSummary summary={summary} isLoading={isLoadingSummary} />
      </section>

      {/* Issue Browser Section */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-mono uppercase tracking-wider text-neutral-400 font-semibold">
              Detected Code Issues
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-400 text-xs font-mono">
              {totalIssuesCount}
            </span>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search file, message, rule..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500"
              />
            </div>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-xs font-mono text-neutral-300 focus:outline-none focus:border-neutral-500"
            >
              <option value="">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            {/* Issue Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-xs font-mono text-neutral-300 focus:outline-none focus:border-neutral-500"
            >
              <option value="">All Types</option>
              <option value="security">Security</option>
              <option value="performance">Performance</option>
              <option value="bug">Bug</option>
              <option value="code-smell">Code Smell</option>
              <option value="maintainability">Maintainability</option>
            </select>
          </div>
        </div>

        {/* Issue Table Component */}
        <IssueTable issues={issues} isLoading={isLoadingIssues} />

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-neutral-400">
              Page {currentPage} of {totalPages} ({totalIssuesCount} issues)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-[#161616] border border-[#262626] text-xs font-mono text-neutral-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-[#161616] border border-[#262626] text-xs font-mono text-neutral-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
