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
    a: "Starter is $39.99/month ($399.99/year): 10 songs and 10 stem separations a month. Pro is $69.99/month ($699.99/year): 25 songs and 30 stem separations, 5 of them on Cloud HQ. Studio is $99.99/month ($999.99/year): 50 songs, 80 stem separations (20 on Cloud HQ), all AI models and MixMind. DJs can get MixMind alone for $19.99/month, or bundled with BeatMind: MixMind Pro (BeatMind Starter + MixMind) is $29.99/month and MixMind Studio (BeatMind Pro + MixMind) is $49.99/month. Every BeatMind plan starts with a 7-day free trial: 3 songs and 3 stem separations, no credit card.",
  },
  {
    q: "What's included in the free trial?",
    a: "The 7-day free trial needs no credit card. It includes 3 songs, 3 stem separations on your own Mac, and limited AI (about 50 messages). It covers BeatMind only; MixMind isn't part of the trial. Cloud HQ separations and packs need a paid plan. If you start a plan during the trial, the trial ends and your plan begins straight away.",
  },
  {
    q: "Will I be charged after the trial?",
    a: "No. We never take a card for the trial; you only pay if you choose a plan.",
  },
  {
    q: "What counts as a stem separation?",
    a: "A stem separation splits one reference track into stems (drums, bass, vocals and the rest). Each separation, on your Mac or on Cloud HQ, uses one from your monthly allowance: Starter 10, Pro 30, Studio 80. Songs are counted separately: each new song you make with the AI producer uses one of your monthly songs (10, 25 or 50).",
  },
  {
    q: "What are Cloud HQ separations?",
    a: "Cloud HQ runs high-quality stem separation on our cloud GPU instead of your computer, for Macs that can't run it locally or when you want it faster. It needs a paid plan (it isn't part of the free trial). Pro includes 5 a month and Studio 20; each one also counts toward your monthly stem separations. Cloud HQ packs are 10 for $7.99 or 50 for $34.99.",
  },
  {
    q: "Do unused separations roll over?",
    a: "No. Your monthly allowance resets each month. Purchased packs never expire: stem separation packs are 10 for $9, 25 for $19 or 60 for $39, and they're used after your monthly allowance. AI round packs (10 for $1.99, 25 for $3.99) add extra AI rounds to one song. Packs need a paid plan.",
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
    a: "No. MixMind reads your Rekordbox 6 or 7 library (database or XML) if you have one, or you can import any folder of music and MixMind analyses BPM, key and waveforms itself. If you use Rekordbox, close it while MixMind writes to your library.",
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
    a: "MixMind is $19.99/month or $199.99/year (2 months free). You can also bundle it with BeatMind for Ableton: MixMind Pro (BeatMind Starter + MixMind) is $29.99/month ($299.99/year) and MixMind Studio (BeatMind Pro + MixMind) is $49.99/month ($499.99/year). MixMind is also included in BeatMind Studio ($99.99/month). Cancel anytime.",
  },
  {
    q: "Is MixMind included in the free trial?",
    a: "No. The 7-day free trial (3 songs, no card) is for BeatMind. To use MixMind you need a MixMind, MixMind Pro, MixMind Studio or BeatMind Studio plan.",
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
