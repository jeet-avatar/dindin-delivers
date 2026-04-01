import { Helmet } from 'react-helmet-async'
import { Scene3D } from '../components/3d'
import { SectionHeader } from '../components/ui'

export default function Home() {
  return (
    <>
      <Helmet>
        <title>TechCloudPro — Enterprise AI, ERP, Cybersecurity & IT Staffing</title>
        <meta name="description" content="Transform your business with TechCloudPro — Private AI deployment, Oracle NetSuite ERP, CyberArk cybersecurity, and IT staffing solutions." />
      </Helmet>

      {/* Hero placeholder — Wave 2 */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        <Scene3D />
        <div className="relative z-10 text-center px-6">
          <SectionHeader
            label="Full-Spectrum IT Consulting"
            title="Enterprise Technology Reimagined"
            subtitle="From AI-powered automation to NetSuite ERP, cybersecurity to IT staffing — we deliver end-to-end technology transformation."
          />
          <p className="text-sm text-[var(--text-muted)] mt-8 border border-dashed border-[var(--glass-border)] rounded-xl px-6 py-3 inline-block">
            Hero Carousel, Stats, Pillars, Client Marquee, CTA — Coming in Wave 2
          </p>
        </div>
      </section>
    </>
  )
}
