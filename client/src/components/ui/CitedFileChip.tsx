import React from "react";
import Link from "next/link";
import { FileCode, ExternalLink, Hash } from "lucide-react";

export interface CitedFileChipProps {
  filePath: string;
  startLine?: number;
  endLine?: number;
  score?: number;
  repoId: string;
}

export default function CitedFileChip({
  filePath,
  startLine,
  endLine,
  score,
  repoId,
}: CitedFileChipProps) {
  const lineQuery = startLine ? `&startLine=${startLine}` : "";
  const href = `/dashboard/repositories/${repoId}/code?file=${encodeURIComponent(filePath)}${lineQuery}`;

  const fileName = filePath.split("/").pop() || filePath;
  const dirPath = filePath.includes("/")
    ? filePath.substring(0, filePath.lastIndexOf("/"))
    : "";

  const lineRangeText =
    startLine && endLine && startLine !== endLine
      ? `L${startLine}-${endLine}`
      : startLine
      ? `L${startLine}`
      : null;

  const scorePercentage =
    score !== undefined ? `${Math.round(score * 100)}%` : null;

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#141414] hover:bg-[#1C1C1C] border border-[#262626] hover:border-purple-500/50 transition-all duration-150 group text-xs font-mono text-neutral-300 hover:text-white max-w-full truncate"
      title={`Open ${filePath}${lineRangeText ? ` at ${lineRangeText}` : ""}`}
    >
      <FileCode className="w-3.5 h-3.5 text-purple-400 shrink-0 group-hover:scale-110 transition-transform" />

      <div className="flex items-center gap-1 truncate">
        {dirPath && (
          <span className="text-neutral-500 truncate max-w-[120px]">
            {dirPath}/
          </span>
        )}
        <span className="font-semibold text-neutral-200 group-hover:text-white truncate">
          {fileName}
        </span>
      </div>

      {lineRangeText && (
        <span className="px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-800/40 text-[10px] text-purple-300 shrink-0 flex items-center gap-0.5">
          <Hash className="w-2.5 h-2.5" />
          <span>{lineRangeText}</span>
        </span>
      )}

      {scorePercentage && (
        <span className="text-[10px] text-neutral-500 shrink-0">
          ({scorePercentage})
        </span>
      )}

      <ExternalLink className="w-3 h-3 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
    </Link>
  );
}
