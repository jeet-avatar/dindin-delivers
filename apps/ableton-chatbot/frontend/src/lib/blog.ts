// Build-time blog loader for content/blog/*.md (server components only).
import fs from "node:fs";
import path from "node:path";
import type { Faq } from "@/lib/faqs";

export type BlogProduct = "beatmind" | "mixmind";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated: string;
  author: string;
  product: BlogProduct;
  keywords: string[];
  body: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
const FAQ_HEADING = /^##\s+(FAQs?|Frequently asked questions)\s*$/im;

function unquote(value: string): string {
  const trimmed = value.trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote) && trimmed.length >= 2) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

function parseFrontmatter(source: string): { fields: Record<string, string>; body: string } {
  const match = source.match(FRONTMATTER);
  if (!match) return { fields: {}, body: source };
  const fields: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator <= 0 || line.trimStart().startsWith("#")) continue;
    const key = line.slice(0, separator).trim();
    // Drop a trailing "# comment" that follows a quoted value.
    const raw = line.slice(separator + 1).replace(/(["'])\s+#.*$/, "$1");
    fields[key] = unquote(raw);
  }
  return { fields, body: source.slice(match[0].length) };
}

function readPost(fileName: string): BlogPost {
  const slug = fileName.replace(/\.md$/, "");
  const { fields, body } = parseFrontmatter(fs.readFileSync(path.join(BLOG_DIR, fileName), "utf8"));
  if (!fields.title || !fields.date) {
    throw new Error(`content/blog/${fileName} must define "title" and "date" in its frontmatter.`);
  }
  return {
    slug,
    title: fields.title,
    description: fields.description ?? "",
    date: fields.date,
    updated: fields.updated || fields.date,
    author: fields.author || "BeatMind Team",
    product: fields.product === "mixmind" ? "mixmind" : "beatmind",
    keywords: (fields.keywords ?? "").split(",").map((k) => k.trim()).filter(Boolean),
    body,
  };
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".md") && !name.startsWith("_"))
    .map(readPost)
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}

export function getPost(slug: string): BlogPost | undefined {
  return getAllPosts().find((post) => post.slug === slug);
}

export function getRelatedPosts(post: BlogPost, limit = 3): BlogPost[] {
  const others = getAllPosts().filter((other) => other.slug !== post.slug);
  const sameProduct = others.filter((other) => other.product === post.product);
  const otherProduct = others.filter((other) => other.product !== post.product);
  return [...sameProduct, ...otherProduct].slice(0, limit);
}

function stripInlineMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

// Extracts "### Question" + answer paragraphs from a "## FAQ" section.
export function extractFaqs(body: string): Faq[] {
  const heading = body.match(FAQ_HEADING);
  if (!heading || heading.index === undefined) return [];
  const afterHeading = body.slice(heading.index + heading[0].length);
  const nextSection = afterHeading.search(/^##\s/m);
  const section = nextSection === -1 ? afterHeading : afterHeading.slice(0, nextSection);

  return section
    .split(/^###\s+/m)
    .slice(1)
    .map((block) => {
      const [questionLine, ...rest] = block.split(/\r?\n/);
      return { q: stripInlineMarkdown(questionLine), a: stripInlineMarkdown(rest.join("\n")) };
    })
    .filter((faq) => faq.q && faq.a);
}

export function formatPostDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
