"use client";

import React from "react";
import { Code2 } from "lucide-react";

export interface LanguageItem {
  language: string;
  bytes: number;
  percentage: number;
}

interface Props {
  languages: LanguageItem[];
}

const LANGUAGE_PALETTE: Record<string, string> = {
  TypeScript: "bg-blue-400 border-blue-500",
  JavaScript: "bg-yellow-400 border-yellow-500",
  Python: "bg-emerald-400 border-emerald-500",
  Go: "bg-cyan-400 border-cyan-500",
  Rust: "bg-orange-500 border-orange-600",
  HTML: "bg-red-400 border-red-500",
  CSS: "bg-indigo-400 border-indigo-500",
  Java: "bg-amber-600 border-amber-700",
  "C++": "bg-pink-500 border-pink-600",
  C: "bg-neutral-400 border-neutral-500",
  Shell: "bg-emerald-600 border-emerald-700",
  Ruby: "bg-rose-500 border-rose-600",
  PHP: "bg-violet-400 border-violet-500",
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function LanguageChart({ languages }: Props) {
  if (!languages || languages.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] text-center">
        <Code2 className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
        <p className="text-xs font-mono text-neutral-400">
          No language breakdown telemetry available for this repository.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Language Composition
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-400 bg-[#161616] px-2.5 py-1 rounded-md border border-[#262626]">
          {languages.length} {languages.length === 1 ? "Language" : "Languages"}
        </span>
      </div>

      {/* Stacked Multi-Color Progress Bar */}
      <div className="h-3.5 w-full rounded-full bg-[#1A1A1A] overflow-hidden flex shadow-inner border border-white/5">
        {languages.map((lang) => {
          const colorClass =
            LANGUAGE_PALETTE[lang.language]?.split(" ")[0] || "bg-neutral-500";
          return (
            <div
              key={lang.language}
              style={{ width: `${Math.max(lang.percentage, 0.5)}%` }}
              className={`h-full ${colorClass} transition-all duration-500 hover:opacity-90 relative group`}
              title={`${lang.language}: ${lang.percentage}% (${formatBytes(lang.bytes)})`}
            />
          );
        })}
      </div>

      {/* Detailed Language Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
        {languages.map((lang) => {
          const dotColor =
            LANGUAGE_PALETTE[lang.language]?.split(" ")[0] || "bg-neutral-400";

          return (
            <div
              key={lang.language}
              className="p-3 rounded-xl bg-[#141414] border border-[#222222] hover:border-neutral-700 transition-colors flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor} shrink-0`} />
                <span className="text-xs font-semibold text-white truncate">
                  {lang.language}
                </span>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-mono text-neutral-300 font-bold">
                  {lang.percentage}%
                </span>
                <span className="text-[10px] font-mono text-neutral-500 block">
                  {formatBytes(lang.bytes)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LanguageChart;
