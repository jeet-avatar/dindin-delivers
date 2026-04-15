import React from "react";
import clsx from "clsx";

interface SocialButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export default function SocialButton({ icon, label, onClick }: SocialButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full px-4 py-3 border border-slate-700 rounded-full flex items-center justify-center gap-2 hover:bg-slate-800 transition"
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
