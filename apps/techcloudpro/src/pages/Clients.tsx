import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, SEO, SchemaMarkup } from '../components/ui'
import { CTABlock } from '../components/sections'
import { clients } from '../data/clients'

export default function Clients() {
  return (
    <>
      <SEO
        title="Clients — Our Enterprise Partners"
        description="TechCloudPro partners with Fortune 500 and growing enterprises including AbbVie, Accenture, BNY Mellon, Mercedes-Benz, and more."
        path="/clients"
      />
      <SchemaMarkup page="about" breadcrumbs={[{ name: 'Home', url: 'https://techcloudpro.com' }, { name: 'Clients', url: 'https://techcloudpro.com/clients' }]} />

      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            as="h1"
            label="A Growing Clientele"
            title="Happy Clients Are Our Measure Of Success"
            subtitle="TechCloudPro has partnered with small, medium and large enterprises on their digital transformation journey, taking them ahead of competitors with technology solutions that cater to their dynamic and growing needs."
          />
        </div>
      </section>

      {/* Client grid */}
      <section className="py-12 px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {clients.map(client => (
            <GlassCard key={client.name} className="group flex flex-col">
              <div className="h-16 flex items-center justify-center mb-4 rounded-xl bg-white/80 [.light_&]:bg-gray-50 p-3">
                <img
                  src={`/images/clients/${client.logo}`}
                  alt={client.name}
                  className="max-h-12 max-w-[140px] object-contain"
                  width={140}
                  height={48}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h3 className="text-[15px] font-bold mb-2">{client.name}</h3>
              <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed flex-1">{client.description}</p>
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
