/**
 * MFASetup — Phase 13
 *
 * Guides the user through TOTP MFA enrollment:
 *   1. Calls POST /api/auth/mfa/enroll on mount → receives provisioning_uri + qr_data_url
 *   2. Displays QR code (or manual entry link if qr_data_url is empty)
 *   3. User scans QR in their authenticator app, enters the 6-digit OTP
 *   4. POST /api/auth/mfa/verify with the OTP code
 *   5. On success: shows confirmation, navigates to /dashboard
 *
 * Token storage: memory only (CLAUDE.md project law — never localStorage).
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, XCircle, Loader2, QrCode } from "lucide-react";
import { getAccessToken } from "../services/api";

export default function MFASetup() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [provisioningUri, setProvisioningUri] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Step 1: Enroll on mount
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate("/log-in", { replace: true });
      return;
    }
    setLoading(true);
    fetch("/api/auth/mfa/enroll", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.detail ?? "Enrollment failed");
        }
        return r.json();
      })
      .then((data) => {
        setProvisioningUri(data.provisioning_uri ?? null);
        setQrDataUrl(data.qr_data_url || null);
        setEnrollError(null);
      })
      .catch((err: Error) => setEnrollError(err.message))
      .finally(() => setLoading(false));
  }, [navigate]);

  // Step 3: Verify OTP
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!otp.trim()) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      const token = getAccessToken();
      const r = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ otp_code: otp.trim() }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail ?? "Verification failed");
      }
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#15181c] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 mb-4">
            <Shield size={24} className="text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Set Up Two-Factor Authentication</h1>
          <p className="text-slate-400 mt-2 text-sm">
            Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
          </p>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 space-y-6">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Generating MFA secret...</span>
            </div>
          )}

          {/* Enrollment error */}
          {!loading && enrollError && (
            <div className="flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-700/30 rounded-xl text-sm text-red-300">
              <XCircle size={16} className="flex-shrink-0" />
              {enrollError}
            </div>
          )}

          {/* QR Code + manual link */}
          {!loading && !enrollError && provisioningUri && (
            <>
              <div className="flex flex-col items-center gap-4">
                {qrDataUrl ? (
                  <div className="p-3 bg-white rounded-xl">
                    <img
                      src={qrDataUrl}
                      alt="MFA QR Code"
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-48 h-48 bg-slate-900/60 border border-slate-700/50 rounded-xl">
                    <div className="text-center px-4">
                      <QrCode size={32} className="text-slate-500 mx-auto mb-2" />
                      <p className="text-xs text-slate-500">QR generation requires the qrcode library</p>
                    </div>
                  </div>
                )}
                <details className="w-full text-center">
                  <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-300 transition-colors">
                    Can't scan? Enter code manually
                  </summary>
                  <div className="mt-2 px-3 py-2 bg-slate-900/60 rounded-lg font-mono text-xs text-slate-300 break-all select-all">
                    {provisioningUri}
                  </div>
                </details>
              </div>

              {/* OTP Entry */}
              {!success && (
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label htmlFor="otp" className="block text-sm font-medium text-slate-300 mb-2">
                      Enter the 6-digit code from your app
                    </label>
                    <input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      className="w-full text-center text-2xl tracking-widest px-4 py-3 bg-slate-900/60 border border-slate-600/50 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none transition-all font-mono"
                    />
                  </div>

                  {verifyError && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-900/20 border border-red-700/30 rounded-xl text-sm text-red-300">
                      <XCircle size={14} className="flex-shrink-0" />
                      {verifyError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={otp.length !== 6 || verifying}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {verifying ? (
                      <><Loader2 size={16} className="animate-spin" /> Verifying...</>
                    ) : (
                      <><Shield size={16} /> Activate MFA</>
                    )}
                  </button>
                </form>
              )}

              {/* Success state */}
              {success && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <CheckCircle size={36} className="text-green-400" />
                  <div className="text-center">
                    <div className="text-base font-semibold text-white">MFA Activated!</div>
                    <div className="text-sm text-slate-400 mt-1">You'll be required to enter a code on each login.</div>
                    <div className="text-xs text-slate-500 mt-2">Redirecting to dashboard...</div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Skip link */}
        {!success && (
          <div className="mt-4 text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
