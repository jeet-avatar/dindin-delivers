import { NavBar } from '../components/NavBar'
import { HeroSection } from '../components/HeroSection'
import { StatsStrip } from '../components/StatsStrip'
import { ProductReveal } from '../components/ProductReveal'
import { AutomationFlow } from '../components/AutomationFlow'
import { SuccessStories } from '../components/SuccessStories'
import { PricingSection } from '../components/PricingSection'
import { SiteFooter } from '../components/SiteFooter'

const CRMCard = (
  <div className="glass-card" style={{ padding: 24, width: 340, flexShrink: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Pipeline — Q2</div>
    {[
      { stage: 'To Contact', deals: ['Sarah Chen — $12K', 'Global Tech — $8K'], color: 'var(--crm)' },
      { stage: 'Qualified', deals: ['Apex Labs — $21K'], color: 'var(--zietra)' },
      { stage: 'Closed ✓', deals: ['FreshBrew — $5K', 'NxtStep — $9K'], color: 'var(--meet)' },
    ].map(col => (
      <div key={col.stage} style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: col.color, marginBottom: 6 }}>{col.stage}</div>
        {col.deals.map(d => (
          <div key={d} style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '6px 10px',
            fontSize: 12, color: 'var(--text)', marginBottom: 4, border: '1px solid rgba(255,255,255,0.06)',
          }}>{d}</div>
        ))}
      </div>
    ))}
  </div>
)

const SocialCard = (
  <div className="glass-card" style={{ padding: 24, width: 340, flexShrink: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 16 }}>Scheduled today</div>
    {[
      { platform: 'LinkedIn', time: '9:00 AM', preview: 'Q2 growth story — 3 slides', color: '#0A66C2' },
      { platform: 'Instagram', time: '12:30 PM', preview: 'Behind the scenes 🔥', color: 'var(--social)' },
      { platform: 'Twitter / X', time: '3:00 PM', preview: 'Product tip of the week', color: '#1DA1F2' },
      { platform: 'Facebook', time: '6:00 PM', preview: 'Customer spotlight — GlamCo', color: '#1877F2' },
    ].map(p => (
      <div key={p.platform} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{p.platform}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.preview}</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.time}</div>
      </div>
    ))}
  </div>
)

const MeetCard = (
  <div className="glass-card" style={{ padding: 24, width: 340, flexShrink: 0 }}>
    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>AI Meeting Summary</div>
    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>
      GlamCo — Discovery Call
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>Key decisions:</div>
    {['Expand to EU market by Q3', 'Budget approved — $24K ARR', 'Onboarding starts next Monday'].map(p => (
      <div key={p} style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: 12, color: 'var(--text)' }}>
        <span style={{ color: 'var(--meet)', flexShrink: 0 }}>◆</span>
        {p}
      </div>
    ))}
    <div style={{
      marginTop: 16, padding: '10px 12px',
      background: 'rgba(48,209,88,0.08)', borderRadius: 8,
      border: '1px solid rgba(48,209,88,0.2)', fontSize: 12, color: 'var(--meet)',
    }}>
      Follow-up email drafted by AI — ready to send ›
    </div>
  </div>
)

export default function HomePage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <StatsStrip />
        <div id="features">
          <ProductReveal
            chip="CRM"
            chipColor="var(--crm)"
            headline="Close more deals. With zero busywork."
            sub="Your full sales pipeline, contact database, and email sequences in one place. AI surfaces your hottest leads so you know exactly who to call next."
            features={[
              'Unlimited contacts and deals',
              'AI lead scoring — ranked by close probability',
              'Email sequences with open-rate tracking',
              'Pipeline board + forecasting',
            ]}
            card={CRMCard}
          />
          <ProductReveal
            flip
            chip="Social"
            chipColor="var(--social)"
            headline="Publish everywhere. In 20 minutes a week."
            sub="AI drafts your posts from a single brief. Schedule across LinkedIn, Instagram, Twitter, and Facebook. See exactly which posts drove pipeline."
            features={[
              'AI post drafts from a single topic',
              'Schedule across 4+ platforms at once',
              'Analytics tied to contact activity',
              'Content calendar with team approval flow',
            ]}
            card={SocialCard}
          />
          <ProductReveal
            chip="Meetings"
            chipColor="var(--meet)"
            headline="AI takes notes. You close the deal."
            sub="One-click video meetings, automatic transcription, and AI summaries delivered before the prospect closes their laptop. Follow-ups write themselves."
            features={[
              'Unlimited HD video meetings',
              'AI transcription + summary in seconds',
              'Auto-drafted follow-up emails',
              'Booking links synced to your calendar',
            ]}
            card={MeetCard}
          />
        </div>
        <AutomationFlow />
        <SuccessStories />
        <PricingSection />
      </main>
      <SiteFooter />
    </>
  )
}
