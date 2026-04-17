export type BlogCategory = 'netsuite' | 'cost' | 'ai-erp' | 'engineering'
export type EditorialBadge = 'must-read' | 'hot' | 'deep-dive' | 'quick-win'

export interface BlogPost {
  slug: string
  title: string
  description: string
  category: BlogCategory
  badge?: EditorialBadge
  publishedAt: string
  readTime: string
  tags: string[]
  content: string
}

export const categories = [
  { id: 'all', label: 'All' },
  { id: 'netsuite', label: 'NetSuite How-To' },
  { id: 'cost', label: 'Cost & ROI' },
  { id: 'ai-erp', label: 'AI for ERP' },
  { id: 'engineering', label: 'Engineering' },
] as const

export const categoryColors: Record<BlogCategory, string> = {
  netsuite: '#A855F7',
  cost: '#10B981',
  'ai-erp': '#6366F1',
  engineering: '#3B82F6',
}

export const badgeColors: Record<EditorialBadge, string> = {
  'must-read': '#EF4444',
  'hot': '#F59E0B',
  'deep-dive': '#6366F1',
  'quick-win': '#10B981',
}

export const badgeLabels: Record<EditorialBadge, string> = {
  'must-read': 'MUST READ',
  'hot': 'HOT',
  'deep-dive': 'DEEP DIVE',
  'quick-win': 'QUICK WIN',
}
