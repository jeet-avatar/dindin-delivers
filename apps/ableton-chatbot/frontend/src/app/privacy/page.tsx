"use client";

import { LEGAL_LAST_UPDATED, LEGAL_NAME, LEGAL_POSTAL_ADDRESS, SUPPORT_EMAIL } from "@/lib/site";

const PRODUCT = "BeatMind";
const DOMAIN = "beatmind.io";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text-primary)" }}>{title}</h2>
      {children}
    </section>
  );
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li><strong style={{ color: "var(--text-primary)" }}>{label}:</strong> {children}</li>
  );
}

function SupportLink() {
  return (
    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline" style={{ color: "var(--accent)" }}>{SUPPORT_EMAIL}</a>
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
        <p className="text-sm mb-12" style={{ color: "var(--text-secondary)" }}>Last updated: {LEGAL_LAST_UPDATED}</p>

        <div className="prose prose-invert space-y-8 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          <Section title="1. Who we are">
            <p>{PRODUCT} ({DOMAIN}) and MixMind are made by {LEGAL_NAME} (&quot;we&quot;, &quot;us&quot;). Our postal address is {LEGAL_POSTAL_ADDRESS}. For anything about your data, email <SupportLink />.</p>
          </Section>

          <Section title="2. What we collect">
            <ul className="list-disc pl-4 space-y-2">
              <Item label="Account">your name, email address and a hashed version of your password (we never store the password itself).</Item>
              <Item label="Billing">payments are handled by Stripe. We don&apos;t see or store your card number. We keep your Stripe customer ID, your plan, and your purchase and subscription history.</Item>
              <Item label="Usage">what you type to BeatMind and your chat history; logs of AI usage (which feature was used and how many tokens); your track and separation usage; and records of the sign-in tokens for the BeatMind Bridge and MixMind apps, including when each was last used.</Item>
              <Item label="IP addresses">we use your IP address for security and rate limiting.</Item>
              <Item label="Audio">reference tracks you upload are stored on our servers at Amazon Web Services (cloud separations pass through Amazon S3) until you delete them or close your account. Captured auditions (recordings of Ableton&apos;s output that the Bridge makes so you can review a part) are also stored on our servers. When the Bridge separates a track on your Mac, the audio stays on your Mac and only a report (such as the stem list and timing) is sent to us.</Item>
            </ul>
          </Section>

          <Section title="3. How AI processing works">
            <ul className="list-disc pl-4 space-y-2">
              <Item label="BeatMind chat">your messages and the relevant state of your Live Set are sent to Anthropic Claude models through Amazon Bedrock to plan and carry out Ableton actions.</Item>
              <Item label="Listen to reference (optional)">only when you choose it, short audio excerpts of your reference (or its stems) and your listening brief are sent to OpenAI for analysis. We send them with OpenAI&apos;s storage option turned off.</Item>
              <Item label="MixMind AI features">your prompts and the relevant library metadata (such as track titles, BPM, key and genre) are sent through our server to Anthropic models on Amazon Bedrock.</Item>
            </ul>
            <p className="mt-3">Under their API terms, these providers do not use this data to train their models.</p>
            <p className="mt-3">MixMind itself runs on your computer and reads your Rekordbox library there. Our servers only check your sign-in and relay MixMind&apos;s AI requests.</p>
          </Section>

          <Section title="4. How we use your information">
            <ul className="list-disc pl-4 space-y-2">
              <li>To run {PRODUCT} and MixMind, including your plan, allowances and packs</li>
              <li>To take payments and manage subscriptions through Stripe</li>
              <li>To keep the service secure and prevent abuse</li>
              <li>To send email: password resets, support replies and product update emails</li>
              <li>To fix bugs and improve the service</li>
              <li>To meet legal obligations</li>
            </ul>
          </Section>

          <Section title="5. Email">
            <p>We send email from {SUPPORT_EMAIL} through Google Workspace (Gmail). Product update emails include a one-click unsubscribe link.</p>
          </Section>

          <Section title="6. Who we share data with">
            <p className="mb-3">We share data only with the providers we need to run the service:</p>
            <ul className="list-disc pl-4 space-y-2">
              <Item label="Amazon Web Services">hosting, storage and Amazon Bedrock (Anthropic Claude models).</Item>
              <Item label="OpenAI">only for the optional listen-to-reference step, when you choose it.</Item>
              <Item label="Stripe">payments and billing.</Item>
              <Item label="Google">email (Google Workspace) and the web fonts on our site.</Item>
            </ul>
            <p className="mt-3">We don&apos;t sell or share your personal information, as those terms are defined in the California Consumer Privacy Act (CCPA).</p>
          </Section>

          <Section title="7. Browser storage and cookies">
            <p>We keep your sign-in token and some app state (such as your saved chats) in your browser&apos;s local storage. We don&apos;t use advertising or analytics cookies. Our pages load fonts from Google Fonts, so Google sees your IP address when those fonts load.</p>
          </Section>

          <Section title="8. How long we keep data">
            <p>We keep your data until you delete it or close your account. Billing and tax records are kept for as long as the law requires.</p>
          </Section>

          <Section title="9. Deleting your data and your rights">
            <p>You can delete uploaded references in the app. To delete your account, or to access, correct or export your data, email <SupportLink /> from the address on your account. Depending on where you live, you may have other rights over your data; contact us and we&apos;ll help.</p>
          </Section>

          <Section title="10. Security">
            <p>We use TLS for connections, bcrypt for password hashing, and rate limiting. No system is perfectly secure, but we work to protect your data.</p>
          </Section>

          <Section title="11. International users">
            <p>Our servers are in the United States, and your data is processed there.</p>
          </Section>

          <Section title="12. Children">
            <p>{PRODUCT} and MixMind are not for children under 13, and we don&apos;t knowingly collect their data.</p>
          </Section>

          <Section title="13. Changes to this policy">
            <p>When we change this policy we&apos;ll update the date above. For material changes, we&apos;ll also tell you by email or in the app.</p>
          </Section>

          <Section title="14. Contact">
            <p>Questions? Email <SupportLink />.</p>
          </Section>
        </div>
      </div>

      <footer className="border-t px-6 py-6" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto text-center text-xs" style={{ color: "var(--text-secondary)" }}>
          &copy; 2026 {LEGAL_NAME}
        </div>
      </footer>
    </div>
  );
}
