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
  FileCode,
  FolderTree,
  ExternalLink,
  Github,
  ShieldCheck,
  ShieldAlert,
  Bug,
  Wrench,
  Zap,
  Activity,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Info,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import ScoreGauge from "@/components/ui/ScoreGauge";
import GradeBadge from "@/components/ui/GradeBadge";
import ScoreCard from "@/components/ui/ScoreCard";
import SeverityPieChart, { SeveritySlice } from "@/components/ui/SeverityPieChart";
import IssueTypeBarChart, { IssueTypeItem } from "@/components/ui/IssueTypeBarChart";
import TopFilesChart, { ProblematicFile } from "@/components/ui/TopFilesChart";
import HealthTrendChart, { HealthTrendPoint } from "@/components/ui/HealthTrendChart";

interface RepositorySummary {
  id: string;
  github_repo_fullname: string;
  github_repo_url: string;
}

interface HealthRecord {
  id: string;
  repository_id: string;
  overall_score: number;
  overall_grade: string;
  code_quality_score: number;
  security_score: number;
  maintainability_score: number;
  performance_score: number;
  total_files_analyzed: number;
  total_lines_of_code?: number;
  calculated_at: string;
}

export default function RepositoryHealthPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repoInfo, setRepoInfo] = useState<RepositorySummary | null>(null);
  const [health, setHealth] = useState<HealthRecord | null>(null);
  const [severityData, setSeverityData] = useState<SeveritySlice[]>([]);
  const [typeData, setTypeData] = useState<IssueTypeItem[]>([]);
  const [topFiles, setTopFiles] = useState<ProblematicFile[]>([]);
  const [trends, setTrends] = useState<HealthTrendPoint[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load All Health and Analytics Telemetry
  const loadHealthData = useCallback(async () => {
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

      // 2. Latest Health
      const healthRes = await apiClient<HealthRecord>(
        `/api/repositories/${repoId}/health`
      );
      if (healthRes.success && healthRes.data) {
        setHealth(healthRes.data);
      } else {
        setHealth(null);
      }

      // 3. Analytics Severity
      const sevRes = await apiClient<SeveritySlice[]>(
        `/api/repositories/${repoId}/analytics/severity-distribution`
      );
      if (sevRes.success && sevRes.data) {
        setSeverityData(sevRes.data);
      }

      // 4. Analytics Types
      const typeRes = await apiClient<IssueTypeItem[]>(
        `/api/repositories/${repoId}/analytics/type-distribution`
      );
      if (typeRes.success && typeRes.data) {
        setTypeData(typeRes.data);
      }

      // 5. Top Problematic Files
      const filesRes = await apiClient<ProblematicFile[]>(
        `/api/repositories/${repoId}/analytics/top-files?limit=10`
      );
      if (filesRes.success && filesRes.data) {
        setTopFiles(filesRes.data);
      }

      // 6. Health Trend History
      const trendRes = await apiClient<HealthTrendPoint[]>(
        `/api/repositories/${repoId}/health/history`
      );
      if (trendRes.success && trendRes.data) {
        // Map history to display format
        setTrends(
          trendRes.data.map((r: any) => ({
            id: r.id,
            date: new Date(r.calculated_at).toLocaleDateString([], {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            overall_score: r.overall_score,
            overall_grade: r.overall_grade,
            security_score: r.security_score,
            code_quality_score: r.code_quality_score,
            maintainability_score: r.maintainability_score,
            performance_score: r.performance_score,
          }))
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load health telemetry");
    } finally {
      setIsLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    loadHealthData();
  }, [loadHealthData]);

  // Handle Recalculate Health
  const handleRecalculateHealth = async () => {
    if (!repoId) return;
    setIsRecalculating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<HealthRecord>(
      `/api/repositories/${repoId}/calculate-health`,
      { method: "POST" }
    );

    if (res.success && res.data) {
      setHealth(res.data);
      setSuccessMessage(
        `Health scores updated! New score: ${res.data.overall_score} (Grade ${res.data.overall_grade})`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
      loadHealthData();
    } else {
      setErrorMessage(
        res.error?.message ||
          "Failed to calculate health scores. Ensure code analysis has been run."
      );
    }

    setIsRecalculating(false);
  };

  const getHealthStatusText = (score: number) => {
    if (score >= 90) return { title: "Optimal Health", desc: "Clean codebase adhering to top security and quality standards." };
    if (score >= 75) return { title: "Good Condition", desc: "Minor code smells and low-risk issues detected." };
    if (score >= 60) return { title: "Fair Condition", desc: "Moderate technical debt and vulnerabilities require attention." };
    if (score >= 40) return { title: "Degraded Health", desc: "High security risks or significant code quality anti-patterns." };
    return { title: "Critical Attention Required", desc: "Multiple severe vulnerabilities and major maintainability blockers." };
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
              <Activity className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-bold font-mono text-white tracking-tight">
                Repository Health Radar
              </h1>
            </div>
            <p className="text-xs font-mono text-neutral-400 mt-0.5">
              {repoInfo?.github_repo_fullname || "Health Scorecard & Visual Analytics"}
            </p>
          </div>
        </div>

        {/* View Switcher / Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="px-3 py-1.5 rounded-lg border border-[#222222] bg-[#141414] text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            Overview
          </Link>
          <Link
            href={`/dashboard/repositories/${repoId}/analytics`}
            className="px-3 py-1.5 rounded-lg border border-[#222222] bg-[#141414] text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            Dev Analytics
          </Link>
          <Link
            href={`/dashboard/repositories/${repoId}/code`}
            className="px-3 py-1.5 rounded-lg border border-[#222222] bg-[#141414] text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            Code Explorer
          </Link>
          <Link
            href={`/dashboard/repositories/${repoId}/analysis`}
            className="px-3 py-1.5 rounded-lg border border-[#222222] bg-[#141414] text-xs font-mono text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors"
          >
            Static Analysis
          </Link>

          <button
            onClick={handleRecalculateHealth}
            disabled={isRecalculating}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-white text-black font-mono text-xs font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {isRecalculating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Computing Scores...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recalculate Health</span>
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
              Health Notice
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

      {/* Empty State when no health data exists */}
      {!isLoading && !health ? (
        <div className="p-12 rounded-2xl bg-[#111111] border border-[#1F1F1F] text-center space-y-4">
          <Activity className="w-12 h-12 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold font-mono text-white">
              No Health Scores Recorded Yet
            </h3>
            <p className="text-xs font-mono text-neutral-400 max-w-md mx-auto">
              Run static code analysis on your repository files to generate automated health scores, letter grades, and distribution charts.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href={`/dashboard/repositories/${repoId}/analysis`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-xs font-mono font-bold hover:bg-neutral-200 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>Run Code Analysis First</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Main Hero Health Card */}
          {health && (
            <div className="p-6 md:p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: Overall Gauge + Grade */}
                <div className="flex items-center gap-6">
                  <ScoreGauge score={health.overall_score} size={130} strokeWidth={11} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <GradeBadge grade={health.overall_grade} size="lg" />
                      <div>
                        <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 block">
                          Overall Health
                        </span>
                        <h2 className="text-xl md:text-2xl font-black font-mono text-white">
                          {getHealthStatusText(health.overall_score).title}
                        </h2>
                      </div>
                    </div>
                    <p className="text-xs font-mono text-neutral-400 max-w-lg">
                      {getHealthStatusText(health.overall_score).desc}
                    </p>
                  </div>
                </div>

                {/* Right: Telemetry metadata stats */}
                <div className="flex flex-wrap md:flex-col gap-3 text-xs font-mono border-t md:border-t-0 md:border-l border-[#222222] pt-4 md:pt-0 md:pl-6 shrink-0">
                  <div>
                    <span className="text-neutral-500 block">Files Analyzed:</span>
                    <span className="text-white font-bold">{health.total_files_analyzed} files</span>
                  </div>
                  {health.total_lines_of_code !== undefined && (
                    <div>
                      <span className="text-neutral-500 block">Lines of Code:</span>
                      <span className="text-white font-bold">{health.total_lines_of_code.toLocaleString()} LOC</span>
                    </div>
                  )}
                  <div>
                    <span className="text-neutral-500 block">Assessed:</span>
                    <span className="text-neutral-400">
                      {new Date(health.calculated_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Scoring Formula Explainer */}
              <div className="p-3.5 rounded-xl bg-[#161616] border border-[#242424] text-xs font-mono flex items-start gap-2.5">
                <Info className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
                <div className="text-neutral-400 leading-relaxed">
                  <strong className="text-white">Deterministic Scoring Formula:</strong> Overall Score = 40% Security + 25% Code Quality + 20% Maintainability + 15% Performance. Points deduct weighted by issue severity and normalized across codebase scale.
                </div>
              </div>
            </div>
          )}

          {/* 4 Dimension Sub-Scores */}
          {health && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ScoreCard
                title="Security"
                score={health.security_score}
                weight="40%"
                icon={ShieldAlert}
                description="Secrets, SQL injection, XSS, and weak crypto vulnerabilities."
              />
              <ScoreCard
                title="Code Quality"
                score={health.code_quality_score}
                weight="25%"
                icon={Bug}
                description="Bugs, unused variables, null checks, and unreachable paths."
              />
              <ScoreCard
                title="Maintainability"
                score={health.maintainability_score}
                weight="20%"
                icon={Wrench}
                description="Function lengths, documentation, complexity, and nesting."
              />
              <ScoreCard
                title="Performance"
                score={health.performance_score}
                weight="15%"
                icon={Zap}
                description="Blocking I/O calls, nested loops, and linear searches."
              />
            </div>
          )}

          {/* 2x2 Analytics Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Severity Distribution */}
            <SeverityPieChart data={severityData} isLoading={isLoading} />

            {/* Issue Category Breakdown */}
            <IssueTypeBarChart data={typeData} isLoading={isLoading} />

            {/* Top Problematic Files */}
            <TopFilesChart
              repositoryId={repoId}
              files={topFiles}
              isLoading={isLoading}
            />

            {/* Historical Score Trends */}
            <HealthTrendChart data={trends} isLoading={isLoading} />
          </div>
        </>
      )}
    </div>
  );
}
