export interface Story {
  id: string
  quote: string
  name: string
  role: string
  company: string
  module: 'CRM' | 'Social' | 'Meet'
  moduleColor: string
  initials: string
  defaultReactions: { heart: number; hands: number; fire: number }
}

export const STORIES: Story[] = [
  {
    id: 'sarah-bloom',
    quote: "I replaced HubSpot, Buffer, and Calendly with Zietra. My reply rate went from 8% to 31% in the first month. The AI drafts are scary good.",
    name: 'Sarah Bloom',
    role: 'Founder',
    company: 'GlamCo Beauty',
    module: 'CRM',
    moduleColor: '#ff6b35',
    initials: 'SB',
    defaultReactions: { heart: 24, hands: 11, fire: 18 },
  },
  {
    id: 'marcus-osei',
    quote: "Our team books 3× more demo calls since switching. The AI meeting summaries save us 2 hours a week — I send follow-ups before the prospect closes their laptop.",
    name: 'Marcus Osei',
    role: 'Sales Lead',
    company: 'Apex Labs',
    module: 'Meet',
    moduleColor: '#30d158',
    initials: 'MO',
    defaultReactions: { heart: 31, hands: 15, fire: 22 },
  },
  {
    id: 'priya-nair',
    quote: "I was spending 4 hours a week on social. Now I do it in 20 minutes. Zietra schedules across all platforms and tells me exactly which posts drove leads.",
    name: 'Priya Nair',
    role: 'Marketing Director',
    company: 'NxtStep Finance',
    module: 'Social',
    moduleColor: '#bf5af2',
    initials: 'PN',
    defaultReactions: { heart: 19, hands: 8, fire: 14 },
  },
]
