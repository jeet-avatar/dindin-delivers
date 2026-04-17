import { Zap, Video, Users, BarChart3, Mail, Calendar, CheckCircle, ArrowRight, Star, TrendingUp, MessageSquare, Globe } from 'lucide-react'
import { SEO } from '../components/ui'
import ConsolidationCalculator from '../components/launchos/ConsolidationCalculator'

// ── BrandMonkz-matched color tokens ─────────────────────────────────────
const C = {
  bg:         '#060609',
  bgCard:     '#0a0d16',
  bgElevated: '#0f1520',
  border:     'rgba(255,255,255,0.07)',
  borderHot:  'rgba(255,107,53,0.4)',
  orange:     '#FF6B35',
  orangeLight:'#F97316',
  orangeDim:  'rgba(255,107,53,0.12)',
  text:       '#F1F5F9',
  textDim:    '#94A3B8',
  textMuted:  '#64748B',
}

// ── Automation flow steps ────────────────────────────────────────────────
const FLOW_STEPS = [
  {
    day: 'Day 1',
    label: 'Onboard',
    color: C.orange,
    icon: <Star size={18} />,
    points: [
      'Answer 10 questions about your business',
      'AI Strategy Bot builds your 90-day GTM plan',
      'CRM auto-configured with your pipeline stages',
    ],
  },
  {
    day: 'Week 1',
    label: 'Create',
    color: '#A78BFA',
    icon: <Video size={18} />,
    points: [
      'AI Workers write campaign copy + social posts',
      'Marketing video auto-generated from your copy',
      'ElevenLabs professional voiceover added',
    ],
  },
  {
    day: 'Week 2',
    label: 'Launch',
    color: '#10B981',
    icon: <Mail size={18} />,
    points: [
      'Email campaign sent to your full contact list',
      'Video auto-posted to all 6 social platforms',
      'Open/click/watch tracking begins in real time',
    ],
  },
  {
    day: 'Ongoing',
    label: 'Follow-Up',
    color: '#F59E0B',
    icon: <BarChart3 size={18} />,
    points: [
      'AI scores leads by opens, clicks, video watch time',
      'Hot leads get personalised follow-up emails',
      'Hottest leads get calendar link auto-sent',
    ],
  },
  {
    day: 'Close',
    label: 'Close',
    color: '#EF4444',
    icon: <Calendar size={18} />,
    points: [
      'Lead joins self-hosted video meeting',
      'Meeting auto-recorded + AI-summarised',
      'Notes synced to CRM deal — loop restarts',
    ],
  },
]

// ── Competitive comparison ───────────────────────────────────────────────
const COMPARISON = [
  { feature: 'AI Video Generation',     launchos: true,  ghl: false, hubspot: false, ac: false, clickfunnels: false },
  { feature: 'Autonomous AI Workers',   launchos: true,  ghl: false, hubspot: false, ac: false, clickfunnels: false },
  { feature: 'Native Video Meetings',   launchos: true,  ghl: false, hubspot: false, ac: false, clickfunnels: false },
  { feature: 'Full CRM + Pipeline',     launchos: true,  ghl: true,  hubspot: true,  ac: true,  clickfunnels: false },
  { feature: 'Email Campaigns',         launchos: true,  ghl: true,  hubspot: true,  ac: true,  clickfunnels: true  },
  { feature: 'SEO Suite',               launchos: true,  ghl: false, hubspot: false, ac: false, clickfunnels: false },
  { feature: 'One Subscription',        launchos: true,  ghl: true,  hubspot: false, ac: false, clickfunnels: true  },
]

