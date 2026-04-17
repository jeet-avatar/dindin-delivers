import React, { useState, useRef } from "react";
import ChatLayout from "../components/ChatLayout";
import { BookOpen, Loader2, Copy, CheckCheck, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { sendChatMessage } from "../services/api";
import { chatService } from "../services/chatService";
import { useChat } from "../hooks/useChat";
import ReactMarkdown from "react-markdown";

const EXAMPLES = [
  "Send an automatic email to the customer when a Sales Order is approved by the finance team",
  "Validate that a vendor bill's amount matches the purchase order before allowing approval",
  "Auto-populate estimated delivery date on Sales Orders based on item lead times",
  "Create a custom approval workflow for expenses over $5,000 requiring two-level sign-off",
];

function GuideInner() {
  const [requirement, setRequirement] = useState("");
  const [guide, setGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chatId, setChatId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { refresh } = useChat();

  const handleGenerate = async () => {
    if (!requirement.trim() || loading) return;
    setLoading(true);
    setGuide(null);
    setError(null);

    try {
      // Create a chat session to persist the guide in history
      const session = await chatService.create("Implementation Guide");
      const numId = session.id;
      setChatId(numId);
      await refresh();

      const prompt = `Generate a comprehensive NetSuite implementation guide for the following requirement:\n\n${requirement.trim()}`;
      const result = await sendChatMessage(prompt, undefined, numId);
      setGuide(result.response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!guide) return;
    navigator.clipboard.writeText(guide);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!guide) return;
    const blob = new Blob([guide], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `implementation-guide-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExample = (ex: string) => {
    setRequirement(ex);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#15181c]">
        {/* Header */}
        <div className="flex-shrink-0 px-8 pt-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-indigo-600/20">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="text-xl font-bold text-white">Implementation Guide</h1>
          </div>
          <p className="text-slate-500 text-sm ml-12">
            Describe what you need to build in NetSuite — get a full technical implementation plan.
          </p>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4 sm:py-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Input card */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                Describe your requirement
              </label>
              <textarea
                ref={textareaRef}
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="e.g. When a Sales Order is approved, automatically send the customer a confirmation email with the estimated delivery date and assigned rep contact info…"
                rows={5}
                disabled={loading}
                className="w-full bg-slate-900/80 text-white text-sm rounded-xl px-4 py-3 outline-none resize-none
                           placeholder-slate-500 border border-slate-700/50 focus:border-indigo-500/60
                           disabled:opacity-50 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">⌘↩ to generate</span>
                <button
                  onClick={handleGenerate}
                  disabled={!requirement.trim() || loading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500
                             disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm
                             font-medium rounded-xl transition-colors"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Guide</>
                  )}
                </button>
              </div>
            </div>

            {/* Example requirements */}
            {!guide && !loading && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Example requirements
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => handleExample(ex)}
                      className="text-left px-4 py-3 bg-slate-800/40 hover:bg-slate-700/50
                                 border border-slate-700/40 hover:border-indigo-500/30
                                 rounded-xl text-sm text-slate-400 hover:text-slate-200
                                 transition-all"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center gap-4 py-16 text-center">
                <div className="p-4 rounded-2xl bg-indigo-600/10 border border-indigo-500/20">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
                <div>
                  <p className="text-white font-medium">Generating your implementation guide…</p>
                  <p className="text-slate-500 text-sm mt-1">
                    Analysing requirements, selecting script types, drafting test cases
                  </p>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="px-4 py-3 bg-red-900/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Guide output */}
            {guide && !loading && (
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-700/50 bg-slate-800/60">
                  <span className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <CheckCheck className="w-4 h-4 text-green-400" />
                    Implementation Guide ready
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300
                                 hover:text-white bg-slate-700/60 hover:bg-slate-600/60
                                 rounded-lg transition-colors"
                    >
                      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300
                                 hover:text-white bg-slate-700/60 hover:bg-slate-600/60
                                 rounded-lg transition-colors"
                    >
                      Download .md
                    </button>
                  </div>
                </div>

                {/* Markdown rendered guide */}
                <div className="px-6 py-5 prose prose-invert prose-sm max-w-none
                                prose-headings:text-white prose-headings:font-semibold
                                prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-slate-700/50 prose-h2:pb-2
                                prose-p:text-slate-300 prose-p:leading-relaxed
                                prose-li:text-slate-300
                                prose-strong:text-white
                                prose-code:text-indigo-300 prose-code:bg-slate-900/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                                prose-table:text-sm prose-th:text-slate-200 prose-td:text-slate-400
                                prose-th:bg-slate-800/60 prose-td:border-slate-700/40 prose-th:border-slate-700/40">
                  <ReactMarkdown>{guide}</ReactMarkdown>
                </div>

                {/* Regenerate */}
                <div className="px-5 py-3 border-t border-slate-700/50 bg-slate-900/20">
                  <button
                    onClick={() => { setGuide(null); setRequirement(""); }}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Start a new guide
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
  );
}

export default function Guide() {
  return (
    <ChatLayout>
      <GuideInner />
    </ChatLayout>
  );
}
