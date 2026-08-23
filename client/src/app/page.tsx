import React from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Activity,
  GitPullRequest,
  CheckCircle2,
  Terminal,
  Zap,
  Radio,
  ArrowRight,
  Github,
  Search,
  Cpu,
  Layers,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#0A0A0A] text-[#FAFAFA] selection:bg-white selection:text-black overflow-x-hidden">
      {/* Background Grid & Ambient Glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-white/[0.03] blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-48 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-b from-white/[0.07] to-transparent blur-[90px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0A0A0A]/80 border-b border-[#1F1F1F]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-inner">
              <Radio className="w-5 h-5 text-white animate-pulse" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0A]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              RepoRadar
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10 font-normal">
                v0.1
              </span>
            </span>
          </div>

          {/* Center Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#radar-preview" className="hover:text-white transition-colors">
              Live Radar
            </a>
            <a href="#security" className="hover:text-white transition-colors">
              Security
            </a>
            <a href="#docs" className="hover:text-white transition-colors">
              Documentation
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-sm font-medium text-neutral-300 hover:text-white px-3.5 py-2 rounded-lg transition-colors"
            >
              Sign In
            </button>
            <button
              type="button"
              className="text-sm font-semibold bg-white text-black px-4 py-2 rounded-lg transition-all duration-200 hover:bg-neutral-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.35)] active:scale-[0.98] flex items-center gap-1.5"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* HERO SECTION */}
        <section className="relative pt-20 pb-24 md:pt-32 md:pb-32 px-6 max-w-7xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur-md mb-8 text-xs font-medium text-neutral-300 shadow-sm hover:border-white/20 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>AI-Driven Repository Intelligence</span>
            <span className="w-1 h-1 rounded-full bg-neutral-600" />
            <span className="text-white font-semibold">Module 0 Ready</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.08] text-white">
            Your AI-Powered Radar for{" "}
            <span className="bg-gradient-to-b from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
              Repository Health
            </span>
          </h1>

          {/* Tagline */}
          <p className="mt-7 text-lg sm:text-xl md:text-2xl text-neutral-400 max-w-3xl mx-auto font-normal leading-relaxed">
            Your AI-powered radar for repository health, security, and code quality. Continuous
            scanning, automated vulnerability triage, and developer-first health metrics.
          </p>

          {/* Hero CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              type="button"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-black font-semibold text-base transition-all duration-300 hover:bg-neutral-100 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] active:scale-[0.98] flex items-center justify-center gap-2 group cursor-pointer"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              type="button"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] hover:border-neutral-500 text-neutral-200 font-medium text-base transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <Github className="w-4 h-4" />
              Connect GitHub Repository
            </button>
          </div>

          {/* Trust proof */}
          <div className="mt-12 flex items-center justify-center gap-6 text-xs text-neutral-500 font-mono">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Zero Configuration</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Deep Static & AST Analysis</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Radar</span>
            </div>
          </div>

          {/* Interactive Radar Visual Mockup */}
          <div id="radar-preview" className="mt-16 relative max-w-5xl mx-auto">
            {/* Outer Glow frame */}
            <div className="relative rounded-2xl border border-white/10 bg-[#111111]/90 backdrop-blur-2xl shadow-2xl p-4 md:p-6 overflow-hidden">
              {/* Window Bar */}
              <div className="flex items-center justify-between border-b border-[#222222] pb-4 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#262626]" />
                  <div className="w-3 h-3 rounded-full bg-[#262626]" />
                  <div className="w-3 h-3 rounded-full bg-[#262626]" />
                  <span className="ml-3 text-xs font-mono text-neutral-500">reporadar-core // scan-engine v1.0.0</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  RADAR ACTIVE
                </div>
              </div>

              {/* Grid of live stats inside dashboard preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                {/* Metric 1 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span className="font-mono uppercase">Health Score</span>
                    <Activity className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">98.4<span className="text-xs text-neutral-500 font-normal">/100</span></div>
                  <div className="mt-2 text-xs text-neutral-400 flex items-center gap-1.5">
                    <span className="text-emerald-400 font-medium">↑ +4.2%</span> from last commit scan
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span className="font-mono uppercase">Vulnerability Radar</span>
                    <ShieldAlert className="w-4 h-4 text-neutral-300" />
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">0 <span className="text-xs text-neutral-400 font-normal">Critical CVEs</span></div>
                  <div className="mt-2 text-xs text-neutral-400">
                    2 Low Severity triaged automatically
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="p-4 rounded-xl bg-[#161616] border border-[#262626] hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
                    <span className="font-mono uppercase">Code Quality Index</span>
                    <Zap className="w-4 h-4 text-neutral-300" />
                  </div>
                  <div className="text-3xl font-bold text-white font-mono">A+</div>
                  <div className="mt-2 text-xs text-neutral-400">
                    Maintainability & complexity optimal
                  </div>
                </div>
              </div>

              {/* Mock Terminal Output */}
              <div className="mt-5 p-4 rounded-xl bg-[#0C0C0C] border border-[#1F1F1F] font-mono text-xs text-left text-neutral-400 space-y-1.5">
                <div className="flex items-center gap-2 text-neutral-500">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>RepoRadar Diagnostic Stream</span>
                </div>
                <div className="text-neutral-300 flex items-center gap-2">
                  <span className="text-emerald-400">✔</span> [Radar Engine] Connected to repository master branch (SHA: 7a8f90c)
                </div>
                <div className="text-neutral-300 flex items-center gap-2">
                  <span className="text-emerald-400">✔</span> [AST Scanner] Analyzed 142 files in 380ms across TypeScript and Python
                </div>
                <div className="text-neutral-400 flex items-center gap-2">
                  <span className="text-neutral-200">ℹ</span> [AI Synthesis] Generated actionable repository health scorecard
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES GRID */}
        <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-[#1F1F1F]">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-xs uppercase font-mono tracking-widest text-neutral-400 mb-3">
              Comprehensive Radar Modules
            </h2>
            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Everything required to maintain pristine repositories
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldAlert className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Automated Security Audits</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Scan dependencies and code patterns for vulnerabilities, leaked secrets, and known CVEs with automated fixes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">AI Code Health Analysis</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Leverage fine-tuned models to analyze code smell, circular dependencies, technical debt, and architectural bottlenecks.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#1F1F1F] hover:border-neutral-700 transition-all duration-300 group">
              <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Monorepo & Polyrepo Radar</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Unified radar matrix supporting Next.js, Express, Go, Python, and microservice architectures seamlessly.
              </p>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className="py-20 px-6 max-w-7xl mx-auto">
          <div className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-[#161616] to-[#0D0D0D] p-10 md:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-dot-pattern opacity-30 pointer-events-none" />
            <h2 className="relative text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
              Ready to activate your repository radar?
            </h2>
            <p className="relative mt-4 text-neutral-400 max-w-xl mx-auto text-base sm:text-lg">
              Get comprehensive visibility into code quality, security vulnerabilities, and architectural health today.
            </p>
            <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-black font-semibold text-base transition-all duration-200 hover:bg-neutral-200 hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
              >
                Launch RepoRadar
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1F1F1F] py-12 px-6 text-neutral-500 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-white" />
            <span className="font-bold text-white">RepoRadar</span>
            <span>— Module 0 Foundation</span>
          </div>
          <p>© {new Date().getFullYear()} RepoRadar. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
