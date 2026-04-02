import { Handshake } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, SEO } from '../components/ui'
import { CTABlock } from '../components/sections'
import { partners } from '../data/partners'

export default function Partners() {
  return (
    <>
      <SEO
        title="Technology Partners"
        description="TechCloudPro partners with Oracle NetSuite, CyberArk, Planful, and Zietra to deliver best-in-class enterprise solutions."
        path="/partners"
      />

      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Technology Partners"
            title="Partnering With Industry Leaders"
            subtitle="We align with the best technology vendors to deliver proven, enterprise-grade solutions for our clients."
          />
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partners.map(p => (
            <GlassCard key={p.name} className="p-8">
              <div className="w-14 h-14 rounded-xl bg-purple-500/12 text-purple-400 flex items-center justify-center mb-5 [.light_&]:bg-purple-600/8 [.light_&]:text-purple-600">
                <Handshake size={26} />
              </div>
              <h3 className="text-xl font-bold mb-3">{p.name}</h3>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{p.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <CTABlock title="Become a Partner" subtitle="Interested in partnering with TechCloudPro? Let's explore how we can grow together." />
    </>
  )
}
