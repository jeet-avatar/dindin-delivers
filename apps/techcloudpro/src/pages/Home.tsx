import { HeroCarousel, StatsRibbon, PillarGrid, ClientMarquee, CTABlock } from '../components/sections'
import { SectionHeader, SEO } from '../components/ui'
import { SchemaMarkup } from '../components/ui/SchemaMarkup'

export default function Home() {
  return (
    <>
      <SEO
        title="Enterprise AI, ERP, Cybersecurity & IT Staffing"
        description="Transform your business with TechCloudPro — Private AI deployment, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing solutions."
        path="/"
      />
      <SchemaMarkup page="home" />

      <HeroCarousel />
      <StatsRibbon />

      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <SectionHeader
          label="What's Trending in 2026"
          title="Services Built for What's Next"
          subtitle="Every service we offer is aligned with the latest industry trends and enterprise demands."
          className="mb-14"
        />
        <PillarGrid />
      </section>

      <ClientMarquee />
      <CTABlock />
    </>
  )
}
