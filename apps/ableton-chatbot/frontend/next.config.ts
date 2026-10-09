import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default function config(phase: string): NextConfig {
  if (phase === PHASE_PRODUCTION_BUILD) {
    const value = process.env.NEXT_PUBLIC_API_URL;
    let url: URL | undefined;
    try { url = value ? new URL(value) : undefined; } catch { /* Report a configuration error below. */ }
    if (!url || url.protocol !== "https:" || url.origin !== value || url.username || url.password ||
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || url.hostname.endsWith(".localhost")) {
      throw new Error("Production build requires NEXT_PUBLIC_API_URL set to the deployed HTTPS API origin (no trailing slash). Localhost fallback is development-only.");
    }
  }
  return nextConfig;
}
