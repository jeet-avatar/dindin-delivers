import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { Quote, Filter } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader } from '../components/ui'
import { CTABlock } from '../components/sections'
import { caseStudies, type CaseCategory } from '../data/caseStudies'

const filterOptions: { key: CaseCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All Case Studies' },
  { key: 'erp', label: 'NetSuite ERP' },
  { key: 'ai', label: 'AI & Private LLM' },
  { key: 'cyber', label: 'Cybersecurity' },
  { key: 'staffing', label: 'IT Staffing' },
]

const categoryStyles: Record<CaseCategory, { badge: string; dot: string; accent: string }> = {
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
        <title>Case Studies — AI, ERP & Cybersecurity Success Stories | TechCloudPro</title>
        <meta name="description" content="See how TechCloudPro delivers measurable results — private LLM deployments processing 50K+ docs/day, NetSuite ERP for Fortune 500, CyberArk securing 12K accounts, and rapid IT team scaling." />
        <meta property="og:title" content="Case Studies — Real Results, Real Impact | TechCloudPro" />
        <meta property="og:description" content="From private AI deployment to cloud ERP, cybersecurity to IT staffing — 9 case studies showing measurable enterprise transformation." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://techcloudpro.com/case-studies" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Case Studies — TechCloudPro" />
        <meta name="twitter:description" content="Real results from AI deployment, NetSuite ERP, CyberArk security, and IT staffing engagements." />
        <link rel="canonical" href="https://techcloudpro.com/case-studies" />
      </Helmet>

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

      {/* Case studies */}
      <section className="px-6 md:px-10 lg:px-16 max-w-[1440px] mx-auto pb-16">
        <div className="space-y-8">
          {filtered.map(study => {
            const cs = categoryStyles[study.category]
            return (
              <article
                key={study.slug}
                className="rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-xl [.light_&]:bg-white [.light_&]:shadow-md"
                itemScope
                itemType="https://schema.org/Article"
              >
                {/* Category + client header */}
                <div className="flex items-center gap-3 px-8 md:px-10 pt-7">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${cs.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${cs.dot}`} />
                    {study.categoryLabel}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{study.client}</span>
                </div>

                {/* Main content */}
                <div className="grid lg:grid-cols-5 gap-0">
                  {/* Left 3/5: Title, Summary, Metrics, Testimonial */}
                  <div className="lg:col-span-3 p-8 md:p-10">
                    <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 leading-tight" itemProp="headline">
                      {study.title}
                    </h2>
                    <p className="text-base text-[var(--text-dim)] leading-relaxed mb-8" itemProp="description">
                      {study.summary}
                    </p>

                    {/* Metrics */}
                    {study.metrics && (
                      <div className="flex flex-wrap gap-4 mb-8">
                        {study.metrics.map(m => (
                          <div key={m.label} className="px-6 py-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] [.light_&]:bg-gray-50 text-center min-w-[110px]">
                            <div className={`text-2xl md:text-3xl font-extrabold ${cs.accent}`}>{m.value}</div>
                            <div className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mt-1">{m.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Testimonial */}
                    {study.testimonial && (
                      <div className="flex gap-4 p-5 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-[var(--glass-border)]">
                        <Quote size={20} className="text-purple-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-[var(--text-dim)] italic leading-relaxed mb-2">
                            "{study.testimonial.quote}"
                          </p>
                          <p className="text-sm font-semibold">
                            {study.testimonial.author}
                            <span className="text-[var(--text-muted)] font-normal"> — {study.testimonial.role}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right 2/5: Challenge / Solution / Result */}
                  <div className="lg:col-span-2 p-6 md:p-8 lg:p-10 bg-[var(--surface)] [.light_&]:bg-gray-50/80 flex flex-col gap-5 lg:border-l border-[var(--glass-border)]">
                    <div className="p-5 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-rose-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Challenge</span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{study.challenge}</p>
                    </div>

                    <div className="p-5 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Solution</span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{study.solution}</p>
                    </div>

                    <div className="p-5 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Result</span>
                      </div>
                      <p className="text-sm text-[var(--text-muted)] leading-relaxed">{study.result}</p>
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
