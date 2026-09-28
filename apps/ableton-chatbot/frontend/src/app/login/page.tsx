"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveAuth, API_URL } from "@/lib/auth";
import { parsePlanIntent, planIntentQuery } from "@/lib/billing";
import { EyeIcon, EyeOffIcon } from "@/components/Icons";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // A plan picked on the public site (?plan=&interval=) is carried to the dashboard plan picker.
  const [planQuery, setPlanQuery] = useState("");
  // Where to send the user after signing in — a page like /mixmind that sent them here to authenticate
  // first. Only an internal path is honored, so this can't be turned into an open redirect.
  const [redirectTo, setRedirectTo] = useState("");
  useEffect(() => {
    setPlanQuery(planIntentQuery(parsePlanIntent(window.location.search)));
    const redirect = new URLSearchParams(window.location.search).get("redirect");
    setRedirectTo(redirect && redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "");
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      saveAuth(data.token, data.user);
      // Users without a plan choose one in the dashboard; never force Stripe Checkout at sign-in.
      router.push(redirectTo || `/dashboard${planQuery}`);
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
          <h1 className="text-2xl font-bold">Welcome back</h1>
        </div>

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
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <Link href="/forgot-password" className="text-xs" style={{ color: "var(--accent)" }}>Forgot password?</Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl px-4 py-3 pr-12 text-sm outline-none"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                placeholder="Your password"
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
            {loading ? "Signing in..." : "Sign in \u2192"}
          </button>
        </form>

        <p className="text-center text-sm mt-6" style={{ color: "var(--text-secondary)" }}>
          No account?{" "}
          <Link href={`/signup${planQuery}`} className="font-medium" style={{ color: "var(--accent)" }}>Start free trial</Link>
        </p>
      </div>
    </div>
  );
}
