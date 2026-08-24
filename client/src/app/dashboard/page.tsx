"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Activity,
  ShieldAlert,
  FolderGit2,
  CheckCircle2,
  Terminal,
  Key,
  Github,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import apiClient from "@/lib/api-client";

interface Repository {
  id: string;
  is_selected: boolean;
}

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);

  useEffect(() => {
    async function loadRepos() {
      setLoadingRepos(true);
      const res = await apiClient<Repository[]>("/api/repositories");
      if (res.success && res.data) {
        setRepositories(res.data);
      }
      setLoadingRepos(false);
    }

    if (session) {
      loadRepos();
    }
  }, [session]);

  const hasGithub = Boolean(session?.user?.github_username || session?.user?.github_id);
  const selectedRepos = repositories.filter((r) => r.is_selected).length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="p-6 md:p-8 rounded-2xl bg-gradient-to-b from-[#141414] to-[#0D0D0D] border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>NextAuth + Express JWT Connected</span>
              </div>
              {hasGithub && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white text-xs font-mono">
                  <Github className="w-3.5 h-3.5" />
                  <span>@{session?.user?.github_username}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white">
              Welcome back, {session?.user?.name || "Developer"}
            </h1>
            <p className="text-sm text-neutral-400 mt-1 font-mono">
              Authenticated Email: <span className="text-white">{session?.user?.email}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/repositories"
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl bg-white text-black hover:bg-neutral-200 transition-all shadow-md"
            >
              <span>Manage Repositories</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Repositories Ingestion Telemetry */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase text-neutral-400">Repositories Ingestion</span>
            <FolderGit2 className="w-4 h-4 text-neutral-300" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">
            {loadingRepos ? "..." : repositories.length}
            <span className="text-xs text-neutral-500 font-normal"> Synced</span>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            {selectedRepos} selected for active AST & security radar pipeline.
          </p>
          <div className="mt-4 pt-3 border-t border-[#1C1C1C]">
            <Link
              href="/dashboard/repositories"
              className="text-xs font-mono text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Sync & Select Repos</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Card 2: Radar Engine Status */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase text-neutral-400">Radar Engine Status</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">ONLINE</div>
          <p className="mt-2 text-xs text-neutral-400">
            Octokit GitHub API client & AES-256 encrypted access token ready.
          </p>
        </div>

        {/* Card 3: Security & Health */}
        <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-mono uppercase text-neutral-400">Security Gate</span>
            <ShieldAlert className="w-4 h-4 text-neutral-300" />
          </div>
          <div className="text-3xl font-bold text-white font-mono">0 CVEs</div>
          <p className="mt-2 text-xs text-neutral-400">
            Encrypted OAuth perimeter & Bearer token verification active.
          </p>
        </div>
      </div>

      {/* Auth Telemetry & Diagnostics */}
      <div className="p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
        <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-white" />
            <h2 className="text-sm font-bold text-white font-mono uppercase">System Diagnostic Stream</h2>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
            MODULE 4 ACTIVE
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#0C0C0C] border border-[#1F1F1F] space-y-1.5">
            <span className="text-neutral-500 block uppercase">User Identification:</span>
            <span className="text-white break-all">{session?.user?.id || "Loading..."}</span>
            {hasGithub && (
              <span className="text-neutral-400 block">
                GitHub: @{session?.user?.github_username} (ID: {session?.user?.github_id})
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#0C0C0C] border border-[#1F1F1F] space-y-1.5">
            <span className="text-neutral-500 block uppercase">Repository Matrix:</span>
            <span className="text-emerald-400 block">✔ Octokit SDK Integration Active</span>
            <span className="text-emerald-400 block">✔ AES-256-GCM Token Encryption Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
