import { useState } from 'react'
import { ArrowRight } from 'lucide-react'

const C = {
  bg:         '#060609',
  bgCard:     '#0a0d16',
  bgElevated: '#0f1520',
  border:     'rgba(255,255,255,0.07)',
  borderHot:  'rgba(255,107,53,0.4)',
  orange:     '#FF6B35',
  orangeLight:'#F97316',
  orangeDim:  'rgba(255,107,53,0.12)',
  green:      '#10B981',
  greenDim:   'rgba(16,185,129,0.12)',
  text:       '#F1F5F9',
  textDim:    '#94A3B8',
  textMuted:  '#64748B',
}

interface Tool {
  id: string
  name: string
  category: string
  monthlyPrice: number
  annualPrice: number
  emoji: string
  description: string
}

const TOOLS: Tool[] = [
  { id: 'activecampaign', name: 'ActiveCampaign', category: 'CRM & Email',        monthlyPrice: 79,  annualPrice: 63,  emoji: '📧', description: 'CRM + email automation (Plus)' },
  { id: 'heygen',         name: 'HeyGen',         category: 'AI Video',            monthlyPrice: 59,  annualPrice: 49,  emoji: '🎬', description: 'AI video generation (Creator)' },
  { id: 'hootsuite',      name: 'Hootsuite',       category: 'Social Scheduling',   monthlyPrice: 99,  annualPrice: 79,  emoji: '🦉', description: 'Social media management (Pro)' },
  { id: 'buffer',         name: 'Buffer',          category: 'Social Scheduling',   monthlyPrice: 18,  annualPrice: 15,  emoji: '📅', description: 'Social scheduling (Essentials)' },
  { id: 'zoom',           name: 'Zoom',            category: 'Video Meetings',      monthlyPrice: 15,  annualPrice: 13,  emoji: '📹', description: 'Video meetings (Pro per host)' },
  { id: 'surfer',         name: 'Surfer SEO',      category: 'SEO',                 monthlyPrice: 89,  annualPrice: 69,  emoji: '🏄', description: 'SEO optimization (Essential)' },
  { id: 'hubspot',        name: 'HubSpot',         category: 'CRM',                 monthlyPrice: 50,  annualPrice: 45,  emoji: '🧡', description: 'CRM Starter' },
  { id: 'ghl',            name: 'GoHighLevel',     category: 'Marketing Platform',  monthlyPrice: 97,  annualPrice: 97,  emoji: '🚀', description: 'Marketing platform (Starter)' },
]

const LAUNCHOS_MONTHLY = 149
const LAUNCHOS_ANNUAL  = 119

