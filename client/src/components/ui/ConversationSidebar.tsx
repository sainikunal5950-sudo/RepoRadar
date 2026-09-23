import React, { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  Clock,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";

export interface ConversationItem {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    messages: number;
  };
}

export interface ConversationSidebarProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  isLoading: boolean;
}

export default function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isLoading,
}: ConversationSidebarProps) {
  const [filterText, setFilterText] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = conversations.filter((c) => {
    const title = c.title || "Untitled Conversation";
    return title.toLowerCase().includes(filterText.toLowerCase());
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm("Delete this conversation and all its messages?")) {
      setDeletingId(id);
      onDeleteConversation(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0D0D0D] border-r border-[#1F1F1F] rounded-2xl overflow-hidden w-full md:w-72 shrink-0">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-[#1A1A1A] space-y-3">
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition-all duration-150 shadow-md cursor-pointer group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>New Conversation</span>
        </button>

        {/* Filter Input */}
        {conversations.length > 3 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter chats..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#141414] border border-[#222222] text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 font-sans"
            />
          </div>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="py-8 text-center text-xs font-mono text-neutral-500 space-y-2">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-purple-400" />
            <p>Loading history...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 px-4 text-center text-neutral-500 space-y-2">
            <MessageSquare className="w-6 h-6 mx-auto opacity-40 text-neutral-400" />
            <p className="text-xs font-mono">
              {filterText ? "No matching conversations" : "No past conversations"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isDeleting = deletingId === conv.id;
            const title = conv.title || "Untitled Conversation";
            const dateStr = new Date(conv.updatedAt || conv.createdAt).toLocaleDateString(
              undefined,
              { month: "short", day: "numeric" }
            );

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? "bg-purple-950/40 border border-purple-800/40 text-white font-medium"
                    : "hover:bg-[#161616] text-neutral-400 hover:text-neutral-200 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate min-w-0">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? "text-purple-400" : "text-neutral-500 group-hover:text-neutral-300"
                    }`}
                  />
                  <div className="truncate">
                    <p className="truncate text-xs">{title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono mt-0.5">
                      <span>{dateStr}</span>
                      {conv._count?.messages !== undefined && (
                        <span>• {conv._count.messages} msgs</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={isDeleting}
                    title="Delete conversation"
                    className="p-1 rounded text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3 h-3 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <ChevronRight
                    className={`w-3 h-3 text-neutral-600 group-hover:text-neutral-400 transition-colors ${
                      isActive ? "opacity-100 text-purple-400" : "opacity-0 group-hover:opacity-100"
                    }`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
