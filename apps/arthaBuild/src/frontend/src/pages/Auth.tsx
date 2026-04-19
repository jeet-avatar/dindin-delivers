import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { checkEmail } from "../services/authService";
import Logo from "../components/Logo";
import MotionButton from "../components/MotionButton";
import { motion } from "framer-motion";

const OAUTH_ERRORS: Record<string, string> = {
  google_denied: "Google sign-in was cancelled.",
  token_exchange_failed: "Google sign-in failed. Please try again.",
  invalid_state: "Google sign-in session expired. Please try again.",
};

export default function Auth() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();

  // Show OAuth error from redirect (e.g. company_email_required)
  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError && OAUTH_ERRORS[oauthError]) {
      setError(OAUTH_ERRORS[oauthError]);
    }
  }, [searchParams]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { setError("Invalid email address."); return; }

    setLoading(true);
    try {
      const exists = await checkEmail(email);
      if (exists) {
        nav("/log-in/password", { state: { email } });
      } else {
        setError("No account found with this email. Please sign up.");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const buildTs = typeof __BUILD_TS__ !== "undefined" ? __BUILD_TS__ as string : "";
  const buildLabel = buildTs
    ? new Date(buildTs).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" })
    : "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white px-4 relative">
      {/* Logo + Card grouped into one centered block */}
       <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center w-full max-w-sm sm:max-w-md"
      >
        {/* Logo */}
        <div className="mb-6">
          <Logo />
        </div>

        {/* Card */}
        <motion.form
          onSubmit={submit}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
          className="w-full p-8 flex flex-col gap-4 bg-panel rounded-2xl shadow-xl"
        >
          <h1 className="text-2xl font-semibold text-center">Log in</h1>
          <p className="text-center text-sm text-gray-400">
            You’ll get smarter responses and can upload files, images, and more.
          </p>
          
          <div className="flex flex-col gap-1">
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(""); // clear error on typing
              }}
              placeholder="Email address"
              className={`w-full px-4 py-3 bg-slate-800 rounded-full focus:outline-none ${
                error
                  ? "border border-red-500 focus:ring-2 focus:ring-red-500"
                  : "border border-slate-700 focus:ring-2 focus:ring-indigo-500"
              }`}
            />
            {error && <div className="text-red-400 text-sm">{error}</div>}
          </div>
          
          {/* <button
            type="submit"
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium"
          > Continue
          </button> */}
          <MotionButton loading={loading} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-indigo-500/40 transition-shadow duration-300">Continue</MotionButton>

          <div className="flex justify-center items-center text-sm text-gray-400 mt-4 gap-1">
            <span>Don't have an account?</span>
            <Link to="/create-account" className="text-blue-400 hover:underline font-medium">
              Create account
            </Link>
          </div>

          <div className="flex justify-center items-center text-xs text-gray-400 mt-2 gap-2">
            <MotionButton
              as="a"
              href="/privacy"
              className="text-xs text-gray-400 hover:underline w-auto px-2 py-1"
            >Privacy Policy</MotionButton>
            {/* <span>|</span> */}
            <MotionButton
              as="a"
              href="/terms"
              className="text-xs text-gray-400 hover:underline w-auto px-2 py-1"
            >Terms of Use</MotionButton>
          </div>
        </motion.form>
      </motion.div>
      {buildLabel && (
        <div className="fixed bottom-3 right-4 text-[10px] text-slate-600 select-none pointer-events-none">
          artha.build · {buildLabel}
        </div>
      )}
    </div>
  );
}
