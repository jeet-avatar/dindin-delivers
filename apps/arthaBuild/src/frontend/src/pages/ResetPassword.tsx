import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { resetPassword } from "../services/authService";
import { Loader2 } from "lucide-react";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(pw)) return "Password must contain at least one lowercase letter";
  if (!/\d/.test(pw)) return "Password must contain at least one number";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return "Password must contain at least one special character";
  return null;
}

export default function ResetPassword() {
  const nav = useNavigate();
  const { token } = useParams<{ token: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }
    const valErr = validatePassword(password);
    if (valErr) {
      setError(valErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token!, password);
      nav("/reset-success");
    } catch (err: any) {
      nav("/reset-failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md p-8 flex flex-col gap-4 bg-panel rounded-lg shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-center">Reset password</h1>
        <p className="text-sm text-gray-400 text-center">
          Enter your new password
        </p>

        <div className="flex flex-col gap-1">
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="New password"
            className={`w-full px-4 py-3 bg-slate-800 rounded-full focus:outline-none ${
              error
                ? "border border-red-500 focus:ring-2 focus:ring-red-500"
                : "border border-slate-700 focus:ring-2 focus:ring-indigo-500"
            }`}
          />
        </div>

        <div className="flex flex-col gap-1">
          <input
            type="password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError("");
            }}
            placeholder="Confirm password"
            className={`w-full px-4 py-3 bg-slate-800 rounded-full focus:outline-none ${
              error
                ? "border border-red-500 focus:ring-2 focus:ring-red-500"
                : "border border-slate-700 focus:ring-2 focus:ring-indigo-500"
            }`}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-500 text-white rounded-full font-medium"
        >
          {loading && <Loader2 className="h-5 w-5 animate-spin" />}
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
