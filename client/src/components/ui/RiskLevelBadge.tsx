import React from "react";
import { ShieldCheck, ShieldAlert, AlertCircle } from "lucide-react";

export type RiskLevel = "low" | "medium" | "high" | "critical" | string;

interface RiskLevelBadgeProps {
  riskLevel: RiskLevel;
  className?: string;
  showIcon?: boolean;
  size?: "sm" | "md" | "lg";
}

const RISK_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; glow: string; icon: React.ElementType }
> = {
  critical: {
    label: "Critical Risk",
    bg: "bg-red-950/50",
    text: "text-red-400",
    border: "border-red-500/40",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
    icon: ShieldAlert,
  },
  high: {
    label: "High Risk",
    bg: "bg-orange-950/50",
    text: "text-orange-400",
    border: "border-orange-500/40",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.15)]",
    icon: ShieldAlert,
  },
  medium: {
    label: "Medium Risk",
    bg: "bg-yellow-950/50",
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    glow: "shadow-[0_0_15px_rgba(234,179,8,0.15)]",
    icon: AlertCircle,
  },
  low: {
    label: "Low Risk",
    bg: "bg-emerald-950/50",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    icon: ShieldCheck,
  },
};

export default function RiskLevelBadge({
  riskLevel,
  className = "",
  showIcon = true,
  size = "md",
}: RiskLevelBadgeProps) {
  const normalized = (riskLevel || "low").toLowerCase();
  const config = RISK_CONFIG[normalized] || RISK_CONFIG.low;
  const Icon = config.icon;

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
    lg: "px-4 py-1.5 text-sm font-semibold",
  }[size];

  const iconSizes = {
    sm: "w-3.5 h-3.5",
    md: "w-4 h-4",
    lg: "w-4.5 h-4.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-mono font-medium border ${config.bg} ${config.text} ${config.border} ${config.glow} ${sizeClasses} ${className}`}
    >
      {showIcon && <Icon className={`${iconSizes} flex-shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
}
