import { useParams, Navigate } from 'react-router'
import { Helmet } from 'react-helmet-async'
import { Monitor, Shield, Sparkles, Users, CheckCircle } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, Badge } from '../components/ui'
import { CTABlock } from '../components/sections'
import { pillars, type PillarColor } from '../data/services'

const iconMap: Record<string, React.ElementType> = { Monitor, Shield, Sparkles, Users }

const heroGradients: Record<PillarColor, string> = {
  ai: 'from-blue-600/10 via-cyan-500/5 to-transparent',
  erp: 'from-purple-600/10 via-pink-500/5 to-transparent',
  cyber: 'from-rose-600/10 via-orange-500/5 to-transparent',
  staff: 'from-emerald-600/10 via-cyan-500/5 to-transparent',
}

const iconBg: Record<PillarColor, string> = {
  ai: 'bg-blue-500/12 text-blue-400 [.light_&]:bg-blue-600/8 [.light_&]:text-blue-600',
  erp: 'bg-purple-500/12 text-purple-400 [.light_&]:bg-purple-600/8 [.light_&]:text-purple-600',
  cyber: 'bg-rose-500/12 text-rose-400 [.light_&]:bg-rose-600/8 [.light_&]:text-rose-600',
  staff: 'bg-emerald-500/12 text-emerald-400 [.light_&]:bg-emerald-600/8 [.light_&]:text-emerald-600',
}

const labelColor: Record<PillarColor, string> = {
  ai: 'text-blue-400 [.light_&]:text-blue-600',
  erp: 'text-purple-400 [.light_&]:text-purple-600',
  cyber: 'text-rose-400 [.light_&]:text-rose-600',
  staff: 'text-emerald-400 [.light_&]:text-emerald-600',
}

const checkColor: Record<PillarColor, string> = {
  ai: 'text-blue-400',
  erp: 'text-purple-400',
  cyber: 'text-rose-400',
  staff: 'text-emerald-400',
}

export default function ServiceDetail() {
  const { slug } = useParams<{ slug: string }>()
  const pillar = pillars.find(p => p.slug === slug)

  if (!pillar) return <Navigate to="/services" replace />

  const Icon = iconMap[pillar.icon] || Sparkles

  return (
    <>
      <Helmet>
        <title>{pillar.title} — {pillar.label} | TechCloudPro</title>
        <meta name="description" content={pillar.description} />
      </Helmet>

      {/* Hero */}
      <section className={`relative py-28 md:py-36 overflow-hidden bg-gradient-to-br ${heroGradients[pillar.color]}`}>
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${iconBg[pillar.color]}`}>
            <Icon size={30} />
          </div>
          <p className={`text-[11px] font-semibold uppercase tracking-[3px] mb-3 ${labelColor[pillar.color]}`}>
            {pillar.label}
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mb-5">
            {pillar.title}
          </h1>
          <p className="text-base md:text-lg text-[var(--text-dim)] max-w-2xl mx-auto leading-relaxed">
            {pillar.description}
          </p>
        </div>
      </section>

      {/* Sub-services grid */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <SectionHeader
          label="What We Deliver"
          title="Comprehensive Service Catalog"
          className="mb-14"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillar.subServices.map(sub => (
            <GlassCard key={sub.name} color={pillar.color} className="group">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-[15px] font-bold">{sub.name}</h3>
                {sub.badge && (
                  <Badge label={sub.badge.label} variant={sub.badge.variant} className="flex-shrink-0" />
                )}
              </div>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{sub.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Why choose us */}
      <section className="py-16 px-6 md:px-12 max-w-4xl mx-auto">
        <SectionHeader
          label="Why TechCloudPro"
          title="Why Choose Us"
          className="mb-10"
        />
        <div className="space-y-4">
          {pillar.whyChooseUs.map(reason => (
            <div key={reason} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm">
              <CheckCircle size={20} className={`flex-shrink-0 mt-0.5 ${checkColor[pillar.color]}`} />
              <p className="text-sm text-[var(--text-dim)]">{reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <CTABlock
        title={`Ready to Get Started with ${pillar.label}?`}
        subtitle="Schedule a free consultation and let our experts build your technology roadmap."
        buttonText="Get Free Consultation"
      />
    </>
  )
}
