import type { Faq } from "@/lib/faqs";
import {
  ANNUAL_DISCOUNT_LABEL,
  HIGHEST_MONTHLY_USD,
  LOWEST_MONTHLY_USD,
  MIXMIND_PRICE,
  PLANS,
  type Plan,
  planById,
  signupHref,
} from "@/lib/pricing";
import {
  BASE_URL,
  HOME_DESCRIPTION,
  LEGAL_NAME,
  OG_IMAGE,
  OG_IMAGE_MIXMIND,
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

function usd(amount: number): string {
  return amount.toFixed(2);
}

function unitPrice(amount: number, unitText: "MONTH" | "YEAR", unitCode: "MON" | "ANN"): JsonLdObject {
  return {
    "@type": "UnitPriceSpecification",
    price: usd(amount),
    priceCurrency: "USD",
    unitText,
    referenceQuantity: { "@type": "QuantitativeValue", value: 1, unitCode },
  };
}

function planOffer(plan: Plan, description: string): JsonLdObject {
  return {
    "@type": "Offer",
    name: `BeatMind ${plan.name}`,
    url: absoluteUrl(signupHref(plan.id, "month")),
    price: usd(plan.monthly),
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    description,
    priceSpecification: [unitPrice(plan.monthly, "MONTH", "MON"), unitPrice(plan.yearly, "YEAR", "ANN")],
  };
}

function beatmindOffers(): JsonLdObject {
  return {
    "@type": "AggregateOffer",
    lowPrice: usd(LOWEST_MONTHLY_USD),
    highPrice: usd(HIGHEST_MONTHLY_USD),
    priceCurrency: "USD",
    offerCount: PLANS.length,
    offers: PLANS.map((plan) =>
      planOffer(
        plan,
        `$${plan.monthly}/month or $${plan.yearly}/year (${ANNUAL_DISCOUNT_LABEL}). ${plan.features.join(", ")}. ${TRIAL_TERMS}`,
      ),
    ),
  };
}

// MixMind has no standalone checkout yet, so the only purchasable offer is
// early access through BeatMind Studio. Standalone pricing is described, not offered.
function mixmindOffer(): JsonLdObject {
  const studio = planById("studio");
  return planOffer(
    studio,
    `MixMind early access is included with BeatMind Studio ($${studio.monthly}/month). Standalone MixMind ($${MIXMIND_PRICE.monthly}/month) is coming soon. ${TRIAL_TERMS}`,
  );
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
    offers: beatmindOffers(),
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
      "DJ library manager that reads your Rekordbox collection. Browse every track, find duplicates, and build AI playlists from music you already own. In early access, included with BeatMind Studio; standalone MixMind is coming soon.",
    softwareRequirements: "Rekordbox 6 or 7",
    publisher: ORGANIZATION_REF,
    offers: mixmindOffer(),
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
