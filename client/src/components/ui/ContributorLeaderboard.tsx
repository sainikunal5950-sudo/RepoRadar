import React, { useState } from "react";
import ContributorCard, { ContributorData } from "./ContributorCard";
import { Users, Search } from "lucide-react";

interface ContributorLeaderboardProps {
  contributors: ContributorData[];
}

export default function ContributorLeaderboard({ contributors }: ContributorLeaderboardProps) {
  const [search, setSearch] = useState("");

  const filtered = contributors.filter(
    (c) =>
      c.author_name.toLowerCase().includes(search.toLowerCase()) ||
      c.author_email.toLowerCase().includes(search.toLowerCase()) ||
      (c.author_github_username &&
        c.author_github_username.toLowerCase().includes(search.toLowerCase()))
  );

  if (!contributors || contributors.length === 0) {
    return (
      <div
        data-testid="contributor-leaderboard-empty"
        className="p-8 text-center bg-neutral-900/40 border border-neutral-800 rounded-xl"
      >
        <Users className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
        <h4 className="text-white font-medium mb-1">No Contributors Found</h4>
        <p className="text-xs text-neutral-400 font-mono">
          Sync commit data from GitHub to populate contributor metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="contributor-leaderboard">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">
            Contributors ({contributors.length})
          </h3>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-900 border border-neutral-800 focus:border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500 outline-none transition-colors font-mono"
          />
        </div>
      </div>

      {/* Grid of Contributor Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((contributor, idx) => (
            <ContributorCard
              key={contributor.id || contributor.author_email}
              contributor={contributor}
              rank={contributors.indexOf(contributor) + 1}
            />
          ))}
        </div>
      ) : (
        <div className="p-6 text-center bg-neutral-900/30 border border-neutral-800 rounded-xl text-neutral-400 text-sm font-mono">
          No contributors match &ldquo;{search}&rdquo;
        </div>
      )}
    </div>
  );
}
