import React from "react";
import { GitPullRequest, GitMerge, CheckCircle2, AlertCircle } from "lucide-react";

export type PRStatusType = "open" | "closed" | "merged" | string;

interface PRStatusBadgeProps {
  status: PRStatusType;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  open: {
    label: "Open",
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    icon: GitPullRequest,
  },
  merged: {
    label: "Merged",
    bg: "bg-purple-950/40",
    text: "text-purple-400",
    border: "border-purple-500/30",
    icon: GitMerge,
  },
  closed: {
    label: "Closed",
    bg: "bg-neutral-900/60",
    text: "text-neutral-400",
    border: "border-neutral-700",
    icon: AlertCircle,
  },
};

export default function PRStatusBadge({ status, className = "" }: PRStatusBadgeProps) {
  const normalized = (status || "open").toLowerCase();
  const config = STATUS_CONFIG[normalized] || STATUS_CONFIG.open;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
