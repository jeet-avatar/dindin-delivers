// Single source of truth for the FAQ sections and their FAQPage JSON-LD.

export interface Faq {
  q: string;
  a: string;
}

export const BEATMIND_FAQS: Faq[] = [
  {
    q: "Do I need Ableton Live?",
    a: "Yes — BeatMind directly controls Ableton Live 11 or 12 (Standard or Suite).",
  },
  {
    q: "What do I need to run BeatMind?",
    a: "Ableton Live 11 or 12 (Standard or Suite), AbletonOSC, and the BeatMind Bridge on a Mac with Apple Silicon (M1 or later) and macOS 15 or later. BeatMind itself runs in your browser. Placing separated stems into your Live Set also needs Live 12 and the BeatMind extension that comes with the Bridge.",
  },
  {
    q: "What genres does it support?",
    a: "Any electronic style — house, techno, minimal, drum & bass, ambient and more. Genre guides the plan; there are no fixed templates.",
  },
  {
    q: "Who owns the music I create?",
    a: "You do. We claim no rights to what you make. Samples and presets you load stay under their own licences.",
  },
  {
    q: "Does it work on Mac and Windows?",
    a: "BeatMind runs in your browser, and the BeatMind Bridge that connects it to Ableton Live currently runs on Macs with Apple Silicon (M1 or later) and macOS 15 or later. Windows support isn't available yet — join the list at support@beatmind.io and we'll email you when it is.",
  },
  {
    q: "What happens to the audio I upload?",
    a: "Reference tracks you upload are stored on our AWS servers (cloud separations pass through Amazon S3) until you delete them or close your account. Captured auditions (recordings of Ableton's output) are also stored on our servers. When the Bridge separates a track on your Mac, the audio stays on your Mac and only a report is sent to us.",
  },
  {
    q: "Which AI does BeatMind use?",
    a: "BeatMind chat uses Anthropic Claude models through Amazon Bedrock. The optional \"listen to reference\" step sends a short audio excerpt and your brief to OpenAI, only when you choose it. Under their API terms, these providers do not use this data to train their models.",
  },
  {
    q: "How much does BeatMind cost?",
    a: "Plans start at $19/month. Starter is $19/month ($190/year) with 10 tracks a month; Pro is $39/month ($390/year) with 30 tracks and 5 cloud HQ separations a month; Studio is $79/month ($790/year) with 80 tracks, 20 cloud HQ separations, MixMind and priority support. DJs can also get MixMind for $12/month, or bundle it: Starter + MixMind is $25/month and Pro + MixMind is $45/month. You can start with a 7-day free trial that includes 3 tracks and needs no credit card.",
  },
  {
    q: "What's included in the free trial?",
    a: "The 7-day free trial needs no credit card and includes 3 tracks, separated on your own Mac, and limited AI (about 50 messages). It covers BeatMind only: MixMind isn't part of the trial. Cloud HQ separations and packs need a paid plan. If you start a plan during the trial, the trial ends and your plan begins immediately.",
  },
  {
    q: "Will I be charged after the trial?",
    a: "No. We never take a card for the trial; you only pay if you choose a plan.",
  },
  {
    q: "What counts as a track?",
    a: "A track is one stem separation of a reference track. High-quality separation runs on your own computer through the BeatMind Bridge, so each reference you split uses one track from your monthly allowance. The AI producer itself is included on every plan under fair use.",
  },
  {
    q: "What are cloud HQ separations?",
    a: "Cloud HQ separations run high-quality stem separation on our cloud GPU instead of your computer. They are for machines that can't run HQ separation locally and need a paid plan (they aren't part of the free trial). Pro includes 5 a month, Studio includes 20, and Cloud HQ packs are 10 for $7.99 or 50 for $34.99.",
  },
  {
    q: "Do unused tracks roll over?",
    a: "No. Your monthly allowance resets each month. Purchased packs never expire: track packs are 10 for $9, 25 for $19 or 60 for $39, and they are used after your monthly allowance. Packs need a paid plan.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes. You can move between Starter, Pro and Studio anytime from Dashboard → Account → Billing.",
  },
  {
    q: "Is there an annual discount?",
    a: "Yes. Annual billing gives you 2 months free: $190/year for Starter, $390/year for Pro and $790/year for Studio. The first 100 annual subscribers who use code FOUNDING100 also get 40% off for as long as their subscription stays active. Annual plans only.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Go to Dashboard → Account → Billing → Cancel subscription, or use Manage billing (Stripe) or email support@beatmind.io. Your access continues until the end of the period you've paid for, and you won't be charged again.",
  },
  {
    q: "Can I get a refund?",
    a: "We don't give refunds for partial billing periods, except where the law requires it. If you think you were charged in error, email support@beatmind.io within 30 days of the charge and we'll look into it.",
  },
  {
    q: "How do I delete my account?",
    a: "Email support@beatmind.io from the address on your account and we'll delete your account and the data tied to it. Billing and tax records we must keep by law are kept.",
  },
];

