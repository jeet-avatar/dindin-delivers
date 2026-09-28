import type { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const buildDate = new Date();
  const latestPost = posts.reduce<string | undefined>(
    (latest, post) => (!latest || post.updated > latest ? post.updated : latest),
    undefined,
  );

  return [
    { url: absoluteUrl("/"), lastModified: buildDate, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/mixmind"), lastModified: buildDate, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/blog"), lastModified: latestPost ?? buildDate, changeFrequency: "weekly", priority: 0.8 },
    ...posts.map((post) => ({
      url: absoluteUrl(`/blog/${post.slug}`),
      lastModified: post.updated,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: absoluteUrl("/privacy"), changeFrequency: "yearly", priority: 0.3 },
    { url: absoluteUrl("/terms"), changeFrequency: "yearly", priority: 0.3 },
  ];
}
