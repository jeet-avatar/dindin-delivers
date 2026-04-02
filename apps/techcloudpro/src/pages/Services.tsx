import { Scene3D } from '../components/3d'
import { SectionHeader, SEO } from '../components/ui'
import { PillarGrid, CTABlock } from '../components/sections'

export default function Services() {
  return (
    <>
      <SEO
        title="Services — AI, ERP, Cybersecurity & IT Staffing"
        description="Full-spectrum technology services: Private AI deployment, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing solutions."
        path="/services"
      />

      {/* Hero */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Our Core Practices"
            title="Full-Spectrum Technology Services"
            subtitle="From AI strategy to ERP deployment, cybersecurity to IT talent — four interconnected pillars powering enterprise transformation."
          />
        </div>
      </section>

      {/* Expanded pillar grid */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <PillarGrid expanded />
      </section>

      <CTABlock />
    </>
  )
}
