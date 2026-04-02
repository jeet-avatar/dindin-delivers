export type BadgeVariant = 'hot' | 'new' | 'trend' | 'emerging'
export type PillarColor = 'ai' | 'erp' | 'cyber' | 'staff'

export interface SubService {
  name: string
  description: string
  badge?: { label: string; variant: BadgeVariant }
}

export interface Testimonial {
  quote: string
  name: string
  title: string
  company: string
}

export interface ServicePillar {
  slug: string
  color: PillarColor
  label: string
  title: string
  tagline: string
  description: string
  longDescription?: string
  icon: string // lucide icon name
  subServices: SubService[]
  whyChooseUs: string[]
  testimonial?: Testimonial
  stats?: { label: string; value: string }[]
}

export const pillars: ServicePillar[] = [
  {
    slug: 'netsuite',
    color: 'erp',
    label: 'Oracle NetSuite',
    title: 'Cloud ERP & Beyond',
    tagline: 'Certified partner. NetSuite Next ready.',
    description: 'As a Certified NetSuite Solutions Provider with 1000+ implementations, we deliver end-to-end cloud ERP solutions — from discovery and architecture through go-live and ongoing support. Our team of certified consultants brings deep industry expertise across retail, manufacturing, fashion, F&B, and software.',
    longDescription: 'The NetSuite landscape is evolving rapidly. NetSuite Next 2026 introduces AI-powered analytics, predictive financial planning, and SuiteCloud AI — and most implementation partners are still learning how to deploy them. We have been delivering NetSuite solutions for over 15 years, across 1,000+ business users, and our consultants hold multiple Oracle certifications. Whether you are migrating from legacy ERP, implementing a new OneWorld multi-subsidiary setup, or optimizing an existing deployment with SuiteScript 2.1, our team delivers from discovery through go-live with 40 hours of free consultation included. We also provide ongoing managed services, 24/7 support, and Planful FP&A integration for finance teams that need real-time forecasting alongside their ERP data.',
    icon: 'Monitor',
    stats: [
      { label: 'Implementations', value: '1,000+' },
      { label: 'Years Experience', value: '15+' },
      { label: 'Free Consultation', value: '40 hrs' },
      { label: 'Support', value: '24/7' },
    ],
    testimonial: {
      quote: 'TechCloudPro delivered our NetSuite OneWorld implementation across 3 subsidiaries in under 4 months. Their team understood our retail workflows from day one.',
      name: 'Director of Operations',
      title: 'Fortune 500 Retail Client',
      company: 'Enterprise Retail',
    },
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
    longDescription: 'Our cybersecurity practice was born from a real incident — during a client ERP implementation, we discovered unauthorized privileged access that could have exposed millions of records. That experience shaped our identity-first security approach. Today, with AI agents operating as autonomous identities and machine-to-machine communication driving enterprise workflows, the attack surface has expanded beyond traditional perimeters. We deliver CyberArk PAM/PAS implementations that treat every identity — human, machine, or AI agent — as a potential attack vector requiring least-privilege access and full audit trails. Our team has maintained zero security breaches across all deployments, and we hold compliance expertise across SOC 2, HIPAA, GDPR, and ISO 27001. From post-quantum cryptography readiness to SSO blast radius containment, we help enterprises stay ahead of threats that have not materialized yet.',
    icon: 'Shield',
    stats: [
      { label: 'Security Breaches', value: '0' },
      { label: 'Compliance Frameworks', value: '4+' },
      { label: 'Identity Types Secured', value: '3' },
      { label: 'Avg Response Time', value: '<4 hrs' },
    ],
    testimonial: {
      quote: 'They found a critical privileged access vulnerability during our ERP implementation that our existing security team had missed for 2 years. We immediately expanded the engagement to a full CyberArk deployment.',
      name: 'CISO',
      title: 'Global Financial Services Firm',
      company: 'Financial Services',
    },
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
    longDescription: 'The technology talent crisis is real — 90% of organizations face IT skills gaps in cloud and security roles, and specialized engineers take 85+ days to hire through traditional channels. We deliver in 48 hours. Our staffing model is built on transparency: a flat $2/hr staffing fee, visible to both client and contractor. The engineer keeps everything else. This approach has driven 3.2x year-over-year growth in talent demand fulfilled, because both sides trust the arrangement. Whether you need a single NetSuite consultant for a 3-month project, a dedicated offshore team for ongoing operations, or permanent AI/ML engineers to build your internal capability, we match pre-vetted, certified professionals from our talent pool of 200+ engineers across AI/ML, Cloud, Cybersecurity, Full-Stack, DevOps, and Data Engineering.',
    icon: 'Users',
    stats: [
      { label: 'Time to Hire', value: '48 hrs' },
      { label: 'Staffing Fee', value: '$2/hr' },
      { label: 'Talent Pool', value: '200+' },
      { label: 'YoY Growth', value: '3.2x' },
    ],
    testimonial: {
      quote: 'We needed 5 NetSuite developers for a SuiteCommerce build. TechCloudPro delivered all 5 within a week, and the transparent pricing meant our CFO approved it in a single meeting.',
      name: 'VP of Engineering',
      title: 'E-commerce Platform',
      company: 'Retail Technology',
    },
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
