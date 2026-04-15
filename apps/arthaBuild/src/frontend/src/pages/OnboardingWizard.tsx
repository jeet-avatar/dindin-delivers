/**
 * OnboardingWizard — Phase 17
 * 3-step first-run modal for new admin users.
 * Steps: Connect NetSuite → Invite team → Verify license
 * Renders nothing if: user is not admin, or onboarding already completed.
 */
import React, { useEffect, useState } from "react";
import { CheckCircle, X, ChevronRight, Key, Users, Link2 } from "lucide-react";
import { getAccessToken } from "../services/api";

interface OnboardingWizardProps {
  /** Current user role — wizard only shows for admin */
  userRole?: string;
}

const TOTAL_STEPS = 3;

export default function OnboardingWizard({ userRole }: OnboardingWizardProps) {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [completing, setCompleting] = useState(false);

  // Step 2: invite
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Step 3: license
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseStatus, setLicenseStatus] = useState<"idle" | "validating" | "valid" | "invalid">("idle");
  const [licenseResult, setLicenseResult] = useState<{ plan?: string; expiry?: string; message?: string } | null>(null);

  // Check if onboarding is needed on mount
  useEffect(() => {
    if (userRole !== "admin") return;

    const token = getAccessToken();
    if (!token) return;

    fetch("/api/admin/user/me/onboarding", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && data.onboarding_completed === false) {
          setShow(true);
        }
      })
      .catch(() => {
        // non-fatal — don't block login if check fails
      });
  }, [userRole]);

  async function handleComplete() {
    setCompleting(true);
    try {
      const token = getAccessToken();
      await fetch("/api/admin/onboarding/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
    } catch {
      // non-fatal — close wizard regardless
    } finally {
      setCompleting(false);
      setShow(false);
    }
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return;
    setInviteStatus("sending");
    setInviteError(null);
    try {
      const token = getAccessToken();
      const r = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });
      if (!r.ok) {
        const err = await r.json();
        throw new Error(err.detail ?? "Invite failed");
      }
      setInviteStatus("sent");
    } catch (err) {
      setInviteStatus("error");
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    }
  }

  async function handleValidateLicense() {
    if (!licenseKey.trim()) return;
    setLicenseStatus("validating");
    setLicenseResult(null);
    try {
      const token = getAccessToken();
      const r = await fetch("/api/admin/license/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
        body: JSON.stringify({ license_key: licenseKey.trim() }),
      });
      const data = await r.json();
      setLicenseResult(data);
      setLicenseStatus(data.valid ? "valid" : "invalid");
    } catch {
      setLicenseStatus("invalid");
      setLicenseResult({ message: "Could not reach validation service" });
    }
  }

  if (!show) return null;

  const stepTitles = ["Connect NetSuite", "Invite Your Team", "Verify License"];
  const stepIcons = [Link2, Users, Key];

  function StepIcon({ s }: { s: number }) {
    const Icon = stepIcons[s - 1];
    const active = step === s;
    const done = step > s;
    return (
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-colors ${
          done
            ? "bg-green-500 border-green-500 text-white"
            : active
            ? "bg-indigo-600 border-indigo-600 text-white"
            : "bg-slate-700 border-slate-600 text-slate-400"
        }`}
      >
        {done ? <CheckCircle size={14} /> : <Icon size={14} />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1a1f2e] border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-[500px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700/50">
          <div>
            <h2 className="text-lg font-bold text-white">Welcome to ArthaBuild</h2>
            <p className="text-xs text-slate-400 mt-0.5">Let's get you set up in 3 quick steps</p>
          </div>
          <button
            onClick={handleComplete}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700/60 transition-colors"
            title="Skip setup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-700/30">
          {[1, 2, 3].map((s) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <StepIcon s={s} />
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    step === s ? "text-white" : step > s ? "text-green-400" : "text-slate-500"
                  }`}
                >
                  {stepTitles[s - 1]}
                </span>
              </div>
              {s < TOTAL_STEPS && (
                <div className={`flex-1 h-px mx-1 ${step > s ? "bg-green-500/40" : "bg-slate-700/60"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6 min-h-[200px]">
          {/* Step 1: Connect NetSuite */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30">
                  <Link2 size={18} className="text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Connect to NetSuite</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Authenticate with TBA to enable RAG and SuiteScript deployment</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                ArthaBuild needs TBA credentials to fetch your NetSuite data and deploy scripts.
                You can connect now or do it later from the chat header.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    // Trigger existing NetSuite connect modal by dispatching a custom event
                    window.dispatchEvent(new CustomEvent("arthabuild:open-netsuite-connect"));
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Link2 size={14} />
                  Connect NetSuite
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 text-slate-400 hover:text-white rounded-lg text-sm transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Invite team */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/20 border border-blue-500/30">
                  <Users size={18} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Invite Your Team</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Add colleagues to your ArthaBuild workspace</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colleague@company.com"
                    className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all"
                  />
                  <button
                    onClick={handleSendInvite}
                    disabled={!inviteEmail.trim() || inviteStatus === "sending"}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {inviteStatus === "sending" ? "Sending..." : "Invite"}
                  </button>
                </div>
                {inviteStatus === "sent" && (
                  <div className="flex items-center gap-2 text-xs text-green-400">
                    <CheckCircle size={12} />
                    Invite sent to {inviteEmail}
                  </div>
                )}
                {inviteStatus === "error" && (
                  <div className="text-xs text-red-400">{inviteError}</div>
                )}
              </div>
              <button
                onClick={() => setStep(3)}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-2"
              >
                Skip — invite later from Admin Panel
              </button>
            </div>
          )}

          {/* Step 3: Verify license */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/30">
                  <Key size={18} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Verify Your License</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Enter your TechCloudPro license key to unlock full features</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    placeholder="AB-XXXX-XXXX-XXXX-XXXX"
                    className="flex-1 px-3.5 py-2.5 bg-slate-900/60 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 font-mono focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none transition-all"
                  />
                  <button
                    onClick={handleValidateLicense}
                    disabled={!licenseKey.trim() || licenseStatus === "validating"}
                    className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {licenseStatus === "validating" ? "Checking..." : "Validate"}
                  </button>
                </div>
                {licenseStatus === "valid" && licenseResult && (
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-green-900/20 border border-green-700/30 rounded-lg text-sm text-green-300">
                    <CheckCircle size={14} />
                    <span>
                      Valid license — Plan: <strong>{licenseResult.plan}</strong>
                      {licenseResult.expiry ? ` · Expires ${licenseResult.expiry}` : ""}
                    </span>
                  </div>
                )}
                {licenseStatus === "invalid" && licenseResult && (
                  <div className="text-xs text-red-400">
                    {licenseResult.message ?? "Invalid license key. Contact sales@techcloudpro.com"}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500">
                No license? ArthaBuild runs in dev mode without a key.{" "}
                <a href="https://artha.build" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                  Get a license
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/30 bg-slate-900/30">
          <button
            onClick={handleComplete}
            disabled={completing}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip all
          </button>
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="px-3 py-2 text-sm text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/50 transition-colors"
              >
                Back
              </button>
            )}
            {step < TOTAL_STEPS ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Next
                <ChevronRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                <CheckCircle size={14} />
                {completing ? "Finishing..." : "Finish Setup"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
