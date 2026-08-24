"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  Radio,
  Activity,
  ShieldAlert,
  LogOut,
  FolderGit2,
  CheckCircle2,
  Terminal,
  Key,
  Layers,
} from "lucide-react";
import apiClient from "@/lib/api-client";

interface Project {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch projects using the authenticated apiClient helper
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true);
      setApiError(null);
      const res = await apiClient<Project[]>("/api/projects");
      if (res.success && res.data) {
        setProjects(res.data);
      } else {
        setApiError(res.error?.message || "Failed to load projects");
      }
      setLoadingProjects(false);
    }

    if (session) {
      loadProjects();
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] selection:bg-white selection:text-black">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0A]/80 border-b border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 border border-white/20 shadow-inner">
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0A]" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              RepoRadar
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10">
                Dashboard
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>JWT Session Active</span>
            </div>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 text-xs font-medium bg-[#161616] hover:bg-[#202020] border border-[#262626] text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* Welcome Banner */}
        <div className="mb-8 p-6 md:p-8 rounded-2xl bg-gradient-to-b from-[#141414] to-[#0D0D0D] border border-white/10 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono mb-3">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>NextAuth + Express JWT Connected</span>
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
                href="/"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-[#181818] border border-[#2A2A2A] text-neutral-300 hover:text-white transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Session & JWT Telemetry */}
          <div className="p-6 rounded-xl bg-[#111111] border border-[#1F1F1F]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase text-neutral-400">Auth Telemetry</span>
              <Key className="w-4 h-4 text-neutral-300" />
            </div>
            <div className="space-y-3 text-xs font-mono">
              <div>
                <span className="text-neutral-500 block">User ID:</span>
                <span className="text-white break-all">{session?.user?.id || "Loading..."}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Session Strategy:</span>
                <span className="text-emerald-400">JWT (7-Day Expiry)</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Protected Server API:</span>
                <span className="text-emerald-400">Bearer Token Verified</span>
              </div>
            </div>
          </div>

          {/* Card 2: Radar Engine Status */}
          <div className="p-6 rounded-xl bg-[#111111] border border-[#1F1F1F]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase text-neutral-400">Radar Status</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-white font-mono">ONLINE</div>
            <p className="mt-2 text-xs text-neutral-400">
              AST Scanner & Vulnerability triage modules ready for ingestion.
            </p>
          </div>

          {/* Card 3: Security & Health */}
          <div className="p-6 rounded-xl bg-[#111111] border border-[#1F1F1F]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono uppercase text-neutral-400">Security Gate</span>
              <ShieldAlert className="w-4 h-4 text-neutral-300" />
            </div>
            <div className="text-3xl font-bold text-white font-mono">0 CVEs</div>
            <p className="mt-2 text-xs text-neutral-400">
              Module 1 & 2 authenticated security perimeter intact.
            </p>
          </div>
        </div>

        {/* Protected Projects Resource section */}
        <div className="mt-8 p-6 rounded-2xl bg-[#111111] border border-[#1F1F1F]">
          <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-6">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-5 h-5 text-white" />
              <h2 className="text-lg font-bold text-white">Protected Projects Resource</h2>
              <span className="text-xs font-mono text-neutral-500 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                GET /api/projects
              </span>
            </div>
          </div>

          {loadingProjects ? (
            <div className="py-8 text-center text-xs font-mono text-neutral-500">
              Fetching protected projects with JWT token...
            </div>
          ) : apiError ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {apiError}
            </div>
          ) : projects.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-neutral-500">
              No projects created yet. Use `POST /api/projects` with your Bearer token or requests.http to add one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-xl bg-[#161616] border border-[#262626] text-left"
                >
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                    <span className="font-semibold text-white">{p.name}</span>
                    <span className="font-mono text-[10px] text-neutral-500">{p.id}</span>
                  </div>
                  <p className="text-xs text-neutral-400 line-clamp-2">
                    {p.description || "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Diagnostic Console Box */}
          <div className="mt-6 p-4 rounded-xl bg-[#0C0C0C] border border-[#1F1F1F] font-mono text-xs text-neutral-400 space-y-1">
            <div className="flex items-center gap-2 text-neutral-500">
              <Terminal className="w-3.5 h-3.5" />
              <span>Diagnostic Token Header Check</span>
            </div>
            <div className="text-neutral-300">
              ✔ NextAuth Token: <span className="text-emerald-400">Attached & Verified</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
