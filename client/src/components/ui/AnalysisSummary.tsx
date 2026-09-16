"use client";

import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  Info,
  Bug,
  Zap,
  FileCode2,
  Wrench,
  Activity,
  Clock,
} from "lucide-react";

export interface AnalysisSummaryData {
  id?: string;
  repository_id?: string;
  total_issues: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  security_issues_count: number;
  performance_issues_count: number;
  bug_issues_count: number;
  code_smell_count: number;
  maintainability_count: number;
  analysis_completed_at?: string | null;
}

interface Props {
  summary: AnalysisSummaryData | null;
  isLoading?: boolean;
}

export default function AnalysisSummary({ summary, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-[#141414] border border-[#222222]"
          />
        ))}
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] text-center">
        <Activity className="w-8 h-8 text-neutral-500 mx-auto mb-3" />
        <p className="text-sm font-mono text-neutral-400">
          No analysis summary available yet. Run analysis to inspect this codebase.
        </p>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Issues",
      count: summary.total_issues,
      color: "text-white",
      bg: "bg-[#141414]",
      border: "border-[#222222]",
      badge: "border-neutral-700 bg-neutral-800 text-neutral-300",
      icon: Activity,
    },
    {
      label: "Critical",
      count: summary.critical_count,
      color: "text-red-400",
      bg: "bg-red-950/20",
      border: "border-red-900/40",
      badge: "border-red-500/30 bg-red-950/50 text-red-300",
      icon: ShieldAlert,
    },
    {
      label: "High",
      count: summary.high_count,
      color: "text-orange-400",
      bg: "bg-orange-950/20",
      border: "border-orange-900/40",
      badge: "border-orange-500/30 bg-orange-950/50 text-orange-300",
      icon: AlertTriangle,
    },
    {
      label: "Medium",
      count: summary.medium_count,
      color: "text-yellow-400",
      bg: "bg-yellow-950/20",
      border: "border-yellow-900/40",
      badge: "border-yellow-500/30 bg-yellow-950/50 text-yellow-300",
      icon: AlertCircle,
    },
    {
      label: "Low",
      count: summary.low_count,
      color: "text-neutral-400",
      bg: "bg-[#141414]",
      border: "border-[#222222]",
      badge: "border-neutral-700 bg-neutral-800 text-neutral-400",
      icon: Info,
    },
  ];

  const categoryBreakdown = [
    {
      label: "Security",
      count: summary.security_issues_count,
      icon: ShieldAlert,
      color: "text-red-400",
      barColor: "bg-red-500",
    },
    {
      label: "Performance",
      count: summary.performance_issues_count,
      icon: Zap,
      color: "text-amber-400",
      barColor: "bg-amber-500",
    },
    {
      label: "Bugs",
      count: summary.bug_issues_count,
      icon: Bug,
      color: "text-rose-400",
      barColor: "bg-rose-500",
    },
    {
      label: "Code Smells",
      count: summary.code_smell_count,
      icon: FileCode2,
      color: "text-blue-400",
      barColor: "bg-blue-500",
    },
    {
      label: "Maintainability",
      count: summary.maintainability_count,
      icon: Wrench,
      color: "text-purple-400",
      barColor: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 5-Column Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`p-4 rounded-xl border ${card.bg} ${card.border} flex flex-col justify-between transition-all hover:border-neutral-600`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl md:text-3xl font-bold font-mono ${card.color}`}>
                  {card.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Category Pills & Last Scanned Bar */}
      <div className="p-4 rounded-xl bg-[#111111] border border-[#1F1F1F] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider mr-1">
            Categories:
          </span>
          {categoryBreakdown.map((cat) => {
            const CatIcon = cat.icon;
            return (
              <div
                key={cat.label}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#181818] border border-[#282828] text-xs font-mono"
              >
                <CatIcon className={`w-3.5 h-3.5 ${cat.color}`} />
                <span className="text-neutral-300">{cat.label}</span>
                <span className="font-bold text-white ml-1">{cat.count}</span>
              </div>
            );
          })}
        </div>

        {summary.analysis_completed_at && (
          <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-500">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              Scanned {new Date(summary.analysis_completed_at).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
