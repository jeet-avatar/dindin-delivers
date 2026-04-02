import { Briefcase, Globe, Rocket, Heart } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard, Button, SEO } from '../components/ui'

const perks = [
  { icon: Rocket, title: 'Work on Cutting-Edge Tech', description: 'From AI/LLM deployments to NetSuite implementations — you\'ll work on the latest enterprise technology.', color: 'text-blue-400 bg-blue-500/12' },
  { icon: Globe, title: 'Global Team', description: 'Work with talented colleagues across North America, India, and beyond. Remote-friendly culture.', color: 'text-cyan-400 bg-cyan-500/12' },
  { icon: Heart, title: 'Growth & Learning', description: 'Certification sponsorships, mentorship programs, and continuous learning opportunities.', color: 'text-rose-400 bg-rose-500/12' },
  { icon: Briefcase, title: 'Impactful Work', description: 'Help Fortune 500 companies and growing enterprises transform their business with technology.', color: 'text-emerald-400 bg-emerald-500/12' },
]

export default function Careers() {
  return (
    <>
      <SEO
        title="Careers — Join Our Team"
        description="Join TechCloudPro — work on cutting-edge AI, ERP, and cybersecurity projects with a global team."
        path="/careers"
      />

      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Join Us"
            title="Build Your Career at TechCloudPro"
            subtitle="We're always looking for talented people who share our passion for technology and client success."
          />
          <Button href="/contact" size="lg" className="mt-8">
            Apply Now
          </Button>
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 max-w-6xl mx-auto">
        <SectionHeader label="Why TechCloudPro" title="Why You'll Love Working Here" className="mb-14" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {perks.map(perk => (
            <GlassCard key={perk.title}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${perk.color}`}>
                <perk.icon size={22} />
              </div>
              <h3 className="text-lg font-bold mb-2">{perk.title}</h3>
              <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">{perk.description}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="py-16 px-6 md:px-12 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4">Open Positions</h2>
        <p className="text-[var(--text-dim)] mb-8">We're currently hiring across all practice areas. Send your resume and a note about what excites you.</p>
        <Button href="mailto:jm@techcloudpro.com" size="lg">
          Send Your Resume
        </Button>
      </section>
    </>
  )
}
