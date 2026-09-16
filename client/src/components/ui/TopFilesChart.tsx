"use client";

import React from "react";
import Link from "next/link";
import { FileCode, ExternalLink, ShieldCheck } from "lucide-react";

export interface ProblematicFile {
  file_path: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface Props {
  repositoryId: string;
  files: ProblematicFile[];
  isLoading?: boolean;
}

export default function TopFilesChart({
  repositoryId,
  files,
  isLoading,
}: Props) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-3 animate-pulse">
        <div className="h-5 w-48 bg-neutral-800 rounded" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-neutral-900 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] h-72 flex flex-col items-center justify-center text-center space-y-2">
        <ShieldCheck className="w-8 h-8 text-emerald-400 mb-1" />
        <h4 className="text-sm font-bold font-mono text-white">
          No Problematic Files
        </h4>
        <p className="text-xs font-mono text-neutral-500 max-w-xs">
          All files in this repository pass static quality and security rules.
        </p>
      </div>
    );
  }

  const maxTotal = Math.max(...files.map((f) => f.total), 1);

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F] space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-white" />
          <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
            Top Problematic Files
          </h3>
        </div>
        <span className="text-xs font-mono text-neutral-400">
          Ranked by Issue Count
        </span>
      </div>

      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {files.map((file, idx) => {
          const widthPercent = Math.min(100, Math.max(10, (file.total / maxTotal) * 100));

          return (
            <Link
              key={file.file_path}
              href={`/dashboard/repositories/${repositoryId}/code`}
              className="group block p-2.5 rounded-xl bg-[#151515] hover:bg-[#1C1C1C] border border-[#222222] hover:border-neutral-600 transition-all text-xs font-mono"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-neutral-500 font-bold w-4 text-right shrink-0">
                    {idx + 1}.
                  </span>
                  <span className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">
                    {file.file_path}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 font-bold border border-neutral-700">
                    {file.total} issues
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-white transition-colors" />
                </div>
              </div>

              {/* Progress Bar with stacked severity breakdown */}
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden flex">
                {file.critical > 0 && (
                  <div
                    style={{ width: `${(file.critical / file.total) * 100}%` }}
                    className="bg-red-500 h-full"
                    title={`Critical: ${file.critical}`}
                  />
                )}
                {file.high > 0 && (
                  <div
                    style={{ width: `${(file.high / file.total) * 100}%` }}
                    className="bg-orange-500 h-full"
                    title={`High: ${file.high}`}
                  />
                )}
                {file.medium > 0 && (
                  <div
                    style={{ width: `${(file.medium / file.total) * 100}%` }}
                    className="bg-yellow-500 h-full"
                    title={`Medium: ${file.medium}`}
                  />
                )}
                {file.low > 0 && (
                  <div
                    style={{ width: `${(file.low / file.total) * 100}%` }}
                    className="bg-neutral-500 h-full"
                    title={`Low: ${file.low}`}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