// ── Pricing tiers ────────────────────────────────────────────────────────
const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 79,
    annualPrice: 63,
    target: 'Solopreneurs & freelancers',
    replaces: 'ActiveCampaign + HeyGen = $78/mo',
    highlight: false,
    features: [
      '1,000 CRM contacts',
      '2,000 emails / month',
      '5 AI videos / month',
      '50 AI worker outputs / month',
      '3 social platforms',
      '1 AI worker (email specialist)',
      '5 meeting hours / month',
      'Basic SEO (sitemap, on-page)',
    ],
    cta: 'Start Free Trial',
    utm: 'starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 149,
    annualPrice: 119,
    target: 'Small businesses, 1–10 employees',
    replaces: 'ActiveCampaign + HeyGen + Zoom + Surfer SEO = $242/mo',
    highlight: true,
    badge: 'Most Popular',
    features: [
      '10,000 CRM contacts',
      '15,000 emails / month',
      '30 AI videos / month',
      '300 AI worker outputs / month',
      'All 6 social platforms',
      '3 AI workers (content + social + email)',
      '20 meeting hours / month',
      'Full SEO suite + rank tracking',
      'Lead scoring + hot lead alerts',
      'Social auto-scheduling',
      'CRM + meeting sync',
    ],
    cta: 'Start Free Trial',
    utm: 'growth',
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 249,
    annualPrice: 199,
    target: 'Growing businesses & agencies',
    replaces: 'GoHighLevel Unlimited = $297/mo',
    highlight: false,
    features: [
      'Unlimited contacts',
      '100,000 emails / month',
      'Unlimited AI videos',
      'Unlimited AI worker outputs',
      'All 6 social platforms',
      'Unlimited AI workers',
      'Unlimited meeting hours',
      'Full SEO suite + priority indexing',
      'Lead scoring + hot lead alerts',
      'Sub-accounts + white-label',
      'Agency resale mode',
      'Custom video templates',
      'AI Strategy Bot (full access)',
      'Priority support',
    ],
    cta: 'Get Scale',
    utm: 'scale',
  },
]

// ── What's included cards ────────────────────────────────────────────────
const FEATURES = [
  { icon: <Users size={20} />,        title: 'Full CRM',               desc: 'Contacts, pipelines, deals, lead scoring — BrandMonkz-powered', color: C.orange },
  { icon: <Video size={20} />,        title: 'AI Video Generation',    desc: 'Text → 1080p marketing video with ElevenLabs voiceover',         color: '#A78BFA' },
  { icon: <Zap size={20} />,          title: 'Autonomous AI Workers',  desc: 'Content creator, social manager, email specialist — 24/7',       color: '#10B981' },
  { icon: <Mail size={20} />,         title: 'Email Campaigns',        desc: 'SMTP-powered campaigns, sequences, A/B tests, hot-lead alerts',  color: '#F59E0B' },
  { icon: <Globe size={20} />,        title: 'Social Publishing',      desc: 'Auto-post to LinkedIn, Instagram, TikTok, Twitter/X, Facebook, YouTube', color: '#06B6D4' },
  { icon: <Calendar size={20} />,     title: 'Video Meetings',         desc: 'Self-hosted WebRTC — recording, AI summaries, CRM sync',         color: '#EF4444' },
  { icon: <BarChart3 size={20} />,    title: 'Analytics',              desc: 'Real-time campaign dashboards, video watch-time, lead attribution', color: '#8B5CF6' },
  { icon: <TrendingUp size={20} />,   title: 'SEO Suite',              desc: 'Keyword tracking, on-page SEO, content calendar, sitemap',       color: '#10B981' },
  { icon: <MessageSquare size={20} />, title: 'AI Strategy Bot',       desc: '10 questions → 90-day GTM plan → auto-executes in your CRM',     color: C.orange },
]

// ── Small helpers ────────────────────────────────────────────────────────
function Check() {
  return <span style={{ color: C.orange, fontWeight: 700, fontSize: '1.1rem' }}>✓</span>
}
function Cross() {
  return <span style={{ color: '#4B5563', fontWeight: 700, fontSize: '1rem' }}>✗</span>
}

// ── Label pill used across sections ─────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
      style={{ background: C.orangeDim, color: C.orange, border: `1px solid ${C.borderHot}` }}>
      {children}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════
