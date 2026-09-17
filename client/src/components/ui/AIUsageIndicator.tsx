"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Sparkles, RefreshCw, Cpu, CheckCircle2 } from "lucide-react";
import apiClient from "@/lib/api-client";

interface AIUsageData {
  used_in_last_hour: number;
  limit_per_hour: number;
  remaining: number;
  reset_at: string;
  lifetime_requests: number;
  total_tokens_used: number;
}

export default function AIUsageIndicator() {
  const [usage, setUsage] = useState<AIUsageData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchUsage = useCallback(async () => {
    setIsLoading(true);
    const res = await apiClient<AIUsageData>("/api/ai/usage");
    if (res.success && res.data) {
      setUsage(res.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, [fetchUsage]);

  if (!usage) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-400">
        <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
        <span>AI Ready</span>
      </div>
    );
  }

  const percentage = Math.min(
    100,
    Math.round((usage.used_in_last_hour / usage.limit_per_hour) * 100)
  );

  const isLow = usage.remaining <= 5;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
          isLow
            ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20"
            : "bg-purple-950/30 border-purple-500/30 text-purple-300 hover:bg-purple-900/40 hover:border-purple-500/50"
        }`}
        title="AI Hourly Usage & Quota"
      >
        <Sparkles className={`w-3.5 h-3.5 ${isLow ? "text-amber-400" : "text-purple-400"}`} />
        <span className="font-semibold">{usage.remaining}/{usage.limit_per_hour}</span>
        <span className="text-[10px] opacity-70 hidden md:inline">AI Quota</span>
      </button>

      {/* Popover Card */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 p-4 rounded-xl bg-[#141414] border border-[#262626] shadow-2xl z-50 text-xs font-mono space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#222222]">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>AI LLM Microservice</span>
              </div>
              <button
                type="button"
                onClick={fetchUsage}
                disabled={isLoading}
                className="text-neutral-400 hover:text-white p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                title="Refresh stats"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Quota Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-neutral-400">
                <span>Hourly Quota</span>
                <span className="text-white font-medium">
                  {usage.used_in_last_hour} / {usage.limit_per_hour} used ({percentage}%)
                </span>
              </div>
              <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-[#262626]">
                <div
                  className={`h-full transition-all duration-300 ${
                    isLow
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-purple-500 to-indigo-500"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Lifetime stats */}
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div className="p-2 rounded-lg bg-[#0E0E0E] border border-[#222222]">
                <span className="text-neutral-500 block text-[10px]">Total Calls</span>
                <span className="text-white font-bold">{usage.lifetime_requests}</span>
              </div>
              <div className="p-2 rounded-lg bg-[#0E0E0E] border border-[#222222]">
                <span className="text-neutral-500 block text-[10px]">Tokens Processed</span>
                <span className="text-white font-bold">{usage.total_tokens_used.toLocaleString()}</span>
              </div>
            </div>

            {/* Microservice Health Notice */}
            <div className="pt-2 border-t border-[#222222] flex items-center justify-between text-[10px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>FastAPI Microservice</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                Online
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
