import { Helmet } from 'react-helmet-async'
import { ExternalLink, Mail, User } from 'lucide-react'
import { Scene3D } from '../components/3d'
import { SectionHeader, GlassCard } from '../components/ui'
import { CTABlock } from '../components/sections'
import { team } from '../data/team'

export default function Leadership() {
  return (
    <>
      <Helmet>
        <title>Leadership — Meet Our Team | TechCloudPro</title>
        <meta name="description" content="Meet the executive leadership team at TechCloudPro — experienced technology leaders driving enterprise transformation." />
      </Helmet>

      {/* Hero */}
      <section className="relative py-28 md:py-36 overflow-hidden">
        <Scene3D showMesh={false} />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <SectionHeader
            label="Our Team"
            title="Meet Our Executive Leadership"
            subtitle="The leadership team at TechCloudPro guides us to enable disruptive technologies, customized integrations, and turnkey implementations — combining subject matter expertise with domain knowledge."
          />
        </div>
      </section>

      {/* Team grid */}
      <section className="py-16 px-6 md:px-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {team.map(member => (
            <GlassCard key={member.name} className="text-center p-8">
              {/* Avatar placeholder */}
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-[var(--glass-border)] flex items-center justify-center mx-auto mb-5">
                <User size={36} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-lg font-bold mb-1">{member.name}</h3>
              <p className="text-[12px] font-semibold text-blue-400 [.light_&]:text-blue-600 uppercase tracking-wider mb-4">{member.title}</p>
              <p className="text-[12px] text-[var(--text-muted)] leading-relaxed mb-5">{member.bio}</p>

              {/* Social links */}
              <div className="flex items-center justify-center gap-3">
                {member.linkedin && (
                  <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] flex items-center justify-center hover:bg-blue-500/10 transition-colors" aria-label={`${member.name} LinkedIn`}>
                    <ExternalLink size={14} className="text-[var(--text-muted)]" />
                  </a>
                )}
                {member.email && (
                  <a href={`mailto:${member.email}`} className="w-8 h-8 rounded-lg bg-[var(--glass)] border border-[var(--glass-border)] flex items-center justify-center hover:bg-blue-500/10 transition-colors" aria-label={`Email ${member.name}`}>
                    <Mail size={14} className="text-[var(--text-muted)]" />
                  </a>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <CTABlock
        title="Want to Join Our Team?"
        subtitle="We're always looking for talented people who share our passion for technology."
        buttonText="View Careers"
        buttonHref="/careers"
      />
    </>
  )
}
