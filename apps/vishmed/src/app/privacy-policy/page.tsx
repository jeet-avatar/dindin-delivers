import type { Metadata } from 'next'
import { siteConfig } from '@/lib/config'

export const metadata: Metadata = {
  title: 'Privacy Policy | HIPAA Notice of Privacy Practices',
  description:
    'Vish Medical Privacy Policy and HIPAA Notice of Privacy Practices. Learn how we collect, use, and protect your personal and health information.',
  openGraph: {
    title: 'Privacy Policy | HIPAA Notice of Privacy Practices',
    url: `${siteConfig.siteUrl}/privacy-policy`,
  },
  robots: { index: false },
}

export default function PrivacyPolicyPage() {
  const practiceEmail = process.env.NEXT_PUBLIC_PRACTICE_EMAIL ?? ''

  return (
    <div className="bg-white">
      {/* Header */}
      <section className="bg-brand-blue text-white py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="font-heading text-3xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-blue-200">HIPAA Notice of Privacy Practices &mdash; Last Updated: April 2026</p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto prose prose-slate max-w-none">
          <div className="space-y-10 text-slate-700 leading-relaxed text-base">

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">1. Who We Are</h2>
              <p>
                This Privacy Policy applies to <strong>Vish Medical</strong>, the medical practice of Dr. Arpana Pillay,
                located in Central Florida and accessible at{' '}
                <a href={siteConfig.siteUrl} className="text-primary underline underline-offset-2 hover:text-primary-dark">
                  {siteConfig.siteUrl}
                </a>
                . Dr. Pillay is an Internal Medicine physician providing primary care, weight loss, urgent
                care, and telehealth services. As a healthcare provider, Vish Medical is a Covered Entity under HIPAA and
                is committed to maintaining the privacy and security of your health information.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">2. Information We Collect</h2>
              <p className="mb-3">When you use the contact form on this website, we collect:</p>
              <ul className="list-none space-y-2 pl-0">
                {[
                  'Full name',
                  'Email address',
                  'Phone number (optional)',
                  'Message content you provide',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" aria-hidden="true"></span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                We do not collect sensitive health information (Protected Health Information / PHI) through this website&apos;s
                contact form. Clinical health information is collected separately through our HIPAA-compliant patient management
                systems.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">3. How We Use Your Information</h2>
              <p>Information submitted through our contact form is used solely to:</p>
              <ul className="list-none space-y-2 pl-0 mt-3">
                {[
                  'Respond to your inquiry',
                  'Schedule appointments at your request',
                  'Provide information about our services',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" aria-hidden="true"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">4. How Your Information Is Transmitted</h2>
              <p>
                Contact form submissions are transmitted via encrypted email using Google Workspace SMTP over TLS (Transport
                Layer Security). <strong>Contact form data is not stored in a database.</strong> It is delivered directly to
                the practice&apos;s secure inbox and is retained only as long as necessary to respond to your inquiry.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">5. We Do Not Sell Your Information</h2>
              <p>
                Vish Medical does not sell, rent, trade, or otherwise share your personal information or health information
                with third parties for marketing or commercial purposes. Period.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">6. HIPAA Notice of Privacy Practices</h2>
              <p className="mb-3">
                As a HIPAA Covered Entity, Vish Medical maintains strict policies governing the use and disclosure of
                Protected Health Information (PHI). Your PHI may be used or disclosed for:
              </p>
              <ul className="list-none space-y-2 pl-0">
                {[
                  'Treatment — sharing information with other healthcare providers involved in your care',
                  'Payment — submitting claims to your insurance company',
                  'Healthcare Operations — quality improvement, compliance, and administrative activities',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0 mt-2" aria-hidden="true"></span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3">
                Other uses of your PHI require your written authorization. You have the right to revoke any authorization
                you have given us. For other disclosures required by law (such as public health reporting), we will comply
                with applicable regulations.
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">7. Your Rights</h2>
              <p className="mb-3">Under HIPAA, you have the right to:</p>
              <ul className="list-none space-y-2 pl-0">
                {[
                  'Access and obtain a copy of your health records',
                  'Request corrections to your records',
                  'Receive an accounting of disclosures of your PHI',
                  'Request restrictions on certain uses or disclosures',
                  'Receive confidential communications in an alternative way or location',
                  'File a complaint if you believe your privacy rights have been violated',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 bg-primary rounded-full shrink-0" aria-hidden="true"></span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">8. Cookies & Analytics</h2>
              <p>
                This website may use Google Analytics (GA4) to understand how visitors interact with the site. GA4 collects
                anonymized usage data such as page views, session duration, and traffic sources. No personally identifiable
                information is sent to Google Analytics. You can opt out of GA4 tracking by using the{' '}
                <a href="https://tools.google.com/dlpage/gaoptout" className="text-primary underline underline-offset-2 hover:text-primary-dark" target="_blank" rel="noopener noreferrer">
                  Google Analytics Opt-out Browser Add-on
                </a>
                .
              </p>
            </div>

            <div>
              <h2 className="font-heading text-xl font-bold text-slate-800 mb-3">9. Contact Us About Privacy</h2>
              <p>
                If you have questions about this Privacy Policy or wish to exercise your HIPAA rights, please contact us:
              </p>
              <div className="mt-3 bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <p className="font-semibold text-slate-800">Vish Medical — Privacy Officer</p>
                <p className="text-slate-600">Dr. Arpana Pillay, Internal Medicine Physician</p>
                {practiceEmail && (
                  <p className="mt-2">
                    Email:{' '}
                    <a href={`mailto:${practiceEmail}`} className="text-primary underline underline-offset-2">
                      {practiceEmail}
                    </a>
                  </p>
                )}
                <p>
                  Phone:{' '}
                  <a href={`tel:${siteConfig.phone.replace(/[^0-9]/g, '')}`} className="text-primary font-semibold">
                    {siteConfig.phone}
                  </a>
                </p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6">
              <p className="text-slate-500 text-sm">
                This Privacy Policy was last updated in April 2026. We reserve the right to update this policy at any time.
                Material changes will be communicated via the website.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
