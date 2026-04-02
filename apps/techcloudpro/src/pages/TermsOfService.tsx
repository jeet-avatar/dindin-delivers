import { SectionHeader, SEO } from '../components/ui'
import { SchemaMarkup } from '../components/ui/SchemaMarkup'

export default function TermsOfService() {
  return (
    <>
      <SEO
        title="Terms of Service"
        description="TechCloudPro terms of service — governing the use of our website, consulting services, and technology solutions."
        path="/terms"
      />
      <SchemaMarkup page="about" breadcrumbs={[
        { name: 'Home', url: 'https://techcloudpro.com/' },
        { name: 'Terms of Service', url: 'https://techcloudpro.com/terms/' },
      ]} />

      <section className="py-28 md:py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <SectionHeader as="h1" title="Terms of Service" className="mb-12" />

          <div className="space-y-8 text-[var(--text-dim)] text-sm leading-relaxed">
            <p className="text-xs text-[var(--text-muted)]">Last updated: April 2, 2026</p>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">1. Acceptance of Terms</h3>
              <p>By accessing or using the TechCloudPro website (techcloudpro.com) and any services provided by Vibing World Inc, operating as TechCloudPro, you agree to be bound by these Terms of Service. If you do not agree, please discontinue use of our website and services.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">2. Services</h3>
              <p>TechCloudPro provides enterprise technology consulting services including but not limited to: AI consulting and private LLM deployment, Oracle NetSuite ERP implementation, CyberArk cybersecurity solutions, and IT staffing services. All services are subject to separate engagement agreements that detail scope, deliverables, timelines, and fees.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">3. Intellectual Property</h3>
              <p>All content on this website — including text, graphics, logos, images, and software — is the property of TechCloudPro or its licensors and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without our prior written consent.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">4. Client Engagements</h3>
              <p>Consulting engagements are governed by individual Statements of Work (SOWs) or Master Service Agreements (MSAs). These Terms of Service apply to website usage and general inquiries. In the event of a conflict between these terms and a signed engagement agreement, the engagement agreement shall prevail.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">5. Confidentiality</h3>
              <p>We treat all client information as confidential. Information shared during consultations, discovery sessions, or engagements will not be disclosed to third parties without your consent, except as required by law. Our 40-hour free discovery sessions are covered by this confidentiality commitment.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">6. Limitation of Liability</h3>
              <p>TechCloudPro's liability for any claim arising from our services shall not exceed the fees paid for the specific engagement giving rise to the claim. We are not liable for indirect, incidental, or consequential damages including lost profits, data loss, or business interruption.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">7. IT Staffing Terms</h3>
              <p>Technology professionals placed through our staffing services are engaged under separate contractor agreements. TechCloudPro charges a transparent staffing fee (disclosed to both client and contractor). Clients may not solicit or directly hire placed contractors during and for 12 months after the engagement without written consent.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">8. Website Use</h3>
              <p>You agree not to use this website to transmit harmful code, attempt unauthorized access, or engage in activities that disrupt the website's functionality. We reserve the right to restrict access to users who violate these terms.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">9. Governing Law</h3>
              <p>These Terms of Service are governed by the laws of the State of New York, United States. Any disputes shall be resolved in the courts of New York County, New York.</p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--text)] mb-3">10. Contact</h3>
              <p>For questions about these terms, contact us at <a href="mailto:contact@techcloudpro.com" className="text-blue-400 hover:underline">contact@techcloudpro.com</a> or call +1-866-983-2425.</p>
              <p className="mt-2">Vibing World Inc (d/b/a TechCloudPro)<br />477 Madison Avenue, 6th Floor<br />New York, NY 10022</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
