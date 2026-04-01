export interface CaseStudy {
  slug: string
  client: string
  title: string
  summary: string
  challenge: string
  solution: string
  result: string
  testimonial?: { quote: string; author: string; role: string }
}

export const caseStudies: CaseStudy[] = [
  {
    slug: 'molekule',
    client: 'Molekule',
    title: "Suite'nd Down to the Last Molekule!",
    summary: 'Cloud ERP implementation for a world-class air purifier manufacturer with groundbreaking PECO technology.',
    challenge: 'Implementation of Cloud ERP for a manufacturing business requires granular understanding of the ecosystem, especially when the aspiration is to move to a completely digital existence.',
    solution: 'TechCloudPro conducted an exhaustive Business Requirements Discovery session to identify and recommend specific NetSuite modules and third-party integrations to optimize Molekule\'s manufacturing, inventory, and distribution processes.',
    result: 'Complete digital transformation with NetSuite ERP covering manufacturing, inventory management, order fulfillment, and financial reporting — all integrated into a single cloud platform.',
  },
  {
    slug: 'beach-house-group',
    client: 'Beach House Group',
    title: 'Beach House Group: Brand Incubation at Scale',
    summary: 'NetSuite implementation for a consumer products solutions company in the beauty & lifestyle space.',
    challenge: 'Beach House Group needed a scalable ERP solution to manage brand development, product development, design, licensing, and procurement services across multiple beauty brands.',
    solution: 'TechCloudPro implemented a comprehensive NetSuite solution covering multi-brand inventory management, product lifecycle tracking, and integrated procurement workflows.',
    result: 'Streamlined operations across all brands including "Florence" which became one of the "Hottest Brands of 2019" on the Cosmetify Index.',
  },
  {
    slug: 'bh-cosmetics',
    client: 'BH Cosmetics',
    title: 'BH Cosmetics: Powering Growth with Cloud ERP',
    summary: 'Enterprise-grade ERP enabling product diversification and geographical expansion.',
    challenge: 'BH Cosmetics needed a technology backbone to support rapid scaling in product diversification and geographical expansion while responding to changing market dynamics.',
    solution: 'TechCloudPro implemented NetSuite ERP to unleash the full power of their system, supporting their growth ambitions with robust financial management, inventory control, and e-commerce integration.',
    result: 'Scalable platform supporting product diversification and global expansion.',
    testimonial: {
      quote: 'Good backbone technology is at the center of every company. Techcloudpro was the missing piece to unleash the power of our system, supporting our need to scale in both product diversification and geographical expansion.',
      author: 'Yannis Rodocanachi',
      role: 'CEO, BH Cosmetics',
    },
  },
]
