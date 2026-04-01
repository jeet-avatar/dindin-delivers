import { Helmet } from 'react-helmet-async'
import { Quote } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, Badge } from '../components/ui'
import { CTABlock } from '../components/sections'
import { caseStudies } from '../data/caseStudies'

export default function CaseStudies() {
  return (
    <>
      <Helmet>
        <title>Case Studies — Success Stories | TechCloudPro</title>
        <meta name="description" content="Read how TechCloudPro has helped enterprises leverage Cloud ERP solutions and grow their business more efficiently." />
      </Helmet>

      {/* Hero */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Success Stories"
            title="Case Studies"
            subtitle="Read about how TechCloudPro has helped clients leverage Cloud ERP solutions and grow their business more efficiently."
          />
        </div>
      </section>

      {/* Case studies */}
      <section className="py-16 px-6 md:px-12 max-w-5xl mx-auto">
        <div className="space-y-8">
          {caseStudies.map(study => (
            <GlassCard key={study.slug} className="p-8 md:p-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge label={study.client} variant="new" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">{study.title}</h2>
              <p className="text-[var(--text-dim)] leading-relaxed mb-6">{study.summary}</p>

              <div className="grid md:grid-cols-3 gap-5 mb-6">
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-2">Challenge</p>
                  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{study.challenge}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-2">Solution</p>
                  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{study.solution}</p>
                </div>
                <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2">Result</p>
                  <p className="text-[12px] text-[var(--text-muted)] leading-relaxed">{study.result}</p>
                </div>
              </div>

              {study.testimonial && (
                <div className="flex gap-4 p-5 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-[var(--glass-border)]">
                  <Quote size={24} className="text-purple-400 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-sm text-[var(--text-dim)] italic leading-relaxed mb-3">"{study.testimonial.quote}"</p>
                    <p className="text-[13px] font-semibold">{study.testimonial.author}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{study.testimonial.role}</p>
                  </div>
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      <CTABlock
        title="Ready to Write Your Success Story?"
        subtitle="Let's discuss how TechCloudPro can transform your business operations."
      />
    </>
  )
}
