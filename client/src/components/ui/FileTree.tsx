"use client";

import React, { useState } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  Check,
} from "lucide-react";

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  file_id?: string;
  file_type?: string;
  language?: string | null;
  children?: TreeNode[];
}

interface Props {
  tree: TreeNode[];
  selectedPath: string | null;
  onSelectFile: (node: TreeNode) => void;
}

function getFileIcon(type?: string) {
  switch (type) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
    case "py":
    case "go":
    case "rs":
    case "java":
    case "c":
    case "cpp":
      return <FileCode className="w-4 h-4 text-blue-400 shrink-0" />;
    case "json":
      return <FileJson className="w-4 h-4 text-yellow-400 shrink-0" />;
    case "md":
    case "txt":
      return <FileText className="w-4 h-4 text-neutral-400 shrink-0" />;
    default:
      return <File className="w-4 h-4 text-neutral-400 shrink-0" />;
  }
}

interface TreeItemProps {
  node: TreeNode;
  selectedPath: string | null;
  onSelectFile: (node: TreeNode) => void;
  level: number;
}

function TreeItem({ node, selectedPath, onSelectFile, level }: TreeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 1); // Expand top-level folders by default

  const isFolder = node.type === "folder";
  const isSelected = selectedPath === node.path;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelectFile(node);
    }
  };

  return (
    <div className="select-none">
      <div
        onClick={handleClick}
        style={{ paddingLeft: `${level * 14 + 8}px` }}
        className={`flex items-center gap-2 py-1.5 pr-3 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
          isSelected
            ? "bg-white/15 text-white font-bold shadow-sm"
            : "text-neutral-400 hover:text-white hover:bg-white/5"
        }`}
      >
        {isFolder ? (
          <>
            <span className="w-3.5 h-3.5 flex items-center justify-center text-neutral-500">
              {isOpen ? (
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              )}
            </span>
            {isOpen ? (
              <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-400/80 shrink-0" />
            )}
            <span className="truncate">{node.name}</span>
          </>
        ) : (
          <>
            <span className="w-3.5 h-3.5" />
            {getFileIcon(node.file_type)}
            <span className="truncate">{node.name}</span>
          </>
        )}
      </div>

      {isFolder && isOpen && node.children && (
        <div className="border-l border-white/5 ml-3">
          {node.children.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ tree, selectedPath, onSelectFile }: Props) {
  const [search, setSearch] = useState("");

  // Flatten and filter for quick search
  const filterNodes = (nodes: TreeNode[], term: string): TreeNode[] => {
    if (!term.trim()) return nodes;
    const lower = term.toLowerCase();

    return nodes
      .map((node) => {
        if (node.type === "file") {
          return node.name.toLowerCase().includes(lower) ||
            node.path.toLowerCase().includes(lower)
            ? node
            : null;
        }
        const filteredChildren = node.children
          ? filterNodes(node.children, term)
          : [];
        if (
          filteredChildren.length > 0 ||
          node.name.toLowerCase().includes(lower)
        ) {
          return { ...node, children: filteredChildren };
        }
        return null;
      })
      .filter((n): n is TreeNode => n !== null);
  };

  const displayedTree = filterNodes(tree, search);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search Filter */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
          <Search className="w-3.5 h-3.5" />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter files..."
          className="w-full pl-9 pr-3 py-1.5 bg-[#0C0C0C] border border-[#262626] rounded-xl text-white placeholder-neutral-600 text-xs font-mono focus:outline-none focus:border-white transition-all"
        />
      </div>

      {/* Tree Node Viewport */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 custom-scrollbar">
        {displayedTree.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-neutral-500">
            {search ? "No matching files" : "No files indexed yet"}
          </div>
        ) : (
          displayedTree.map((node) => (
            <TreeItem
              key={node.path}
              node={node}
              selectedPath={selectedPath}
              onSelectFile={onSelectFile}
              level={0}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default FileTree;
