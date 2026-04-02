import { Shield, Lock, Server, Brain, Bot, FileSearch, MessageSquare, Activity, Target, CheckCircle, ArrowRight } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, Badge, Button, SEO } from '../components/ui'
import { CTABlock } from '../components/sections'

const capabilities = [
  { icon: Server, title: 'Private LLM Deployment', description: 'Deploy GPT-class models entirely within your VPN. No third-party APIs, no data leaving your infrastructure. Complete sovereignty over your AI stack.', badge: { label: 'Most Popular', variant: 'hot' as const }, color: 'text-blue-400 bg-blue-500/12' },
  { icon: Bot, title: 'Agentic AI Systems', description: 'Autonomous AI agents that reason, plan, and execute complex workflows — document processing, claims handling, compliance monitoring — with full audit trail.', badge: { label: 'New', variant: 'new' as const }, color: 'text-purple-400 bg-purple-500/12' },
  { icon: FileSearch, title: 'Enterprise RAG', description: 'Retrieval-augmented generation across your proprietary knowledge base. Semantic search over millions of documents with cited, accurate answers.', color: 'text-cyan-400 bg-cyan-500/12' },
  { icon: Brain, title: 'Model Fine-Tuning', description: 'Industry-specific fine-tuning on your data. Legal, financial, healthcare, manufacturing — models that speak your domain language.', color: 'text-emerald-400 bg-emerald-500/12' },
  { icon: MessageSquare, title: 'Conversational AI', description: 'Customer-facing and internal AI assistants. Natural language interfaces for your existing systems — ERP, CRM, knowledge base, support.', color: 'text-orange-400 bg-orange-500/12' },
  { icon: Activity, title: 'MLOps & Monitoring', description: 'Continuous model monitoring, drift detection, performance optimization. Full lifecycle management from training to production.', color: 'text-rose-400 bg-rose-500/12' },
]

const process = [
  { step: '01', title: 'Discovery & Assessment', description: 'We analyze your infrastructure, security requirements, data landscape, and business objectives. Includes AI readiness scoring and ROI projection.', duration: 'Week 1-2' },
  { step: '02', title: 'Architecture & Security Design', description: 'Custom AI architecture designed for your VPN environment. Security protocols, data flow mapping, compliance framework alignment (SOC 2, HIPAA, GDPR).', duration: 'Week 3-4' },
  { step: '03', title: 'Model Selection & Training', description: 'Select and fine-tune the right model for your use case. Industry-specific training data preparation, embeddings optimization, RAG pipeline construction.', duration: 'Week 5-8' },
  { step: '04', title: 'Deployment & Integration', description: 'Deploy within your infrastructure. API integration with existing systems, user training, documentation. Rigorous security testing and penetration testing.', duration: 'Week 9-10' },
  { step: '05', title: 'Monitoring & Optimization', description: 'Go-live with 24/7 monitoring. Continuous optimization, model updates, performance tuning. Monthly reporting on ROI and usage metrics.', duration: 'Ongoing' },
]

const differentiators = [
  'Models deployed INSIDE your firewall — not on our servers',
  'Zero data leaves your infrastructure — ever',
  'No third-party API dependencies — fully self-contained',
  'SOC 2, HIPAA, GDPR compliant deployments',
  'Measurable ROI within 90 days or we refine until it does',
  'Dedicated AI engineer assigned to your account',
  '24/7 monitoring with <5 minute incident response',
  'Works with your existing tech stack — NetSuite, CyberArk, custom systems',
]

const useCases = [
  { industry: 'Financial Services', cases: ['Document analysis & regulatory compliance', 'Loan underwriting automation', 'Fraud detection & AML screening', 'Private wealth management insights'] },
  { industry: 'Healthcare', cases: ['Clinical document processing', 'Patient data analysis (HIPAA compliant)', 'Medical coding automation', 'Drug interaction screening'] },
  { industry: 'Legal', cases: ['Contract review & due diligence', 'Legal research across precedent databases', 'Regulatory compliance monitoring', 'Brief drafting assistance'] },
  { industry: 'Manufacturing', cases: ['Quality control document analysis', 'Supply chain optimization', 'Predictive maintenance from sensor data', 'Safety compliance automation'] },
]

