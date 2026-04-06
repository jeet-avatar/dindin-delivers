import { useState } from 'react';

interface Tool {
  id: string;
  name: string;
  category: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;  // per-month if paid annually
  logoEmoji: string;
  description: string;
}

const TOOLS: Tool[] = [
  {
    id: 'activecampaign',
    name: 'ActiveCampaign',
    category: 'CRM & Email',
    monthlyPrice: 79,
    annualMonthlyPrice: 63,
    logoEmoji: '\u{1F4E7}',
    description: 'CRM + email marketing (Plus plan)',
  },
  {
    id: 'heygen',
    name: 'HeyGen',
    category: 'AI Video',
    monthlyPrice: 59,
    annualMonthlyPrice: 49,
    logoEmoji: '\u{1F3AC}',
    description: 'AI video generation (Creator plan)',
  },
  {
    id: 'buffer',
    name: 'Buffer',
    category: 'Social Scheduling',
    monthlyPrice: 18,
    annualMonthlyPrice: 15,
    logoEmoji: '\u{1F4C5}',
    description: 'Social media scheduling (Essentials)',
  },
  {
    id: 'hootsuite',
    name: 'Hootsuite',
    category: 'Social Scheduling',
    monthlyPrice: 99,
    annualMonthlyPrice: 79,
    logoEmoji: '\u{1F989}',
    description: 'Social media management (Pro)',
  },
  {
    id: 'zoom',
    name: 'Zoom',
    category: 'Video Meetings',
    monthlyPrice: 15,
    annualMonthlyPrice: 13,
    logoEmoji: '\u{1F4F9}',
    description: 'Video meetings (Pro per host)',
  },
  {
    id: 'surfer',
    name: 'Surfer SEO',
    category: 'SEO',
    monthlyPrice: 89,
    annualMonthlyPrice: 69,
    logoEmoji: '\u{1F3C4}',
    description: 'SEO optimization (Essential)',
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'CRM',
    monthlyPrice: 50,
    annualMonthlyPrice: 45,
    logoEmoji: '\u{1F9E1}',
    description: 'CRM (Starter)',
  },
  {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    category: 'Marketing',
    monthlyPrice: 97,
    annualMonthlyPrice: 97,
    logoEmoji: '\u{1F680}',
    description: 'Marketing platform (Starter)',
  },
];

const LAUNCHOS_GROWTH_PRICE = 149;
const LAUNCHOS_GROWTH_ANNUAL_PRICE = 119;

export default function ConsolidationCalculator() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(['activecampaign', 'heygen', 'zoom', 'surfer']) // defaults selected
  );
  const [billingAnnual, setBillingAnnual] = useState(false);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const currentTotal = TOOLS
    .filter(t => selected.has(t.id))
    .reduce((sum, t) => sum + (billingAnnual ? t.annualMonthlyPrice : t.monthlyPrice), 0);

  const launchosPrice = billingAnnual ? LAUNCHOS_GROWTH_ANNUAL_PRICE : LAUNCHOS_GROWTH_PRICE;
  const savings = currentTotal - launchosPrice;
  const savingsPercent = currentTotal > 0 ? Math.round((savings / currentTotal) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Calculate Your Savings</h3>
          <p className="text-gray-500 mt-1">Select the tools you currently pay for</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className={billingAnnual ? 'text-gray-400' : 'font-semibold'}>Monthly</span>
          <button
            onClick={() => setBillingAnnual(b => !b)}
            className={`w-10 h-6 rounded-full transition-colors ${billingAnnual ? 'bg-blue-600' : 'bg-gray-300'}`}
          >
            <span className={`block w-4 h-4 bg-white rounded-full mx-1 transition-transform ${billingAnnual ? 'translate-x-4' : ''}`} />
          </button>
          <span className={billingAnnual ? 'font-semibold' : 'text-gray-400'}>
            Annual <span className="text-green-600">(save 20%)</span>
          </span>
        </div>
      </div>

      {/* Tool selection grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {TOOLS.map(tool => {
          const isSelected = selected.has(tool.id);
          const price = billingAnnual ? tool.annualMonthlyPrice : tool.monthlyPrice;
          return (
            <button
              key={tool.id}
              onClick={() => toggle(tool.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
              }`}>
                {isSelected && <span className="text-white text-xs">&#x2713;</span>}
              </div>
              <span className="text-xl flex-shrink-0">{tool.logoEmoji}</span>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-gray-900">{tool.name}</div>
                <div className="text-xs text-gray-500 truncate">{tool.description}</div>
              </div>
              <div className="ml-auto text-sm font-bold text-gray-700 flex-shrink-0">
                ${price}/mo
              </div>
            </button>
          );
        })}
      </div>

      {/* Results panel */}
      <div className="bg-gray-50 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-sm text-gray-500">Your current stack</div>
            <div className="text-3xl font-bold text-gray-900">
              ${currentTotal}<span className="text-lg font-normal text-gray-500">/mo</span>
            </div>
          </div>
          <div className="text-3xl text-gray-400">&#x2192;</div>
          <div className="text-right">
            <div className="text-sm text-gray-500">LaunchOS Growth</div>
            <div className="text-3xl font-bold text-blue-600">
              ${launchosPrice}<span className="text-lg font-normal text-gray-500">/mo</span>
            </div>
          </div>
        </div>

        {savings > 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center mb-4">
            <div className="text-2xl font-bold text-green-700">You save ${savings}/month</div>
            <div className="text-green-600 text-sm">
              {savingsPercent}% cheaper &mdash; that&apos;s ${savings * 12}/year back in your pocket
            </div>
          </div>
        ) : currentTotal > 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center mb-4">
            <div className="text-lg font-bold text-blue-700">
              LaunchOS does all of that PLUS AI video + AI workers
            </div>
            <div className="text-blue-600 text-sm">Select more tools to see your full savings</div>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-xl p-4 text-center mb-4 text-gray-500">
            Select tools above to calculate your savings
          </div>
        )}

        <a
          href="https://brandmonkz.com/signup?utm_source=launchos&utm_medium=calculator"
          className="block w-full bg-blue-600 text-white text-center py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Start Free 30-Day Trial &mdash; No Credit Card
        </a>
        <p className="text-xs text-gray-400 text-center mt-2">
          Includes everything: CRM + AI video + social publishing + meetings + SEO
        </p>
      </div>
    </div>
  );
}
