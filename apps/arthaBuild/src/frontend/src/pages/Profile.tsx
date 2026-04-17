import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../hooks/useAuth";
import { User, LogOut, Key, Loader2 } from "lucide-react";
import { changePassword } from "../services/authService";

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "At least 8 characters required";
  if (!/[A-Z]/.test(pw)) return "Must contain an uppercase letter";
  if (!/[a-z]/.test(pw)) return "Must contain a lowercase letter";
  if (!/\d/.test(pw)) return "Must contain a number";
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(pw)) return "Must contain a special character";
  return null;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwSuccess(false);
    const valErr = validatePassword(newPw);
    if (valErr) {
      setPwError(valErr);
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match");
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(oldPw, newPw);
      setPwSuccess(true);
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: any) {
      setPwError(err.response?.data?.detail || err.message || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  }

  return (
    <div className="h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>

        {/* Profile info card */}
        <div className="p-4 bg-slate-900 rounded flex items-center gap-3 mb-6">
          <User className="h-6 w-6 text-slate-400" />
          <div>
            <div className="font-medium">{user?.name ?? "Guest"}</div>
            <div className="text-sm text-slate-400">
              {user?.email ?? "guest@example.com"}
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div id="change-password" className="p-4 bg-slate-900 rounded mb-4">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Key className="h-4 w-4" /> Change Password
          </h3>
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3 max-w-sm">
            <input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              placeholder="Current password"
              required
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm placeholder-gray-500"
            />
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="New password"
              required
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm placeholder-gray-500"
            />
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="Confirm new password"
              required
              className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-white text-sm placeholder-gray-500"
            />
            {pwError && <p className="text-red-400 text-xs">{pwError}</p>}
            {pwSuccess && (
              <p className="text-green-400 text-xs">Password updated successfully.</p>
            )}
            <button
              type="submit"
              disabled={pwLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded text-sm font-medium flex items-center gap-2 w-fit"
            >
              {pwLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              Update password
            </button>
          </form>
        </div>

        {/* Sign out */}
        <button
          onClick={logout}
          className="px-3 py-2 rounded bg-red-600 flex items-center gap-2 hover:bg-red-500 text-sm"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </main>
    </div>
  );
}
