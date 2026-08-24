"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  FolderGit2,
  RefreshCw,
  Search,
  Star,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Code,
  Sparkles,
  Layers,
  Check,
  Github,
  Loader2,
  Filter,
} from "lucide-react";
import apiClient from "@/lib/api-client";

interface Repository {
  id: string;
  github_repo_id: number;
  github_repo_name: string;
  github_repo_fullname: string;
  github_repo_url: string;
  description: string | null;
  stars: number;
  language: string | null;
  is_selected: boolean;
  last_synced_at: string | null;
  updatedAt: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-400",
  JavaScript: "bg-yellow-400",
  Python: "bg-emerald-400",
  Go: "bg-cyan-400",
  Rust: "bg-orange-500",
  HTML: "bg-red-400",
  CSS: "bg-indigo-400",
  Java: "bg-amber-600",
  "C++": "bg-pink-500",
  C: "bg-neutral-400",
};

export default function RepositoriesPage() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [onlySelected, setOnlySelected] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Load repositories on mount
  useEffect(() => {
    async function loadRepos() {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await apiClient<Repository[]>("/api/repositories");
      if (res.success && res.data) {
        setRepositories(res.data);
      } else {
        setErrorMessage(res.error?.message || "Failed to load repositories");
      }
      setIsLoading(false);
    }

    if (session) {
      loadRepos();
    }
  }, [session]);

  // Trigger GitHub repository synchronization
  const handleSync = async () => {
    setIsSyncing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<Repository[]>("/api/repositories/sync", {
      method: "POST",
    });

    if (res.success && res.data) {
      setRepositories(res.data);
      setSuccessMessage(`Successfully synchronized ${res.data.length} repositories from GitHub!`);
    } else {
      setErrorMessage(
        res.error?.message ||
          "Failed to synchronize repositories. Make sure your GitHub account is linked."
      );
    }

    setIsSyncing(false);
  };

  // Toggle repository selection state
  const handleToggleSelect = async (repo: Repository) => {
    const nextState = !repo.is_selected;
    const action = nextState ? "select" : "deselect";

    // Track toggling state for loading indicator
    setTogglingIds((prev) => new Set(prev).add(repo.id));

    // Optimistic UI update
    setRepositories((prev) =>
      prev.map((r) => (r.id === repo.id ? { ...r, is_selected: nextState } : r))
    );

    const res = await apiClient<Repository>(`/api/repositories/${repo.id}/${action}`, {
      method: "PATCH",
    });

    if (!res.success) {
      // Revert optimistic update on failure
      setRepositories((prev) =>
        prev.map((r) => (r.id === repo.id ? { ...r, is_selected: !nextState } : r))
      );
      setErrorMessage(res.error?.message || `Failed to ${action} repository`);
    }

    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(repo.id);
      return next;
    });
  };

  // Available unique languages for filtering
  const availableLanguages = useMemo(() => {
    const languages = new Set<string>();
    repositories.forEach((r) => {
      if (r.language) languages.add(r.language);
    });
    return Array.from(languages).sort();
  }, [repositories]);

  // Filtered repositories based on search, language, and selection filters
  const filteredRepositories = useMemo(() => {
    return repositories.filter((repo) => {
      const matchesSearch =
        searchQuery === "" ||
        repo.github_repo_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        repo.github_repo_fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLanguage =
        selectedLanguage === "ALL" || repo.language === selectedLanguage;

      const matchesSelected = !onlySelected || repo.is_selected;

      return matchesSearch && matchesLanguage && matchesSelected;
    });
  }, [repositories, searchQuery, selectedLanguage, onlySelected]);

  const selectedCount = repositories.filter((r) => r.is_selected).length;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1F1F1F] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white text-xs font-mono mb-2">
            <FolderGit2 className="w-3.5 h-3.5" />
            <span>GitHub Repository Matrix</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Repositories
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Synchronize and select the GitHub repositories you want RepoRadar to monitor and analyze.
          </p>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs transition-all duration-200 hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSyncing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Syncing with GitHub...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Sync Repositories</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs font-mono">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs font-mono">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Total Synced Repos</span>
            <FolderGit2 className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {isLoading ? "..." : repositories.length}
          </div>
          <div className="mt-2 text-xs text-neutral-500 font-mono">
            Directly from GitHub Account
          </div>
        </div>

        {/* Metric 2 */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Selected for Radar</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400">
            {isLoading ? "..." : selectedCount}
            <span className="text-xs text-neutral-500 font-normal"> / {repositories.length}</span>
          </div>
          <div className="mt-2 text-xs text-neutral-500 font-mono">
            Active in Analysis Pipeline
          </div>
        </div>

        {/* Metric 3 */}
        <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between text-xs font-mono uppercase text-neutral-400 mb-2">
            <span>Languages Detected</span>
            <Code className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white">
            {isLoading ? "..." : availableLanguages.length}
          </div>
          <div className="mt-2 text-xs text-neutral-500 font-mono">
            Across All Codebases
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
        {/* Search Input */}
        <div className="relative w-full md:w-96">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories by name or description..."
            className="w-full pl-10 pr-3.5 py-2 bg-[#0C0C0C] border border-[#262626] rounded-xl text-white placeholder-neutral-600 text-xs focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-start md:justify-end">
          {/* Language Filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="px-3 py-2 bg-[#0C0C0C] border border-[#262626] rounded-xl text-neutral-300 text-xs font-mono focus:outline-none focus:border-white cursor-pointer"
          >
            <option value="ALL">All Languages ({availableLanguages.length})</option>
            {availableLanguages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>

          {/* Selected Only Toggle */}
          <button
            type="button"
            onClick={() => setOnlySelected(!onlySelected)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono border transition-all cursor-pointer ${
              onlySelected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-[#0C0C0C] border-[#262626] text-neutral-400 hover:text-white"
            }`}
          >
            <Check className={`w-3.5 h-3.5 ${onlySelected ? "opacity-100" : "opacity-40"}`} />
            <span>Selected Only ({selectedCount})</span>
          </button>
        </div>
      </div>

      {/* Repositories Grid / List */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-500 mb-3" />
          <p className="text-xs font-mono text-neutral-400">Loading repositories from database...</p>
        </div>
      ) : repositories.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
            <Github className="w-6 h-6 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No repositories synced yet</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-6">
            Connect your GitHub account and click &quot;Sync Repositories&quot; above to import your public and private repositories.
          </p>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync from GitHub Now</span>
          </button>
        </div>
      ) : filteredRepositories.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-neutral-500">
          No repositories matched your search or filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRepositories.map((repo) => {
            const isToggling = togglingIds.has(repo.id);
            const dotColor = repo.language
              ? LANGUAGE_COLORS[repo.language] || "bg-neutral-400"
              : "bg-neutral-600";

            return (
              <div
                key={repo.id}
                className={`relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                  repo.is_selected
                    ? "bg-[#141414] border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.05)]"
                    : "bg-[#111111] border-[#1F1F1F] hover:border-neutral-700"
                }`}
              >
                <div>
                  {/* Top Bar: Name, Badges, GitHub Link */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FolderGit2 className="w-4 h-4 shrink-0 text-neutral-400" />
                      <a
                        href={repo.github_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-bold text-white hover:underline truncate flex items-center gap-1 group"
                      >
                        <span className="truncate">{repo.github_repo_fullname}</span>
                        <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-white shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>

                    {/* Star Count Badge */}
                    <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400 bg-[#161616] px-2 py-0.5 rounded-md border border-[#262626] shrink-0">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400/20" />
                      <span>{repo.stars}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-neutral-400 line-clamp-2 mb-4 leading-relaxed">
                    {repo.description || "No repository description provided."}
                  </p>
                </div>

                {/* Bottom Bar: Language & Selection Toggle Button */}
                <div className="pt-3 border-t border-[#1C1C1C] flex items-center justify-between gap-2">
                  {/* Language */}
                  <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                    <span>{repo.language || "Unknown"}</span>
                  </div>

                  {/* Selection Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(repo)}
                    disabled={isToggling}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      repo.is_selected
                        ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                        : "bg-[#181818] border border-[#2A2A2A] text-neutral-400 hover:text-white hover:border-neutral-600"
                    }`}
                  >
                    {isToggling ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : repo.is_selected ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Selected</span>
                      </>
                    ) : (
                      <>
                        <span className="w-3.5 h-3.5 rounded-full border border-neutral-600" />
                        <span>Select</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
