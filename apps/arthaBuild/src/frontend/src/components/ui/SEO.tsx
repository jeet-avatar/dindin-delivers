import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article';
  image?: string;
}

const BASE_URL = 'https://artha.build';
const DEFAULT_IMAGE = '/og-image.png';

export default function SEO({ title, description, path, type = 'website', image }: SEOProps) {
  const url = `${BASE_URL}${path}`;
  const ogImage = `${BASE_URL}${image ?? DEFAULT_IMAGE}`;
  const fullTitle = title.endsWith('ArthaBuild') ? title : `${title} | ArthaBuild`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="ArthaBuild" />
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
}
