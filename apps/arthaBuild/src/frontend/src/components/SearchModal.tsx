import React, { useMemo, useState, useRef, useEffect } from "react";
import { X, MessageSquare } from "lucide-react";
import { useChat } from "../hooks/useChat";
import { encodeId } from "../lib/crypto";

interface SearchModalProps {
  onClose: () => void;
  onNavigate?: (token: string) => void;
}

interface ChatItem {
  id: string;
  title: string;
  date?: string; // optional (API may not have it)
}

export default function SearchModal({ onClose, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { search } = useChat();

  // Refs for auto-scroll
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // API search results
  const results: ChatItem[] = useMemo(() => search(query), [query, search]);

  // Mock / fallback chats
  const chats: ChatItem[] = [
    { id: "1", title: "User model error fix", date: "Today" },
    { id: "2", title: "Cloud platforms overview", date: "Previous 7 Days" },
    { id: "3", title: "Code refinement and fixes", date: "Previous 7 Days" },
    { id: "4", title: "React chatbot UI project", date: "Previous 30 Days" },
    { id: "5", title: "Test data generation", date: "Previous 30 Days" },
  ];

  // Fallback filtering
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(query.toLowerCase())
  );

  // Decide dataset
  const data = results.length > 0 ? results : filteredChats;

  // Group by date
  const groupedChats = data.reduce<Record<string, ChatItem[]>>((acc, chat) => {
    const key = chat.date || "Results";
    if (!acc[key]) acc[key] = [];
    acc[key].push(chat);
    return acc;
  }, {});

  // Flatten for navigation
  const flatData = Object.entries(groupedChats).flatMap(([date, items]) =>
    items.map((chat) => ({ ...chat, date }))
  );

  // Highlight search text
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-yellow-500/30 text-yellow-200 font-medium rounded px-0.5"
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatData.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev === 0 ? flatData.length - 1 : prev - 1
      );
    } else if (e.key === "Enter" && flatData.length > 0) {
      const chat = flatData[selectedIndex];
      const token = encodeId(chat.id);
      if (onNavigate) return onNavigate(token);
      window.location.href = `/chat/${token}`;
    }
  };

  // Auto-scroll selected into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 px-3">
      <div className="bg-[#1c1c20] text-gray-200 rounded-lg shadow-lg w-full max-w-[600px] mt-14 sm:mt-20 p-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-gray-700 pb-2">
          <input
            type="text"
            placeholder="Search chats..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0); // reset selection on new search
            }}
            onKeyDown={handleKeyDown}
            className="bg-transparent flex-1 outline-none text-sm px-2"
          />
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Results */}
        <div className="mt-3 max-h-[400px] overflow-y-auto">
          {/* Sticky "New Chat" */}
          <div className="sticky top-0 bg-[#1c1c20] z-10">
            <button className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded w-full text-left">
              <MessageSquare size={16} /> New chat
            </button>
          </div>

          {/* Grouped search results */}
          {Object.keys(groupedChats).length > 0 ? (
            Object.entries(groupedChats).map(([date, chats]) => (
              <div key={date} className="space-y-1">
                <div className="px-3 py-1 text-xs text-slate-400 uppercase tracking-wide sticky top-9 bg-[#1c1c20] z-0">
                  {date}
                </div>
                {chats.map((c) => {
                  const globalIndex = flatData.findIndex((x) => x.id === c.id);
                  return (
                    <button
                      key={c.id}
                      ref={(el) => {
                        itemRefs.current[globalIndex] = el;
                      }}
                      onMouseEnter={() => setSelectedIndex(globalIndex)} // <-- NEW: hover selects
                      onClick={() => {
                        const token = encodeId(c.id);
                        if (onNavigate) return onNavigate(token);
                        window.location.href = `/chat/${token}`;
                      }}
                      className={`w-full text-left px-3 py-2 rounded flex items-center gap-3 ${
                        selectedIndex === globalIndex
                          ? "bg-slate-700"
                          : "hover:bg-slate-800"
                      }`}
                    >
                      <MessageSquare />
                      {highlightText(c.title, query)}
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="text-slate-400 px-3 py-4 text-center">
              No chats found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}