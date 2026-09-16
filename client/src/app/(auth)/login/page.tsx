"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Radio, ArrowRight, Lock, Mail, AlertCircle, CheckCircle2, Loader2, Github } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const authError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    authError ? "Failed to authenticate with GitHub. Please try again." : null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setError(result?.error || "Invalid email or password");
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred during sign in. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGithubSignIn = () => {
    setError(null);
    setIsGithubLoading(true);
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden selection:bg-white selection:text-black">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-white/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-white/15 to-white/5 border border-white/20 shadow-inner group-hover:border-white/40 transition-colors">
            <Radio className="w-5 h-5 text-white animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0A0A0A]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            RepoRadar
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/10 text-white/70 border border-white/10 font-normal">
              v0.1
            </span>
          </span>
        </Link>

        <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
          Sign in to your radar
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          Or{" "}
          <Link
            href="/register"
            className="font-medium text-white hover:underline underline-offset-4 transition-all"
          >
            create a new developer account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-[#111111] py-8 px-6 shadow-2xl rounded-2xl border border-[#222222] sm:px-10 backdrop-blur-xl">
          {/* Success message if redirected after registration */}
          {registered && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Account created successfully! Please sign in with your credentials.</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-400 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* GitHub OAuth Button */}
          <div>
            <button
              type="button"
              onClick={handleGithubSignIn}
              disabled={isGithubLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-black font-semibold text-sm hover:bg-neutral-200 transition-all duration-200 shadow-md hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isGithubLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to GitHub...</span>
                </>
              ) : (
                <>
                  <Github className="w-4 h-4" />
                  <span>Continue with GitHub</span>
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#262626]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase font-mono">
              <span className="bg-[#111111] px-3 text-neutral-500">Or continue with email</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@reporadar.io"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-[#0C0C0C] border border-[#262626] rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-sans"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs font-mono uppercase tracking-wider text-neutral-400"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full pl-10 pr-3.5 py-2.5 bg-[#0C0C0C] border border-[#262626] rounded-xl text-white placeholder-neutral-600 text-sm focus:outline-none focus:border-white focus:ring-1 focus:ring-white transition-all font-sans"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isGithubLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#181818] hover:bg-[#222222] border border-[#333333] hover:border-neutral-500 text-white font-medium text-sm transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In with Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        <div className="mt-8 text-center text-xs text-neutral-500 font-mono">
          <span>Protected by RepoRadar JWT Token & AES-256 Encryption</span>
        </div>
      </div>
    </div>
  );
}