export const MIXMIND_FAQS: Faq[] = [
  {
    q: "Do I need a separate account for MixMind?",
    a: "No. BeatMind and MixMind use one login: sign in to the MixMind app with the same email and password you use on beatmind.io. One account and one subscription cover BeatMind, the Bridge and MixMind, with a single billing page.",
  },
  {
    q: "Do I need Rekordbox?",
    a: "Yes — MixMind reads your Rekordbox library (database or XML). It works with Rekordbox 6 and 7. Close Rekordbox while MixMind reads or writes your library.",
  },
  {
    q: "Does it modify my Rekordbox library?",
    a: "Only when you ask it to. Browsing, searching and finding duplicates never change your Rekordbox library (duplicate cleanup just hides tracks inside MixMind). MixMind only writes to Rekordbox when you click Add to Rekordbox in the Set Builder, which adds the set to Rekordbox as a playlist after backing up your library. Rekordbox must be closed.",
  },
  {
    q: "What kinds of sets can the Set Builder make?",
    a: "Set Builder: techno and minimal sets today; more genres coming. The AI playlist chat works across your whole library.",
  },
  {
    q: "Mac or Windows?",
    a: "MixMind for Mac runs on Apple silicon (M1 or later). A Windows version of MixMind is coming soon.",
  },
  {
    q: "Is this the same as BeatMind?",
    a: "No — they're separate tools. BeatMind makes music inside Ableton Live. MixMind organizes your existing DJ library and builds sets from it. Both are made by the same team and use the same BeatMind account.",
  },
  {
    q: "How much does MixMind cost?",
    a: "MixMind is $12/month or $120/year (2 months free). You can also bundle it with BeatMind: Starter + MixMind is $25/month ($250/year) and Pro + MixMind is $45/month ($450/year), each saving $6/month compared with buying them separately. MixMind is also included in BeatMind Studio ($79/month or $790/year). Cancel anytime.",
  },
  {
    q: "Is MixMind included in the free trial?",
    a: "No. The 7-day free trial (3 tracks, no card) is for BeatMind. To use MixMind you need a MixMind, BeatMind + MixMind (Starter or Pro) or Studio plan.",
  },
  {
    q: "Can I get BeatMind and MixMind together?",
    a: "Yes. Starter + MixMind is $25/month ($250/year) and Pro + MixMind is $45/month ($450/year), each $6/month less than buying the two separately. BeatMind Studio ($79/month or $790/year) also includes MixMind, along with 80 tracks, 20 cloud HQ separations a month and priority support.",
  },
  {
    q: "What does the Set Builder do?",
    a: "The Intelligent Set Builder sequences a set from your own library. Choose a warm-up, peak-time or closing shape, set a BPM range and skip tracks you played recently; MixMind orders the tracks for smooth key flow and can add the finished set to Rekordbox as a playlist. Rekordbox must be closed while MixMind writes the playlist, and it backs up your library first.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Go to Dashboard → Account → Billing → Cancel subscription, or use Manage billing (Stripe) or email support@beatmind.io. Your access continues until the end of the period you've paid for, and you won't be charged again.",
  },
];
