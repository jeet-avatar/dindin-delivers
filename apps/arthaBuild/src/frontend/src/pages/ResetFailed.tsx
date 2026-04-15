import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { XCircle, Loader2 } from "lucide-react";
import { forgotPassword } from "../services/authService";

export default function ResetFailed() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || cooldown > 0) return;
    setSending(true);
    setError("");
    try {
      await forgotPassword(email);
      setSent(true);
      setCooldown(60);
    } catch {
      setError("Failed to send reset link. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
      <div className="w-full max-w-md p-8 flex flex-col items-center gap-4 bg-panel rounded-lg shadow-lg text-center">
        <XCircle className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-semibold text-red-500">Link expired or invalid</h1>
        <p className="text-gray-300">
          This reset link has expired or has already been used.
        </p>
        {sent ? (
          <p className="text-green-400 text-sm">
            Link sent — check your inbox.
            {cooldown > 0 && (
              <span className="text-gray-400"> Resend in {cooldown}s</span>
            )}
          </p>
        ) : (
          <form onSubmit={handleResend} className="w-full flex flex-col gap-3 mt-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-600 text-white placeholder-gray-500"
              required
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={sending || cooldown > 0}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-full font-medium flex items-center justify-center gap-2"
            >
              {sending && <Loader2 className="h-4 w-4 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Send new link"}
            </button>
          </form>
        )}
        <button
          onClick={() => nav("/log-in")}
          className="text-slate-400 hover:text-white text-sm mt-2"
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