export default function AIConsulting() {
  return (
    <>
      <SEO
        title="AI Consulting — Private LLM & Agentic AI Solutions"
        description="Deploy secure AI within your infrastructure. Private LLM models, agentic AI systems, enterprise RAG — zero data leakage, complete sovereignty. SOC 2, HIPAA, GDPR compliant."
        path="/services/ai"
      />

      {/* Hero */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D />
        <div className="relative z-10 max-w-5xl mx-auto px-6">
          <div className="max-w-3xl">
            <Badge label="The AI Era Is Here" variant="hot" dot className="mb-6" />
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.06] mb-6">
              Private AI That Never<br />
              <span className="grad-text-blue">Leaves Your Infrastructure</span>
            </h1>
            <p className="text-lg md:text-xl text-[var(--text-dim)] leading-relaxed mb-8 max-w-2xl">
              Deploy proprietary LLM models directly within your VPN. Build agentic AI systems that reason, plan, and execute autonomously. No third-party APIs. No data leakage. Complete control.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button href="/contact" size="lg">
                Get Free AI Assessment <ArrowRight size={18} />
              </Button>
              <Button href="#capabilities" variant="ghost" size="lg">
                See Capabilities
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Why Private AI */}
      <section className="py-20 px-6 md:px-12 max-w-6xl mx-auto">
        <SectionHeader
          label="Why It Matters"
          title="Traditional AI Is a Security Risk"
          subtitle="Every time you send data to a third-party AI API, you're trusting them with your most sensitive information. We eliminate that risk entirely."
          className="mb-14"
        />
        <div className="grid md:grid-cols-3 gap-6">
          <GlassCard className="text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/12 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <Lock size={26} />
            </div>
            <h3 className="text-lg font-bold mb-2">Third-Party APIs</h3>
            <p className="text-sm text-rose-400 font-semibold mb-2">The Problem</p>
            <p className="text-sm text-[var(--text-muted)]">Your data leaves your infrastructure. You have no control over how it's stored, processed, or retained by the provider.</p>
          </GlassCard>
          <GlassCard className="text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/12 text-blue-400 flex items-center justify-center mx-auto mb-4">
              <Shield size={26} />
            </div>
            <h3 className="text-lg font-bold mb-2">Our Approach</h3>
            <p className="text-sm text-blue-400 font-semibold mb-2">The Solution</p>
            <p className="text-sm text-[var(--text-muted)]">Models run inside YOUR VPN. Data never leaves your infrastructure. No external API calls. Complete audit trail.</p>
          </GlassCard>
          <GlassCard className="text-center p-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/12 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <Target size={26} />
            </div>
            <h3 className="text-lg font-bold mb-2">The Result</h3>
            <p className="text-sm text-emerald-400 font-semibold mb-2">The Outcome</p>
            <p className="text-sm text-[var(--text-muted)]">Enterprise AI with zero compromise. Full regulatory compliance. Measurable ROI. Your data, your models, your control.</p>
          </GlassCard>
        </div>
      </section>

      {/* Capabilities */}
      <section id="capabilities" className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <SectionHeader
          label="What We Build"
          title="AI Capabilities"
          subtitle="Comprehensive AI solutions spanning the entire deployment lifecycle — from strategy to production monitoring."
          className="mb-14"
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map(cap => (
            <GlassCard key={cap.title} color="ai" className="p-7">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${cap.color}`}>
                <cap.icon size={22} />
              </div>
              <div className="flex items-start gap-2 mb-2">
                <h3 className="text-base font-bold">{cap.title}</h3>
                {cap.badge && <Badge label={cap.badge.label} variant={cap.badge.variant} className="flex-shrink-0" />}
              </div>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{cap.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Implementation Process */}
      <section className="py-20 px-6 md:px-12 max-w-5xl mx-auto">
        <SectionHeader
          label="Our Process"
          title="From Assessment to Production in 10 Weeks"
          subtitle="A proven 5-phase methodology that ensures secure, measurable AI deployment."
          className="mb-14"
        />
        <div className="space-y-6">
          {process.map(phase => (
            <div key={phase.step} className="flex gap-6 items-start p-6 rounded-2xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm">
              <div className="w-14 h-14 rounded-xl bg-blue-500/12 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-extrabold text-blue-400">{phase.step}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-bold">{phase.title}</h3>
                  <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">{phase.duration}</span>
                </div>
                <p className="text-sm text-[var(--text-muted)] leading-relaxed">{phase.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases by Industry */}
      <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
        <SectionHeader
          label="Industry Applications"
          title="AI Use Cases By Industry"
          subtitle="We've deployed private AI across regulated industries where data sovereignty is non-negotiable."
          className="mb-14"
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {useCases.map(uc => (
            <GlassCard key={uc.industry} className="p-6">
              <h3 className="text-base font-bold mb-4 text-blue-400">{uc.industry}</h3>
              <ul className="space-y-2">
                {uc.cases.map(c => (
                  <li key={c} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                    <CheckCircle size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-6 md:px-12 max-w-4xl mx-auto">
        <SectionHeader
          label="Our Commitment"
          title="Why TechCloudPro for AI"
          className="mb-10"
        />
        <div className="grid md:grid-cols-2 gap-4">
          {differentiators.map(d => (
            <div key={d} className="flex items-start gap-3 p-4 rounded-xl bg-[var(--glass)] border border-[var(--glass-border)] [.light_&]:bg-white [.light_&]:shadow-sm">
              <CheckCircle size={18} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--text-dim)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <CTABlock
        title="Ready to Deploy Secure AI?"
        subtitle="Get a free AI readiness assessment. We'll evaluate your infrastructure, identify high-impact use cases, and build your deployment roadmap."
        buttonText="Get Free AI Assessment"
      />
    </>
  )
}
