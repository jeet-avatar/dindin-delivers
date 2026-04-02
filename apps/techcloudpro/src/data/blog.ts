import { posts } from './blogPosts'

export interface BlogPost {
  slug: string
  title: string
  description: string
  category: 'ai' | 'erp' | 'cybersecurity' | 'staffing' | 'industry'
  author: string
  authorTitle: string
  publishedAt: string
  readTime: string
  tags: string[]
  heroColor: string
  content: string
}

export const categories = [
  { id: 'all', label: 'All Posts' },
  { id: 'ai', label: 'AI & Automation' },
  { id: 'erp', label: 'ERP & NetSuite' },
  { id: 'cybersecurity', label: 'Cybersecurity' },
  { id: 'staffing', label: 'IT Staffing' },
  { id: 'industry', label: 'Industry Insights' },
]

export const blogPosts: BlogPost[] = posts
