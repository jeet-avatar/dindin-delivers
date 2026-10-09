import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const MUTED = { color: "var(--text-secondary)" };

const components: Components = {
  // The page renders the post title as the only h1.
  h1: ({ children }) => <h2 className="text-2xl md:text-3xl font-bold mt-12 mb-4" style={{ color: "var(--text-primary)" }}>{children}</h2>,
  h2: ({ children }) => <h2 className="text-2xl md:text-3xl font-bold mt-12 mb-4" style={{ color: "var(--text-primary)" }}>{children}</h2>,
  h3: ({ children }) => <h3 className="text-xl font-semibold mt-8 mb-3" style={{ color: "var(--text-primary)" }}>{children}</h3>,
  h4: ({ children }) => <h4 className="text-lg font-semibold mt-6 mb-2" style={{ color: "var(--text-primary)" }}>{children}</h4>,
  p: ({ children }) => <p className="text-base leading-relaxed my-5" style={MUTED}>{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 my-5 space-y-2" style={MUTED}>{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 my-5 space-y-2" style={MUTED}>{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 pl-5 my-6 italic" style={{ borderColor: "var(--accent)", color: "var(--text-secondary)" }}>{children}</blockquote>
  ),
  hr: () => <hr className="my-10" style={{ borderColor: "var(--border)" }} />,
  a: ({ href = "", children }) => {
    const className = "underline underline-offset-2 hover:opacity-80 transition-opacity duration-150";
    if (href.startsWith("/")) {
      return <Link href={href} className={className} style={{ color: "var(--accent)" }}>{children}</Link>;
    }
    return <a href={href} className={className} style={{ color: "var(--accent)" }} rel="noopener noreferrer" target={href.startsWith("#") ? undefined : "_blank"}>{children}</a>;
  },
  code: ({ className, children }) => {
    if (className) return <code className={`${className} text-sm`}>{children}</code>;
    return <code className="px-1.5 py-0.5 rounded text-sm" style={{ background: "var(--bg-tertiary)", color: "var(--text-primary)" }}>{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-6 p-4 rounded-xl border overflow-x-auto text-sm" style={{ background: "var(--bg-secondary)", borderColor: "var(--border)", color: "var(--text-primary)" }}>{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: "var(--bg-secondary)", color: "var(--text-primary)" }}>{children}</thead>,
  th: ({ children }) => <th className="px-4 py-3 font-semibold border-b" style={{ borderColor: "var(--border)" }}>{children}</th>,
  td: ({ children }) => <td className="px-4 py-3 border-b align-top" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>{children}</td>,
  img: ({ src, alt }) => (
    <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" className="my-6 rounded-xl border max-w-full" style={{ borderColor: "var(--border)" }} />
  ),
};

export function PostMarkdown({ body }: { body: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {body}
    </ReactMarkdown>
  );
}
