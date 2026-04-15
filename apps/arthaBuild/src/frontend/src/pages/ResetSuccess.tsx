// src/pages/ResetSuccess.tsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";

export default function ResetSuccess() {
  const nav = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => nav("/log-in"), 2500); // redirect after 2.5s
    return () => clearTimeout(timer);
  }, [nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-chatbg text-white">
      <div className="w-full max-w-md p-8 flex flex-col items-center gap-4 bg-panel rounded-lg shadow-lg text-center">
        <CheckCircle className="h-16 w-16 text-green-400" />

        <h1 className="text-2xl font-semibold text-green-400">
          Password reset successful 🎉
        </h1>

        <p className="text-gray-300">
          You can now use your new password to log in. Redirecting...
        </p>

        <button
          onClick={() => nav("/log-in")}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium"
        >
          Go to login
        </button>
      </div>
    </div>
  );
}
