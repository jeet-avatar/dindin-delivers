import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { forgotPassword } from "../services/authService";
import { Loader2, Mail } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email address.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
        <div className="w-full max-w-md p-8 flex flex-col items-center gap-4 bg-panel rounded-lg shadow-lg text-center">
          <div className="h-16 w-16 rounded-full bg-indigo-600/20 flex items-center justify-center">
            <Mail className="h-8 w-8 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-semibold">Check your inbox</h1>
          <p className="text-gray-400">
            If an account with that email exists, you'll receive a password reset link shortly.
            Check your spam folder if you don't see it.
          </p>
          <button
            onClick={() => nav("/log-in")}
            className="text-indigo-400 hover:text-indigo-300 text-sm"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md p-8 flex flex-col gap-4 bg-panel rounded-lg shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-center">Forgot password?</h1>
        <p className="text-sm text-gray-400 text-center">
          Enter your email address and we'll send you reset instructions.
        </p>

        <div className="flex flex-col gap-1">
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="Email address"
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
          {loading ? "Sending..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
