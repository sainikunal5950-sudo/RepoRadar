import React from "react";
import Link from "next/link";
import { AlertTriangle, ShieldAlert, ArrowUpRight, Flame, Users, Code2 } from "lucide-react";

export interface TechnicalDebtItem {
  id: string;
  file_path: string;
  debt_score: number;
  change_count: number;
  unique_authors_count: number;
  issue_count: number;
  critical_issue_count: number;
  risk_level: "critical" | "high" | "medium" | "low";
  reason: string;
  last_modified_at?: string | Date | null;
}

interface TechnicalDebtCardProps {
  debtItem: TechnicalDebtItem;
  repoId: string;
}

export default function TechnicalDebtCard({ debtItem, repoId }: TechnicalDebtCardProps) {
  const getRiskConfig = (level: string) => {
    switch (level) {
      case "critical":
        return {
          bg: "bg-rose-950/40 hover:bg-rose-950/60",
          border: "border-rose-500/30 hover:border-rose-500/50",
          badge: "bg-rose-900/60 text-rose-300 border-rose-500/40",
          icon: ShieldAlert,
          iconColor: "text-rose-400",
        };
      case "high":
        return {
          bg: "bg-orange-950/40 hover:bg-orange-950/60",
          border: "border-orange-500/30 hover:border-orange-500/50",
          badge: "bg-orange-900/60 text-orange-300 border-orange-500/40",
          icon: AlertTriangle,
          iconColor: "text-orange-400",
        };
      case "medium":
        return {
          bg: "bg-amber-950/30 hover:bg-amber-950/50",
          border: "border-amber-500/30 hover:border-amber-500/50",
          badge: "bg-amber-900/60 text-amber-300 border-amber-500/40",
          icon: AlertTriangle,
          iconColor: "text-amber-400",
        };
      default:
        return {
          bg: "bg-neutral-900/60 hover:bg-neutral-900",
          border: "border-neutral-800 hover:border-neutral-700",
          badge: "bg-neutral-800 text-neutral-300 border-neutral-700",
          icon: Code2,
          iconColor: "text-neutral-400",
        };
    }
  };

  const config = getRiskConfig(debtItem.risk_level);
  const Icon = config.icon;

  return (
    <div
      data-testid="technical-debt-card"
      className={`p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${config.bg} ${config.border}`}
    >
      {/* Top Bar: Risk Level & Score */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border uppercase flex items-center gap-1.5 ${config.badge}`}
          >
            <Icon className="w-3.5 h-3.5" />
            {debtItem.risk_level} Risk
          </span>

          <span className="font-mono text-xs font-bold text-neutral-300">
            Debt Score: <span className={config.iconColor}>{debtItem.debt_score}</span>/100
          </span>
        </div>

        {/* File Path Link */}
        <Link
          href={`/dashboard/repositories/${repoId}/code?file=${encodeURIComponent(
            debtItem.file_path
          )}`}
          className="group inline-flex items-center gap-1.5 text-sm font-mono font-semibold text-white hover:text-blue-400 transition-colors break-all mb-2.5"
        >
          <span>{debtItem.file_path}</span>
          <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0 text-neutral-500 group-hover:text-blue-400 transition-colors" />
        </Link>

        {/* Explanation Reason */}
        <p className="text-xs text-neutral-300 font-mono leading-relaxed mb-4">
          {debtItem.reason}
        </p>
      </div>

      {/* Metrics Footer */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-800/80 text-xs font-mono">
        <div className="flex items-center gap-1 text-neutral-400">
          <Flame className="w-3.5 h-3.5 text-rose-400" />
          <span>{debtItem.change_count} edits</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400">
          <Users className="w-3.5 h-3.5 text-blue-400" />
          <span>{debtItem.unique_authors_count} authors</span>
        </div>
        <div className="flex items-center gap-1 text-neutral-400 justify-end">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>{debtItem.issue_count} issues</span>
        </div>
      </div>
    </div>
  );
}
