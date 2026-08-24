"use client";

import React from "react";
import { GitCommit, User, Calendar, ExternalLink } from "lucide-react";

export interface CommitItem {
  id?: string;
  commit_sha: string;
  author: string;
  message: string;
  committed_at: string;
}

interface Props {
  commits: CommitItem[];
  repoUrl?: string;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export function CommitTimeline({ commits, repoUrl }: Props) {
  if (!commits || commits.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] text-center">
        <GitCommit className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
        <p className="text-xs font-mono text-neutral-400">
          No commit history ingested yet. Click &quot;Refresh Data&quot; to fetch recent commits.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-5">
      <div className="flex items-center justify-between border-b border-[#222222] pb-4">
        <div className="flex items-center gap-2">
          <GitCommit className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Recent Commit Activity
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-400 bg-[#161616] px-2.5 py-1 rounded-md border border-[#262626]">
          Last {commits.length} Commits
        </span>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#262626]">
        {commits.map((commit) => {
          const shortSha = commit.commit_sha.substring(0, 7);
          const commitUrl = repoUrl
            ? `${repoUrl}/commit/${commit.commit_sha}`
            : null;

          return (
            <div key={commit.commit_sha} className="relative group">
              {/* Timeline Node Dot */}
              <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-[#111111] border-2 border-white/40 group-hover:border-emerald-400 group-hover:scale-110 transition-all" />

              <div className="p-4 rounded-xl bg-[#141414] border border-[#222222] group-hover:border-neutral-700 transition-all space-y-2">
                <div className="flex items-start justify-between gap-3">
                  {/* Message */}
                  <p className="text-xs font-medium text-white leading-relaxed break-words font-sans">
                    {commit.message}
                  </p>

                  {/* Commit SHA */}
                  {commitUrl ? (
                    <a
                      href={commitUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-[#1C1C1C] hover:bg-white/10 hover:text-white px-2 py-0.5 rounded border border-white/10 shrink-0 transition-colors"
                      title="View commit on GitHub"
                    >
                      <span>{shortSha}</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  ) : (
                    <span className="text-[11px] font-mono text-neutral-400 bg-[#1C1C1C] px-2 py-0.5 rounded border border-white/10 shrink-0">
                      {shortSha}
                    </span>
                  )}
                </div>

                {/* Author & Date */}
                <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-neutral-500 pt-1">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <User className="w-3 h-3" />
                    <span>{commit.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(commit.committed_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CommitTimeline;
