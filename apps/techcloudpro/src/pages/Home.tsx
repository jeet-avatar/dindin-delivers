import { Helmet } from 'react-helmet-async'
import { HeroCarousel, StatsRibbon, PillarGrid, ClientMarquee, CTABlock } from '../components/sections'
import { SectionHeader } from '../components/ui'

export default function Home() {
  return (
    <>
      <Helmet>
        <title>TechCloudPro — Enterprise AI, ERP, Cybersecurity & IT Staffing</title>
        <meta name="description" content="Transform your business with TechCloudPro — Private AI deployment, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing solutions." />
      </Helmet>

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
