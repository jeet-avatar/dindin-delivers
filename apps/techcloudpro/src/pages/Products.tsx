import { ExternalLink, CheckCircle, Box } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, Button, SEO } from '../components/ui'
import { CTABlock } from '../components/sections'
import { products } from '../data/products'

export default function Products() {
  return (
    <>
      <SEO
        title="Our Products — BrandMonkz, BeatMind, VibingTicket"
        description="Explore TechCloudPro's product portfolio: BrandMonkz CRM, BeatMind AI music assistant, and VibingTicket event ticketing platform."
        path="/products"
      />

      {/* Hero */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Our Products"
            title="Built by TechCloudPro, Powered by Innovation"
            subtitle="We don't just consult — we build. Our product portfolio spans AI-powered SaaS, CRM platforms, and event technology, all crafted with the same enterprise-grade engineering we bring to our clients."
          />
        </div>
      </section>

      {/* Products */}
      <section className="px-6 md:px-10 lg:px-16 max-w-[1200px] mx-auto pb-16">
        <div className="space-y-10">
          {products.map((product, idx) => (
            <article
              key={product.slug}
              className="rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-xl [.light_&]:bg-white [.light_&]:shadow-md"
            >
              <div className="grid lg:grid-cols-5 gap-0">
                {/* Left: Product info */}
                <div className={`lg:col-span-3 p-8 md:p-10 lg:p-12 ${idx % 2 === 1 ? 'lg:order-2' : ''}`}>
                  {/* Icon + name */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: product.iconBg, color: product.iconColor }}>
                      <Box size={28} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{product.name}</h2>
                      <p className="text-sm font-semibold" style={{ color: product.iconColor }}>{product.tagline}</p>
                    </div>
                  </div>

                  <p className="text-base text-[var(--text-dim)] leading-relaxed mb-8">
                    {product.description}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button href={product.url} external size="md">
                      Visit {product.name} <ExternalLink size={16} />
                    </Button>
                  </div>
                </div>

                {/* Right: Features */}
                <div className={`lg:col-span-2 p-6 md:p-8 lg:p-10 bg-[var(--surface)] [.light_&]:bg-gray-50/80 flex flex-col justify-center lg:border-l border-[var(--glass-border)] ${idx % 2 === 1 ? 'lg:order-1 lg:border-l-0 lg:border-r' : ''}`}>
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-5" style={{ color: product.iconColor }}>Key Features</h3>
                  <ul className="space-y-3">
                    {product.features.map(f => (
                      <li key={f} className="flex items-start gap-3 text-sm text-[var(--text-dim)]">
                        <CheckCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: product.iconColor }} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* VibingTicket highlight */}
      <section className="px-6 md:px-10 lg:px-16 max-w-[1200px] mx-auto pb-16">
        <GlassCard className="p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full opacity-10 blur-[80px]" style={{ background: '#06B6D4' }} />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full opacity-8 blur-[80px]" style={{ background: '#2563EB' }} />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(6,182,212,0.12)', color: '#22D3EE' }}>
              <Box size={32} />
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              VibingTicket is <span className="grad-text-blue">Live</span>
            </h2>
            <p className="text-base text-[var(--text-dim)] max-w-xl mx-auto mb-8 leading-relaxed">
              The next-gen event ticketing platform is here. Create events, sell tickets, manage check-ins, and track analytics — all in one place.
            </p>
            <Button href="https://vibingticket.com" external size="lg">
              Explore VibingTicket.com <ExternalLink size={18} />
            </Button>
          </div>
        </GlassCard>
      </section>

      <CTABlock
        title="Have a Product Idea?"
        subtitle="We build enterprise-grade SaaS products from concept to launch. Let's talk about yours."
        buttonText="Let's Build Together"
      />
    </>
  )
}
