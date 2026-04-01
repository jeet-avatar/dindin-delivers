export type BadgeVariant = 'hot' | 'new' | 'trend' | 'emerging'
export type PillarColor = 'ai' | 'erp' | 'cyber' | 'staff'

export interface SubService {
  name: string
  description: string
  badge?: { label: string; variant: BadgeVariant }
}

export interface ServicePillar {
  slug: string
  color: PillarColor
  label: string
  title: string
  tagline: string
  description: string
  icon: string // lucide icon name
  subServices: SubService[]
  whyChooseUs: string[]
}

export const pillars: ServicePillar[] = [
  {
    slug: 'netsuite',
    color: 'erp',
    label: 'Oracle NetSuite',
    title: 'Cloud ERP & Beyond',
    tagline: 'Certified partner. NetSuite Next ready.',
    description: 'As a Certified NetSuite Solutions Provider with 1000+ implementations, we deliver end-to-end cloud ERP solutions — from discovery and architecture through go-live and ongoing support. Our team of certified consultants brings deep industry expertise across retail, manufacturing, fashion, F&B, and software.',
    icon: 'Monitor',
    subServices: [
      { name: 'NetSuite Next 2026', description: 'Latest release with AI-powered analytics and predictive planning', badge: { label: 'Hot', variant: 'hot' } },
      { name: 'AI-Powered Analytics', description: 'Intelligent insights, anomaly detection, and automated reporting', badge: { label: 'New', variant: 'new' } },
      { name: 'Predictive Financial Planning', description: 'AI-driven forecasting and budgeting with SuiteCloud AI', badge: { label: 'New', variant: 'new' } },
      { name: 'SuiteCloud Development', description: 'Custom SuiteScript, workflows, and SuiteBuilder configurations' },
      { name: 'OneWorld Multi-Subsidiary', description: 'Global business management with multi-currency and multi-subsidiary support' },
      { name: 'NetSuite CRM & Commerce', description: 'Customer relationship management and SuiteCommerce' },
      { name: 'SuiteSpots\u2122 Connectors', description: 'Custom integrations with Shopify, Magento, and any business app', badge: { label: 'Trending', variant: 'trend' } },
      { name: 'Planful FP&A Integration', description: 'Financial Planning & Analysis with Planful partnership' },
      { name: 'OmniPOS Retail Solutions', description: 'Point-of-sale system for retail operations' },
      { name: 'Data Migration & Go-Live', description: 'Seamless data migration, testing, and production deployment' },
    ],
    whyChooseUs: [
      '1000+ successful business user implementations',
      'Certified NetSuite Solutions Provider',
      '40 hours of free consultation and discovery',
      '24/7 post-implementation support',
      'Comprehensive documentation and training',
    ],
  },
  {
    slug: 'cybersecurity',
    color: 'cyber',
    label: 'Cybersecurity',
    title: 'Identity-First Security',
    tagline: 'CyberArk-powered. The new perimeter is identity.',
    description: 'In the age of AI agents and machine identities, traditional perimeter security is not enough. Our cybersecurity division, born from real-world threat discovery during a client engagement, delivers CyberArk-powered privileged access management and comprehensive security operations.',
    icon: 'Shield',
    subServices: [
      { name: 'AI Agent Identity Security', description: 'Treat AI agents as identities — least privilege, full audit trail', badge: { label: 'Hot', variant: 'hot' } },
      { name: 'Machine Identity Management', description: 'Secure machine identities that drive trust in banking and enterprise', badge: { label: 'New', variant: 'new' } },
      { name: 'CyberArk PAM / PAS', description: 'Privileged Access Management and Privileged Access Security implementation' },
      { name: 'Application Access Mgmt (AAM)', description: 'CyberArk AAM for application credential management' },
      { name: 'Zero Trust Architecture', description: 'SSO blast radius containment and least-privilege access design' },
      { name: 'Post-Quantum Cryptography', description: 'PKI modernization and crypto agility for the post-quantum era', badge: { label: 'Emerging', variant: 'emerging' } },
      { name: 'SSO Blast Radius Containment', description: 'Limit the impact of compromised single sign-on credentials' },
      { name: 'SIEM & Threat Monitoring', description: 'Real-time threat detection, response, and security information management' },
      { name: 'Compliance: SOC 2, HIPAA, GDPR', description: 'Regulatory compliance frameworks and audit preparation' },
      { name: 'Penetration Testing & Audits', description: 'Comprehensive vulnerability assessments and security audits' },
    ],
    whyChooseUs: [
      'Born from real-world threat discovery',
      'CyberArk certified implementation partner',
      'Zero security breaches across all deployments',
      'Full-spectrum: from assessment to ongoing monitoring',
      'Compliance expertise across SOC 2, HIPAA, GDPR, ISO 27001',
    ],
  },
  {
    slug: 'ai',
    color: 'ai',
    label: 'AI & Automation',
    title: 'Private LLM & Agentic AI',
    tagline: 'Deploy AI inside your firewall. Zero data leakage.',
    description: 'Deploy proprietary LLM models directly within your VPN infrastructure for complete control and data sovereignty. Our agentic AI systems reason, plan, and execute complex business processes autonomously — all within your secure environment, with no third-party API dependencies.',
    icon: 'Sparkles',
    subServices: [
      { name: 'Private LLM Deployment', description: 'Custom models within your VPN — zero data leakage, complete sovereignty', badge: { label: 'Hot', variant: 'hot' } },
      { name: 'Agentic AI Workflows', description: 'Autonomous agents that reason, plan, and execute complex tasks', badge: { label: 'New', variant: 'new' } },
      { name: 'Enterprise RAG Systems', description: 'Retrieval-augmented generation for your proprietary knowledge base' },
      { name: 'AI Strategy & Roadmapping', description: 'Comprehensive ROI analysis, implementation roadmap, and AI readiness assessment' },
      { name: 'Model Fine-Tuning & Training', description: 'Industry-specific fine-tuning for your unique use cases and data' },
      { name: 'Document Intelligence', description: 'Automated document processing, extraction, and classification' },
      { name: 'Conversational AI / Chatbots', description: 'Customer-facing and internal AI assistants' },
      { name: 'AI Security & Compliance', description: 'SOC 2, HIPAA, GDPR compliance for AI deployments' },
      { name: 'MLOps & Model Monitoring', description: 'Continuous monitoring, optimization, and model lifecycle management' },
      { name: 'ROI Assessment & POC', description: 'Proof of concept and measurable ROI within 90 days' },
    ],
    whyChooseUs: [
      'Models deployed within YOUR infrastructure',
      'Zero third-party API dependencies',
      'SOC 2, HIPAA, GDPR compliant deployments',
      'Measurable ROI within 90 days',
      '24/7 monitoring and optimization',
    ],
  },
  {
    slug: 'staffing',
    color: 'staff',
    label: 'Staffing & Consulting',
    title: 'IT Talent On Demand',
    tagline: 'Pre-vetted, certified talent in weeks — not months.',
    description: 'The AI skills gap is widening. NetSuite consultants are in record demand. Cybersecurity roles take 6+ months to fill. We deliver pre-vetted, certified IT professionals — contract, permanent, or dedicated teams — in weeks, not months. All backed by our deep domain expertise.',
    icon: 'Users',
    subServices: [
      { name: 'AI/ML Engineers', description: 'Machine learning engineers, data scientists, and AI specialists', badge: { label: 'High Demand', variant: 'hot' } },
      { name: 'NetSuite Certified Consultants', description: 'ERP consultants, administrators, and SuiteScript developers', badge: { label: 'Hot', variant: 'hot' } },
      { name: 'CyberArk / Security Specialists', description: 'PAM engineers, security architects, and compliance experts' },
      { name: 'Solution Architects', description: 'Enterprise architects for complex technology landscapes' },
      { name: 'DevOps & Cloud Engineers', description: 'AWS, Azure, GCP infrastructure and CI/CD specialists', badge: { label: 'Trending', variant: 'trend' } },
      { name: 'Contract Staffing', description: 'Flexible IT professionals for project-based needs' },
      { name: 'Permanent Placements', description: 'Full-time talent acquisition and placement' },
      { name: 'Dedicated Offshore Teams', description: 'Managed teams for ongoing projects and operations' },
      { name: 'Staff Augmentation', description: 'Scale your team up or down based on project needs' },
      { name: 'NetSuite Training & Certification', description: 'End-user training, administrator certification, and documentation' },
    ],
    whyChooseUs: [
      '4x faster time-to-hire than industry average',
      'Pre-vetted, certified talent pool',
      '3.2x YoY growth in talent demand fulfilled',
      'Contract, permanent, and dedicated team models',
      'Deep domain expertise in ERP, AI, and cybersecurity',
    ],
  },
]
