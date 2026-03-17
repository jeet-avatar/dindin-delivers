"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuth, API_URL } from "@/lib/auth";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      saveAuth(data.token, data.user);
      router.push("/dashboard");
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
          <h1 className="text-2xl font-bold">Start your free trial</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>7 days free, then $19/month</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border p-8 space-y-4" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)" }} noValidate>
          {error && (
            <div role="alert" className="text-sm px-4 py-3 rounded-lg" style={{ background: "#3f1212", color: "#fca5a5" }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">Full name</label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              placeholder="Your name"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5">Password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                placeholder="At least 8 characters"
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
            <p className="text-xs mt-1.5" style={{ color: "var(--text-secondary)" }}>
              Must be 8+ characters with one uppercase letter and one number
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity duration-150 disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {loading ? "Creating account..." : "Start free trial \u2192"}
          </button>

          <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
            No credit card required &middot; Cancel anytime
          </p>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--accent)" }}>Sign in</Link>
        </p>

        <p className="text-xs text-center mt-4" style={{ color: "var(--text-secondary)" }}>
          By signing up you agree to our{" "}
          <Link href="/terms" className="underline hover:text-white transition-colors duration-150">Terms</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-white transition-colors duration-150">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
