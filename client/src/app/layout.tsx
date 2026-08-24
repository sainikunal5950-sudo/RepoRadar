import type { Metadata } from "next";
import "./globals.css";
import SessionProvider from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "RepoRadar — AI-Powered Repository Health, Security & Quality Radar",
  description:
    "RepoRadar is your AI-powered radar for GitHub and GitLab repository health, security vulnerabilities, automated audits, and code quality insights.",
  keywords: [
    "RepoRadar",
    "Repository Health",
    "Code Quality",
    "Security Scanner",
    "Developer Tools",
    "AI Code Analysis",
  ],
  authors: [{ name: "RepoRadar Team" }],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-white selection:text-black">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
