import React from "react";
import {
  Sparkles,
  Bot,
  ShieldCheck,
  Database,
  Layers,
  HelpCircle,
  ArrowRight,
  AlertTriangle,
  Loader2,
} from "lucide-react";

export interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  repoName?: string;
  isIndexed: boolean;
  isIndexing?: boolean;
  onStartIndexing?: () => void;
}

const EXAMPLE_PROMPTS = [
  {
    title: "Authentication Flow",
    prompt: "How does authentication, login, and token verification work in this codebase?",
    icon: ShieldCheck,
  },
  {
    title: "Database Architecture",
    prompt: "Where is the database connection configured, initialized, and models defined?",
    icon: Database,
  },
  {
    title: "API Endpoints & Routing",
    prompt: "What are the primary API routes, middleware, and request controllers in this application?",
    icon: Layers,
  },
  {
    title: "Architecture & Data Flow",
    prompt: "Can you provide a high-level overview of the repository's core subsystems and data flow?",
    icon: Sparkles,
  },
];

export default function ChatEmptyState({
  onSelectPrompt,
  repoName = "Repository",
  isIndexed,
  isIndexing = false,
  onStartIndexing,
}: ChatEmptyStateProps) {
  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 text-center space-y-6">
      {/* Icon Badge */}
      <div className="relative inline-block">
        <div className="w-14 h-14 rounded-2xl bg-purple-950/40 border border-purple-800/50 flex items-center justify-center mx-auto shadow-xl">
          <Bot className="w-7 h-7 text-purple-400" />
        </div>
        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Sparkles className="w-3 h-3" />
        </div>
      </div>

      {/* Hero Text */}
      <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
          Chat with {repoName}
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 max-w-lg mx-auto leading-relaxed font-sans">
          Ask natural-language questions about this codebase. Answers are strictly
          grounded in retrieved code context with line-level file citations.
        </p>
      </div>

      {/* Unindexed Warning Banner */}
      {!isIndexed && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono text-left space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">
                Codebase Indexing Required
              </p>
              <p className="text-neutral-400 text-[11px] leading-relaxed">
                Vector search embeddings have not been generated for this repository yet.
                Index the codebase to enable accurate RAG retrieval and code chat.
              </p>
            </div>
          </div>

          {onStartIndexing && (
            <button
              type="button"
              onClick={onStartIndexing}
              disabled={isIndexing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isIndexing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Code Embeddings...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Index Codebase Now</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Suggested Questions Grid */}
      <div className="space-y-3 pt-2 text-left">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-neutral-500 px-1">
          <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
          <span>Suggested Questions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXAMPLE_PROMPTS.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                type="button"
                onClick={() => onSelectPrompt(item.prompt)}
                disabled={!isIndexed}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-[#111111] hover:bg-[#161616] border border-[#222222] hover:border-purple-500/40 text-left transition-all group disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-950/30 border border-purple-800/30 flex items-center justify-center shrink-0 text-purple-400 group-hover:scale-110 transition-transform mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-neutral-200 group-hover:text-white truncate">
                      {item.title}
                    </p>
                    <ArrowRight className="w-3 h-3 text-neutral-600 group-hover:text-purple-400 transition-colors shrink-0" />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
