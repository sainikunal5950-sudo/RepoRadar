import React from "react";
import { ShieldAlert, AlertTriangle, AlertCircle, Info } from "lucide-react";

export type SeverityLevel = "critical" | "high" | "medium" | "low" | string;

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  showIcon?: boolean;
}

const SEVERITY_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ElementType }
> = {
  critical: {
    label: "Critical",
    bg: "bg-red-950/40",
    text: "text-red-400",
    border: "border-red-500/30",
    icon: ShieldAlert,
  },
  high: {
    label: "High",
    bg: "bg-orange-950/40",
    text: "text-orange-400",
    border: "border-orange-500/30",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    bg: "bg-yellow-950/40",
    text: "text-yellow-400",
    border: "border-yellow-500/30",
    icon: AlertCircle,
  },
  low: {
    label: "Low",
    bg: "bg-neutral-900/60",
    text: "text-neutral-400",
    border: "border-neutral-700",
    icon: Info,
  },
};

export default function SeverityBadge({
  severity,
  className = "",
  showIcon = true,
}: SeverityBadgeProps) {
  const normalized = (severity || "low").toLowerCase();
  const config = SEVERITY_CONFIG[normalized] || SEVERITY_CONFIG.low;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
      <span className="capitalize">{config.label}</span>
    </span>
  );
}
