import { SectionHeader, SEO } from '../components/ui'

export default function PrivacyPolicy() {
  return (
    <>
      <SEO
        title="Privacy Policy"
        description="TechCloudPro privacy policy — how we collect, use, and protect your information."
        path="/privacy-policy"
      />

      <section className="py-28 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader title="Privacy Policy" className="mb-12" />

          <div className="space-y-8 text-[var(--text-dim)] text-sm leading-relaxed">
            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">1. Information We Collect</h3>
              <p>We collect information you provide directly to us, such as when you fill out a contact form, request a consultation, or communicate with us. This may include your name, email address, phone number, company name, and any other information you choose to provide.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">2. How We Use Your Information</h3>
              <p>We use the information we collect to respond to your inquiries, provide our services, send you relevant communications about our offerings, and improve our website and services. We do not sell, trade, or rent your personal information to third parties.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">3. Data Security</h3>
              <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">4. Cookies</h3>
              <p>We use cookies and similar tracking technologies to enhance your browsing experience. You can control cookies through your browser settings. We use cookies to remember your theme preference (dark/light mode) and to understand how you interact with our site.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">5. Third-Party Services</h3>
              <p>Our website may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">6. Changes to This Policy</h3>
              <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated effective date.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">7. Contact Us</h3>
              <p>If you have any questions about this privacy policy, please contact us at <a href="mailto:contact@techcloudpro.com" className="text-blue-400 hover:underline">contact@techcloudpro.com</a>.</p>
            </div>

            <p className="text-xs text-[var(--text-muted)] pt-4 border-t border-[var(--glass-border)]">
              &copy; {new Date().getFullYear()} TechCloudPro — A Zietra Technologies Inc. Company. Last updated: April 2026.
            </p>
          </div>
        </div>
      </section>
    </>
  )
}
