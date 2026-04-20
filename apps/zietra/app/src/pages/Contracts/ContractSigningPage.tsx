import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  Shield,
  Mail,
  Pen,
  ChevronRight,
} from 'lucide-react';
import SignaturePad from './SignaturePad';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Step = 'landing' | 'otp' | 'contract' | 'sign' | 'success' | 'error';

interface ContractInfo {
  title: string;
  type: string;
  sender_name: string;
  signer_name: string;
  signer_email: string;
  content?: string;
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const STEPS_ORDER: Step[] = ['landing', 'otp', 'contract', 'sign'];

function ProgressBar({ currentStep }: { currentStep: Step }) {
  const stepIndex = STEPS_ORDER.indexOf(currentStep);
  const activeIndex = stepIndex < 0 ? 0 : stepIndex;

  const labels = ['Verify Identity', 'Confirm Email', 'Review Contract', 'Sign'];

  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-2">
        {labels.map((label, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-colors ${
                i < activeIndex
                  ? 'bg-indigo-600 text-white'
                  : i === activeIndex
                  ? 'bg-indigo-500 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#0f0f23]'
                  : 'bg-[#1a1a2e] text-gray-500 border border-gray-700'
              }`}
            >
              {i < activeIndex ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                i === activeIndex ? 'text-indigo-400' : 'text-gray-600'
              }`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
      <div className="relative h-1 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full transition-all duration-500"
          style={{ width: `${(activeIndex / (STEPS_ORDER.length - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export function ContractSigningPage() {
  const { token } = useParams<{ token: string }>();

  const [step, setStep] = useState<Step>('landing');
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [sessionToken, setSessionToken] = useState<string>('');
  const [otpCode, setOtpCode] = useState<string>('');
  const [otpSent, setOtpSent] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [signatureType, setSignatureType] = useState<'typed' | 'drawn'>('typed');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  // ── Load contract info on mount ────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    loadContractInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadContractInfo = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}`);
      if (!res.ok) throw new Error(await res.text());
      const data: ContractInfo = await res.json();
      setContractInfo(data);
      setSignerName(data.signer_name || '');
    } catch (err: unknown) {
      setError({
        title: 'Contract Not Found',
        message:
          err instanceof Error
            ? err.message
            : 'This signing link is invalid or has expired.',
      });
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(await res.text());
      setOtpSent(true);
    } catch (err: unknown) {
      setError({
        title: 'Failed to Send Code',
        message:
          err instanceof Error ? err.message : 'Unable to send verification code. Please try again.',
      });
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (!token || otpCode.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp: otpCode }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSessionToken(data.session_token || '');
      if (data.content && contractInfo) {
        setContractInfo({ ...contractInfo, content: data.content });
      }
      setStep('contract');
    } catch (err: unknown) {
      setError({
        title: 'Verification Failed',
        message:
          err instanceof Error ? err.message : 'Invalid or expired verification code.',
      });
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Submit signature ───────────────────────────────────────────────────────
  const handleSubmitSignature = async () => {
    if (!token || !signatureData || !signerName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/contracts/sign/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          signer_name: signerName.trim(),
          signer_title: signerTitle.trim() || undefined,
          signature_data: signatureData,
          signature_type: signatureType,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setStep('success');
    } catch (err: unknown) {
      setError({
        title: 'Submission Failed',
        message:
          err instanceof Error ? err.message : 'Unable to submit your signature. Please try again.',
      });
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  // ── Signature pad callback ─────────────────────────────────────────────────
  const handleSignatureChange = useCallback(
    (data: string | null, type: 'typed' | 'drawn') => {
      setSignatureData(data);
      setSignatureType(type);
    },
    []
  );

  // ── Masked email ───────────────────────────────────────────────────────────
  const maskedEmail = contractInfo?.signer_email
    ? (() => {
        const [local, domain] = contractInfo.signer_email.split('@');
        const visible = local.slice(0, 2);
        return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
      })()
    : '****@****.com';

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  const showProgress = ['landing', 'otp', 'contract', 'sign'].includes(step);

  return (
    <div className="min-h-screen bg-[#0f0f23] flex flex-col">
      {/* ── Header ── */}
      <header className="border-b border-gray-800 bg-[#0f0f23] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Zietra</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          Secure Signing
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {showProgress && <ProgressBar currentStep={step} />}

          {/* ── LANDING STEP ── */}
          {step === 'landing' && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-8 text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-indigo-600/20 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-indigo-400" />
                </div>
              </div>

              {contractInfo ? (
                <>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                      Contract Ready for Signature
                    </h1>
                    <p className="text-gray-400 text-sm leading-relaxed">
                      <span className="font-medium text-gray-300">{contractInfo.sender_name}</span>{' '}
                      has sent you a{' '}
                      <span className="font-medium text-gray-300">{contractInfo.type}</span> titled{' '}
                      <span className="font-medium text-gray-300">"{contractInfo.title}"</span> for
                      your review and signature.
                    </p>
                  </div>

                  <button
                    onClick={() => setStep('otp')}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Verify Your Identity to Continue
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : loading ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                  <p className="text-gray-400 text-sm">Loading contract details…</p>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No contract information available.</p>
              )}
            </div>
          )}

          {/* ── OTP STEP ── */}
          {step === 'otp' && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-8 space-y-6">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-14 h-14 rounded-full bg-indigo-600/20 flex items-center justify-center">
                    <Mail className="w-7 h-7 text-indigo-400" />
                  </div>
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Verify Your Email</h2>
                <p className="text-gray-400 text-sm">
                  We'll send a 6-digit code to{' '}
                  <span className="text-indigo-400 font-medium">{maskedEmail}</span>
                </p>
              </div>

              {!otpSent ? (
                <button
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                  Send Verification Code
                </button>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs text-gray-400 mb-3 text-center">
                      Enter the 6-digit code sent to your email
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center tracking-[0.5em] text-2xl font-mono px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading || otpCode.length !== 6}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                  >
                    {loading ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    Verify &amp; Continue
                  </button>

                  <button
                    onClick={() => {
                      setOtpSent(false);
                      setOtpCode('');
                    }}
                    className="w-full text-sm text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Resend code
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── CONTRACT STEP ── */}
          {step === 'contract' && contractInfo && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{contractInfo.title}</h2>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="px-2 py-0.5 bg-indigo-600/20 text-indigo-400 rounded text-xs font-medium">
                    {contractInfo.type}
                  </span>
                  <span>From: {contractInfo.sender_name}</span>
                </div>
              </div>

              {/* Scrollable contract content */}
              <div className="h-72 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 p-5">
                {contractInfo.content ? (
                  <div
                    className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: contractInfo.content }}
                  />
                ) : (
                  <p className="text-gray-500 text-sm italic text-center py-8">
                    Contract content will appear here.
                  </p>
                )}
              </div>

              {/* Agree checkbox */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="sr-only"
                  />
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      agreedToTerms
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-gray-600 group-hover:border-indigo-500'
                    }`}
                  >
                    {agreedToTerms && (
                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-300">
                  I have read and agree to the terms and conditions set forth in this contract.
                </span>
              </label>

              <button
                onClick={() => setStep('sign')}
                disabled={!agreedToTerms}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                <Pen className="w-4 h-4" />
                Continue to Sign
              </button>
            </div>
          )}

          {/* ── SIGN STEP ── */}
          {step === 'sign' && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Sign the Contract</h2>
                <p className="text-gray-400 text-sm">
                  Add your signature below to complete the signing process.
                </p>
              </div>

              {/* Signer name */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Full Legal Name *</label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your full legal name"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Signer title */}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Title / Position{' '}
                  <span className="text-gray-600">(optional)</span>
                </label>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => setSignerTitle(e.target.value)}
                  placeholder="e.g. CEO, Director"
                  className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Signature pad */}
              <div>
                <label className="block text-xs text-gray-400 mb-2">Signature *</label>
                <SignaturePad onSignatureChange={handleSignatureChange} />
              </div>

              {/* Legal consent */}
              <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-800 pt-4">
                By clicking "Sign Contract", you agree that this electronic signature is the legal
                equivalent of your manual signature on this document, and you consent to be legally
                bound by this contract's terms and conditions.
              </p>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('contract')}
                  disabled={loading}
                  className="flex-1 py-3 px-4 rounded-xl border border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white text-sm font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmitSignature}
                  disabled={loading || !signatureData || !signerName.trim()}
                  className="flex-[2] flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <Pen className="w-4 h-4" />
                  )}
                  Sign Contract
                </button>
              </div>
            </div>
          )}

          {/* ── SUCCESS STEP ── */}
          {step === 'success' && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-10 text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  Contract Signed Successfully
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Thank you for signing. A copy of the executed contract will be sent to your email
                  address for your records.
                </p>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-5 py-3">
                <p className="text-green-400 text-xs">
                  All parties will be notified by email with a signed copy attached.
                </p>
              </div>
            </div>
          )}

          {/* ── ERROR STEP ── */}
          {step === 'error' && error && (
            <div className="bg-[#1a1a2e] rounded-2xl border border-gray-800 p-10 text-center space-y-5">
              <div className="flex justify-center">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">{error.title}</h2>
                <p className="text-gray-400 text-sm leading-relaxed">{error.message}</p>
              </div>
              <button
                onClick={() => {
                  setError(null);
                  setStep('landing');
                }}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-800 py-4 text-center">
        <p className="text-xs text-gray-600">
          Powered by Zietra &bull; Secure Electronic Signature
        </p>
      </footer>
    </div>
  );
}
