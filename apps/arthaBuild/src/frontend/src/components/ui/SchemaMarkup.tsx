// apps/arthaBuild/src/frontend/src/components/ui/SchemaMarkup.tsx
import { Helmet } from 'react-helmet-async';

type PageType = 'default' | 'blog' | 'blog-post' | 'industry' | 'solutions-hub';

interface SchemaMarkupProps {
  page: PageType;
  articleTitle?: string;
  articleDescription?: string;
  articleUrl?: string;
  articleDatePublished?: string;
  industryName?: string;
  industryDescription?: string;
  breadcrumbs?: { name: string; url: string }[];
}

const SOFTWARE_APP = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ArthaBuild',
  applicationCategory: 'BusinessApplication',
  description: 'AI-powered NetSuite development platform. Generates, tests, and deploys SuiteScript inside your AWS VPC.',
  url: 'https://artha.build',
  offers: { '@type': 'Offer', price: '799', priceCurrency: 'USD' },
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ArthaBuild',
  url: 'https://artha.build',
};

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
  };
}

export default function SchemaMarkup(props: SchemaMarkupProps) {
  const schemas: object[] = [SOFTWARE_APP, WEBSITE];

  if (props.breadcrumbs?.length) {
    schemas.push(breadcrumbSchema(props.breadcrumbs));
  }

  if (props.page === 'blog-post' && props.articleTitle) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: props.articleTitle,
      description: props.articleDescription,
      url: props.articleUrl,
      datePublished: props.articleDatePublished,
      publisher: { '@type': 'Organization', name: 'ArthaBuild', url: 'https://artha.build' },
      author: { '@type': 'Organization', name: 'ArthaBuild' },
    });
  }

  if (props.page === 'industry' && props.industryName) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: `ArthaBuild for ${props.industryName}`,
      serviceType: 'NetSuite AI Automation',
      description: props.industryDescription,
      provider: { '@type': 'Organization', name: 'ArthaBuild', url: 'https://artha.build' },
    });
  }

  return (
    <Helmet>
      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
