import { Target, Eye, Shield, Zap } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, SEO, SchemaMarkup } from '../components/ui'
import { CTABlock } from '../components/sections'

const values = [
  { icon: Target, title: 'Our Mission', description: 'To empower enterprises with secure, scalable technology solutions — from AI and cloud ERP to cybersecurity and talent — that drive measurable business outcomes.', color: 'text-blue-400 bg-blue-500/12' },
  { icon: Eye, title: 'Our Vision', description: 'To be the most trusted full-spectrum technology partner for enterprises navigating digital transformation, AI adoption, and cybersecurity in an increasingly complex world.', color: 'text-purple-400 bg-purple-500/12' },
  { icon: Shield, title: 'Security First', description: 'Every decision prioritizes data protection and client security above all else. We deploy AI within your infrastructure, never compromising on sovereignty.', color: 'text-rose-400 bg-rose-500/12' },
  { icon: Zap, title: 'Innovation Driven', description: 'We stay ahead of industry trends — NetSuite Next, agentic AI, zero trust, post-quantum cryptography — so our clients are always future-ready.', color: 'text-emerald-400 bg-emerald-500/12' },
]

export default function About() {
  return (
    <>
      <SEO
        title="About Us — Our Story"
        description="TechCloudPro is a Vibing World Inc. company delivering enterprise AI, ERP, cybersecurity, and IT staffing solutions with 200+ clients and 15+ years of experience."
        path="/about"
      />
      <SchemaMarkup page="about" breadcrumbs={[{ name: 'Home', url: 'https://techcloudpro.com' }, { name: 'About', url: 'https://techcloudpro.com/about' }]} />

      {/* Hero */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            as="h1"
            label="About TechCloudPro"
            title="Pioneering Enterprise Technology Solutions"
            subtitle="Founded by technology and security experts, TechCloudPro was born from the need to deliver truly integrated enterprise solutions — where AI, ERP, cybersecurity, and talent converge."
          />
        </div>
      </section>

      {/* Story */}
      <section className="py-16 px-6 md:px-12 max-w-4xl mx-auto">
        <div className="space-y-6 text-[var(--text-dim)] leading-relaxed">
          <p>TechCloudPro is a <strong className="text-[var(--text)]">Vibing World Inc.</strong> company, delivering enterprise-grade technology solutions across four interconnected practice areas: Oracle NetSuite ERP, Cybersecurity, AI & Private LLM, and IT Staffing.</p>
          <p>With over 15 years of experience, 200+ enterprise clients, and 1000+ successful implementations, we've established ourselves as a trusted partner for businesses navigating their digital transformation journey. Our clientele spans Fortune 500 companies to fast-growing startups across retail, manufacturing, fashion, F&B, pharmaceuticals, financial services, and technology.</p>
          <p>Our cybersecurity division was conceived during a client ERP engagement when we discovered critical vulnerabilities in their privileged access infrastructure. That real-world threat discovery led us to partner with CyberArk and build a full-fledged security practice — a testament to our proactive, client-first approach.</p>
          <p>Today, we're at the forefront of the AI revolution, deploying private LLM models within enterprise VPN infrastructure, building agentic AI systems, and helping organizations secure the emerging machine identity landscape — all while continuing to deliver world-class ERP implementations and IT talent.</p>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 md:px-12 max-w-7xl mx-auto">
        <SectionHeader label="What Drives Us" title="Our Values" className="mb-14" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {values.map(v => (
            <GlassCard key={v.title}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${v.color}`}>
                <v.icon size={22} />
              </div>
              <h3 className="text-lg font-bold mb-2">{v.title}</h3>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{v.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <CTABlock />
    </>
  )
}
