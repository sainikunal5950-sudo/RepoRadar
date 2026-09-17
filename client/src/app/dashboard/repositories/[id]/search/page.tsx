"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Search,
  ArrowLeft,
  Sparkles,
  Layers,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  Cpu,
  RefreshCw,
  Compass,
  Database,
  Code2,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import CodeSearchResult, { CodeSearchResultProps } from "@/components/ui/CodeSearchResult";

interface RepositorySummary {
  id: string;
  github_repo_fullname: string;
  github_repo_name: string;
  github_repo_url: string;
  language: string | null;
}

interface IndexStatusResponse {
  indexing_status: "not_started" | "processing" | "completed" | "failed" | string;
  total_chunks_indexed: number;
  last_indexed_at?: string | null;
}

interface SearchResponse {
  query: string;
  total_results: number;
  search_mode: "atlas_vector_search" | "in_memory_cosine_fallback";
  results: Array<{
    id: string;
    file_path: string;
    start_line: number;
    end_line: number;
    chunk_text: string;
    chunk_type: string;
    chunk_label: string;
    language: string | null;
    score: number;
  }>;
}

const QUICK_SEARCH_PROMPTS = [
  "Authentication and token validation",
  "Database connection pooling and queries",
  "Error handling and HTTP response helpers",
  "Input validation schemas and middleware",
  "API route handlers and controllers",
];

