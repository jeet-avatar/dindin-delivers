import { Helmet } from 'react-helmet-async'
import { Quote, ArrowRight } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader } from '../components/ui'
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
      <section className="relative py-24 md:py-32 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Success Stories"
            title="Case Studies"
            subtitle="Read about how TechCloudPro has helped clients leverage Cloud ERP solutions and grow their business more efficiently."
          />
        </div>
      </section>

      {/* Case studies — full width cards */}
      <section className="py-12 px-6 md:px-12 lg:px-20 max-w-[1400px] mx-auto">
        {caseStudies.map((study, idx) => (
          <div
            key={study.slug}
            className={`grid lg:grid-cols-2 gap-0 mb-10 rounded-2xl overflow-hidden border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-xl [.light_&]:bg-white [.light_&]:shadow-md ${idx % 2 === 1 ? 'lg:direction-rtl' : ''}`}
          >
            {/* Left: Info panel */}
            <div className={`p-8 md:p-12 flex flex-col justify-center ${idx % 2 === 1 ? 'lg:order-2' : ''}`} style={{ direction: 'ltr' }}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border bg-blue-500/10 border-blue-500/20 text-blue-400 [.light_&]:text-blue-600 w-fit mb-5">
                {study.client}
              </span>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight mb-4 leading-tight">{study.title}</h2>
              <p className="text-[15px] text-[var(--text-dim)] leading-relaxed mb-6">{study.summary}</p>

              {study.testimonial && (
                <div className="flex gap-4 p-5 rounded-xl bg-gradient-to-r from-purple-500/5 to-blue-500/5 border border-[var(--glass-border)] mb-6">
                  <Quote size={22} className="text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[13px] text-[var(--text-dim)] italic leading-relaxed mb-2">"{study.testimonial.quote}"</p>
                    <p className="text-[13px] font-semibold">{study.testimonial.author}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{study.testimonial.role}</p>
                  </div>
                </div>
              )}

              <button className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors w-fit cursor-pointer">
                Read Full Case Study <ArrowRight size={16} />
              </button>
            </div>

            {/* Right: Challenge / Solution / Result */}
            <div className={`p-8 md:p-12 bg-[var(--surface)] [.light_&]:bg-gray-50 flex flex-col justify-center gap-6 ${idx % 2 === 1 ? 'lg:order-1' : ''}`} style={{ direction: 'ltr' }}>
              <div className="p-5 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Challenge</p>
                </div>
                <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{study.challenge}</p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400">Solution</p>
                </div>
                <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{study.solution}</p>
              </div>

              <div className="p-5 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Result</p>
                </div>
                <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{study.result}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <CTABlock
        title="Ready to Write Your Success Story?"
        subtitle="Let's discuss how TechCloudPro can transform your business operations."
      />
    </>
  )
}
