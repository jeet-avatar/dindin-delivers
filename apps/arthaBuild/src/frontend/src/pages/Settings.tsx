import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { changePassword } from "../services/authService";
import {
  User,
  Lock,
  Bell,
  Shield,
  ChevronRight,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
} from "lucide-react";

function PasswordSection() {
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (newPw !== confirmPw) { setError("Passwords do not match"); return; }
    if (newPw.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    try {
      await changePassword(oldPw, newPw);
      setSuccess(true);
      setOldPw(""); setNewPw(""); setConfirmPw("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-slate-400 mb-1">Current Password</label>
        <div className="relative">
          <input
            type={showOld ? "text" : "password"}
            value={oldPw}
            onChange={(e) => setOldPw(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            required
          />
          <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-3 top-2.5 text-slate-400">
            {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">New Password</label>
        <div className="relative">
          <input
            type={showNew ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            required
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-2.5 text-slate-400">
            {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm text-slate-400 mb-1">Confirm New Password</label>
        <input
          type="password"
          value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && (
        <p className="text-green-400 text-sm flex items-center gap-1">
          <Check size={14} /> Password updated successfully
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? "Updating..." : "Update Password"}
      </button>
    </form>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: "account",
      icon: User,
      title: "Account",
      subtitle: "Manage your profile and email",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white">
              {user?.name ?? "—"}
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Email Address</label>
            <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-400">
              {user?.email ?? "—"}
            </div>
          </div>
          <p className="text-xs text-slate-500">
            To update your name or email, contact{" "}
            <a href="mailto:hello@artha.build" className="text-indigo-400 hover:underline">
              hello@artha.build
            </a>
          </p>
        </div>
      ),
    },
    {
      id: "security",
      icon: Lock,
      title: "Password & Security",
      subtitle: "Change your password",
      content: <PasswordSection />,
    },
    {
      id: "notifications",
      icon: Bell,
      title: "Notifications",
      subtitle: "Email and in-app notification preferences",
      content: (
        <div className="space-y-3">
          {[
            { label: "Product updates and new features", defaultOn: true },
            { label: "Weekly usage summary", defaultOn: false },
            { label: "Security alerts", defaultOn: true },
          ].map(({ label, defaultOn }) => (
            <label key={label} className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-300">{label}</span>
              <input type="checkbox" defaultChecked={defaultOn} className="accent-indigo-600 w-4 h-4" />
            </label>
          ))}
          <p className="text-xs text-slate-500 pt-2">
            Notification preferences are saved per browser session.
          </p>
        </div>
      ),
    },
    {
      id: "privacy",
      icon: Shield,
      title: "Privacy",
      subtitle: "Data retention and session history",
      content: (
        <div className="space-y-4 text-sm text-slate-300">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">Chat history stored</span>
              <span>Yes — on your server</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Data leaves your server</span>
              <span className="text-green-400">Never</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">NetSuite credentials</span>
              <span className="text-green-400">RAM only, never written to disk</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">AI model</span>
              <span>Local Ollama (llama3.1:8b)</span>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            ArthaBuild runs entirely on your infrastructure. No data is sent to third-party AI providers.{" "}
            <Link to="/privacy" className="text-indigo-400 hover:underline">Privacy Policy</Link>
          </p>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1620] text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/chat/new" className="p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Settings</h1>
            <p className="text-slate-400 text-sm mt-0.5">Manage your account and preferences</p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-2">
          {sections.map(({ id, icon: Icon, title, subtitle, content }) => (
            <div key={id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <button
                onClick={() => setActiveSection(activeSection === id ? null : id)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-700/30 transition-colors text-left"
              >
                <div className="p-2 bg-slate-700/50 rounded-lg">
                  <Icon size={16} className="text-indigo-400" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
                </div>
                <ChevronRight
                  size={16}
                  className={`text-slate-400 transition-transform ${activeSection === id ? "rotate-90" : ""}`}
                />
              </button>
              {activeSection === id && (
                <div className="px-5 pb-5 pt-1 border-t border-slate-700/50">
                  {content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
