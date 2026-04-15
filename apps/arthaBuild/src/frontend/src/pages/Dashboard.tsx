import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Plus, History, Shield, Clock, Zap, Users } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { listChats, getAccessToken } from "../services/api";
import type { ChatSession } from "../services/api";
import { encodeId } from "../lib/crypto";

interface AdminStats {
  total_users: number;
  total_chats: number;
  scripts_deployed: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [recentChats, setRecentChats] = useState<ChatSession[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatError, setChatError] = useState(false);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    setLoadingChats(true);
    listChats()
      .then((chats) => {
        setRecentChats(chats.slice(0, 5));
        setLoadingChats(false);
      })
      .catch(() => {
        setChatError(true);
        setLoadingChats(false);
      });
  }, []);

  useEffect(() => {
    if (user?.role !== "admin") return;
    const token = getAccessToken();
    if (!token) return;
    fetch("/api/admin/stats", {
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setAdminStats(data))
      .catch(() => {});
  }, [user?.role]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-[#0f1620] text-white p-4 sm:p-6 md:p-10">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Welcome back, {user?.name ?? "there"}
        </h1>
        <p className="text-slate-400 mt-1">
          Here&apos;s what&apos;s happening with your ArthaBuild workspace.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={() => nav("/chat/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
        <button
          onClick={() => nav("/history")}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
        >
          <History className="w-4 h-4" />
          History
        </button>
        {user?.role === "admin" && (
          <button
            onClick={() => nav("/admin")}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-700 hover:bg-amber-600 rounded-lg text-sm font-medium transition-colors"
          >
            <Shield className="w-4 h-4" />
            Admin Panel
          </button>
        )}
      </div>

      {/* Stats Row */}
      <div className={`grid grid-cols-1 gap-4 mb-8 ${user?.role === "admin" ? "sm:grid-cols-3" : "sm:grid-cols-1 max-w-xs"}`}>
        <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-indigo-600/20 rounded-lg">
            <MessageSquare className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="text-2xl font-bold">{recentChats.length}</div>
            <div className="text-sm text-slate-400">Recent Chats</div>
          </div>
        </div>
        {user?.role === "admin" && (
          <>
            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="p-2.5 bg-green-600/20 rounded-lg">
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{adminStats?.scripts_deployed ?? "—"}</div>
                <div className="text-sm text-slate-400">Scripts Deployed</div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-4">
              <div className="p-2.5 bg-purple-600/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{adminStats?.total_users ?? "—"}</div>
                <div className="text-sm text-slate-400">Team Members</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent Chats */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-slate-200">Recent Conversations</h2>

        {loadingChats && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        )}

        {!loadingChats && chatError && (
          <div className="text-slate-400 text-sm py-4">
            Could not load recent chats.
          </div>
        )}

        {!loadingChats && !chatError && recentChats.length === 0 && (
          <div className="text-slate-400 text-sm py-4">
            No conversations yet.{" "}
            <button
              onClick={() => nav("/chat/new")}
              className="text-indigo-400 hover:underline"
            >
              Start one now
            </button>
          </div>
        )}

        {!loadingChats && !chatError && recentChats.length > 0 && (
          <div className="space-y-2">
            {recentChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => nav(`/chat/${encodeId(String(chat.id))}`)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors text-left"
              >
                <MessageSquare className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="flex-1 text-sm truncate">{chat.title}</span>
                <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  {formatDate(chat.updated_at)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
