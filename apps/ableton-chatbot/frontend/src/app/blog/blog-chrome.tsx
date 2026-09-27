import Link from "next/link";
import { LEGAL_NAME, SUPPORT_EMAIL } from "@/lib/site";

export function BlogNav() {
  return (
    <nav aria-label="Main navigation" className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto border-b" style={{ borderColor: "var(--border)" }}>
      <Link href="/" className="flex items-center gap-2 font-bold text-xl">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
        beatmind
      </Link>
      <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--text-secondary)" }}>
        <Link href="/" className="hover:text-white transition-colors duration-150">BeatMind</Link>
        <Link href="/mixmind" className="hover:text-white transition-colors duration-150">MixMind</Link>
        <Link href="/blog" className="hover:text-white transition-colors duration-150" style={{ color: "var(--text-primary)" }}>Blog</Link>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm px-4 py-2 rounded-lg transition-colors duration-150 hover:text-white" style={{ color: "var(--text-secondary)" }}>
          Sign in
        </Link>
        <Link href="/signup" className="text-sm px-4 py-2 rounded-lg font-medium transition-opacity duration-150 hover:opacity-90" style={{ background: "var(--accent)", color: "#fff" }}>
          Try free &rarr;
        </Link>
      </div>
    </nav>
  );
}

export function BlogFooter() {
  return (
    <footer className="border-t px-6 py-10" style={{ borderColor: "var(--border)" }}>
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm font-bold">
          <span className="w-6 h-6 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }} aria-hidden="true">B</span>
          beatmind
        </div>
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          &copy; 2026 {LEGAL_NAME}
        </div>
        <nav aria-label="Footer links">
          <div className="flex items-center gap-6 text-xs" style={{ color: "var(--text-secondary)" }}>
            <Link href="/mixmind" className="hover:text-white transition-colors duration-150">MixMind</Link>
            <Link href="/blog" className="hover:text-white transition-colors duration-150">Blog</Link>
            <Link href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors duration-150">Terms</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-white transition-colors duration-150">Support</a>
          </div>
        </nav>
      </div>
    </footer>
  );
}
