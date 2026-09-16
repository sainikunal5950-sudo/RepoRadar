import React from "react";

interface GradeBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const GRADE_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; glow: string }
> = {
  A: {
    label: "A",
    bg: "bg-emerald-950/40",
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
  },
  B: {
    label: "B",
    bg: "bg-teal-950/40",
    text: "text-teal-400",
    border: "border-teal-500/40",
    glow: "shadow-[0_0_15px_rgba(20,184,166,0.2)]",
  },
  C: {
    label: "C",
    bg: "bg-yellow-950/40",
    text: "text-yellow-400",
    border: "border-yellow-500/40",
    glow: "shadow-[0_0_15px_rgba(234,179,8,0.2)]",
  },
  D: {
    label: "D",
    bg: "bg-orange-950/40",
    text: "text-orange-400",
    border: "border-orange-500/40",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.2)]",
  },
  F: {
    label: "F",
    bg: "bg-red-950/40",
    text: "text-red-400",
    border: "border-red-500/40",
    glow: "shadow-[0_0_15px_rgba(239,68,68,0.2)]",
  },
};

export default function GradeBadge({
  grade,
  size = "md",
  className = "",
}: GradeBadgeProps) {
  const normalized = (grade || "F").toUpperCase();
  const config = GRADE_CONFIG[normalized] || GRADE_CONFIG.F;

  const sizeClasses = {
    sm: "w-6 h-6 text-xs font-bold",
    md: "w-9 h-9 text-sm font-extrabold",
    lg: "w-14 h-14 text-2xl font-black",
    xl: "w-20 h-20 text-4xl font-black",
  }[size];

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl border font-mono ${config.bg} ${config.text} ${config.border} ${config.glow} ${sizeClasses} ${className}`}
    >
      <span>{config.label}</span>
    </div>
  );
}
