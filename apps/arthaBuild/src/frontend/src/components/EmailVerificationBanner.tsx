import React, { useEffect, useState } from "react";
import { Mail, X, Loader2 } from "lucide-react";
import { getProfile, resendVerification } from "../services/authService";
import { useAuth } from "../hooks/useAuth";

export default function EmailVerificationBanner() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!user) return;
    getProfile()
      .then((p) => setIsVerified(p.is_verified))
      .catch(() => setIsVerified(true)); // fail open — don't block user if endpoint fails
  }, [user]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  async function handleResend() {
    if (!user?.email || cooldown > 0) return;
    setSending(true);
    try {
      await resendVerification(user.email);
      setSent(true);
      setCooldown(60);
    } finally {
      setSending(false);
    }
  }

  if (!user || isVerified === null || isVerified === true || dismissed) return null;

  return (
    <div className="bg-amber-900/40 border border-amber-700/50 rounded mx-3 mb-2 px-4 py-2 flex items-center gap-3 text-sm">
      <Mail className="h-4 w-4 text-amber-400 shrink-0" />
      <span className="text-amber-200 flex-1">
        {sent
          ? "Verification email sent — check your inbox."
          : "Please verify your email address to access all features."}
      </span>
      {!sent && (
        <button
          onClick={handleResend}
          disabled={sending || cooldown > 0}
          className="text-amber-400 hover:text-amber-300 disabled:opacity-50 text-xs font-medium whitespace-nowrap flex items-center gap-1"
        >
          {sending && <Loader2 className="h-3 w-3 animate-spin" />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-600 hover:text-amber-400 shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
