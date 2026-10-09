"use client";

import { GOVERNING_LAW_STATE, LEGAL_LAST_UPDATED, LEGAL_NAME, SUPPORT_EMAIL, TRIAL_AI_MESSAGES, TRIAL_DAYS, TRIAL_TRACKS } from "@/lib/site";
import { FOUNDING_CODE, FOUNDING_DISCOUNT_PERCENT, FOUNDING_SEATS } from "@/lib/pricing";

const PRODUCT = "BeatMind";
const COMPANY = LEGAL_NAME;
const DOMAIN = "beatmind.io";
const EFFECTIVE = "March 1, 2026";

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
        <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>Effective: {EFFECTIVE} · Last updated: {LEGAL_LAST_UPDATED}</p>

        <div className="prose prose-invert space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <Section title="1. Acceptance">
            <p>By creating an account or using {PRODUCT} ({DOMAIN}), you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </Section>

          <Section title="2. Description of Service">
            <p className="mb-3">{PRODUCT} is an AI music production assistant operated by {COMPANY}. It uses AI to plan and send Ableton Live commands through the BeatMind Bridge app on your computer. {PRODUCT} controls your Ableton Live session and can separate reference tracks into audio stems.</p>
            <p>MixMind is a desktop DJ library manager, also operated by {COMPANY}, that reads your Rekordbox library on your computer. MixMind is currently in early access.</p>
          </Section>

          <Section title="3. Account and Eligibility">
            <p>You must be at least 13 years old. You are responsible for keeping your login credentials secure. One account per person — sharing credentials is prohibited.</p>
          </Section>

          <Section title="4. Subscriptions, Billing and Cancellation">
            <Clause title="Free trial">
              <p>New accounts get a {TRIAL_DAYS}-day free trial. No credit card is needed. The trial includes {TRIAL_TRACKS} tracks, separated on your own Mac, and limited AI use (about {TRIAL_AI_MESSAGES} messages). Cloud HQ separations and packs are not part of the trial. The trial never turns into a paid plan on its own and we never charge you for it. If you start a paid plan during the trial, the trial ends and the plan begins, and is billed, immediately.</p>
            </Clause>
            <Clause title="Automatic renewal">
              <p>Paid plans renew automatically at the end of each billing period (monthly or yearly, whichever you chose) at the then-current price, until you cancel. The price, billing interval and renewal terms are shown to you before you buy.</p>
            </Clause>
            <Clause title="How to cancel">
              <p>You can cancel anytime, online: go to Dashboard → Account → Billing and choose Cancel subscription. You can also use Manage billing (Stripe) there, or email <SupportLink />. Cancellation takes effect at the end of your current paid period. You keep access until then, and you will not be charged again.</p>
            </Clause>
            <Clause title="Refunds">
              <p>We don&apos;t give refunds for partial billing periods, except where the law requires it. If you think you were charged in error, contact <SupportLink /> within 30 days of the charge and we&apos;ll look into it.</p>
            </Clause>
            <Clause title="Changing plans">
              <p>You can upgrade or downgrade your plan in Dashboard → Account → Billing. Stripe prorates the change, so you pay or are credited for the difference based on the time left in your billing period.</p>
            </Clause>
            <Clause title="Promotions and discount codes">
              <p>Promotional discounts (for example launch or creator codes) apply only for the period stated with the offer. After that, your subscription renews at the standard price unless you cancel. Only one code can be used per customer, and codes may have a limited number of redemptions. The {FOUNDING_CODE} code gives the first {FOUNDING_SEATS} annual subscribers who use it {FOUNDING_DISCOUNT_PERCENT}% off for as long as your subscription stays active; it applies to annual plans only.</p>
            </Clause>
            <Clause title="Track allowances and packs">
              <p>Each plan includes a monthly allowance of tracks (and, on some plans, cloud HQ separations). Allowances reset on the 1st of each calendar month (UTC) and unused amounts don&apos;t roll over. Track packs and cloud HQ packs are one-time purchases that never expire. They are used only after your monthly allowance runs out, they require an active paid plan, and they are non-refundable once used.</p>
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
            <p>You own all music and creative output produced using {PRODUCT}. We claim no rights to your compositions, arrangements, or Ableton projects. Samples and presets you load stay under their own licences. You are responsible for having the rights to reference tracks you upload.</p>
          </Section>

          <Section title="6. Desktop Software">
            <p>The BeatMind Bridge and MixMind are desktop apps. We give you a personal, non-exclusive, non-transferable licence to install and use them on your own computers while you have an account with access to them. You may not sell, rent or redistribute them. Updates may be offered from time to time. The apps include open-source components that stay under their own licences. MixMind reads your Rekordbox library and only writes to it when you ask it to (for example, Add to Rekordbox); keep your own backups.</p>
          </Section>

          <Section title="7. Acceptable Use">
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-4 space-y-2">
              <li>Reverse-engineer, decompile, or extract the AI system prompt or tools</li>
              <li>Use automated scripts or bots to access the service</li>
              <li>Attempt to bypass rate limits, subscription checks, or authentication</li>
              <li>Share your account credentials or bridge tokens with others</li>
              <li>Use the service for any illegal purpose</li>
            </ul>
          </Section>

          <Section title="8. Third-Party Dependencies">
            <p>{PRODUCT} requires Ableton Live 11 or 12 (sold separately by Ableton AG), and MixMind requires Rekordbox. BeatMind and MixMind are not affiliated with Ableton AG or Pioneer DJ/AlphaTheta (rekordbox). {PRODUCT} also uses AbletonOSC and AI providers: Anthropic Claude models via Amazon Bedrock, and OpenAI for optional audio listening. Service availability depends on these third parties.</p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>{PRODUCT} is provided &quot;as is&quot; without warranty of any kind. We do not guarantee uninterrupted service, error-free AI output, or compatibility with all Ableton configurations. AI-generated commands may produce unexpected results — always save your project before using {PRODUCT}.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>To the maximum extent permitted by law, {COMPANY} is not liable for any indirect, incidental, or consequential damages arising from use of {PRODUCT}, including but not limited to loss of data, corrupted Ableton projects, or interrupted workflows. Our total liability is limited to the amount you paid in the 12 months preceding the claim.</p>
          </Section>

          <Section title="11. Termination">
            <p>We may suspend or terminate your account if you violate these terms. You may delete your account at any time by contacting <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{SUPPORT_EMAIL}</a>.</p>
          </Section>

          <Section title="12. Governing Law">
            <p>These terms are governed by the laws of the State of {GOVERNING_LAW_STATE}, USA, and applicable US federal law. Any disputes will be resolved in the state or federal courts located in {GOVERNING_LAW_STATE}.</p>
          </Section>

          <Section title="13. Contact">
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
