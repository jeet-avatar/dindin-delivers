import React from "react";
import clsx from "clsx";

export default function Button({
  children,
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={clsx(
        "px-3 py-1 rounded-md bg-slate-700 hover:bg-slate-600 text-sm",
        className
      )}
    >
      {children}
    </button>
  );
}
