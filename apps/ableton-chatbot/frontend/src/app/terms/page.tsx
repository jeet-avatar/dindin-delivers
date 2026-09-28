"use client";

import { TRIAL_AI_MESSAGES, TRIAL_DAYS, TRIAL_TRACKS } from "@/lib/site";

const PRODUCT = "BeatMind";
const COMPANY = "Zietra Technologies Inc.";
const DOMAIN = "beatmind.io";
const SUPPORT_EMAIL = "support@beatmind.io";
const EFFECTIVE = "March 1, 2026";
const LAST_UPDATED = "September 28, 2026";

function Clause({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</h3>
      {children}
    </div>
  );
}

function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{SUPPORT_EMAIL}</a>
  );
}

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
        <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>Effective: {EFFECTIVE} · Last updated: {LAST_UPDATED}</p>

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

          <Section title="4. Subscriptions, Billing and Cancellation">
            <Clause title="Free trial">
              <p>New accounts get a {TRIAL_DAYS}-day free trial. No credit card is needed. The trial includes {TRIAL_TRACKS} tracks (processed on your own computer) and limited AI use (about {TRIAL_AI_MESSAGES} messages). Cloud HQ separations and packs are not part of the trial. The trial never turns into a paid plan on its own and we never charge you for it. If you start a paid plan during the trial, the trial ends and the plan begins, and is billed, immediately.</p>
            </Clause>
            <Clause title="Automatic renewal">
              <p>Paid plans renew automatically at the end of each billing period (monthly or yearly, whichever you chose) at the then-current price, until you cancel. The price, billing interval and renewal terms are shown to you before you buy.</p>
            </Clause>
            <Clause title="How to cancel">
              <p>You can cancel anytime, online: go to Dashboard → Billing and choose Cancel subscription (this opens our billing portal, run by Stripe). You can also cancel by emailing <SupportLink />. Cancellation takes effect at the end of your current paid period. You keep access until then, and you will not be charged again.</p>
            </Clause>
            <Clause title="Refunds">
              <p>We don&apos;t give refunds for partial billing periods, except where the law requires it. If you think you were charged in error, contact <SupportLink /> within 30 days of the charge and we&apos;ll look into it.</p>
            </Clause>
            <Clause title="Changing plans">
              <p>You can upgrade or downgrade your plan in your billing settings. Stripe prorates the change, so you pay or are credited for the difference based on the time left in your billing period.</p>
            </Clause>
            <Clause title="Promotions and discount codes">
              <p>Promotional discounts (for example launch or creator codes) apply only for the period stated with the offer. After that, your subscription renews at the standard price unless you cancel. Only one code can be used per customer, and codes may have a limited number of redemptions.</p>
            </Clause>
            <Clause title="Track allowances and packs">
              <p>Each plan includes a monthly allowance of tracks (and, on some plans, cloud HQ separations). Allowances reset at the start of each billing month and unused amounts don&apos;t roll over. Track packs and cloud HQ packs are one-time purchases that never expire. They are used only after your monthly allowance runs out, they require an active paid plan, and they are non-refundable once used.</p>
            </Clause>
            <Clause title="Price changes">
              <p>If we change the price of your plan, we&apos;ll email you at least 30 days before the new price takes effect at your next renewal. You can cancel before then if you don&apos;t want to continue at the new price.</p>
            </Clause>
            <Clause title="Failed payments">
              <p>If a payment fails, we may retry it. If payment still isn&apos;t completed, we may suspend access to paid features until it is.</p>
            </Clause>
            <Clause title="Taxes">
              <p>Prices may not include taxes. Sales tax, VAT or similar taxes may apply depending on where you live.</p>
            </Clause>
            <Clause title="Payment processing">
              <p>Payments are processed by Stripe. We never see or store your full card number.</p>
            </Clause>
            <p>Current plans and prices are listed at {DOMAIN}/#pricing.</p>
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
