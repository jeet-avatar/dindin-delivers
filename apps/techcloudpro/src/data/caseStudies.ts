export type CaseCategory = 'erp' | 'ai' | 'cyber' | 'staffing'

export interface CaseStudy {
  slug: string
  client: string
  category: CaseCategory
  categoryLabel: string
  title: string
  summary: string
  challenge: string
  solution: string
  result: string
  metrics?: { label: string; value: string }[]
  testimonial?: { quote: string; author: string; role: string }
}

export const caseStudies: CaseStudy[] = [
  // === NETSUITE ERP ===
  {
    slug: 'molekule',
    client: 'Molekule',
    category: 'erp',
    categoryLabel: 'NetSuite ERP',
    title: "Suite'nd Down to the Last Molekule!",
    summary: 'Complete digital transformation for a world-class air purifier manufacturer with groundbreaking PECO technology — from legacy systems to a fully integrated cloud ERP.',
    challenge: 'Molekule operated on fragmented legacy systems with disconnected inventory, manufacturing, and financial processes. Moving to a completely digital existence required granular understanding right down to the last molecule of the ecosystem — raw materials, bill of materials, multi-stage production, and global distribution.',
    solution: 'TechCloudPro conducted a 40-hour Business Requirements Discovery session, mapping every process across manufacturing, procurement, warehousing, and fulfillment. We implemented NetSuite with custom SuiteScript workflows for production scheduling, real-time inventory tracking across 3 warehouses, and automated purchase order generation based on demand forecasting.',
    result: 'Complete digital transformation with NetSuite ERP covering manufacturing, inventory management, order fulfillment, and financial reporting — all integrated into a single cloud platform. Inventory accuracy improved from 82% to 99.2%.',
    metrics: [
      { label: 'Inventory Accuracy', value: '99.2%' },
      { label: 'Implementation', value: '14 weeks' },
      { label: 'Warehouses Integrated', value: '3' },
    ],
  },
  {
    slug: 'beach-house-group',
    client: 'Beach House Group',
    category: 'erp',
    categoryLabel: 'NetSuite ERP',
    title: 'Beach House Group: Brand Incubation at Scale',
    summary: 'NetSuite implementation enabling a beauty & lifestyle brand incubator to manage multi-brand operations, product development, licensing, and procurement from a single platform.',
    challenge: 'Beach House Group manages multiple beauty brands simultaneously — each with its own product lines, licensing agreements, procurement pipelines, and distribution channels. Their existing systems couldn\'t handle the complexity of multi-brand inventory management, real-time cost tracking across brands, or consolidated financial reporting.',
    solution: 'TechCloudPro implemented a multi-subsidiary NetSuite configuration with brand-level P&L tracking, integrated procurement workflows with automated vendor management, and real-time dashboards showing product lifecycle status across all brands. Custom SuiteSpots connectors linked their e-commerce channels for unified order management.',
    result: 'Streamlined operations across all brands. Their brand "Florence" became one of the "Hottest Brands of 2019" on the Cosmetify Index — powered by the operational efficiency that NetSuite enabled.',
    metrics: [
      { label: 'Brands Managed', value: '8+' },
      { label: 'Order Processing', value: '3x faster' },
      { label: 'Financial Close', value: '5 → 2 days' },
    ],
  },
  {
    slug: 'bh-cosmetics',
    client: 'BH Cosmetics',
    category: 'erp',
    categoryLabel: 'NetSuite ERP',
    title: 'BH Cosmetics: Powering Growth with Cloud ERP',
    summary: 'Enterprise-grade ERP enabling rapid product diversification and geographical expansion for a fast-growing vegan cosmetics brand.',
    challenge: 'BH Cosmetics was scaling rapidly — new product lines every quarter, expansion into international markets, and beauty influencer collaborations driving unpredictable demand spikes. Their technology backbone couldn\'t keep up with the pace of growth, causing inventory stockouts, delayed fulfillment, and manual financial reconciliation.',
    solution: 'TechCloudPro implemented NetSuite ERP with advanced demand planning, multi-channel inventory optimization (DTC, wholesale, marketplace), and automated financial consolidation across domestic and international entities. Real-time dashboards gave the C-suite visibility into sales velocity, margin analysis, and cash flow by channel.',
    result: 'Scalable platform supporting product diversification and global expansion. Stockout rate dropped by 67%, fulfillment SLA improved to 99.1%, and month-end close reduced from 8 days to 3.',
    metrics: [
      { label: 'Stockout Reduction', value: '67%' },
      { label: 'Fulfillment SLA', value: '99.1%' },
      { label: 'Month-End Close', value: '3 days' },
    ],
    testimonial: {
      quote: 'Good backbone technology is at the center of every company. Techcloudpro was the missing piece to unleash the power of our system, supporting our need to scale in both product diversification and geographical expansion, to be responsive to changing market dynamics, consumer preferences and buying behavior.',
      author: 'Yannis Rodocanachi',
      role: 'CEO, BH Cosmetics',
    },
  },

  // === AI & PRIVATE LLM ===
  {
    slug: 'private-llm-financial-services',
    client: 'Fortune 500 Financial Institution',
    category: 'ai',
    categoryLabel: 'AI & Private LLM',
    title: 'Private LLM Deployment: Zero-Leak AI for Financial Services',
    summary: 'Deployed a private GPT-class language model entirely within a regulated financial institution\'s VPN — processing 50,000+ documents daily with zero data leaving the secure perimeter.',
    challenge: 'A Fortune 500 financial institution needed AI-powered document analysis for regulatory compliance, loan underwriting, and customer communications — but strict regulatory requirements (SOC 2, FINRA, OCC) prohibited any data from leaving their infrastructure. Third-party AI APIs were not an option. Every vendor they evaluated required data transmission to external servers.',
    solution: 'TechCloudPro deployed a fine-tuned LLM (7B parameter model) within the client\'s on-premises VPN infrastructure, running on their existing GPU hardware. We built a custom RAG pipeline connected to their document management system, trained the model on 10 years of regulatory filings, and implemented role-based access controls with full audit logging. The entire deployment — model, inference engine, vector database — runs within their firewall.',
    result: 'The AI system processes 50,000+ documents daily with 94% accuracy on regulatory classification, reducing manual review time by 78%. Zero data has ever left the client\'s infrastructure. The system passed SOC 2 Type II audit on first attempt.',
    metrics: [
      { label: 'Documents/Day', value: '50K+' },
      { label: 'Manual Review Reduction', value: '78%' },
      { label: 'Data Leakage', value: 'Zero' },
      { label: 'SOC 2 Audit', value: 'Passed' },
    ],
  },
  {
    slug: 'agentic-ai-insurance',
    client: 'National Insurance Provider',
    category: 'ai',
    categoryLabel: 'Agentic AI',
    title: 'Agentic AI: Autonomous Claims Processing at Scale',
    summary: 'Built an autonomous AI agent system that handles end-to-end insurance claims processing — from intake and verification to adjudication and payment — reducing processing time from 14 days to 48 hours.',
    challenge: 'A national insurance provider was drowning in claims volume — 15,000+ claims per month, each requiring manual data extraction, policy verification, damage assessment, and adjudication. Average processing time was 14 days. Customer satisfaction was declining, and 23% of claims had data entry errors causing rework.',
    solution: 'TechCloudPro designed and deployed a multi-agent AI system within the client\'s Azure private cloud. Agent 1 handles document intake and OCR extraction. Agent 2 cross-references policy details and validates coverage. Agent 3 performs damage assessment using computer vision. Agent 4 handles adjudication logic and flags edge cases for human review. All agents communicate through a secure message bus with full audit trail.',
    result: 'Claims processing time reduced from 14 days to 48 hours for 82% of claims (straight-through processing). Data entry errors eliminated entirely. Customer NPS improved by 34 points. The system handles 15,000+ claims/month with only 18% requiring human intervention.',
    metrics: [
      { label: 'Processing Time', value: '14d → 48h' },
      { label: 'Straight-Through Rate', value: '82%' },
      { label: 'Error Rate', value: '0%' },
      { label: 'NPS Improvement', value: '+34' },
    ],
  },
  {
    slug: 'enterprise-rag-legal',
    client: 'Global Law Firm',
    category: 'ai',
    categoryLabel: 'Enterprise RAG',
    title: 'Enterprise RAG: AI-Powered Legal Research Across 2M+ Documents',
    summary: 'Deployed a retrieval-augmented generation system across 2 million legal documents, enabling attorneys to find relevant precedents and draft briefs 5x faster with AI-assisted research.',
    challenge: 'A top-50 global law firm had 2 million+ legal documents across case files, contracts, precedents, and regulatory filings — spanning 30 years. Associates spent 40% of billable hours on manual research. Existing search tools returned keyword matches, not semantic understanding. Critical precedents were often missed.',
    solution: 'TechCloudPro built a custom RAG system using a fine-tuned embedding model optimized for legal language, deployed within the firm\'s private infrastructure. We indexed all 2M+ documents with semantic chunking, built a multi-tier retrieval pipeline (dense + sparse + reranking), and created a conversational interface where attorneys can ask natural language questions and receive cited answers with source links.',
    result: 'Legal research time reduced by 80%. Associates now find relevant precedents in minutes instead of hours. The system surfaces cross-practice insights that were previously impossible to discover manually. ROI achieved within 60 days of deployment.',
    metrics: [
      { label: 'Research Time Saved', value: '80%' },
      { label: 'Documents Indexed', value: '2M+' },
      { label: 'ROI Timeline', value: '60 days' },
    ],
  },

  // === CYBERSECURITY ===
  {
    slug: 'cyberark-retail-pam',
    client: 'Major Retail Chain',
    category: 'cyber',
    categoryLabel: 'Cybersecurity',
    title: 'CyberArk PAM: Securing 12,000 Privileged Accounts for Retail',
    summary: 'Discovered and secured 12,000 previously unmanaged privileged accounts across a major retail chain\'s POS, e-commerce, and corporate infrastructure — averting a potential breach that could have exposed 40M customer records.',
    challenge: 'During a NetSuite ERP implementation for a major retail chain, TechCloudPro\'s security team discovered that the client had over 12,000 privileged accounts with no centralized management — shared admin passwords for POS terminals, hardcoded credentials in e-commerce applications, and service accounts with full database access. A single compromised credential could have exposed 40 million customer records.',
    solution: 'TechCloudPro deployed CyberArk Privileged Access Security (PAS) across the entire enterprise: vaulting all 12,000 privileged credentials, implementing automatic password rotation on a 24-hour cycle, deploying session recording for all administrative access, and integrating with their SIEM for real-time anomaly detection. We also remediated 847 hardcoded credentials in application code.',
    result: 'All 12,000 privileged accounts secured and centrally managed. Mean time to detect privileged access anomalies reduced from 72 hours to under 5 minutes. Zero security incidents since deployment. Passed PCI-DSS audit with zero findings on privileged access controls.',
    metrics: [
      { label: 'Accounts Secured', value: '12,000' },
      { label: 'Detection Time', value: '72h → 5min' },
      { label: 'Incidents Post-Deploy', value: 'Zero' },
      { label: 'PCI-DSS Audit', value: 'Zero Findings' },
    ],
  },
  {
    slug: 'zero-trust-healthcare',
    client: 'Regional Healthcare Network',
    category: 'cyber',
    categoryLabel: 'Zero Trust',
    title: 'Zero Trust Architecture: Securing Patient Data Across 23 Facilities',
    summary: 'Designed and implemented a Zero Trust security architecture across a 23-facility healthcare network, achieving HIPAA compliance and reducing the attack surface by 94%.',
    challenge: 'A regional healthcare network with 23 hospitals and clinics had a flat network architecture where any compromised device could access patient records, billing systems, and medical devices. They had failed two consecutive HIPAA audits and faced $2.4M in potential fines. Legacy VPN-based access gave remote workers broad network access.',
    solution: 'TechCloudPro implemented a comprehensive Zero Trust architecture: micro-segmented the network into 156 security zones, deployed CyberArk for privileged access, implemented identity-based access policies (verify every request, trust nothing), and replaced VPN with zero-trust network access (ZTNA) for remote workers. Every access request is authenticated, authorized, and encrypted regardless of source.',
    result: 'Attack surface reduced by 94%. Passed HIPAA audit with zero findings. Remote access security improved dramatically — lateral movement is now impossible even if credentials are compromised. Mean time to contain a security event reduced from 4 hours to 12 minutes.',
    metrics: [
      { label: 'Attack Surface Reduction', value: '94%' },
      { label: 'HIPAA Audit', value: 'Zero Findings' },
      { label: 'Security Zones', value: '156' },
      { label: 'Containment Time', value: '4h → 12min' },
    ],
  },

  // === STAFFING ===
  {
    slug: 'netsuite-team-scaling',
    client: 'Fast-Growing E-Commerce Brand',
    category: 'staffing',
    categoryLabel: 'IT Staffing',
    title: 'From Zero to 12 NetSuite Consultants in 3 Weeks',
    summary: 'Assembled and deployed a 12-person NetSuite implementation team in just 3 weeks for a fast-growing e-commerce brand facing a critical ERP migration deadline.',
    challenge: 'A fast-growing e-commerce brand had committed to a NetSuite go-live date for Black Friday — but their implementation partner fell through 8 weeks before launch. They needed 12 certified NetSuite professionals (3 functional consultants, 4 SuiteScript developers, 2 solution architects, 2 data migration specialists, 1 project manager) within 3 weeks or face $4M+ in lost holiday revenue.',
    solution: 'TechCloudPro mobilized our pre-vetted talent pool within 48 hours. We presented 22 pre-screened candidates within the first week, conducted rapid technical assessments, and had the full 12-person team onboarded and productive by day 18. Our project manager established an accelerated methodology with daily standups, weekly milestone reviews, and parallel workstreams.',
    result: 'Full 12-person team deployed in 18 days. NetSuite go-live achieved 4 days ahead of the Black Friday deadline. The system handled 340% surge in order volume without issues. Client retained 8 of the 12 consultants on a long-term contract.',
    metrics: [
      { label: 'Team Assembled', value: '18 days' },
      { label: 'Go-Live', value: '4 days early' },
      { label: 'Order Surge Handled', value: '340%' },
      { label: 'Consultants Retained', value: '8 of 12' },
    ],
  },
]