export default function RepositoryCodeSearchPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repoInfo, setRepoInfo] = useState<RepositorySummary | null>(null);
  const [indexStatus, setIndexStatus] = useState<IndexStatusResponse | null>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Indexing action state
  const [isTriggeringIndex, setIsTriggeringIndex] = useState(false);
  const [indexMessage, setIndexMessage] = useState<string | null>(null);

  // Load repo info and current index status
  const loadStatus = useCallback(async () => {
    if (!repoId) return;

    // Fetch repo basic metrics for fullname
    const repoRes = await apiClient<RepositorySummary>(`/api/repositories/${repoId}/metrics`);
    if (repoRes.success && repoRes.data) {
      setRepoInfo(repoRes.data);
    }

    // Fetch index status
    const statusRes = await apiClient<IndexStatusResponse>(
      `/api/repositories/${repoId}/index-status`
    );
    if (statusRes.success && statusRes.data) {
      setIndexStatus(statusRes.data);
    }
  }, [repoId]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Polling loop when indexing is in processing status
  useEffect(() => {
    if (indexStatus?.indexing_status === "processing") {
      const interval = setInterval(async () => {
        const res = await apiClient<IndexStatusResponse>(
          `/api/repositories/${repoId}/index-status`
        );
        if (res.success && res.data) {
          setIndexStatus(res.data);
          if (res.data.indexing_status === "completed") {
            setIndexMessage(`Indexing completed! ${res.data.total_chunks_indexed} chunks vector-indexed.`);
            clearInterval(interval);
          } else if (res.data.indexing_status === "failed") {
            setIndexMessage("Indexing failed. Please check AI service connectivity and retry.");
            clearInterval(interval);
          }
        }
      }, 2500);

      return () => clearInterval(interval);
    }
  }, [indexStatus?.indexing_status, repoId]);

  // Trigger indexing handler
  const handleTriggerIndex = async () => {
    if (!repoId) return;
    setIsTriggeringIndex(true);
    setIndexMessage(null);

    const res = await apiClient<{ message: string; indexing_status: string }>(
      `/api/repositories/${repoId}/index-code`,
      { method: "POST" }
    );

    if (res.success) {
      setIndexStatus({
        indexing_status: "processing",
        total_chunks_indexed: indexStatus?.total_chunks_indexed || 0,
      });
      setIndexMessage("Code chunking and vector embedding generation started in background...");
    } else {
      setIndexMessage(res.error?.message || "Failed to start repository indexing.");
    }
    setIsTriggeringIndex(false);
  };

  // Perform search handler
  const handleSearch = async (searchQuery?: string) => {
    const activeQuery = (searchQuery ?? query).trim();
    if (!activeQuery || !repoId) return;

    if (searchQuery) {
      setQuery(searchQuery);
    }

    setIsSearching(true);
    setSearchError(null);

    const res = await apiClient<SearchResponse>(
      `/api/repositories/${repoId}/search-code`,
      {
        method: "POST",
        body: JSON.stringify({ query: activeQuery, limit: 10 }),
      }
    );

    if (res.success && res.data) {
      setSearchResults(res.data);
    } else {
      setSearchError(res.error?.message || "Vector search failed");
    }
    setIsSearching(false);
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Vector Indexed</span>
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Indexing in progress...</span>
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Indexing Failed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs font-mono">
            <span>Not Indexed</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href="/dashboard/repositories" className="hover:text-white transition-colors">
          Repositories
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/repositories/${repoId}`}
          className="hover:text-white transition-colors"
        >
          {repoInfo?.github_repo_fullname || "Repository"}
        </Link>
        <span>/</span>
        <span className="text-white">AI Code Search</span>
      </div>

      {/* Top Banner Card */}
      <div className="p-6 md:p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Vector Embeddings</span>
              </div>
              {getStatusBadge(indexStatus?.indexing_status)}
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-3">
              <span>Code Vector Search</span>
            </h1>

            <p className="text-sm text-neutral-400 max-w-3xl leading-relaxed">
              Retrieve relevant code snippets and functions across {repoInfo?.github_repo_fullname || "the repository"} using AI embeddings and MongoDB Atlas Vector Search.
            </p>
          </div>

          {/* Indexing Action Box */}
          <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] space-y-3 shrink-0 min-w-[280px]">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-neutral-400">Indexed Chunks</span>
              <span className="text-white font-bold">
                {indexStatus?.total_chunks_indexed || 0}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTriggerIndex}
              disabled={isTriggeringIndex || indexStatus?.indexing_status === "processing"}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-black font-semibold text-xs transition-all duration-200 hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {indexStatus?.indexing_status === "processing" ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing Embeddings...</span>
                </>
              ) : indexStatus?.indexing_status === "completed" ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Re-index Repository</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Index for AI Search</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Index Status Message */}
        {indexMessage && (
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{indexMessage}</span>
          </div>
        )}
      </div>

      {/* Search Input Section */}
      <div className="space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="relative flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about this codebase... (e.g. 'Authentication JWT token verification', 'Database connection pool')"
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-[#0E0E0E] border border-[#222222] focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 text-white placeholder-neutral-500 text-sm transition-all outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-white text-black font-semibold text-sm transition-all hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Search Suggestions */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-neutral-400">
          <span className="text-neutral-500 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Try searching:</span>
          </span>
          {QUICK_SEARCH_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSearch(prompt)}
              className="px-3 py-1 rounded-lg bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] text-neutral-300 hover:text-white transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {searchError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{searchError}</span>
        </div>
      )}

      {/* Search Results Area */}
      {isSearching && (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-400" />
          <p className="text-xs font-mono text-neutral-400">
            Vectorizing query and executing similarity search across codebase...
          </p>
        </div>
      )}

      {!isSearching && searchResults && (
        <div className="space-y-6">
          {/* Results Summary Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span>Found</span>
              <span className="font-bold text-white">{searchResults.total_results}</span>
              <span>matches for</span>
              <span className="text-purple-300 font-semibold">
                &ldquo;{searchResults.query}&rdquo;
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-neutral-400 text-[11px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-neutral-400" />
                <span>
                  {searchResults.search_mode === "atlas_vector_search"
                    ? "Atlas Vector Search ($vectorSearch)"
                    : "Cosine Similarity Fallback"}
                </span>
              </span>
            </div>
          </div>

          {/* Results List */}
          {searchResults.results.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#0E0E0E] border border-[#1F1F1F] space-y-3">
              <Code2 className="w-10 h-10 text-neutral-600 mx-auto" />
              <h3 className="text-sm font-bold text-white font-mono">No Relevant Code Chunks Found</h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                No code chunks met the similarity threshold for this query. Try broader keywords or re-indexing the repository if new code was added.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {searchResults.results.map((result, idx) => (
                <CodeSearchResult
                  key={result.id || idx}
                  id={result.id}
                  repositoryId={repoId}
                  filePath={result.file_path}
                  startLine={result.start_line}
                  endLine={result.end_line}
                  chunkText={result.chunk_text}
                  chunkType={result.chunk_type}
                  chunkLabel={result.chunk_label}
                  language={result.language}
                  score={result.score}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Initial Empty State Guide */}
      {!isSearching && !searchResults && (
        <div className="p-12 text-center rounded-2xl bg-[#0E0E0E] border border-[#1F1F1F] space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-mono">Semantic Code Retrieval</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            Enter a natural language query or concept above to search across functions, classes, and code logic stored with high-dimensional vector embeddings.
          </p>
        </div>
      )}
    </div>
  );
}
