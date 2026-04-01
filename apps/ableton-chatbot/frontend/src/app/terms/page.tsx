"use client";

const PRODUCT = "BeatMind";
const COMPANY = "Zietra Technologies Inc.";
const DOMAIN = "beatmind.io";
const SUPPORT_EMAIL = "support@beatmind.io";
const EFFECTIVE = "March 1, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>Effective: {EFFECTIVE}</p>

        <div className="prose prose-invert space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <Section title="1. Acceptance">
            <p>By creating an account or using {PRODUCT} ({DOMAIN}), you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </Section>

          <Section title="2. Description of Service">
            <p>{PRODUCT} is an AI music production assistant operated by {COMPANY}. It generates Ableton Live commands via a local bridge agent and the Claude AI API. {PRODUCT} does not produce audio files — it controls your existing Ableton Live session.</p>
          </Section>

          <Section title="3. Account and Eligibility">
            <p>You must be at least 13 years old. You are responsible for keeping your login credentials secure. One account per person — sharing credentials is prohibited.</p>
          </Section>

          <Section title="4. Subscription and Billing">
            <p className="mb-3">Access requires a paid subscription ($19/month) after a 7-day free trial. Billing is handled by Stripe. You may cancel anytime from your account dashboard — access continues until the end of the current billing period. No refunds for partial months.</p>
            <p>We reserve the right to change pricing with 30 days&apos; notice. Existing subscribers keep their rate until the next renewal after the notice period.</p>
          </Section>

          <Section title="5. Your Content and IP Ownership">
            <p>You own all music and creative output produced using {PRODUCT}. We claim no rights to your compositions, arrangements, or Ableton projects. AI-generated commands are tools — the creative decisions are yours.</p>
          </Section>

          <Section title="6. Acceptable Use">
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-4 space-y-2">
              <li>Reverse-engineer, decompile, or extract the AI system prompt or tools</li>
              <li>Use automated scripts or bots to access the service</li>
              <li>Attempt to bypass rate limits, subscription checks, or authentication</li>
              <li>Share your account credentials or bridge tokens with others</li>
              <li>Use the service for any illegal purpose</li>
            </ul>
          </Section>

          <Section title="7. Third-Party Dependencies">
            <p>{PRODUCT} requires Ableton Live 11 or 12 (sold separately by Ableton AG). We are not affiliated with Ableton. {PRODUCT} also uses the AbletonOSC protocol and Anthropic&apos;s Claude API. Service availability depends on these third parties.</p>
          </Section>

          <Section title="8. Disclaimer of Warranties">
            <p>{PRODUCT} is provided &quot;as is&quot; without warranty of any kind. We do not guarantee uninterrupted service, error-free AI output, or compatibility with all Ableton configurations. AI-generated commands may produce unexpected results — always save your project before using {PRODUCT}.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by law, {COMPANY} is not liable for any indirect, incidental, or consequential damages arising from use of {PRODUCT}, including but not limited to loss of data, corrupted Ableton projects, or interrupted workflows. Our total liability is limited to the amount you paid in the 12 months preceding the claim.</p>
          </Section>

          <Section title="10. Termination">
            <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time by contacting <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{SUPPORT_EMAIL}</a>.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>These terms are governed by the laws of the United States. Any disputes shall be resolved in the courts of the state where {COMPANY} is registered.</p>
          </Section>

          <Section title="12. Contact">
            <p>Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{SUPPORT_EMAIL}</a>.</p>
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
