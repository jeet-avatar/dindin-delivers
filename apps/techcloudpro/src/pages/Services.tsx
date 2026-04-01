import { Helmet } from 'react-helmet-async'
import { Scene3D } from '../components/3d'
import { SectionHeader } from '../components/ui'
import { PillarGrid, CTABlock } from '../components/sections'

export default function Services() {
  return (
    <>
      <Helmet>
        <title>Services — AI, ERP, Cybersecurity & IT Staffing | TechCloudPro</title>
        <meta name="description" content="Full-spectrum technology services: Private AI deployment, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing solutions." />
      </Helmet>

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
