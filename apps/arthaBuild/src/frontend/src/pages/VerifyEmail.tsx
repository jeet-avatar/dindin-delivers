import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { forgotPassword } from "../services/authService";

type State = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [resendEmail, setResendEmail] = useState("");
  const [resendSent, setResendSent] = useState(false);
  const [resendError, setResendError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setState("error");
      return;
    }
    fetch(`/api/user/verify-email?token=${encodeURIComponent(token)}`)
      .then((r) => {
        if (r.ok) setState("success");
        else setState("error");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim() || cooldown > 0) return;
    setResendLoading(true);
    setResendError("");
    try {
      await forgotPassword(resendEmail);
      setResendSent(true);
      setCooldown(60);
    } catch {
      setResendError("Failed to send verification email. Please try again.");
    } finally {
      setResendLoading(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
          <p className="text-gray-400">Verifying your email...</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
        <div className="w-full max-w-md p-8 flex flex-col items-center gap-4 bg-panel rounded-lg shadow-lg text-center">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-semibold">Email verified!</h1>
          <p className="text-gray-400">
            Your email address has been verified. You can now access all features.
          </p>
          <button
            onClick={() => nav("/chat/new")}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium"
          >
            Go to ArthaBuild
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
      <div className="w-full max-w-md p-8 flex flex-col items-center gap-4 bg-panel rounded-lg shadow-lg text-center">
        <XCircle className="h-16 w-16 text-red-500" />
        <h1 className="text-2xl font-semibold text-red-400">Verification link invalid</h1>
        <p className="text-gray-300">
          This verification link is invalid or has expired.
        </p>
        {resendSent ? (
          <p className="text-green-400 text-sm">
            Verification email sent — check your inbox.
            {cooldown > 0 && <span className="text-gray-400"> Resend in {cooldown}s</span>}
          </p>
        ) : (
          <form onSubmit={handleResend} className="w-full flex flex-col gap-3 mt-2">
            <input
              type="email"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              placeholder="Enter your email to resend"
              className="w-full px-4 py-2 rounded bg-slate-800 border border-slate-600 text-white placeholder-gray-500"
              required
            />
            {resendError && <p className="text-red-400 text-sm">{resendError}</p>}
            <button
              type="submit"
              disabled={resendLoading || cooldown > 0}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-full font-medium flex items-center justify-center gap-2"
            >
              {resendLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
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
