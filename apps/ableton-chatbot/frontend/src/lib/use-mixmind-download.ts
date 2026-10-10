"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, isLoggedIn } from "@/lib/auth";

// The installer has no public URL of its own — /api/mixmind/download hands back a signed link that
// expires in minutes, and only to a signed-in account on a plan that includes MixMind.
export function useMixMindDownload(returnTo: string) {
  const router = useRouter();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function download(event?: React.MouseEvent) {
    event?.preventDefault();
    const login = `/login?redirect=${encodeURIComponent(returnTo)}`;
    if (!isLoggedIn()) {
      router.push(login);
      return;
    }
    setError("");
    setDownloading(true);
    try {
      const res = await apiFetch("/api/mixmind/download");
      if (res.status === 401) {
        router.push(login);
        return;
      }
      if (res.status === 402) {
        router.push("/dashboard?upgrade=mixmind");
        return;
      }
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setError("Couldn't start the download. Please try again in a moment.");
    } finally {
      setDownloading(false);
    }
  }

  return { download, downloading, error };
}
