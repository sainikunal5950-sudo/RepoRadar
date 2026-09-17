"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Radio,
  LayoutDashboard,
  FolderGit2,
  LogOut,
  Github,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import AIUsageIndicator from "@/components/ui/AIUsageIndicator";


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  const navItems = [
    {
      label: "Overview",
      href: "/dashboard",
      icon: LayoutDashboard,
      active: pathname === "/dashboard",
    },
    {
      label: "Repositories",
      href: "/dashboard/repositories",
      icon: FolderGit2,
      active: pathname.startsWith("/dashboard/repositories"),
    },
  ];

  const hasGithub = Boolean(session?.user?.github_username || session?.user?.github_id);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] selection:bg-white selection:text-black flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0A]/85 border-b border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-inner group-hover:border-white/40 transition-colors">
                <Radio className="w-4 h-4 text-white animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0A]" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                RepoRadar
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10 font-normal">
                  v0.1
                </span>
              </span>
            </Link>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                      item.active
                        ? "bg-white/10 text-white border border-white/15 shadow-sm"
                        : "text-neutral-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right User Bar */}
          <div className="flex items-center gap-3">
            <AIUsageIndicator />

            {hasGithub ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-neutral-300">
                <Github className="w-3.5 h-3.5 text-white" />
                <span>@{session?.user?.github_username}</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>JWT Active</span>
              </div>
            )}


            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1.5 text-xs font-medium bg-[#161616] hover:bg-[#202020] border border-[#262626] hover:border-neutral-600 text-neutral-300 hover:text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Subnav */}
      <div className="md:hidden border-b border-[#1F1F1F] bg-[#0E0E0E] px-6 py-2 flex items-center gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                item.active
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</div>
    </div>
  );
}
