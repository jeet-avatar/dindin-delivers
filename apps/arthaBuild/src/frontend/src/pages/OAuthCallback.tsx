import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken } from "../services/api";
import { storage } from "../lib/storage";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    const token = params.get("token");
    const refresh_token = params.get("refresh_token");
    const first_name = params.get("first_name") ?? "";
    const last_name = params.get("last_name") ?? "";
    const email = params.get("email") ?? "";
    const role = (params.get("role") ?? "user") as "admin" | "user";
    const error = params.get("error");

    if (error) {
      nav("/log-in?error=" + error, { replace: true });
      return;
    }

    if (!token || !email) {
      setDebugInfo(`Missing params — token:${token ? "yes" : "no"} email:${email || "empty"}`);
      setTimeout(() => nav("/log-in?error=missing_token", { replace: true }), 3000);
      return;
    }

    // Store token in memory (same pattern as email/password login)
    setAccessToken(token);

    const user = {
      name: `${first_name} ${last_name}`.trim() || email,
      first_name,
      last_name,
      role,
      email,
    };
    storage.set("auth_user", user);

    nav("/chat/new", { replace: true });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white flex-col gap-3">
      <p className="text-gray-400 text-sm">Signing you in…</p>
      {debugInfo && (
        <p className="text-red-400 text-xs bg-red-900/30 px-4 py-2 rounded">{debugInfo}</p>
      )}
    </div>
  );
}
