import React from "react";

const createIcon = (name: string) => {
  const Icon = (props: any) => <span data-testid={`icon-${name}`} {...props} />;
  Icon.displayName = name;
  return Icon;
};

// Explicit exports for all icons used across client components
export const Folder = createIcon("Folder");
export const FolderOpen = createIcon("FolderOpen");
export const FileCode = createIcon("FileCode");
export const FileCode2 = createIcon("FileCode2");
export const FileText = createIcon("FileText");
export const FileJson = createIcon("FileJson");
export const File = createIcon("File");
export const ChevronRight = createIcon("ChevronRight");
export const ChevronDown = createIcon("ChevronDown");
export const Search = createIcon("Search");
export const Check = createIcon("Check");
export const Copy = createIcon("Copy");
export const AlertCircle = createIcon("AlertCircle");
export const AlertTriangle = createIcon("AlertTriangle");
export const Loader2 = createIcon("Loader2");
export const ArrowLeft = createIcon("ArrowLeft");
export const ArrowRight = createIcon("ArrowRight");
export const FolderGit2 = createIcon("FolderGit2");
export const RefreshCw = createIcon("RefreshCw");
export const CheckCircle = createIcon("CheckCircle");
export const CheckCircle2 = createIcon("CheckCircle2");
export const FolderTree = createIcon("FolderTree");
export const ExternalLink = createIcon("ExternalLink");
export const Github = createIcon("Github");
export const Layers = createIcon("Layers");
export const GitBranch = createIcon("GitBranch");
export const Calendar = createIcon("Calendar");
export const Sparkles = createIcon("Sparkles");
export const ShieldCheck = createIcon("ShieldCheck");
export const ShieldAlert = createIcon("ShieldAlert");
export const Info = createIcon("Info");
export const Bug = createIcon("Bug");
export const Zap = createIcon("Zap");
export const Wrench = createIcon("Wrench");
export const Activity = createIcon("Activity");
export const Clock = createIcon("Clock");
export const Lightbulb = createIcon("Lightbulb");
export const Filter = createIcon("Filter");
export const Code2 = createIcon("Code2");
export const Star = createIcon("Star");
export const GitFork = createIcon("GitFork");
export const GitPullRequest = createIcon("GitPullRequest");
export const PieChart = createIcon("PieChart");
export const BarChart = createIcon("BarChart");
export const BarChart3 = createIcon("BarChart3");
export const TrendingUp = createIcon("TrendingUp");
export const Plus = createIcon("Plus");

// Export a fallback proxy for any other icons
const icons = new Proxy(
  {},
  {
    get: (_, prop: string) => createIcon(prop),
  }
);

export default icons;
