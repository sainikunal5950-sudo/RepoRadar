import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  FileCode2,
  ExternalLink,
  Flame,
  Search,
  Users,
  AlertTriangle,
  ArrowUpDown,
  FileWarning,
} from "lucide-react";

export interface HotspotData {
  id: string;
  file_path: string;
  change_count: number;
  unique_authors_count: number;
  total_additions: number;
  total_deletions: number;
  issue_count: number;
  critical_issue_count: number;
  debt_score: number;
  last_modified_at?: string | Date | null;
}

interface HotspotTableProps {
  hotspots: HotspotData[];
  repoId: string;
}

type SortField = "debt_score" | "change_count" | "unique_authors_count" | "issue_count";
type SortOrder = "asc" | "desc";

export default function HotspotTable({ hotspots, repoId }: HotspotTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("debt_score");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    return hotspots
      .filter((h) => h.file_path.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const factor = sortOrder === "asc" ? 1 : -1;
        return (a[sortField] - b[sortField]) * factor;
      });
  }, [hotspots, search, sortField, sortOrder]);

  const getDebtBadge = (score: number) => {
    if (score >= 75) {
      return "bg-rose-950/60 text-rose-400 border-rose-500/30";
    }
    if (score >= 50) {
      return "bg-orange-950/60 text-orange-400 border-orange-500/30";
    }
    if (score >= 25) {
      return "bg-amber-950/60 text-amber-400 border-amber-500/30";
    }
    return "bg-emerald-950/40 text-emerald-400 border-emerald-500/30";
  };

  if (!hotspots || hotspots.length === 0) {
    return (
      <div
        data-testid="hotspot-table-empty"
        className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl"
      >
        <Flame className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
        <h4 className="text-white font-medium mb-1">No Hotspots Computed</h4>
        <p className="text-xs text-neutral-400 font-mono">
          Sync repository commits to identify high-churn files and technical debt.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="hotspot-table"
      className="p-6 bg-neutral-900/60 border border-neutral-800 rounded-xl flex flex-col space-y-4"
    >
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <h3 className="text-lg font-semibold text-white">File Hotspots & Churn</h3>
          </div>
          <p className="text-xs text-neutral-400 font-mono mt-0.5">
            Files ranked by Technical Debt Score (combining change churn frequency & code issues)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter files..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 focus:border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 outline-none transition-colors font-mono"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left border-collapse text-xs font-mono">
          <thead>
            <tr className="bg-neutral-900/90 border-b border-neutral-800 text-neutral-400 select-none">
              <th className="py-3 px-4 font-semibold text-neutral-300">File Path</th>
              <th
                onClick={() => handleSort("debt_score")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Debt Score</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("change_count")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Changes</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("unique_authors_count")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Authors</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th
                onClick={() => handleSort("issue_count")}
                className="py-3 px-4 font-semibold cursor-pointer hover:text-white transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span>Issues</span>
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </div>
              </th>
              <th className="py-3 px-4 font-semibold text-right">Lines Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {filteredAndSorted.map((hotspot) => (
              <tr
                key={hotspot.id || hotspot.file_path}
                className="hover:bg-neutral-800/40 transition-colors group"
              >
                {/* File Path & Explorer Link */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <FileCode2 className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                    <Link
                      href={`/dashboard/repositories/${repoId}/code?file=${encodeURIComponent(
                        hotspot.file_path
                      )}`}
                      className="text-white hover:text-blue-400 font-medium transition-colors flex items-center gap-1.5 group-hover:underline"
                    >
                      <span>{hotspot.file_path}</span>
                      <ExternalLink className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </div>
                </td>

                {/* Debt Score */}
                <td className="py-3 px-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-xs border ${getDebtBadge(
                      hotspot.debt_score
                    )}`}
                  >
                    <FileWarning className="w-3 h-3" />
                    {hotspot.debt_score}/100
                  </span>
                </td>

                {/* Changes */}
                <td className="py-3 px-4 text-neutral-200">
                  <span className="font-semibold">{hotspot.change_count}</span> commits
                </td>

                {/* Unique Authors */}
                <td className="py-3 px-4 text-neutral-300">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{hotspot.unique_authors_count}</span>
                  </div>
                </td>

                {/* Code Issues */}
                <td className="py-3 px-4">
                  {hotspot.issue_count > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-neutral-200 font-semibold">{hotspot.issue_count}</span>
                      {hotspot.critical_issue_count > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 text-[10px] font-bold border border-rose-800">
                          {hotspot.critical_issue_count} critical
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-neutral-500">0 issues</span>
                  )}
                </td>

                {/* Lines Added / Deleted */}
                <td className="py-3 px-4 text-right">
                  <span className="text-emerald-400 font-medium">+{hotspot.total_additions}</span>
                  <span className="text-neutral-500 mx-1">/</span>
                  <span className="text-rose-400 font-medium">-{hotspot.total_deletions}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredAndSorted.length === 0 && (
        <div className="p-6 text-center text-neutral-400 font-mono text-xs">
          No files match &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  );
}
