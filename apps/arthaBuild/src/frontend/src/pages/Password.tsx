import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Apple, Phone } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import SocialButton from "../components/SocialButton";
import GoogleLogo from "../assets/google.svg";
import MicrosoftLogo from "../assets/microsoft.svg";

export default function PasswordPage() {
  const nav = useNavigate();
  const location = useLocation();
  const email = (location.state as { email: string })?.email || "";
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
        await login({ username: email, password });
        nav("/dashboard");
    } catch (err: any) {
        setError(err.message || "Invalid email or password");
    } finally {
        setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-chatbg text-white">
      <form
        onSubmit={submit}
        className="w-full max-w-md p-8 flex flex-col gap-4 bg-panel rounded-lg shadow-lg"
      >
        <h1 className="text-2xl font-semibold text-center">
          Enter your password
        </h1>

        <div className="text-sm text-gray-400">Email address</div>
        <div className="flex items-center justify-between bg-slate-800 px-4 py-3 rounded-full border border-slate-700">
          <span>{email}</span>
          <button
            type="button"
            onClick={() => nav("/log-in")}
            className="text-indigo-400 text-sm hover:underline"
          >
            Edit
          </button>
        </div>

        <div className="relative flex flex-col gap-1">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(""); // clear error when typing
            }}
            placeholder="Password"
            className={`w-full px-4 py-3 bg-slate-800 border rounded-full focus:outline-none ${
              error
                ? "border-red-500 focus:ring-2 focus:ring-red-500"
                : "border-slate-700 focus:ring-2 focus:ring-indigo-500"
            }`}
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute inset-y-0 right-4 flex items-center text-gray-400"
          >
            {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Forgot password link */}
        <div className="text-right">
            <button
                type="button"
                onClick={() => nav("/forgot-password")}
                className="text-indigo-400 text-sm hover:underline"
            >
                Forgot password?
            </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Continue"}
        </button>

        <div className="flex items-center gap-2 my-2">
          <div className="flex-1 border-t border-slate-700" />
          <span className="text-xs text-gray-500">OR</span>
          <div className="flex-1 border-t border-slate-700" />
        </div>

        <SocialButton icon={<img src={GoogleLogo} alt="Google" className="h-5 w-5" />} label="Continue with Google"/>
        <SocialButton icon={<img src={MicrosoftLogo} alt="Microsoft" className="h-5 w-5" />} label="Continue with Microsoft"/>
        <SocialButton icon={<Apple className="h-5 w-5" />} label="Continue with Apple" />

        <div className="flex justify-center items-center text-sm text-gray-400 mt-4 gap-1">
          <span>Don't have an account?</span>
          <a href="/create-account" className="text-blue-400 hover:underline font-medium">
            Create account
          </a>
        </div>

        <div className="flex justify-center items-center text-xs text-gray-400 mt-2 gap-2">
          <a href="#" className="hover:underline">
            Terms of Use
          </a>
          <span>|</span>
          <a href="#" className="hover:underline">
            Privacy Policy
          </a>
        </div>
      </form>
    </div>
  );
}
