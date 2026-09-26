"use client";

import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatText({ text }: { text: string }) {
  return <div className="text-sm leading-relaxed min-w-0 break-words space-y-3" aria-label="Assistant response">
    <Markdown remarkPlugins={[remarkGfm]} skipHtml components={{
      h1: ({ children }) => <h3 className="text-base font-semibold mt-3">{children}</h3>,
      h2: ({ children }) => <h3 className="text-sm font-semibold mt-3">{children}</h3>,
      h3: ({ children }) => <h4 className="text-sm font-semibold mt-3">{children}</h4>,
      p: ({ children }) => <p className="my-2">{children}</p>,
      ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 my-2">{children}</ul>,
      ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 my-2">{children}</ol>,
      table: ({ children }) => <div className="overflow-x-auto max-w-full my-3"><table className="text-xs text-left w-full">{children}</table></div>,
      th: ({ children }) => <th className="p-2 border-b font-semibold align-top" style={{ borderColor: "var(--border)" }}>{children}</th>,
      td: ({ children }) => <td className="p-2 border-b align-top" style={{ borderColor: "var(--border)" }}>{children}</td>,
      pre: ({ children }) => <pre className="overflow-x-auto p-3 rounded text-xs" style={{ background: "var(--bg-primary)" }}>{children}</pre>,
      code: ({ children }) => <code className="text-xs break-all">{children}</code>,
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="underline">{children}</a>,
      img: ({ alt }) => <span>{alt}</span>,
    }}>{text}</Markdown>
  </div>;
}
