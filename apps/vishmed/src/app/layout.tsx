import type { Metadata } from 'next'
import { Figtree, Noto_Sans } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { VisitorTracker } from '@/components/ui/VisitorTracker'
import { siteConfig } from '@/lib/config'

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  weight: ['300', '400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  verification: {
    google: 'Qv91v_oT97WNkWYBGfjCzLLrc67VGUE7QerUfgn66KU',
  },
  title: {
    default: 'Vish Medical | Primary Care & Weight Loss | Dr. Arpana Pillay',
    template: '%s | Vish Medical',
  },
  description:
    'Internal Medicine physician Dr. Arpana Pillay offers primary care, weight loss, urgent care, and telehealth in Central Florida. Accepting new patients.',
  keywords: [
    'primary care doctor',
    'weight loss doctor',
    'telehealth',
    'Dr. Arpana Pillay',
    'internal medicine',
    'Central Florida doctor',
    'urgent care',
  ],
  openGraph: {
    type: 'website',
    siteName: 'Vish Medical',
    url: siteConfig.siteUrl,
  },
  metadataBase: new URL(siteConfig.siteUrl),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${figtree.variable} ${notoSans.variable}`}>
      <body className="flex flex-col min-h-screen bg-slate-50 text-slate-800 font-sans antialiased leading-relaxed">
        {/* Skip to main content — WCAG AAA */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:font-semibold"
        >
          Skip to main content
        </a>

        {siteConfig.ga4Id && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.ga4Id}`}
              strategy="afterInteractive"
            />
            <Script id="ga4" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${siteConfig.ga4Id}');
            `}</Script>
          </>
        )}
        <VisitorTracker />
        <Header />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  )
}
