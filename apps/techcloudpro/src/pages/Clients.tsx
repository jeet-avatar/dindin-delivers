import { Helmet } from 'react-helmet-async'
import { Building2 } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard } from '../components/ui'
import { CTABlock } from '../components/sections'
import { clients } from '../data/clients'

export default function Clients() {
  return (
    <>
      <Helmet>
        <title>Clients — Our Enterprise Partners | TechCloudPro</title>
        <meta name="description" content="TechCloudPro partners with Fortune 500 and growing enterprises on their digital transformation journey." />
      </Helmet>

      {/* Hero */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="A Growing Clientele"
            title="Happy Clients Are Our Measure Of Success"
            subtitle="TechCloudPro has partnered with small, medium and large enterprises on their digital transformation journey, taking them ahead of competitors with technology solutions that cater to their dynamic and growing needs."
          />
        </div>
      </section>

      {/* Client grid */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {clients.map(client => (
            <GlassCard key={client.name} className="group">
              <div className="w-12 h-12 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] flex items-center justify-center mb-4 [.light_&]:bg-gray-50">
                <Building2 size={22} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-[15px] font-bold mb-2">{client.name}</h3>
              <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">{client.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <CTABlock
        title="Join Our Growing Clientele"
        subtitle="See how TechCloudPro can transform your business with the right technology solutions."
      />
    </>
  )
}
