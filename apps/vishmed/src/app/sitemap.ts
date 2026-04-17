import type { MetadataRoute } from 'next'
import { blogPosts } from '@/data/blogPosts'

const BASE = 'https://vishmed.com'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: '2026-04-15',
      changeFrequency: 'monthly',
      priority: 1.0,
    },
    {
      url: `${BASE}/services`,
      lastModified: '2026-04-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/contact`,
      lastModified: '2026-04-15',
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/telehealth`,
      lastModified: '2026-04-15',
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/about`,
      lastModified: '2026-04-15',
      changeFrequency: 'yearly',
      priority: 0.8,
    },
    {
      url: `${BASE}/blog`,
      lastModified: new Date().toISOString().slice(0, 10),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/patient-info`,
      lastModified: '2026-04-15',
      changeFrequency: 'yearly',
      priority: 0.7,
    },
    {
      url: `${BASE}/pricing`,
      lastModified: '2026-04-15',
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/privacy-policy`,
      lastModified: '2026-04-15',
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  const blogEntries: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'yearly',
    priority: 0.6,
  }))

  return [...staticPages, ...blogEntries]
}