export default function ConsolidationCalculator() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(['activecampaign', 'heygen', 'zoom', 'surfer'])
  )
  const [annual, setAnnual] = useState(false)

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const stackTotal = TOOLS
    .filter(t => selected.has(t.id))
    .reduce((sum, t) => sum + (annual ? t.annualPrice : t.monthlyPrice), 0)

  const launchosPrice = annual ? LAUNCHOS_ANNUAL : LAUNCHOS_MONTHLY
  const savings        = stackTotal - launchosPrice
  const savingsPct     = stackTotal > 0 ? Math.round((savings / stackTotal) * 100) : 0

  return (
    <div className="rounded-2xl p-6 md:p-8" style={{ background: C.bgElevated, border: `1px solid ${C.border}` }}>

      {/* Header + toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: C.orange }}>Consolidation Calculator</p>
          <p style={{ color: C.textDim, fontSize: '0.9rem' }}>Select what you currently pay for</p>
        </div>
        <button
          onClick={() => setAnnual(a => !a)}
          className="flex items-center gap-2 text-sm flex-shrink-0"
          style={{ color: C.textDim }}
        >
          <span style={{ color: annual ? C.textMuted : C.text, fontWeight: annual ? 400 : 600 }}>Monthly</span>
          <span
            className="relative inline-flex w-10 h-6 rounded-full transition-colors duration-200"
            style={{ background: annual ? C.orange : 'rgba(255,255,255,0.12)' }}
          >
            <span
              className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200"
              style={{ transform: annual ? 'translateX(20px)' : 'translateX(4px)' }}
            />
          </span>
          <span style={{ color: annual ? C.text : C.textMuted, fontWeight: annual ? 600 : 400 }}>
            Annual <span style={{ color: C.green }}>−20%</span>
          </span>
        </button>
      </div>

      {/* Tool grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6">
        {TOOLS.map(tool => {
          const on    = selected.has(tool.id)
          const price = annual ? tool.annualPrice : tool.monthlyPrice
          return (
            <button
              key={tool.id}
              onClick={() => toggle(tool.id)}
              className="flex items-center gap-3 p-3 rounded-xl text-left transition-all"
              style={{
                background: on ? C.orangeDim : C.bg,
                border: `1px solid ${on ? C.borderHot : C.border}`,
              }}
            >
              {/* Checkbox */}
              <span
                className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center"
                style={{ background: on ? C.orange : 'transparent', border: `1.5px solid ${on ? C.orange : C.textMuted}` }}
              >
                {on && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
              </span>
              <span className="text-lg flex-shrink-0">{tool.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate" style={{ color: on ? C.text : C.textDim }}>{tool.name}</div>
                <div className="text-xs truncate" style={{ color: C.textMuted }}>{tool.description}</div>
              </div>
              <div className="ml-auto text-sm font-bold flex-shrink-0" style={{ color: on ? C.orange : C.textMuted }}>
                ${price}/mo
              </div>
            </button>
          )
        })}
      </div>

      {/* Results */}
      <div className="rounded-xl p-5" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
        {/* Cost comparison */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div>
            <p className="text-xs mb-1" style={{ color: C.textMuted }}>Your current stack</p>
            <p className="text-3xl font-black" style={{ color: stackTotal > 0 ? C.text : C.textMuted }}>
              ${stackTotal}<span className="text-base font-normal" style={{ color: C.textMuted }}>/mo</span>
            </p>
          </div>
          <ArrowRight size={20} style={{ color: C.textMuted, flexShrink: 0 }} />
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: C.textMuted }}>LaunchOS Growth</p>
            <p className="text-3xl font-black" style={{ color: C.orange }}>
              ${launchosPrice}<span className="text-base font-normal" style={{ color: C.textMuted }}>/mo</span>
            </p>
          </div>
        </div>

        {/* Savings badge */}
        {savings > 0 ? (
          <div className="rounded-xl p-4 text-center mb-4"
            style={{ background: C.greenDim, border: `1px solid rgba(16,185,129,0.25)` }}>
            <p className="text-xl font-extrabold mb-0.5" style={{ color: C.green }}>
              You save ${savings}/month
            </p>
            <p className="text-sm" style={{ color: C.textDim }}>
              {savingsPct}% cheaper — ${savings * 12} back per year
            </p>
          </div>
        ) : stackTotal > 0 ? (
          <div className="rounded-xl p-4 text-center mb-4"
            style={{ background: C.orangeDim, border: `1px solid ${C.borderHot}` }}>
            <p className="text-base font-bold mb-0.5" style={{ color: C.orange }}>
              LaunchOS also adds AI video + AI workers + meetings
            </p>
            <p className="text-sm" style={{ color: C.textDim }}>Select more tools to see full savings</p>
          </div>
        ) : (
          <div className="rounded-xl p-4 text-center mb-4" style={{ background: C.bgElevated }}>
            <p className="text-sm" style={{ color: C.textMuted }}>Select tools above to calculate savings</p>
          </div>
        )}

        {/* CTA */}
        <a
          href={`https://brandmonkz.com/signup?plan=growth&utm_source=launchos&utm_medium=calculator`}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90"
          style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orangeLight})` }}
        >
          Start Free 30-Day Trial <ArrowRight size={16} />
        </a>
        <p className="text-xs text-center mt-2" style={{ color: C.textMuted }}>
          CRM · AI video · Social publishing · Meetings · SEO — all included
        </p>
      </div>
    </div>
  )
}
