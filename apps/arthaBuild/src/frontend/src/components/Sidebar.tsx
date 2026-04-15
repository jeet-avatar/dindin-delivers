import React, { useEffect, useState, useRef } from "react";
import { EmptyState } from "./EmptyState";
import {
  MoreHorizontal,
  Plus,
  Search,
  Menu,
  PanelsTopLeft,
  Trash2,
  Pencil,
  LogOut,
  HelpCircle,
  Settings,
  Crown,
  MessageSquare,
  Calendar,
  Archive,
  Download,
  Share2,
  Star,
  Clock,
  Filter,
  ChevronDown,
  ChevronRight,
  Shield,
  BookOpen,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SearchModal from "./SearchModal";
import { useAuth } from "../hooks/useAuth";
import { useChat } from "../hooks/useChat";
import { encodeId, decodeId } from "../lib/crypto";

export default function Sidebar() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [isOpen, setIsOpen] = useState(() => window.innerWidth >= 768);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'today' | 'yesterday' | 'week' | 'starred'>('all');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const { token } = useParams();

  const { chats, createChat, refresh, remove, updateTitle, starChat, isLoading } = useChat();
  const [openThreeDot, setOpenThreeDot] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const chatListRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Get current active chat ID
  const currentChatId = token ? decodeId(token) : null;

  // Enhanced smart auto-title with immediate update
  useEffect(() => {
    chats.forEach((c) => {
      if (
        c.title === "New Chat" &&
        c.messages.length > 0 &&
        c.messages[0].role === "user"
      ) {
        const firstMsg = c.messages[0].content;
        const stopwords = new Set([
          "what", "is", "the", "a", "an", "of", "and", "or", "to", "in", 
          "for", "on", "with", "about", "how", "why", "when", "where", 
          "which", "who", "are", "can", "could", "would", "should", "will"
        ]);

        const keywords = firstMsg
          .split(/\s+/)
          .map((w) => w.replace(/[^a-z0-9]/gi, "").toLowerCase())
          .filter((w) => w && !stopwords.has(w));

        const smartTitle = keywords.length > 0
          ? keywords
              .slice(0, 3)
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")
          : firstMsg.length > 25 
            ? firstMsg.slice(0, 25) + "..." 
            : firstMsg;

        if (smartTitle && smartTitle !== "New Chat") {
          updateTitle(c.id, smartTitle);
        }
      }
    });
  }, [chats, updateTitle]);

  // Fixed handleNewChat function
  const handleNewChat = async () => {
    if (isCreatingChat) return;
    
    // Navigate to /chat/new — Chat.tsx handles creation + real-ID redirect
    nav("/chat/new");
    setIsCreatingChat(false);
  };

  const handleLogout = () => {
    logout();
    nav("/log-in");
  };

  const getInitials = (name?: string) => {
    if (!name) return "G";
    const parts = name.trim().split(" ");
    if (parts.length < 2) return parts[0][0]?.toUpperCase() || "U";
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const handleRenameStart = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
    setOpenThreeDot(null);
  };

  const handleRenameSave = (id: string) => {
    if (renameValue.trim()) {
      updateTitle(id, renameValue.trim());
    }
    setRenamingId(null);
  };

  // Format date for grouping
  const formatChatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (date >= today) return 'Today';
    if (date >= yesterday) return 'Yesterday';
    if (date >= weekAgo) return 'This Week';
    return 'Older';
  };

  // Group and filter chats
  const filteredChats = chats.filter(chat => {
    if (filterBy === 'starred') return chat.starred;
    if (filterBy === 'all') return true;
    
    const chatDate = new Date(chat.createdAt);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filterBy) {
      case 'today':
        return chatDate >= today;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return chatDate >= yesterday && chatDate < today;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return chatDate >= weekAgo;
      default:
        return true;
    }
  });

  // Group chats by date
  const groupedChats = filteredChats.reduce((groups, chat) => {
    const group = formatChatDate(chat.createdAt);
    if (!groups[group]) groups[group] = [];
    groups[group].push(chat);
    return groups;
  }, {} as Record<string, typeof chats>);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setShowFilter(false);
      }
      
      if (openThreeDot && !(event.target as Element).closest('.chat-menu')) {
        setOpenThreeDot(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openThreeDot]);

  // Close menus when sidebar collapses
  useEffect(() => {
    if (!isOpen) {
      setOpenThreeDot(null);
      setShowUserMenu(false);
      setShowFilter(false);
    }
  }, [isOpen]);

  // Responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
      } else if (window.innerWidth > 1024) {
        setIsOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      {/* Mobile floating hamburger — only visible when drawer is closed on mobile */}
      {isMobile && !isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed top-3 left-3 z-[9997] p-2 rounded-lg bg-[#1c1c20] border border-slate-700 text-gray-200 shadow-xl"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-[9998]"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — drawer on mobile, inline on desktop */}
      {(!isMobile || isOpen) && (
      <aside
        className={`flex flex-col h-screen transition-all duration-300 bg-[#1c1c20] text-gray-200 border-r border-slate-800 ${
          isMobile
            ? 'fixed inset-y-0 left-0 z-[9999] w-72'
            : isOpen ? 'w-72 relative' : 'w-16 relative'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            {isOpen && <span className="font-semibold text-lg">ArthaBuild</span>}
          </div>
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            {isOpen ? <PanelsTopLeft size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="p-3 flex-shrink-0 space-y-2">
          {/* New Chat Button */}
          <button
            onClick={handleNewChat}
            disabled={isCreatingChat}
            className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              isCreatingChat 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-indigo-600/25'
            }`}
          >
            <Plus size={16} className={isCreatingChat ? 'animate-spin' : ''} />
            {isOpen && <span>{isCreatingChat ? 'Creating...' : 'New Chat'}</span>}
          </button>

          {/* Search Button */}
          {isOpen && (
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-3 w-full rounded-lg hover:bg-slate-800 px-3 py-2 text-sm transition-colors"
            >
              <Search size={16} />
              <span>Search Chats</span>
            </button>
          )}

          {/* Implementation Guide Link */}
          <Link
            to="/guide"
            className="flex items-center gap-3 w-full rounded-lg hover:bg-slate-800 px-3 py-2 text-sm transition-colors text-slate-300 hover:text-white"
          >
            <BookOpen size={16} className="text-indigo-400 flex-shrink-0" />
            {isOpen && <span>Implementation Guide</span>}
          </Link>
        </div>

        {/* Filter Section */}
        {isOpen && (
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-xs text-slate-400 uppercase font-medium">Chats</h3>
              <div className="relative" ref={filterMenuRef}>
                <button
                  onClick={() => setShowFilter(!showFilter)}
                  className="p-1 rounded hover:bg-slate-700 transition-colors"
                >
                  <Filter size={14} />
                </button>
                
                {showFilter && (
                  <div className="absolute right-0 top-8 w-40 bg-[#2a2b31] border border-slate-700 rounded-lg shadow-xl z-50">
                    {[
                      { key: 'all', label: 'All Chats', icon: MessageSquare },
                      { key: 'today', label: 'Today', icon: Calendar },
                      { key: 'yesterday', label: 'Yesterday', icon: Clock },
                      { key: 'week', label: 'This Week', icon: Calendar },
                      { key: 'starred', label: 'Starred', icon: Star },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => {
                          setFilterBy(key as any);
                          setShowFilter(false);
                        }}
                        className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-slate-800 transition-colors ${
                          filterBy === key ? 'text-indigo-400 bg-slate-800' : ''
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Chat List - Scrollable */}
        <div 
          ref={chatListRef}
          className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
          style={{ scrollBehavior: 'smooth' }}
        >
          {!isOpen ? (
            // Collapsed view - hide chat history
            <div className="flex flex-col items-center pt-4 text-slate-500">
              <MessageSquare size={20} />
            </div>
          ) : (
            // Expanded view - show grouped chats
            <div className="space-y-1">
              {isLoading && (
                <div className="text-center py-8 text-slate-500">
                  <div className="animate-spin mx-auto mb-2">
                    <Plus size={24} className="opacity-50" />
                  </div>
                  <p className="text-sm">Loading chats...</p>
                </div>
              )}

              {!isLoading && filteredChats.length === 0 && (
                <EmptyState
                  message="No chats yet"
                  subtext="Start a conversation to ask ArthaBuild a NetSuite question"
                  ctaLabel="New Chat"
                  onCta={() => nav("/chat/new")}
                />
              )}

              {!isLoading && Object.entries(groupedChats).map(([group, groupChats]) => (
                <div key={group}>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-wide px-2 pt-3 pb-1">
                    {group}
                  </div>
                  {groupChats.map((chat) => {
                    const isActive = chat.id === String(currentChatId);
                    return (
                      <div key={chat.id} className="relative chat-menu">
                        {renamingId === chat.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={() => handleRenameSave(chat.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRenameSave(chat.id);
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            className="w-full bg-slate-800 text-white text-sm px-3 py-2 rounded-lg outline-none border border-indigo-500 mx-1"
                          />
                        ) : (
                          <button
                            onClick={() => nav(`/chat/${encodeId(chat.id)}`)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors group/chat ${
                              isActive ? "bg-slate-700 text-white" : "hover:bg-slate-800 text-slate-300"
                            }`}
                          >
                            <span className="flex-1 truncate">{chat.title}</span>
                            {chat.starred && <Star size={12} className="text-yellow-400 flex-shrink-0" />}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenThreeDot(openThreeDot === chat.id ? null : chat.id);
                              }}
                              className="opacity-0 group-hover/chat:opacity-100 p-1 rounded hover:bg-slate-600 transition-all flex-shrink-0"
                            >
                              <MoreHorizontal size={14} />
                            </button>
                          </button>
                        )}
                        {openThreeDot === chat.id && (
                          <div className="absolute right-0 top-9 w-40 bg-[#2a2b31] border border-slate-700 rounded-lg shadow-xl z-50 py-1">
                            <button
                              onClick={() => handleRenameStart(chat.id, chat.title)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
                            >
                              <Pencil size={14} /> Rename
                            </button>
                            <button
                              onClick={() => { starChat(chat.id); setOpenThreeDot(null); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-800 transition-colors"
                            >
                              <Star size={14} /> {chat.starred ? "Unstar" : "Star"}
                            </button>
                            <div className="border-t border-slate-700 my-1" />
                            <button
                              onClick={() => {
                                remove(chat.id);
                                setOpenThreeDot(null);
                                if (chat.id === String(currentChatId)) nav("/chat/new");
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-900/20 text-red-400 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Section */}
        <div className="px-3 py-3 border-t border-slate-800 flex-shrink-0" ref={userMenuRef}>
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-800 p-2 rounded-lg transition-colors"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg">
              {getInitials(user?.name)}
            </div>
            {isOpen && (
              <div className="flex-1">
                <div className="text-sm font-medium">{user?.name ?? "Guest User"}</div>
                <div className="text-xs text-slate-400">{user?.email ?? "guest@example.com"}</div>
              </div>
            )}
          </div>

          {showUserMenu && isOpen && (
            <div className="absolute bottom-16 left-3 w-64 bg-[#2a2b31] border border-slate-700 rounded-lg shadow-xl p-1 text-sm z-50">
              <Link
                to="/settings"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-yellow-400"
              >
                <Crown size={16} />
                Upgrade to Pro
              </Link>
              <Link
                to="/settings"
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Settings size={16} />
                Settings
              </Link>
              {user?.role === "admin" && (
                <Link
                  to="/admin"
                  className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors text-amber-400"
                >
                  <Shield size={16} />
                  Admin Panel
                </Link>
              )}
              <Link 
                to="/help" 
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <HelpCircle size={16} />
                Help & Support
              </Link>
              
              <div className="border-t border-slate-700 my-1" />
              
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-red-900/20 text-red-400 rounded-lg transition-colors w-full text-left"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      )}

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onNavigate={(token) => {
            setShowSearch(false);
            nav(`/chat/${token}`);
          }}
        />
      )}
    </>
  );
}