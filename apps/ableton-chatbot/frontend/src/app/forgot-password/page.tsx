"use client";

import Link from "next/link";
import { useState } from "react";
import { API_URL } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Something went wrong");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6" aria-label="BeatMind home">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
            beatmind
          </Link>
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
            <div className="text-3xl mb-4">📬</div>
            <h2 className="font-semibold text-lg mb-2">Check your email</h2>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              If <strong>{email}</strong> has an account, a reset link is on its way. Check your spam folder if you don&apos;t see it.
            </p>
            <Link href="/login" className="inline-block mt-6 text-sm font-medium" style={{ color: "var(--accent)" }}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border p-8 space-y-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} noValidate>
            {error && (
              <div role="alert" className="text-sm px-4 py-3 rounded-lg" style={{ background: "#3f1212", color: "#fca5a5" }}>
                {error}
              </div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity duration-150 disabled:opacity-50"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {loading ? "Sending..." : "Send reset link →"}
            </button>
          </form>
        )}

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
          <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
