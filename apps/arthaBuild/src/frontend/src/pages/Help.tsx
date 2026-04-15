import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronDown, MessageSquare, Zap, Shield, BookOpen, Mail } from "lucide-react";

const faqs = [
  {
    q: "What can I ask ArthaBuild?",
    a: "You can ask ArthaBuild to generate SuiteScript code, explain NetSuite concepts, debug existing scripts, create SDF deployment files, and answer questions about NetSuite modules like Inventory, Financials, CRM, and more.",
  },
  {
    q: "How do I connect my NetSuite account?",
    a: "Click the NetSuite icon in the top bar of the chat page. You'll need your Account ID, Consumer Key, Consumer Secret, Token Key, and Token Secret. These are generated in NetSuite under Setup → Integration → Token-Based Authentication. Your credentials are stored in RAM only — never written to disk.",
  },
  {
    q: "Are my chats saved?",
    a: "Yes. All conversations are saved to your local database on your server. You can access previous chats from the sidebar at any time. Messages are stored with full history so you can continue where you left off.",
  },
  {
    q: "Can I ask follow-up questions?",
    a: "Yes. ArthaBuild maintains conversation context within a session. You can refer to previous messages, ask for changes to generated code, or build on earlier answers. Each chat session keeps its own history.",
  },
  {
    q: "How do I save a generated SuiteScript?",
    a: "When ArthaBuild generates a script, it will prompt you to type 'yes' to save the files. Once saved, the files are stored in the SuiteCloud SDF project format on your server and can be deployed directly to NetSuite.",
  },
  {
    q: "What AI model powers ArthaBuild?",
    a: "ArthaBuild uses Llama 3.1 8B running locally via Ollama. The model is augmented with a RAG (Retrieval-Augmented Generation) pipeline trained on NetSuite SuiteScript documentation. No data is sent to external AI providers.",
  },
  {
    q: "Why is the first response slow?",
    a: "The first message in a session may take 30–60 seconds as the AI model loads into memory. Subsequent responses in the same session are faster. This is normal for locally-hosted LLMs.",
  },
  {
    q: "Can I invite my team?",
    a: "Yes. Admins can invite team members from the Admin Panel. Invited users receive an email with a link to set up their account. Each user has their own private chat history.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-800/40 transition-colors"
      >
        <span className="text-sm font-medium text-slate-200 pr-4">{q}</span>
        <ChevronDown size={16} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-slate-400 leading-relaxed border-t border-slate-700/50 pt-3">
          {a}
        </div>
      )}
    </div>
  );
}

export default function Help() {
  return (
    <div className="min-h-screen bg-[#0f1620] text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/chat/new" className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Help & Support</h1>
            <p className="text-slate-400 text-sm mt-0.5">Everything you need to get started</p>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {[
            { icon: MessageSquare, label: "Start a New Chat", to: "/chat/new", color: "text-indigo-400" },
            { icon: BookOpen, label: "View Chat History", to: "/history", color: "text-purple-400" },
            { icon: Zap, label: "Go to Dashboard", to: "/dashboard", color: "text-green-400" },
            { icon: Shield, label: "Admin Panel", to: "/admin", color: "text-amber-400" },
          ].map(({ icon: Icon, label, to, color }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:bg-slate-700/40 transition-colors"
            >
              <Icon size={18} className={color} />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Getting started */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Getting Started</h2>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
              <span>Click <strong className="text-slate-200">New Chat</strong> in the sidebar to start a conversation</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
              <span>Ask anything about NetSuite — "Generate a SuiteScript to auto-email invoices" or "Explain how saved searches work"</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
              <span>Connect NetSuite via TBA credentials to deploy generated SuiteScripts directly</span>
            </li>
            <li className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">4</span>
              <span>Type <strong className="text-slate-200">'yes'</strong> when ArthaBuild asks to save a generated script</span>
            </li>
          </ol>
        </div>

        {/* FAQ */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2 mb-8">
          {faqs.map((faq) => (
            <FAQItem key={faq.q} {...faq} />
          ))}
        </div>

        {/* Contact */}
        <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-xl p-5 flex items-start gap-4">
          <Mail size={20} className="text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-medium mb-1">Still need help?</div>
            <p className="text-sm text-slate-400">
              Email us at{" "}
              <a href="mailto:hello@artha.build" className="text-indigo-400 hover:underline">
                hello@artha.build
              </a>{" "}
              and we'll get back to you within one business day.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
