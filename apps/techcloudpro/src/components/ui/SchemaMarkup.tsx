import { Helmet } from 'react-helmet-async'

// Organization schema — appears on every page
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'TechCloudPro',
  legalName: 'Vibing World Inc',
  url: 'https://techcloudpro.com',
  logo: 'https://techcloudpro.com/tcplogo.png',
  description:
    'Enterprise AI consulting, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing solutions. 7 offices across 5 countries.',
  foundingDate: '2005',
  contactPoint: [
    {
      '@type': 'ContactPoint',
      telephone: '+1-866-983-2425',
      contactType: 'customer service',
      areaServed: 'US',
      availableLanguage: 'English',
    },
  ],
  address: [
    {
      '@type': 'PostalAddress',
      streetAddress: '477 Madison Avenue, 6th Floor',
      addressLocality: 'New York',
      addressRegion: 'NY',
      postalCode: '10022',
      addressCountry: 'US',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: 'Two North Central Ave, 18th and 19th Floor',
      addressLocality: 'Phoenix',
      addressRegion: 'AZ',
      postalCode: '85004',
      addressCountry: 'US',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: '1275-B (First Floor), Jane Street',
      addressLocality: 'Toronto',
      addressRegion: 'Ontario',
      postalCode: 'M6M 4Y1',
      addressCountry: 'CA',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: 'Unit 804, 60 Lorimer Street',
      addressLocality: 'Melbourne',
      addressRegion: 'Victoria',
      postalCode: '3008',
      addressCountry: 'AU',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: 'Bonifacio Global City, 32nd Street',
      addressLocality: 'Taguig, Metro Manila',
      postalCode: '1634',
      addressCountry: 'PH',
    },
    {
      '@type': 'PostalAddress',
      streetAddress: '2M – 419, 2nd Floor, East of NGEF Layout, Kasturi Nagar',
      addressLocality: 'Bangalore',
      addressRegion: 'Karnataka',
      postalCode: '560043',
      addressCountry: 'IN',
    },
  ],
  numberOfEmployees: {
    '@type': 'QuantitativeValue',
    minValue: 200,
    maxValue: 500,
  },
  sameAs: [
    'https://www.linkedin.com/company/techcloudpro',
    'https://www.crunchbase.com/organization/techcloudpro',
    'https://clutch.co/profile/techcloudpro',
    'https://www.g2.com/sellers/techcloudpro',
    'https://www.glassdoor.com/Overview/Working-at-TechCloudPro',
    'https://www.facebook.com/techcloudpro',
    'https://twitter.com/techcloudpro',
    'https://www.wikidata.org/wiki/Q138861599',
  ],
}

// WebSite schema with sitelinks search
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'TechCloudPro',
  url: 'https://techcloudpro.com',
}

// Service schemas for each pillar
const serviceSchemas = {
  ai: {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'AI Consulting & Private LLM Deployment',
    description:
      'Deploy secure AI within your infrastructure. Private LLM models, agentic AI systems, enterprise RAG — zero data leakage, complete sovereignty. SOC 2, HIPAA, GDPR compliant.',
    provider: { '@type': 'Organization', name: 'TechCloudPro' },
    serviceType: 'AI Consulting',
    areaServed: { '@type': 'Country', name: 'US' },
    url: 'https://techcloudpro.com/services/ai',
  },
  netsuite: {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Oracle NetSuite ERP Implementation',
    description:
      'Certified NetSuite Solutions Provider with 1000+ implementations. End-to-end cloud ERP — discovery, architecture, go-live, and ongoing support across retail, manufacturing, fashion, F&B, and software.',
    provider: { '@type': 'Organization', name: 'TechCloudPro' },
    serviceType: 'ERP Consulting',
    areaServed: { '@type': 'Country', name: 'US' },
    url: 'https://techcloudpro.com/services/netsuite',
  },
  cybersecurity: {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'CyberArk Cybersecurity & Identity Security',
    description:
      'CyberArk-powered privileged access management, AI agent identity security, machine identity management, Zero Trust architecture, and SOC 2/HIPAA/GDPR compliance.',
    provider: { '@type': 'Organization', name: 'TechCloudPro' },
    serviceType: 'Cybersecurity Consulting',
    areaServed: { '@type': 'Country', name: 'US' },
    url: 'https://techcloudpro.com/services/cybersecurity',
  },
  staffing: {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'IT Staffing & Technology Talent Solutions',
    description:
      'Pre-vetted technology talent delivered in 48 hours. AI/ML, Cloud, Cybersecurity, Full-Stack, DevOps, Data Engineering. Transparent $2/hr staffing fee.',
    provider: { '@type': 'Organization', name: 'TechCloudPro' },
    serviceType: 'IT Staffing',
    areaServed: { '@type': 'Country', name: 'US' },
    url: 'https://techcloudpro.com/services/staffing',
  },
}

// BreadcrumbList generator
function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

// ContactPage schema
const contactPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact TechCloudPro',
  url: 'https://techcloudpro.com/contact',
  mainEntity: {
    '@type': 'Organization',
    name: 'TechCloudPro',
    telephone: '+1-866-983-2425',
    email: 'contact@techcloudpro.com',
  },
}

interface SchemaProps {
  page:
    | 'home'
    | 'services'
    | 'service-detail'
    | 'contact'
    | 'about'
    | 'case-studies'
    | 'products'
    | 'leadership'
    | 'partners'
    | 'careers'
    | 'privacy-policy'
  serviceSlug?: string
  breadcrumbs?: { name: string; url: string }[]
}

export function SchemaMarkup({ page, serviceSlug, breadcrumbs }: SchemaProps) {
  const schemas: object[] = []

  // Organization + WebSite on every page
  schemas.push(organizationSchema)
  schemas.push(websiteSchema)

  // Breadcrumbs if provided
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(breadcrumbSchema(breadcrumbs))
  }

  // Page-specific schemas
  if (page === 'service-detail' && serviceSlug && serviceSlug in serviceSchemas) {
    schemas.push(serviceSchemas[serviceSlug as keyof typeof serviceSchemas])
  }

  if (page === 'contact') {
    schemas.push(contactPageSchema)
  }

  return (
    <Helmet>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  )
}
