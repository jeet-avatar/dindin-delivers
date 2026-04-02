import { useState } from 'react'
import { Quote, Filter } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, SEO } from '../components/ui'
import { CTABlock } from '../components/sections'
import { caseStudies, type CaseCategory } from '../data/caseStudies'

const filterOptions: { key: CaseCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Case Studies' },
  { key: 'erp', label: 'NetSuite ERP' },
  { key: 'ai', label: 'AI & Private LLM' },
  { key: 'cyber', label: 'Cybersecurity' },
  { key: 'staffing', label: 'IT Staffing' },
]

const categoryStyles: Record<CaseCategory, { badge: string; dot: string; accent: string; border: string }> = {
  erp: { badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400', dot: 'bg-purple-400', accent: 'text-purple-400', border: 'border-l-purple-500' },
  ai: { badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400', dot: 'bg-blue-400', accent: 'text-blue-400', border: 'border-l-blue-500' },
  cyber: { badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400', dot: 'bg-rose-400', accent: 'text-rose-400', border: 'border-l-rose-500' },
  staffing: { badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400', accent: 'text-emerald-400', border: 'border-l-emerald-500' },
}

export default function CaseStudies() {
  const [filter, setFilter] = useState<CaseCategory | 'all'>('all')
  const filtered = filter === 'all' ? caseStudies : caseStudies.filter(s => s.category === filter)

  return (
    <>
      <SEO
        title="Case Studies — AI, ERP & Cybersecurity Success Stories"
        description="See how TechCloudPro delivers measurable results — private LLM deployments processing 50K+ docs/day, NetSuite ERP for Fortune 500, CyberArk securing 12K accounts."
        path="/case-studies"
      />

      {/* Hero */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Success Stories"
            title="Real Results, Real Impact"
            subtitle="From private LLM deployments to NetSuite implementations, CyberArk security to rapid team scaling — see how we deliver measurable outcomes for enterprises worldwide."
          />
        </div>
      </section>

      {/* Category filter */}
      <div className="flex items-center justify-center gap-2 flex-wrap px-6 pb-10">
        <Filter size={14} className="text-[var(--text-muted)] mr-1" />
        {filterOptions.map(cat => (
          <button
            key={cat.key}
            type="button"
            onClick={() => setFilter(cat.key)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
              filter === cat.key
                ? 'bg-white/10 border-white/20 text-[var(--text)] [.light_&]:bg-gray-100 [.light_&]:border-gray-300'
                : 'bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:border-[var(--glass-border-hover)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Case studies — full width, single column flow */}
      <section className="px-6 md:px-10 lg:px-16 max-w-[1200px] mx-auto pb-16">
        <div className="space-y-12">
          {filtered.map(study => {
            const cs = categoryStyles[study.category]
            return (
              <article
                key={study.slug}
                className="rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-xl [.light_&]:bg-white [.light_&]:shadow-md"
                itemScope
                itemType="https://schema.org/Article"
              >
                {/* Header */}
                <div className="p-8 md:p-10 lg:p-12 pb-0">
                  <div className="flex items-center gap-3 mb-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${cs.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                      {study.categoryLabel}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">{study.client}</span>
                  </div>

                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 leading-tight" itemProp="headline">
                    {study.title}
                  </h2>
                  <p className="text-base md:text-lg text-[var(--text-dim)] leading-relaxed mb-8 max-w-4xl" itemProp="description">
                    {study.summary}
                  </p>

                  {/* Metrics row */}
                  {study.metrics && (
                    <div className="flex flex-wrap gap-4 mb-8">
                      {study.metrics.map(m => (
                        <div key={m.label} className="px-6 py-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] [.light_&]:bg-gray-50 text-center min-w-[120px]">
                          <div className={`text-2xl md:text-3xl font-extrabold ${cs.accent}`}>{m.value}</div>
                          <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Full-width content sections */}
                <div className="px-8 md:px-10 lg:px-12 pb-8 md:pb-10 lg:pb-12">
                  {/* Challenge */}
                  <div className={`mb-6 pl-5 border-l-2 ${cs.border}`}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-400 mb-2">The Challenge</h3>
                    <p className="text-[15px] text-[var(--text-dim)] leading-relaxed">{study.challenge}</p>
                  </div>

                  {/* Solution */}
                  <div className={`mb-6 pl-5 border-l-2 ${cs.border}`}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-400 mb-2">Our Solution</h3>
                    <p className="text-[15px] text-[var(--text-dim)] leading-relaxed">{study.solution}</p>
                  </div>

                  {/* Result */}
                  <div className={`mb-8 pl-5 border-l-2 ${cs.border}`}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-400 mb-2">The Result</h3>
                    <p className="text-[15px] text-[var(--text-dim)] leading-relaxed">{study.result}</p>
                  </div>

                  {/* Testimonial */}
                  {study.testimonial && (
                    <div className="flex gap-4 p-6 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-[var(--glass-border)]">
                      <Quote size={24} className="text-purple-400 flex-shrink-0 mt-1" />
                      <div>
                        <p className="text-base text-[var(--text-dim)] italic leading-relaxed mb-3">
                          "{study.testimonial.quote}"
                        </p>
                        <p className="text-sm font-bold">
                          {study.testimonial.author}
                          <span className="text-[var(--text-muted)] font-normal"> — {study.testimonial.role}</span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <CTABlock
        title="Ready to Write Your Success Story?"
        subtitle="Let's discuss how TechCloudPro can deliver measurable results for your business."
      />
    </>
  )
}
