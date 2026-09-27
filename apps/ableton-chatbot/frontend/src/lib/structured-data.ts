import type { Faq } from "@/lib/faqs";
import {
  BASE_URL,
  HOME_DESCRIPTION,
  LEGAL_NAME,
  OG_IMAGE,
  OG_IMAGE_MIXMIND,
  PRICE_MONTHLY_USD,
  SITE_NAME,
  SOCIAL_PROFILES,
  SUPPORT_EMAIL,
  TRIAL_TERMS,
  absoluteUrl,
} from "@/lib/site";

type JsonLdObject = Record<string, unknown>;

const ORGANIZATION_ID = `${BASE_URL}/#organization`;
const WEBSITE_ID = `${BASE_URL}/#website`;

export const ORGANIZATION_REF = { "@id": ORGANIZATION_ID };

function monthlyOffer(url: string): JsonLdObject {
  return {
    "@type": "Offer",
    url,
    price: PRICE_MONTHLY_USD,
    priceCurrency: "USD",
    description: `$19/month subscription. ${TRIAL_TERMS}`,
    priceSpecification: {
      "@type": "UnitPriceSpecification",
      price: PRICE_MONTHLY_USD,
      priceCurrency: "USD",
      unitText: "MONTH",
      referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode: "MON" },
    },
  };
}

export function organizationSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    legalName: LEGAL_NAME,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/favicon.svg"),
    email: SUPPORT_EMAIL,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SUPPORT_EMAIL,
      availableLanguage: ["English"],
    },
    sameAs: SOCIAL_PROFILES,
  };
}

export function websiteSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    inLanguage: "en-US",
    publisher: ORGANIZATION_REF,
  };
}

export function beatmindAppSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "BeatMind",
    applicationCategory: "MusicApplication",
    operatingSystem: "macOS, Windows",
    url: absoluteUrl("/"),
    image: absoluteUrl(OG_IMAGE),
    description: HOME_DESCRIPTION,
    softwareRequirements: "Ableton Live 11 or 12 (Standard or Suite), BeatMind Bridge, AbletonOSC",
    publisher: ORGANIZATION_REF,
    offers: monthlyOffer(absoluteUrl("/signup")),
    featureList: [
      "Part-by-part production of drums, bass and melodies",
      "Session-view clips and scenes in your own Live Set",
      "Captured auditions to review each part",
      "Supported Ableton device control adjustments",
      "Mac and Windows bridge agent",
    ],
  };
}

export function mixmindAppSchema(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MixMind",
    applicationCategory: "MusicApplication",
    operatingSystem: "macOS, Windows",
    url: absoluteUrl("/mixmind"),
    image: absoluteUrl(OG_IMAGE_MIXMIND),
    description:
      "DJ library manager that reads your Rekordbox collection. Browse every track, find duplicates, and build AI playlists from music you already own.",
    softwareRequirements: "Rekordbox 6 or 7",
    publisher: ORGANIZATION_REF,
    offers: monthlyOffer(absoluteUrl("/mixmind")),
    featureList: [
      "Full Rekordbox library browser",
      "AI playlist builder",
      "Duplicate track detection and cleanup",
      "Pioneer USB drive support",
      "Mac and Windows native app",
    ],
  };
}

export function faqPageSchema(faqs: Faq[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
