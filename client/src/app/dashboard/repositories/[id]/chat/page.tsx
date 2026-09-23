"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Sparkles,
  Loader2,
  AlertCircle,
  FolderGit2,
  Search,
  Activity,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import ChatMessage, { ChatChunkInfo } from "@/components/ui/ChatMessage";
import ChatInput from "@/components/ui/ChatInput";
import ConversationSidebar, { ConversationItem } from "@/components/ui/ConversationSidebar";
import ChatEmptyState from "@/components/ui/ChatEmptyState";

interface RepositoryMeta {
  id: string;
  github_repo_name: string;
  github_repo_fullname: string;
  indexing_status: string;
  total_chunks_indexed: number;
}

interface MessageData {
  id?: string;
  role: "user" | "assistant";
  content: string;
  citedFiles?: string[];
  retrievedChunks?: ChatChunkInfo[];
  tokensUsed?: number | null;
  createdAt?: string | Date;
}

export default function RepositoryChatPage() {
  const params = useParams();
  const repoId = params?.id as string;

  const [repository, setRepository] = useState<RepositoryMeta | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);

  const [isLoadingRepo, setIsLoadingRepo] = useState(true);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isSending]);

  // Load repository metadata & indexing status
  const loadRepository = useCallback(async () => {
    if (!repoId) return;
    setIsLoadingRepo(true);
    const res = await apiClient<RepositoryMeta>(`/api/repositories/${repoId}/metrics`);
    if (res.success && res.data) {
      setRepository({
        id: res.data.id,
        github_repo_name: res.data.github_repo_name,
        github_repo_fullname: res.data.github_repo_fullname,
        indexing_status: res.data.indexing_status || "not_started",
        total_chunks_indexed: res.data.total_chunks_indexed || 0,
      });
    }
    setIsLoadingRepo(false);
  }, [repoId]);

  // Load conversation history for repository
  const loadConversations = useCallback(async () => {
    if (!repoId) return;
    setIsLoadingConversations(true);
    const res = await apiClient<ConversationItem[]>(
      `/api/repositories/${repoId}/chat/conversations`
    );
    if (res.success && res.data) {
      setConversations(res.data);
    }
    setIsLoadingConversations(false);
  }, [repoId]);

  // Load messages for a specific conversation
  const loadConversationMessages = useCallback(async (convId: string) => {
    setIsLoadingMessages(true);
    setErrorMessage(null);
    const res = await apiClient<{
      conversation: { id: string; title: string | null };
      messages: MessageData[];
    }>(`/api/chat/conversations/${convId}/messages`);

    if (res.success && res.data) {
      setMessages(res.data.messages || []);
      setActiveConversationId(convId);
    } else {
      setErrorMessage(res.error?.message || "Failed to load conversation messages");
    }
    setIsLoadingMessages(false);
  }, []);

  useEffect(() => {
    loadRepository();
    loadConversations();
  }, [loadRepository, loadConversations]);

  // Trigger indexing if repository unindexed
  const handleStartIndexing = async () => {
    if (!repoId) return;
    setIsIndexing(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient<{ message: string }>(
      `/api/repositories/${repoId}/index-code`,
      { method: "POST" }
    );

    if (res.success) {
      setSuccessMessage("Codebase indexing started in background. Polling status...");

      // Poll status every 2 seconds
      const pollInterval = setInterval(async () => {
        const statusRes = await apiClient<{
          indexing_status: string;
          total_chunks_indexed: number;
        }>(`/api/repositories/${repoId}/index-status`);

        if (statusRes.success && statusRes.data) {
          const status = statusRes.data.indexing_status;
          if (status === "completed" || status === "indexed") {
            clearInterval(pollInterval);
            setIsIndexing(false);
            setSuccessMessage(
              `Codebase successfully indexed (${statusRes.data.total_chunks_indexed} semantic code chunks)!`
            );
            if (repository) {
              setRepository({
                ...repository,
                indexing_status: "completed",
                total_chunks_indexed: statusRes.data.total_chunks_indexed,
              });
            }
          } else if (status === "failed") {
            clearInterval(pollInterval);
            setIsIndexing(false);
            setErrorMessage("Codebase indexing failed. Please try again.");
          }
        }
      }, 2000);
    } else {
      setIsIndexing(false);
      setErrorMessage(res.error?.message || "Failed to start indexing");
    }
  };

  // Send message handler
  const handleSendMessage = async (text: string) => {
    if (!repoId || !text.trim() || isSending) return;

    setErrorMessage(null);

    // Optimistically append user message
    const tempUserMsg: MessageData = {
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsSending(true);

    const res = await apiClient<{
      conversationId: string;
      answer: string;
      citedFiles: string[];
      retrievedChunks: ChatChunkInfo[];
      tokensUsed?: number;
      messageId: string;
    }>(`/api/repositories/${repoId}/chat`, {
      method: "POST",
      body: JSON.stringify({
        question: text.trim(),
        conversationId: activeConversationId || undefined,
      }),
    });

    if (res.success && res.data) {
      const assistantMsg: MessageData = {
        id: res.data.messageId,
        role: "assistant",
        content: res.data.answer,
        citedFiles: res.data.citedFiles,
        retrievedChunks: res.data.retrievedChunks,
        tokensUsed: res.data.tokensUsed,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If new conversation was created, update active ID and list
      if (!activeConversationId) {
        setActiveConversationId(res.data.conversationId);
        loadConversations();
      }
    } else {
      setErrorMessage(
        res.error?.message || "Failed to generate AI response. Please try again."
      );
    }

    setIsSending(false);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setErrorMessage(null);
  };

  const handleDeleteConversation = async (convId: string) => {
    const res = await apiClient<{ message: string }>(
      `/api/chat/conversations/${convId}`,
      { method: "DELETE" }
    );

    if (res.success) {
      if (activeConversationId === convId) {
        handleNewConversation();
      }
      loadConversations();
    } else {
      setErrorMessage(res.error?.message || "Failed to delete conversation");
    }
  };

  const isIndexed =
    repository?.indexing_status === "completed" ||
    repository?.indexing_status === "indexed";

  if (isLoadingRepo) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-neutral-400 mb-3" />
        <p className="text-xs font-mono text-neutral-400">Loading AI chat workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-100px)]">
      {/* Navigation Breadcrumbs & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="hover:text-white transition-colors"
          >
            {repository?.github_repo_name || "Repository"}
          </Link>
          <span>/</span>
          <span className="text-purple-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Chat Assistant</span>
          </span>
        </div>

        {/* Quick Nav Header Links */}
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/repositories/${repoId}/search`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#222] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-purple-400" />
            <span>Code Search</span>
          </Link>

          <Link
            href={`/dashboard/repositories/${repoId}/code`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#222] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
          >
            <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Code Tree</span>
          </Link>

          <Link
            href={`/dashboard/repositories/${repoId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141414] hover:bg-[#1A1A1A] border border-[#222] text-xs font-mono text-neutral-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Overview</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono flex items-center gap-2 shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono flex items-center gap-2 shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Chat Workspace Grid (Sidebar + Chat Area) */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0 overflow-hidden">
        {/* Left Sidebar: Conversations History */}
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={loadConversationMessages}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          isLoading={isLoadingConversations}
        />

        {/* Right Main Panel: Messages + Input */}
        <div className="flex-1 flex flex-col bg-[#0D0D0D] border border-[#1F1F1F] rounded-2xl overflow-hidden min-h-0">
          {/* Top Panel Header */}
          <div className="p-3.5 px-5 bg-[#111111] border-b border-[#1C1C1C] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-purple-950/40 border border-purple-800/40 flex items-center justify-center text-purple-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">
                  {activeConversationId
                    ? conversations.find((c) => c.id === activeConversationId)?.title ||
                      "Conversation"
                    : "New Conversation"}
                </p>
                <p className="text-[10px] font-mono text-neutral-500">
                  Grounding: Vector Code Embeddings (RAG)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono ${
                  isIndexed
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                    : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isIndexed ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span>{isIndexed ? "Code Indexed" : "Not Indexed"}</span>
              </div>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
            {isLoadingMessages ? (
              <div className="py-24 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400 mb-2" />
                <p className="text-xs font-mono text-neutral-400">
                  Loading message history...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <ChatEmptyState
                repoName={repository?.github_repo_name}
                isIndexed={isIndexed}
                isIndexing={isIndexing}
                onStartIndexing={handleStartIndexing}
                onSelectPrompt={handleSendMessage}
              />
            ) : (
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((msg, idx) => (
                  <ChatMessage
                    key={msg.id || `msg-${idx}`}
                    role={msg.role}
                    content={msg.content}
                    citedFiles={msg.citedFiles}
                    retrievedChunks={msg.retrievedChunks}
                    repoId={repoId}
                    tokensUsed={msg.tokensUsed}
                    createdAt={msg.createdAt}
                  />
                ))}

                {/* Thinking / Streaming Indicator */}
                {isSending && (
                  <div className="flex items-start gap-3 my-4">
                    <div className="w-8 h-8 rounded-xl bg-[#141414] border border-[#2A2A2A] flex items-center justify-center shrink-0 text-purple-400">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="rounded-2xl p-4 bg-[#111111] border border-[#1F1F1F] text-neutral-300 rounded-tl-sm shadow-lg flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400 shrink-0" />
                      <div className="text-xs font-mono text-neutral-400 space-y-0.5">
                        <p className="text-white font-medium">Analyzing repository context...</p>
                        <p className="text-[11px] text-neutral-500">
                          Retrieving relevant code chunks & generating response
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Bottom Chat Input */}
          <div className="p-4 bg-[#0A0A0A] border-t border-[#1C1C1C] shrink-0">
            <div className="max-w-4xl mx-auto">
              <ChatInput
                onSendMessage={handleSendMessage}
                isLoading={isSending}
                disabled={!isIndexed}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
