"use client";

const PRODUCT = "BeatMind";
const COMPANY = "Zietra Technologies Inc.";
const DOMAIN = "beatmind.io";
const PRIVACY_EMAIL = "privacy@zietra.tech";
const EFFECTIVE = "March 1, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg-primary)", color: "var(--text-primary)" }}>
      <nav className="px-6 py-4 border-b max-w-3xl mx-auto flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
        <a className="flex items-center gap-2 font-bold" href="/">
          <span className="w-7 h-7 rounded flex items-center justify-center text-xs font-black" style={{ background: "var(--accent)", color: "#fff" }}>B</span>
          beatmind
        </a>
        <a className="text-sm" style={{ color: "var(--text-secondary)" }} href="/">&larr; Back to home</a>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>Effective: {EFFECTIVE}</p>

        <div className="prose prose-invert space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <Section title="1. Who We Are">
            <p>{COMPANY} (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates {PRODUCT} ({DOMAIN}), an AI music production assistant that integrates with Ableton Live. Our registered address is in the United States. For privacy inquiries, contact us at <a href={`mailto:${PRIVACY_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{PRIVACY_EMAIL}</a>.</p>
          </Section>

          <Section title="2. Information We Collect">
            <p className="mb-3"><strong style={{ color: "var(--text-primary)" }}>Account information:</strong> When you register, we collect your name, email address, and hashed password.</p>
            <p className="mb-3"><strong style={{ color: "var(--text-primary)" }}>Billing information:</strong> Payment processing is handled by Stripe. We never see or store your full card details. We receive a Stripe customer ID and subscription status.</p>
            <p className="mb-3"><strong style={{ color: "var(--text-primary)" }}>Chat conversations:</strong> Your messages to the AI assistant are processed by Anthropic&apos;s Claude API to generate Ableton commands. We store your conversation history to maintain session context. Conversations are not used to train AI models.</p>
            <p className="mb-3"><strong style={{ color: "var(--text-primary)" }}>Usage data:</strong> We log basic usage analytics (features used, error rates) to improve the service. We do not sell this data.</p>
            <p><strong style={{ color: "var(--text-primary)" }}>Local bridge agent:</strong> The bridge agent runs entirely on your machine and communicates directly with Ableton Live via UDP. We do not store or transmit your Ableton project data or music.</p>
          </Section>

          <Section title="3. How We Use Your Information">
            <ul className="list-disc pl-4 space-y-2">
              <li>To provide and operate the {PRODUCT} service</li>
              <li>To process payments and manage subscriptions via Stripe</li>
              <li>To send transactional emails (account confirmation, receipts, support replies)</li>
              <li>To improve the AI assistant and fix bugs</li>
              <li>To comply with legal obligations</li>
            </ul>
          </Section>

          <Section title="4. Third-Party Services">
            <p>We share your data with these third parties solely to deliver the service:</p>
            <ul className="list-disc pl-4 space-y-2 mt-3">
              <li><strong style={{ color: "var(--text-primary)" }}>Anthropic:</strong> Your chat messages are sent to the Claude API for AI processing. See <a href="https://www.anthropic.com/privacy" target="_blank" className="underline" style={{ color: "var(--accent)" }}>Anthropic&apos;s Privacy Policy</a>.</li>
              <li><strong style={{ color: "var(--text-primary)" }}>Stripe:</strong> Payment processing. See <a href="https://stripe.com/privacy" target="_blank" className="underline" style={{ color: "var(--accent)" }}>Stripe&apos;s Privacy Policy</a>.</li>
              <li><strong style={{ color: "var(--text-primary)" }}>AWS:</strong> Server infrastructure. Data is hosted in the United States.</li>
            </ul>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your account data for as long as your account is active. Chat history is retained for 90 days. You may request deletion of your account and associated data at any time by emailing <a href={`mailto:${PRIVACY_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{PRIVACY_EMAIL}</a>.</p>
          </Section>

          <Section title="6. Your Rights">
            <p>Depending on your location, you may have rights to access, correct, delete, or export your personal data. To exercise these rights, email <a href={`mailto:${PRIVACY_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{PRIVACY_EMAIL}</a>. We respond within 30 days.</p>
          </Section>

          <Section title="7. Cookies">
            <p>We use minimal session cookies for authentication. We do not use tracking or advertising cookies.</p>
          </Section>

          <Section title="8. Security">
            <p>We use TLS encryption, bcrypt password hashing, rate limiting, and DoS protection. All data is stored on encrypted infrastructure (AWS, US-East-1).</p>
          </Section>

          <Section title="9. Children">
            <p>{PRODUCT} is not intended for users under 13. We do not knowingly collect data from children.</p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>We may update this policy. Changes take effect when posted. Continued use of {PRODUCT} constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="11. Contact">
            <p>Questions? Email <a href={`mailto:${PRIVACY_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{PRIVACY_EMAIL}</a>.</p>
          </Section>
        </div>
      </div>

      <footer className="border-t px-6 py-6" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto text-center text-xs" style={{ color: "var(--text-secondary)" }}>
          &copy; 2026 {COMPANY}
        </div>
      </footer>
    </div>
  );
}
