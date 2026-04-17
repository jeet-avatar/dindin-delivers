/**
 * NetSuiteModal — TBA credential entry modal.
 *
 * Provides a 5-field form for NetSuite TBA credentials.
 * On success: stores connection status in component state, notifies parent.
 */
import { useState, useEffect } from "react";
import { Eye, EyeOff, X, CheckCircle, Loader2 } from "lucide-react";
import { netsuiteService, type TBACredentials, type NetSuiteStatus } from "../services/netsuiteService";

interface NetSuiteModalProps {
  onStatusChange?: (status: NetSuiteStatus) => void;
}

export default function NetSuiteModal({ onStatusChange }: NetSuiteModalProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<NetSuiteStatus>({ authenticated: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState<TBACredentials>({
    account_id: "",
    token_key: "",
    token_secret: "",
    consumer_key: "",
    consumer_secret: "",
  });

  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({
    token_secret: false,
    consumer_secret: false,
  });

  // Fetch current connection status on mount
  useEffect(() => {
    netsuiteService.getStatus().then((s) => {
      setStatus(s);
      onStatusChange?.(s);
    });
  }, []);

  const handleChange = (field: keyof TBACredentials) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError(null);
  };

  const toggleShow = (field: string) => {
    setShowSecret((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await netsuiteService.authenticate(form);
      const newStatus: NetSuiteStatus = {
        authenticated: true,
        account_name: result.account_name,
        account_id: form.account_id,
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      setSuccess(true);
      // Close modal after short delay to show success state
      setTimeout(() => setOpen(false), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Connection failed";
      if (message.includes("503") || message.includes("SuiteCloud")) {
        setError("SuiteCloud CLI not available on server");
      } else if (message.includes("401") || message.includes("Invalid")) {
        setError("Invalid credentials — check Account ID and all four token/consumer fields");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await netsuiteService.logout();
    } catch {
      // ignore logout errors
    }
    const disconnected: NetSuiteStatus = { authenticated: false };
    setStatus(disconnected);
    onStatusChange?.(disconnected);
    setSuccess(false);
    setForm({ account_id: "", token_key: "", token_secret: "", consumer_key: "", consumer_secret: "" });
  };

  const isFormComplete = Object.values(form).every((v) => v.trim().length > 0);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm"
      >
        {/* Status dot */}
        <span
          className={`w-2 h-2 rounded-full ${
            status.authenticated ? "bg-green-400" : "bg-orange-400"
          }`}
        />
        {status.authenticated
          ? `NetSuite: ${status.account_name || status.account_id || "Connected"}`
          : "Connect NetSuite"}
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="relative w-full max-w-md mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white text-lg font-semibold">NetSuite TBA Credentials</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-gray-700 transition"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Already connected state */}
            {status.authenticated && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-900/40 border border-green-700 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                <span className="text-green-300 text-sm">
                  Connected to {status.account_name || status.account_id}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="ml-auto text-xs text-red-400 hover:text-red-300 transition"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Form */}
            <div className="space-y-4">
              {/* Account ID */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Account ID</label>
                <input
                  type="text"
                  placeholder="e.g. 7220160_SB2"
                  value={form.account_id}
                  onChange={handleChange("account_id")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Consumer Key */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Consumer Key</label>
                <input
                  type="text"
                  placeholder="Consumer Key from NetSuite OAuth setup"
                  value={form.consumer_key}
                  onChange={handleChange("consumer_key")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Consumer Secret */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Consumer Secret</label>
                <div className="relative">
                  <input
                    type={showSecret.consumer_secret ? "text" : "password"}
                    placeholder="Consumer Secret"
                    value={form.consumer_secret}
                    onChange={handleChange("consumer_secret")}
                    className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow("consumer_secret")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showSecret.consumer_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Token Key */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Token Key</label>
                <input
                  type="text"
                  placeholder="Token ID / Token Key"
                  value={form.token_key}
                  onChange={handleChange("token_key")}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Token Secret */}
              <div>
                <label className="block text-sm text-gray-300 mb-1">Token Secret</label>
                <div className="relative">
                  <input
                    type={showSecret.token_secret ? "text" : "password"}
                    placeholder="Token Secret"
                    value={form.token_secret}
                    onChange={handleChange("token_secret")}
                    className="w-full px-3 py-2 pr-10 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => toggleShow("token_secret")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showSecret.token_secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 px-3 py-2 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Connected successfully
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={loading || !isFormComplete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  "Connect"
                )}
              </button>
            </div>

            {/* Security note */}
            <p className="mt-4 text-xs text-gray-500 text-center">
              Credentials are held only in server memory — never stored to disk or database.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
