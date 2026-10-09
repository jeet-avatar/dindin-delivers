import type { Metadata } from "next";
import { JsonLd } from "@/components/JsonLd";
import { BEATMIND_FAQS } from "@/lib/faqs";
import { BASE_URL } from "@/lib/site";
import {
  beatmindAppSchema,
  faqPageSchema,
  organizationSchema,
  websiteSchema,
} from "@/lib/structured-data";
import LandingPage from "./landing-page";

export const metadata: Metadata = {
  alternates: {
    canonical: `${BASE_URL}/`,
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={organizationSchema()} />
      <JsonLd data={websiteSchema()} />
      <JsonLd data={beatmindAppSchema()} />
      <JsonLd data={faqPageSchema(BEATMIND_FAQS)} />
      <LandingPage />
    </>
  );
}
