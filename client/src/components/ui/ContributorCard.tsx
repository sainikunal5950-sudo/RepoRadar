import React from "react";
import { GitCommit, Plus, ArrowUpRight } from "lucide-react";

export interface ContributorData {
  id: string;
  author_email: string;
  author_name: string;
  author_github_username?: string | null;
  author_avatar_url?: string | null;
  total_commits: number;
  total_additions: number;
  total_deletions: number;
  files_touched_count: number;
  contribution_percentage: number;
  first_commit_at?: string | Date | null;
  last_commit_at?: string | Date | null;
}

interface ContributorCardProps {
  contributor: ContributorData;
  rank?: number;
}

export default function ContributorCard({ contributor, rank }: ContributorCardProps) {
  const getInitials = (name: string) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const formattedDate = (d?: string | Date | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getRankBadge = (r: number) => {
    if (r === 1) return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    if (r === 2) return "bg-zinc-300/20 text-zinc-300 border-zinc-400/30";
    if (r === 3) return "bg-amber-700/20 text-amber-600 border-amber-700/30";
    return "bg-neutral-800 text-neutral-400 border-neutral-700";
  };

  return (
    <div
      data-testid="contributor-card"
      className="group relative flex flex-col p-5 bg-neutral-900/60 hover:bg-neutral-900 border border-neutral-800 hover:border-neutral-700 rounded-xl transition-all duration-200"
    >
      {/* Header with Avatar & Rank */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          {contributor.author_avatar_url ? (
            <img
              src={contributor.author_avatar_url}
              alt={contributor.author_name}
              className="w-12 h-12 rounded-full border border-neutral-700 object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-neutral-300 font-mono text-sm">
              {getInitials(contributor.author_name)}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-white text-base leading-tight group-hover:text-blue-400 transition-colors">
                {contributor.author_name}
              </h4>
              {contributor.author_github_username && (
                <a
                  href={`https://github.com/${contributor.author_github_username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-500 hover:text-neutral-300 transition-colors"
                  title="View GitHub Profile"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-xs text-neutral-400 font-mono truncate max-w-[200px]">
              {contributor.author_github_username
                ? `@${contributor.author_github_username}`
                : contributor.author_email}
            </p>
          </div>
        </div>

        {rank !== undefined && (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${getRankBadge(
              rank
            )}`}
          >
            #{rank}
          </span>
        )}
      </div>

      {/* Contribution Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center text-xs mb-1.5 font-mono">
          <span className="text-neutral-400">Share of Commits</span>
          <span className="text-white font-semibold">{contributor.contribution_percentage}%</span>
        </div>
        <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(2, contributor.contribution_percentage))}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800/80 mt-auto text-xs font-mono">
        <div>
          <span className="text-neutral-500 block mb-0.5">Commits</span>
          <div className="flex items-center gap-1.5 text-neutral-200 font-semibold text-sm">
            <GitCommit className="w-4 h-4 text-blue-400" />
            <span>{contributor.total_commits}</span>
          </div>
        </div>

        <div>
          <span className="text-neutral-500 block mb-0.5">Files Touched</span>
          <span className="text-neutral-200 font-semibold text-sm">
            {contributor.files_touched_count}
          </span>
        </div>

        <div>
          <span className="text-neutral-500 block mb-0.5">Lines Added</span>
          <span className="text-emerald-400 font-medium">
            +{contributor.total_additions.toLocaleString()}
          </span>
        </div>

        <div>
          <span className="text-neutral-500 block mb-0.5">Lines Deleted</span>
          <span className="text-rose-400 font-medium">
            -{contributor.total_deletions.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Timestamps Footer */}
      {(contributor.first_commit_at || contributor.last_commit_at) && (
        <div className="mt-3 pt-2 text-[11px] font-mono text-neutral-500 flex justify-between border-t border-neutral-800/40">
          <span>First: {formattedDate(contributor.first_commit_at) || "N/A"}</span>
          <span>Latest: {formattedDate(contributor.last_commit_at) || "N/A"}</span>
        </div>
      )}
    </div>
  );
}
