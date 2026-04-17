export interface NavLink {
  label: string
  href: string
}

export const mainNav: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'Products', href: '/products' },
  { label: 'Clients', href: '/clients' },
  { label: 'Case Studies', href: '/case-studies' },
  { label: 'About', href: '/about' },
  { label: 'Leadership', href: '/leadership' },
  { label: 'Blog', href: '/blog' },
  { label: 'Tools', href: '/tools/ai-playground' },
  { label: 'Careers', href: '/careers' },
  { label: 'Contact', href: '/contact' },
]

export const footerSections = [
  {
    title: 'Products & Solutions',
    links: [
      { label: 'NetSuite ERP', href: '/services/netsuite' },
      { label: 'NetSuite CRM', href: '/services/netsuite' },
      { label: 'NetSuite OneWorld', href: '/services/netsuite' },
      { label: 'NetSuite PSA', href: '/services/netsuite' },
      { label: 'SuiteSpots\u2122', href: '/services/netsuite' },
      { label: 'OmniPOS', href: '/services/netsuite' },
    ],
  },
  {
    title: 'Services',
    links: [
      { label: 'AI & Private LLM', href: '/services/ai' },
      { label: 'Cybersecurity', href: '/services/cybersecurity' },
      { label: 'IT Staffing', href: '/services/staffing' },
      { label: 'Technology Consulting', href: '/services/staffing' },
      { label: 'Implementation & Training', href: '/services' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Blog & Insights', href: '/blog' },
      { label: 'Case Studies', href: '/case-studies' },
      { label: 'Products', href: '/products' },
      { label: 'Partners', href: '/partners' },
      { label: 'AI Playground', href: '/tools/ai-playground' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Leadership', href: '/leadership' },
      { label: 'Clients', href: '/clients' },
      { label: 'Careers', href: '/careers' },
    ],
  },
  {
    title: 'Connect',
    links: [
      { label: 'LinkedIn', href: 'https://www.linkedin.com/company/tech-cloud-pro' },
      { label: 'Twitter', href: 'https://twitter.com/techcloudpro1' },
      { label: 'Facebook', href: 'https://www.facebook.com/TechCloudPro/' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
]