export default function LaunchOS() {
  return (
    <>
      <SEO
        title="Zietra — Your Entire Marketing Team, One Platform"
        description="Zietra replaces 5–6 SaaS tools with one AI-powered platform: CRM, AI video generation, social publishing, email campaigns, and video meetings. $79/mo. 30-day free trial."
        path="/zietra"
      />

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center text-center px-6 py-28 overflow-hidden"
        style={{ background: C.bg }}>

        {/* Glow orbs */}
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(255,107,53,0.08), transparent 70%)` }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, rgba(167,139,250,0.06), transparent 70%)` }} />
        {/* Grid lines */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
            style={{ background: C.orangeDim, border: `1px solid ${C.borderHot}`, color: C.orange }}>
            A TechCloudPro Product
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight" style={{ color: C.text }}>
            Your entire marketing team.<br />
            <span style={{ color: C.orange }}>One platform. One price.</span>
          </h1>

          <p className="text-xl mb-10 max-w-2xl mx-auto" style={{ color: C.textDim }}>
            Zietra replaces 5–6 disconnected SaaS tools with a single integrated system that
            autonomously executes your full go-to-market stack: CRM, AI video, social publishing,
            email campaigns, and video meetings.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <a
              href="https://brandmonkz.com/signup?utm_source=zietra&utm_medium=hero&utm_campaign=zietra-landing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}
            >
              Start Free 30-Day Trial <ArrowRight size={18} />
            </a>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl font-semibold text-lg transition-all"
              style={{ border: `1px solid ${C.border}`, color: C.textDim, background: 'transparent' }}
              onMouseEnter={e => (e.currentTarget.style.background = C.bgCard)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              See Pricing
            </a>
          </div>
          <p className="text-sm" style={{ color: C.textMuted }}>No credit card required. Cancel anytime.</p>

          {/* Stats ribbon */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-sm mx-auto">
            {[
              { value: '$93/mo',  label: 'avg savings' },
              { value: '86–90%', label: 'gross margin' },
              { value: '30 days', label: 'free trial' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black" style={{ color: C.orange }}>{s.value}</div>
                <div className="text-xs" style={{ color: C.textMuted }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AHA MOMENT ───────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: C.bgCard }}>
        <div className="max-w-3xl mx-auto text-center">
          <SectionLabel>The Aha Moment</SectionLabel>
          <blockquote className="text-2xl md:text-3xl font-semibold leading-relaxed italic"
            style={{ color: C.text }}>
            "I wrote one paragraph about my new service. Zietra drafted a 5-email campaign,
            generated a 60-second marketing video, posted it to LinkedIn and Instagram, emailed
            my 800 contacts with personalised follow-ups, scored the leads who opened it, and
            booked three discovery calls —&nbsp;while I slept."
          </blockquote>
          <p className="mt-6 text-sm" style={{ color: C.textMuted }}>— What every Zietra user experiences in Week 2</p>
        </div>
      </section>

      {/* ── AUTOMATION FLOW ───────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: C.bg }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>How It Works</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.text }}>
              From signup to closed deal — automatically
            </h2>
            <p className="mt-3" style={{ color: C.textDim }}>
              One input triggers the entire go-to-market machine.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {FLOW_STEPS.map((step, i) => (
              <div key={step.day} className="relative">
                {i < FLOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-9 left-[calc(100%-6px)] w-4 h-0.5 z-10"
                    style={{ background: step.color, opacity: 0.3 }} />
                )}
                <div className="rounded-2xl p-5 h-full"
                  style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: step.color }}>
                      {step.icon}
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: step.color }}>{step.day}</div>
                      <div className="font-bold text-sm" style={{ color: C.text }}>{step.label}</div>
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {step.points.map(p => (
                      <li key={p} className="flex items-start gap-1.5 text-xs" style={{ color: C.textDim }}>
                        <CheckCircle size={11} className="mt-0.5 flex-shrink-0" style={{ color: step.color }} />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES GRID ────────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: C.bgCard }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Everything Included</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.text }}>
              9 tools. One subscription.
            </h2>
            <p className="mt-3" style={{ color: C.textDim }}>
              No integrations to maintain. No tool-switching. Everything works together natively.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {FEATURES.map(item => (
              <div key={item.title}
                className="p-6 rounded-2xl transition-all"
                style={{ background: C.bgElevated, border: `1px solid ${C.border}` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 text-white"
                  style={{ background: item.color }}>
                  {item.icon}
                </div>
                <h3 className="font-bold mb-1" style={{ color: C.text }}>{item.title}</h3>
                <p className="text-sm" style={{ color: C.textDim }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPETITIVE COMPARISON ───────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <SectionLabel>Why Zietra</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.text }}>
              No competitor does this
            </h2>
            <p className="mt-3" style={{ color: C.textDim }}>
              AI video + autonomous AI workers + native meetings — together, in one product, for one price.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: C.bgElevated }}>
                  <th className="text-left p-4 font-semibold" style={{ color: C.textDim }}>Feature</th>
                  <th className="p-4 font-bold text-center" style={{ color: C.orange }}>Zietra</th>
                  <th className="p-4 text-center font-semibold" style={{ color: C.textMuted }}>GoHighLevel</th>
                  <th className="p-4 text-center font-semibold hidden sm:table-cell" style={{ color: C.textMuted }}>HubSpot</th>
                  <th className="p-4 text-center font-semibold hidden md:table-cell" style={{ color: C.textMuted }}>ActiveCampaign</th>
                  <th className="p-4 text-center font-semibold hidden lg:table-cell" style={{ color: C.textMuted }}>ClickFunnels</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.feature}
                    style={{ background: i % 2 === 0 ? C.bgCard : 'transparent' }}>
                    <td className="p-4 font-medium" style={{ color: C.textDim }}>{row.feature}</td>
                    <td className="p-4 text-center">{row.launchos ? <Check /> : <Cross />}</td>
                    <td className="p-4 text-center">{row.ghl ? <Check /> : <Cross />}</td>
                    <td className="p-4 text-center hidden sm:table-cell">{row.hubspot ? <Check /> : <Cross />}</td>
                    <td className="p-4 text-center hidden md:table-cell">{row.ac ? <Check /> : <Cross />}</td>
                    <td className="p-4 text-center hidden lg:table-cell">{row.clickfunnels ? <Check /> : <Cross />}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: C.bgElevated }}>
                  <td className="p-4 font-bold" style={{ color: C.text }}>Price / month</td>
                  <td className="p-4 text-center font-bold" style={{ color: C.orange }}>$79–$249</td>
                  <td className="p-4 text-center" style={{ color: C.textMuted }}>$97–$497</td>
                  <td className="p-4 text-center hidden sm:table-cell" style={{ color: C.textMuted }}>$20–$800</td>
                  <td className="p-4 text-center hidden md:table-cell" style={{ color: C.textMuted }}>$15–$79+</td>
                  <td className="p-4 text-center hidden lg:table-cell" style={{ color: C.textMuted }}>$147–$297</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-6" style={{ background: C.bgCard }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.text }}>
              Simple, transparent pricing
            </h2>
            <p className="mt-3" style={{ color: C.textDim }}>
              Replaces $231–$341/month in tools. 30-day free trial — no credit card.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {TIERS.map(tier => (
              <div key={tier.id}
                className="relative rounded-2xl p-8 flex flex-col"
                style={{
                  background: tier.highlight ? C.bgElevated : C.bg,
                  border: `1px solid ${tier.highlight ? C.orange : C.border}`,
                  boxShadow: tier.highlight ? `0 0 40px rgba(255,107,53,0.12)` : 'none',
                }}>
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}>
                    {tier.badge}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1" style={{ color: C.text }}>{tier.name}</h3>
                  <p className="text-sm mb-4" style={{ color: C.textMuted }}>{tier.target}</p>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-5xl font-black" style={{ color: tier.highlight ? C.orange : C.text }}>
                      ${tier.price}
                    </span>
                    <span className="text-sm mb-2" style={{ color: C.textMuted }}>/mo</span>
                  </div>
                  <p className="text-xs mb-3" style={{ color: C.textMuted }}>
                    ${tier.annualPrice}/mo billed annually
                  </p>
                  <div className="text-xs px-3 py-1.5 rounded-lg"
                    style={{ background: C.orangeDim, color: C.orange, border: `1px solid ${C.borderHot}` }}>
                    Replaces: {tier.replaces}
                  </div>
                </div>

                <ul className="space-y-2.5 mb-8 flex-1">
                  {tier.features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: C.orange }} />
                      <span style={{ color: C.textDim }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={`https://brandmonkz.com/signup?plan=${tier.utm}&utm_source=zietra&utm_medium=pricing`}
                  className="block text-center py-3.5 px-6 rounded-xl font-bold text-white transition-all hover:opacity-90"
                  style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}
                >
                  {tier.cta} →
                </a>
              </div>
            ))}
          </div>

          {/* Consolidation calculator */}
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-center mb-2" style={{ color: C.text }}>
              Calculate Your Exact Savings
            </h3>
            <p className="text-center mb-8" style={{ color: C.textDim }}>
              Select the tools you currently pay for and see how much you save with Zietra Growth.
            </p>
            <ConsolidationCalculator />
          </div>
        </div>
      </section>

      {/* ── FREE SAMPLE PACK ─────────────────────────────────────────── */}
      <section className="py-20 px-6" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <SectionLabel>Free Sample Pack</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-extrabold" style={{ color: C.text }}>
              See exactly what Zietra generates
            </h2>
            <p className="mt-3 max-w-xl mx-auto" style={{ color: C.textDim }}>
              We built a full campaign for Apex Fitness Studio — email, follow-up, and a
              60-second video with production guide. Download all three and use them as a template.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Email Campaign */}
            <div className="rounded-2xl p-6 flex flex-col"
              style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white flex-shrink-0"
                style={{ background: C.orange }}>
                <Mail size={22} />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: C.orange }}>Email #1</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: C.text }}>Initial Campaign Email</h3>
              <p className="text-sm mb-6 flex-1" style={{ color: C.textDim }}>
                Full HTML email template — hero, body copy, social proof, urgency strip, and
                footer. Personalisation tokens included. Ready to import into BrandMonkz.
              </p>
              <div className="text-xs mb-4 space-y-1" style={{ color: C.textMuted }}>
                <div>Subject: <span style={{ color: C.textDim }}>"Your dream body starts Monday — 12 spots left"</span></div>
                <div>Segment: <span style={{ color: C.textDim }}>All contacts · 1,847 subscribers</span></div>
                <div>Trigger: <span style={{ color: C.textDim }}>Manual send · Tuesday 10:00 AM</span></div>
              </div>
              <a href="/samples/email-campaign.html" target="_blank" rel="noopener"
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}>
                View Email Template <ArrowRight size={15} />
              </a>
            </div>

            {/* Follow-up Email */}
            <div className="rounded-2xl p-6 flex flex-col"
              style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white flex-shrink-0"
                style={{ background: '#A78BFA' }}>
                <MessageSquare size={22} />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#A78BFA' }}>Email #2</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: C.text }}>Automated Follow-Up</h3>
              <p className="text-sm mb-6 flex-1" style={{ color: C.textDim }}>
                Triggered 3 days after Email #1 — targets openers who didn't click. Objection
                handling, scarcity visual, and personal tone from the coach. +60 pts on click.
              </p>
              <div className="text-xs mb-4 space-y-1" style={{ color: C.textMuted }}>
                <div>Subject: <span style={{ color: C.textDim }}>3 spots left — wanted to check in, {'{{first_name}}'}</span></div>
                <div>Trigger: <span style={{ color: C.textDim }}>Opened Email #1 but no click · Day 3</span></div>
                <div>Lead score: <span style={{ color: C.textDim }}>+60 pts on click → calendar auto-sent</span></div>
              </div>
              <a href="/samples/email-followup.html" target="_blank"
                className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #A78BFA)' }}>
                View Follow-Up Email <ArrowRight size={15} />
              </a>
            </div>

            {/* Video Script */}
            <div className="rounded-2xl p-6 flex flex-col"
              style={{ background: C.bgCard, border: `1px solid ${C.border}` }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white flex-shrink-0"
                style={{ background: '#10B981' }}>
                <Video size={22} />
              </div>
              <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#10B981' }}>Video</div>
              <h3 className="text-lg font-bold mb-2" style={{ color: C.text }}>60-Second Video Campaign</h3>
              <p className="text-sm mb-6 flex-1" style={{ color: C.textDim }}>
                Full production guide — 5 scenes with title card specs, visual direction,
                ElevenLabs voiceover script, audio mix levels, and 6-platform distribution plan.
              </p>
              <div className="text-xs mb-4 space-y-1" style={{ color: C.textMuted }}>
                <div>Format: <span style={{ color: C.textDim }}>1080p 16:9 · 30fps · Remotion render</span></div>
                <div>Voice: <span style={{ color: C.textDim }}>ElevenLabs Brian · 140 WPM · -14 LUFS</span></div>
                <div>Posts to: <span style={{ color: C.textDim }}>LinkedIn, Instagram, YouTube, TikTok, Facebook, X</span></div>
              </div>
              <div className="flex flex-col gap-2">
                <a href="/samples/video-campaign-remotion.mp4" target="_blank" download="apex-fitness-campaign-video.mp4"
                  className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #059669, #10B981)' }}>
                  Download Campaign Video (14s) <ArrowRight size={15} />
                </a>
                <a href="/samples/video-followup-remotion.mp4" target="_blank" download="apex-fitness-followup-video.mp4"
                  className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold text-sm transition-all hover:opacity-80"
                  style={{ background: C.bgElevated, border: `1px solid ${C.border}`, color: C.textDim }}>
                  Download Follow-Up Video (14s) <ArrowRight size={15} />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom note */}
          <p className="text-center text-xs mt-8" style={{ color: C.textMuted }}>
            All three were generated in under 4 minutes from one paragraph of input. &nbsp;·&nbsp; Business: Apex Fitness Studio &nbsp;·&nbsp; Campaign: Summer Transformation Program
          </p>
        </div>
      </section>

      {/* ── MIGRATION CTA ────────────────────────────────────────────── */}
      <section className="py-16 px-6" style={{ background: C.bg }}>
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl p-10 text-center"
            style={{ background: C.bgElevated, border: `1px solid ${C.borderHot}` }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-4"
              style={{ background: C.orangeDim, color: C.orange }}>
              ActiveCampaign users
            </div>
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3" style={{ color: C.text }}>
              Fleeing ActiveCampaign's pricing hike?
            </h3>
            <p className="mb-6 max-w-xl mx-auto" style={{ color: C.textDim }}>
              We built a one-click CSV importer that migrates your contacts and automations in under 30 minutes.
              You'll be live with more features at a lower price today.
            </p>
            <a
              href="https://brandmonkz.com/signup?plan=growth&utm_source=zietra&utm_medium=migration&utm_campaign=ac-migration"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}
            >
              Migrate from ActiveCampaign <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────────────── */}
      <section className="py-24 px-6 text-center"
        style={{ background: `linear-gradient(135deg, #1a0a04, #2d1409)` }}>
        {/* Orange glow */}
        <div className="relative max-w-3xl mx-auto">
          <div className="absolute inset-0 rounded-3xl blur-3xl opacity-30 pointer-events-none"
            style={{ background: `radial-gradient(circle, ${C.orange}, transparent 70%)` }} />
          <div className="relative">
            <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: C.text }}>
              Ready to replace 5 tools with one?
            </h2>
            <p className="text-lg mb-10" style={{ color: C.textDim }}>
              Join businesses saving $93+ per month. Full platform access for 30 days — no credit card.
            </p>
            <a
              href="https://brandmonkz.com/signup?utm_source=zietra&utm_medium=footer&utm_campaign=zietra-landing"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl font-bold text-lg text-white transition-all hover:opacity-90"
              style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}
            >
              Start Free 30-Day Trial <ArrowRight size={18} />
            </a>
            <p className="text-sm mt-4" style={{ color: C.textMuted }}>No credit card. No commitment. Cancel anytime.</p>
            <p className="text-xs mt-6" style={{ color: C.textMuted }}>
              Powered by <a href="https://techcloudpro.com" className="underline hover:opacity-80">TechCloudPro</a>
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
