"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const THEMES: { value: Theme; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "classic", label: "Classic" },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("live");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "classic" ? "classic" : "live");
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing can block storage; the choice still applies for this page.
    }
  }

  return (
    <div role="group" aria-label="Colour theme" className={`inline-flex rounded-full border p-0.5 text-xs ${className}`}
      style={{ borderColor: "var(--border)" }}>
      {THEMES.map(option => (
        <button key={option.value} type="button" onClick={() => choose(option.value)} aria-pressed={theme === option.value}
          className="px-3 py-1 rounded-full transition-colors duration-150"
          style={theme === option.value
            ? { background: "var(--accent)", color: "var(--on-accent)" }
            : { color: "var(--text-secondary)" }}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
