"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/auth";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Invalid or missing reset token.</p>
        <Link href="/forgot-password" className="inline-block mt-4 text-sm font-medium" style={{ color: "var(--accent)" }}>
          Request a new link
        </Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }}>
        <div className="text-3xl mb-4">✅</div>
        <h2 className="font-semibold text-lg mb-2">Password updated</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border p-8 space-y-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} noValidate>
      {error && (
        <div role="alert" className="text-sm px-4 py-3 rounded-lg" style={{ background: "#3f1212", color: "#fca5a5" }}>
          {error}
        </div>
      )}
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1.5">New password</label>
        <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>Min 8 characters, one uppercase, one number</p>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            placeholder="New password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-opacity duration-150 hover:opacity-70"
            style={{ color: "var(--text-secondary)" }}>
            {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
          </button>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity duration-150 disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#fff" }}
      >
        {loading ? "Updating..." : "Set new password →"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-primary)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-xl mb-6" aria-label="BeatMind home">
            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
            beatmind
          </Link>
          <h1 className="text-2xl font-bold">Set a new password</h1>
        </div>
        <Suspense fallback={<div className="text-center text-sm" style={{ color: "var(--text-secondary)" }}>Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
