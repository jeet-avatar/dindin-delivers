// Client-safe config (NEXT_PUBLIC_* only — safe to import in Client Components)
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_PRACTICE_NAME ?? 'Vish Medical',
  phone: process.env.NEXT_PUBLIC_PRACTICE_PHONE ?? '(446) 654-8278',
  email: process.env.NEXT_PUBLIC_PRACTICE_EMAIL ?? 'info@vishmedical.com',
  address: process.env.NEXT_PUBLIC_PRACTICE_ADDRESS ?? '9486 Narcoossee Rd, Orlando, FL 32827',
  calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL ?? '',
  ga4Id: process.env.NEXT_PUBLIC_GA4_ID ?? '',
  mapsEmbedUrl: process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_URL ?? '',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vishmed.com',
  doctor: {
    name: 'Dr. Arpana Pillay',
    title: 'Internal Medicine Physician',
    experience: '10+ years',
  },
  hours: {
    saturday: '9:00 AM – 4:00 PM',
    weekdays: '5:00 PM – 8:00 PM (Mon–Fri)',
  },
  acceptingPatients: true,
} as const
