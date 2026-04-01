import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Quote, Filter } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader } from '../components/ui'
import { CTABlock } from '../components/sections'
import { caseStudies, type CaseCategory } from '../data/caseStudies'

const categories: { key: CaseCategory | 'all'; label: string; color: string }[] = [
  { key: 'all', label: 'All Case Studies', color: 'text-[var(--text)]' },
  { key: 'erp', label: 'NetSuite ERP', color: 'text-purple-400' },
  { key: 'ai', label: 'AI & Private LLM', color: 'text-blue-400' },
  { key: 'cyber', label: 'Cybersecurity', color: 'text-rose-400' },
  { key: 'staffing', label: 'IT Staffing', color: 'text-emerald-400' },
]

const categoryColors: Record<CaseCategory, { badge: string; dot: string; accent: string }> = {
  erp: { badge: 'bg-purple-500/10 border-purple-500/20 text-purple-400', dot: 'bg-purple-400', accent: 'text-purple-400' },
  ai: { badge: 'bg-blue-500/10 border-blue-500/20 text-blue-400', dot: 'bg-blue-400', accent: 'text-blue-400' },
  cyber: { badge: 'bg-rose-500/10 border-rose-500/20 text-rose-400', dot: 'bg-rose-400', accent: 'text-rose-400' },
  staffing: { badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-400', accent: 'text-emerald-400' },
}

export default function CaseStudies() {
  const [filter, setFilter] = useState<CaseCategory | 'all'>('all')
  const filtered = filter === 'all' ? caseStudies : caseStudies.filter(s => s.category === filter)

  return (
    <>
      <Helmet>
        <title>Case Studies — Success Stories | TechCloudPro</title>
        <meta name="description" content="Read how TechCloudPro has helped enterprises with AI deployment, NetSuite ERP, cybersecurity, and IT staffing." />
      </Helmet>

      {/* Hero */}
      <section className="relative py-24 md:py-28 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Success Stories"
            title="Real Results, Real Impact"
            subtitle="From private LLM deployments to NetSuite implementations, CyberArk security to rapid team scaling — see how we deliver measurable outcomes."
          />
        </div>
      </section>

      {/* Category filter */}
      <div className="flex items-center justify-center gap-2 flex-wrap px-6 pb-8">
        <Filter size={14} className="text-[var(--text-muted)] mr-1" />
        {categories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setFilter(cat.key)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
              filter === cat.key
                ? 'bg-white/10 border-white/20 text-[var(--text)] [.light_&]:bg-gray-100 [.light_&]:border-gray-300'
                : 'bg-transparent border-[var(--glass-border)] text-[var(--text-muted)] hover:border-[var(--glass-border-hover)]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Case studies */}
      <section className="px-6 md:px-10 lg:px-16 max-w-[1440px] mx-auto pb-12">
        <div className="space-y-6">
          {filtered.map(study => {
            const cc = categoryColors[study.category]
            return (
              <article key={study.slug} className="rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-xl [.light_&]:bg-white [.light_&]:shadow-md">
                {/* Top bar with category + client */}
                <div className="flex items-center gap-3 px-8 pt-6 pb-0">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border ${cc.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cc.dot}`} />
                    {study.categoryLabel}
                  </span>
                  <span className="text-[11px] text-[var(--text-muted)]">{study.client}</span>
                </div>

                {/* Main content grid */}
                <div className="grid lg:grid-cols-3 gap-0">
                  {/* Left 2/3: Title + Summary + Testimonial */}
                  <div className="lg:col-span-2 p-8">
                    <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight mb-3 leading-tight">{study.title}</h2>
                    <p className="text-[14px] text-[var(--text-dim)] leading-relaxed mb-6">{study.summary}</p>

                    {/* Metrics row */}
                    {study.metrics && (
                      <div className="flex flex-wrap gap-4 mb-6">
                        {study.metrics.map(m => (
                          <div key={m.label} className="px-5 py-3 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] [.light_&]:bg-gray-50 text-center min-w-[100px]">
                            <div className={`text-xl md:text-2xl font-extrabold ${cc.accent}`}>{m.value}</div>
                            <div className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider mt-0.5">{m.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {study.testimonial && (
                      <div className="flex gap-3 p-4 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-[var(--glass-border)]">
                        <Quote size={18} className="text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[12px] text-[var(--text-dim)] italic leading-relaxed mb-1.5">"{study.testimonial.quote}"</p>
                          <p className="text-[12px] font-semibold">{study.testimonial.author} <span className="text-[var(--text-muted)] font-normal">— {study.testimonial.role}</span></p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 1/3: Challenge / Solution / Result */}
                  <div className="p-6 lg:p-8 bg-[var(--surface)] [.light_&]:bg-gray-50/80 flex flex-col gap-4 lg:border-l border-[var(--glass-border)]">
                    <div className="p-4 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Challenge</span>
                      </div>
                      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">{study.challenge}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Solution</span>
                      </div>
                      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">{study.solution}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Result</span>
                      </div>
                      <p className="text-[11.5px] text-[var(--text-muted)] leading-relaxed">{study.result}</p>
                    </div>
                  </div>
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
