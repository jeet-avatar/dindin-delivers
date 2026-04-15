import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // await login(email || "alice@example.com");
    nav("/chat/new");
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={submit} className="bg-panel p-6 rounded w-full max-w-[420px] mx-4">
        <h2 className="text-xl font-semibold mb-4">Login</h2>
        <label className="block text-sm mb-1">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-slate-900 border"
        />
        <div className="mt-4 flex justify-end">
          <button className="px-4 py-2 rounded bg-indigo-600">Continue</button>
        </div>
      </form>
    </div>
  );
}
