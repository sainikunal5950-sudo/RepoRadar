"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FolderGit2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCode,
  FolderTree,
  ExternalLink,
  Github,
  Layers,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import FileTree, { TreeNode } from "@/components/ui/FileTree";
import FileViewer from "@/components/ui/FileViewer";

interface RepositorySummary {
  id: string;
  github_repo_fullname: string;
  github_repo_url: string;
}

interface TreeResponse {
  tree: TreeNode[];
  total_files: number;
  total_dirs: number;
  updated_at: string | null;
}

interface FileContentResponse {
  id: string;
  file_path: string;
  file_type: string;
  file_size: number;
  language: string | null;
  content: string | null;
  is_binary: boolean;
}

export default function RepositoryCodeExplorerPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repoInfo, setRepoInfo] = useState<RepositorySummary | null>(null);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalDirs, setTotalDirs] = useState(0);
  const [lastIndexedAt, setLastIndexedAt] = useState<string | null>(null);

  // Loading states
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isFetchingCode, setIsFetchingCode] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active file view
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [selectedFileLang, setSelectedFileLang] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<number | undefined>(undefined);
  const [selectedFileIsBinary, setSelectedFileIsBinary] = useState<boolean>(false);

  // Load Tree on Mount
  const loadFileTree = useCallback(async () => {
    if (!repoId) return;
    setIsLoadingTree(true);
    setErrorMessage(null);

    // Fetch repository basic info
    const repoRes = await apiClient<{
      id: string;
      github_repo_fullname: string;
      github_repo_url: string;
    }>(`/api/repositories/${repoId}/metrics`);
    if (repoRes.success && repoRes.data) {
      setRepoInfo(repoRes.data);
    }

    // Fetch tree structure
    const treeRes = await apiClient<TreeResponse>(
      `/api/repositories/${repoId}/files/tree`
    );
    if (treeRes.success && treeRes.data) {
      setTree(treeRes.data.tree || []);
      setTotalFiles(treeRes.data.total_files);
      setTotalDirs(treeRes.data.total_dirs);
      setLastIndexedAt(treeRes.data.updated_at);
    }

    setIsLoadingTree(false);
  }, [repoId]);

  useEffect(() => {
    loadFileTree();
  }, [loadFileTree]);

  // Trigger Code Fetch from GitHub
  const handleFetchCode = async () => {
    if (!repoId) return;
    setIsFetchingCode(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<{
      total_files: number;
      indexed_files: number;
      skipped_files: number;
      total_dirs: number;
      tree: TreeNode[];
    }>(`/api/repositories/${repoId}/fetch-code`, { method: "POST" });

    if (res.success && res.data) {
      setTree(res.data.tree || []);
      setTotalFiles(res.data.indexed_files);
      setTotalDirs(res.data.total_dirs);
      setLastIndexedAt(new Date().toISOString());
      setSuccessMessage(
        `Successfully indexed ${res.data.indexed_files} source files across ${res.data.total_dirs} directories!`
      );
      setTimeout(() => setSuccessMessage(null), 5000);
    } else {
      setErrorMessage(
        res.error?.message ||
          "Failed to fetch repository code. Please ensure your GitHub account is linked."
      );
    }

    setIsFetchingCode(false);
  };

  // Load File Content when a tree item is clicked
  const handleSelectFile = async (node: TreeNode) => {
    if (node.type !== "file") return;

    setSelectedPath(node.path);
    setSelectedFileLang(node.language || "plaintext");
    setSelectedFileSize(node.size);
    setSelectedFileIsBinary(false);

    if (!node.file_id) {
      setSelectedFileContent(null);
      return;
    }

    setIsLoadingFile(true);
    const res = await apiClient<FileContentResponse>(
      `/api/repositories/${repoId}/files/${node.file_id}`
    );

    if (res.success && res.data) {
      setSelectedFileContent(res.data.content);
      setSelectedFileLang(res.data.language);
      setSelectedFileSize(res.data.file_size);
      setSelectedFileIsBinary(res.data.is_binary);
    } else {
      setSelectedFileContent("// Failed to load file content from database");
    }

    setIsLoadingFile(false);
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 shrink-0">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link
          href={`/dashboard/repositories/${repoId}`}
          className="hover:text-white transition-colors"
        >
          {repoInfo?.github_repo_fullname || "Repository"}
        </Link>
        <span>/</span>
        <span className="text-white">Code Explorer</span>
      </div>

      {/* Hero Action Bar */}
      <div className="p-5 rounded-2xl bg-[#111111] border border-[#1F1F1F] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-emerald-400" />
            <h1 className="text-lg font-bold text-white font-mono">
              {repoInfo?.github_repo_fullname || "Repository Source Tree"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-neutral-400 pt-1">
            <span className="text-white font-bold">{totalFiles} Files</span>
            <span className="text-neutral-600">•</span>
            <span>{totalDirs} Directories</span>
            {lastIndexedAt && (
              <>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-500">
                  Indexed: {new Date(lastIndexedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#161616] hover:bg-[#202020] border border-[#2A2A2A] text-neutral-300 hover:text-white text-xs font-mono transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Link>

          <button
            type="button"
            onClick={handleFetchCode}
            disabled={isFetchingCode}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black font-semibold text-xs transition-all hover:bg-neutral-200 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isFetchingCode ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Indexing Code Tree...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{tree.length === 0 ? "Fetch & Index Code" : "Re-index Code"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Split-Pane View */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 min-h-0">
        {/* Left Pane: File Tree Explorer (4 cols on desktop) */}
        <div className="md:col-span-4 lg:col-span-3 p-4 rounded-2xl bg-[#111111] border border-[#1F1F1F] flex flex-col min-h-0 overflow-hidden shadow-inner">
          <div className="flex items-center justify-between border-b border-[#222222] pb-3 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white font-mono uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5 text-neutral-400" />
              <span>File Explorer</span>
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              {totalFiles} items
            </span>
          </div>

          {isLoadingTree ? (
            <div className="py-16 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-neutral-500 mb-2" />
              <p className="text-xs font-mono text-neutral-400">Loading file tree...</p>
            </div>
          ) : tree.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-3">
              <FolderGit2 className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-xs font-mono text-neutral-400">
                Code tree not indexed yet.
              </p>
              <button
                type="button"
                onClick={handleFetchCode}
                disabled={isFetchingCode}
                className="px-3.5 py-1.5 rounded-lg bg-white text-black text-xs font-bold font-mono hover:bg-neutral-200 transition-colors"
              >
                Fetch Code Now
              </button>
            </div>
          ) : (
            <FileTree
              tree={tree}
              selectedPath={selectedPath}
              onSelectFile={handleSelectFile}
            />
          )}
        </div>

        {/* Right Pane: Code Viewer (8 cols on desktop) */}
        <div className="md:col-span-8 lg:col-span-9 min-h-0 overflow-hidden">
          <FileViewer
            filePath={selectedPath}
            content={selectedFileContent}
            language={selectedFileLang}
            fileSize={selectedFileSize}
            isLoading={isLoadingFile}
            isBinary={selectedFileIsBinary}
          />
        </div>
      </div>
    </div>
  );
}
