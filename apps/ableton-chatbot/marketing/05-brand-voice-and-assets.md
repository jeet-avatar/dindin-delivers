# 05 — Brand Voice, Claims and Assets

One brand: **BeatMind**. Two products under it:

- **BeatMind** — AI music-production assistant inside Ableton Live 11/12. (Lead product.)
- **MixMind by BeatMind** — desktop DJ library manager for Rekordbox 6/7. (Early access, included with BeatMind Studio. Standalone coming soon.)

Company: Zietra Technologies Inc. · Site: https://www.beatmind.io · Contact: support@beatmind.io

Sources for every claim in this file: `frontend/src/lib/pricing.ts` (all prices), `frontend/src/app/landing-page.tsx`, `frontend/src/app/mixmind/page.tsx`, `REFERENCE_WORKFLOW_GUIDE.md`, `backend/claude_tools.py` (tool list), `backend/reference_limits.py`, `backend/main.py:219` (no-card trial). If a feature is not in those files, we don't claim it.

---

## 1. Positioning statement

**BeatMind** — For producers who use Ableton Live and lose momentum between idea and first loop, BeatMind is an AI production assistant that works inside your own Live Set. You describe a sound in plain English and it builds drums, bass and melodies part by part as Session-view clips, using sounds you already have installed. You review a recorded audition of each part before moving on. Other AI music tools hand you a finished audio file you can't open up. BeatMind leaves you with real tracks, clips, notes and device settings you can edit, because the song stays yours to finish.

**MixMind** — For DJs whose Rekordbox library has outgrown them, MixMind is a desktop app that reads your Rekordbox 6/7 collection. It gives you a fast searchable browser, a duplicate finder and an AI playlist builder that only picks tracks you already own. It works without changing your Rekordbox library.

## 2. One-liners (10 words or fewer)

1. The AI that builds music inside Ableton. *(site H1, 7 words)*
2. Describe a sound. Get clips in your Live Set. *(9)*
3. Your Ableton session, with a co-producer that listens. *(8)*
4. From blank Live Set to first loop, faster. *(8)*
5. Plain English in. Editable Ableton clips out. *(7)*
6. Part by part, inside your DAW, always yours. *(8)*
7. AI help that leaves you in the producer's chair. *(9)*
8. Not a song generator. A studio assistant. *(7)*
9. Your DJ library, finally organized. *(MixMind, site H1, 5)*
10. Find the duplicates. Build the set. Own every track. *(MixMind, 9)*

## 3. Taglines (by use)

- **Primary (BeatMind):** The AI that builds music inside Ableton.
- **Primary (MixMind):** Your DJ library, finally organized.
- **Umbrella:** Two tools for people who make and play music.
- **Social bio line:** AI co-producer inside Ableton Live + Rekordbox library tools.
- **Anti-hype line (for skeptical forums):** It builds editable parts in your set. You finish the track.
- **Product Hunt (60 chars max):** see `02-launch-playbook.md` §Product Hunt.

## 4. Elevator pitch

**30 words:**
> BeatMind is an AI assistant that works inside Ableton Live. Describe a sound in plain English and it builds editable drums, bass, melodies in your Live Set, part by part.

**75 words:**
> BeatMind is an AI music-production assistant that works inside Ableton Live 11 and 12. A small Bridge app connects your Live Set, and you describe what you want: "dark melodic techno kick at 126, Am". BeatMind builds it as Session-view clips, loads your installed sounds, adjusts supported device controls and records an audition (macOS) before the next part. You can also upload a reference track for estimated stems and section timing. 3 tracks free, no card.

(Word counts: 30 and 75, checked with a script.)

## 5. Voice

**We sound like:** a producer friend who's good with tools. We're specific and a bit dry, and we'd rather show a screen recording than make a claim.

| Do | Don't |
|----|-------|
| Name the real thing: "Session-view clips", "Drift preset", "126 BPM in Am" | Say "revolutionary", "game-changer", "unleash", "10x", "magic" |
| Show the workflow on screen. Let the clip in Live be the proof | Promise a finished, release-ready or mastered song |
| Admit limits up front ("Session view, not Arrangement yet") | Imply BeatMind makes the music *for* you or replaces skill |
| Credit the stack: Ableton Live, AbletonOSC, Rekordbox | Imply endorsement by Ableton, Pioneer DJ / AlphaTheta, or Anthropic |
| Use "you / your set / your library" | Use "users", "leverage", "solution" |
| Disclose "I'm the founder" in every community post | Astroturf, sock-puppet, or pretend to be a random fan |
| Short sentences. Lowercase is fine on TikTok/IG captions | Stack lots of emojis (one per caption is plenty) |
| Treat AI as a tool in the chain, like a sampler or a preset | Pick fights over AI ethics. Acknowledge concerns and move on |

## 6. Claims — can vs. can't (honesty list)

### BeatMind — we CAN say
- Works with **Ableton Live 11 or 12 (Standard or Suite)** via BeatMind Bridge + AbletonOSC. *(page.tsx:60)*
- You describe what you want (genre, mood, tempo, instruments) in plain English. *(page.tsx:39)*
- Builds parts **one at a time** (kick, bass, melody…) as clips in **your** Live Set, in Session view. *(page.tsx:11, 172)*
- Creates MIDI/audio tracks, clips and notes; sets tempo; creates, duplicates and fires scenes; adjusts volume, pan, sends and mute. *(claude_tools.py tool list)*
- Loads **available/installed** instruments, effects and samples. *(page.tsx:16; tools `load_instrument`, `load_effect`, `load_sample`)*
- Adjusts **supported** device parameters. Availability depends on the device. *(page.tsx:16)*
- Records a **captured audition** of each part for you to review. This needs macOS and audio permission. *(page.tsx:34, 72)*
- Iterate with requests like "warmer bass", "different kick pattern". *(page.tsx:26)*
- **Reference track workflow:** upload a track (5 s–10 min, up to 250 MB) *(reference_limits.py)*. BeatMind separates it into **estimated** stems (up to eight: vocals, bass, other, drums, plus kick / snare / toms / cymbals),  which you can audition and download as WAV. You also get an estimated BPM/key, a section timing map you confirm, optional AI listening notes (opt-in; audio is sent to OpenAI), a planning template, and level-matched A/B comparison of your audition against the reference. *(REFERENCE_WORKFLOW_GUIDE.md)*
- **You own what you make**; we claim no rights. Samples and presets stay under their own licences. *(faqs.ts)*
- **Plans from $19/month** (Starter $19, Pro $39, Studio $79; annual = 2 months free), cancel anytime. **Free 7-day trial, no credit card, 3 tracks included** (about 50 AI messages). See §10 for the full one-pager. *(pricing.ts, main.py:219)*
- A "track" = one stem separation of a reference track; HQ separation runs on your own Mac via the Bridge. Cloud HQ separations (Pro/Studio, or packs) are for machines that can't run it locally. *(pricing.ts)*
- Bridge for Mac only: Apple Silicon (M1 or later), macOS 15+. No Windows Bridge yet. *(dashboard/page.tsx Downloads)*

### BeatMind — we CAN'T say
- ~~"Generates a full song" / "finished track" / "exports a master"~~. Session scenes aren't an Arrangement timeline or an exported song. *(page.tsx:172)*
- ~~"Creates any sound"~~. It uses sounds and devices you have installed.
- ~~"Controls every plugin / every parameter"~~. Only supported controls.
- ~~"Mac + Windows" / "works on Windows"~~. The Bridge is Mac-only (Apple Silicon, macOS 15+) today; don't promise a Windows date.
- ~~"Studio-quality / original stems"~~. They're estimates and may have bleed, including the kick/snare/toms/cymbals split.
- ~~"Exact BPM/key detection"~~. They're estimates you confirm.
- ~~"Copies the reference track's sound"~~. The workflow guides *original* parts with a similar energy curve.
- ~~"Works with Live Lite / Intro"~~. Not claimed on the site, so don't claim it.
- ~~Any number of users, tracks made, hours saved, testimonials, ratings~~. We have no verified numbers yet.
- ~~"Endorsed by / partnered with Ableton or Anthropic"~~.
- ~~"Unlimited"~~ anything. Tracks and cloud HQ are monthly allowances; the AI producer is "fair use", not unlimited.
- ~~"Unlimited free trial"~~ / ~~"try everything free"~~. The trial is 7 days, 3 tracks and about 50 AI messages; no cloud HQ, no packs.
- ~~"Cancel before your trial ends"~~ / ~~"billed after the trial"~~. We never take a card for the trial; people only pay if they choose a plan.
- ~~CREATOR60 in any public post~~ and ~~"no card" / "no strings" about CREATOR60~~. It's a private creator code: checkout needs a card, and Pro renews at $39/mo after the 2 free months unless cancelled.
- ~~"Only N Founding seats left"~~ unless you checked the real FOUNDING100 redemption count that day.

### MixMind — we CAN say
- Desktop app for **Mac with Apple silicon (M1 or later)**. Windows is coming soon (no date). *(mixmind/page.tsx)*
- Reads your **Rekordbox 6 or 7** library (database or XML). Close Rekordbox while MixMind reads or writes your library. *(mixmind/page.tsx:65)*
- Library browser: BPM, key, genre and duration in one searchable table. *(:16)*
- Duplicate finder for exact and near-duplicate tracks. Cleanup **hides them inside MixMind**. Browsing, searching and finding duplicates never change your Rekordbox library; MixMind only writes to Rekordbox when you click Add to Rekordbox in the Set Builder, after backing up your library (close Rekordbox first). *(faqs.ts)*
- Set Builder: techno and minimal sets today; more genres coming.
- AI playlist builder: type "20 deep house tracks under 124 BPM in Am" and it builds from tracks you own. *(:26)*
- Pioneer USB: detects your DJ USB and lets you browse the PIONEER folder. *(:31)*
- **Early access, included with BeatMind Studio** ($79/mo or $790/yr). Standalone MixMind ($12/mo) and combos are **coming soon**.

### MixMind — CAREFUL
- ~~"MixMind is $12/month"~~ / ~~"Buy MixMind"~~ / ~~"MixMind free trial"~~ as if it's purchasable on its own. Standalone licensing isn't built yet. Say "early access in Studio, standalone coming soon".
- **"Export to Pioneer USB / CDJ-ready":** The MixMind codebase has a USB export path (`/Users/jeet/mixmind` → `POST /api/usb/export`). But the public MixMind page only claims "detects… browse the PIONEER folder", and the CDJ-3000 hardware acceptance report (`/Users/jeet/mixmind/.planning/CDJ_TEST_REPORT.md`) still has unfilled PASS/FAIL rows. **Before posting any USB-export content:** confirm the export is in the build users download, and record a real export that loads on a real player. Until then, say "export your library to a USB" and don't say "CDJ-verified".
- ~~"Deletes duplicates for you"~~. It hides them in MixMind.
- ~~"Works with Serato / Traktor / Engine"~~. Not claimed.

### Legal hygiene (put in YouTube descriptions, PH, and the press boilerplate)
> Ableton and Live are trademarks of Ableton AG. Rekordbox is a trademark of AlphaTheta Corporation. BeatMind is not affiliated with or endorsed by either. AbletonOSC is an open-source project by Daniel Jones.

---

## 7. Visual system (keep it consistent)

- **Mark:** the rounded-square **"B"** in accent color, as used on the site (page.tsx:94). MixMind uses the same tile with **"M"** (mixmind/page.tsx:123).
- **Wordmark:** lowercase `beatmind` (site nav/footer).
- **Colors (from `frontend/src/app/globals.css:5-11`):** background `#0a0a0a`, surface `#141414`, text `#e5e5e5`, accent orange `#ff6b00`, accent-dim `#cc5500`.
- **Fonts (globals.css:1):** Poppins (400/600/700) for all text. Righteous only for the rare display word. Nothing else.
- **Type on video:** Poppins SemiBold, white `#e5e5e5` on a `#0a0a0a` pill at 80% opacity. Key word in `#ff6b00`. Max 2 lines, about 6 words per line.
- **Existing OG images:** `frontend/public/og.png` (1200×630, verified), `og-mixmind.png`, `og-blog.png`. Reuse them as link-share cards.
- **Screen-capture framing:** Ableton on the left, BeatMind chat on the right. Crop to 9:16 with the clip grid visible.

## 8. Asset checklist (exact dimensions)

| Asset | Size (px) | Ratio | Notes |
|-------|-----------|-------|-------|
| IG feed post / carousel slide | **1080 × 1350** (4:5, as specified) or **1080 × 1440** (3:4, recommended) | 4:5 / 3:4 | Since Jan 2025 the profile grid shows 3:4 tiles. A 4:5 post loses about 34 px on each side in the grid, so 3:4 fills both the feed and the grid |
| IG / FB Story, Reel, TikTok, YT Shorts | **1080 × 1920** | 9:16 | Safe zone: keep text out of the top 220 px and bottom 420 px (UI overlays) |
| Reel cover | 1080 × 1920 | 9:16 | Put the key text in the center 1080×1440 so the 3:4 grid crop still reads |
| IG Highlight cover | 1080 × 1920 | 9:16 | Shown as a small circle. Keep the icon inside the center ~720 × 720 |
| Profile image (all platforms) | **1080 × 1080** master → export 800×800 (YouTube), 400×400 (X), 320×320 (Facebook Page, the official best size), 720×720 (IG/Threads; stored at 320), 400×400 (TikTok; 200 minimum) | 1:1 | "B" tile centered, ≥15% padding (circle crop) |
| YouTube banner | **2560 × 1440** (min 2048×1152, ≤6 MB) | 16:9 | Safe area for text/logo: 1546 × 423 centered at 2560 wide (= YouTube's official 1235 × 338 at 2048×1152) |
| YouTube thumbnail | **1280 × 720** (YouTube now also accepts up to 3840×2160) | 16:9 | JPG/PNG, keep under 2 MB (the mobile upload limit), big 3–4 word text |
| X header | **1500 × 500** | 3:1 | Keep the bottom-left clear (avatar overlaps). No animated GIF |
| Facebook Page cover | **851 × 315** (official). sRGB JPG <100 KB, or PNG if there's text/logo | ~2.7:1 | Mobile crops to about 2.4:1, so keep text in the center ~640 px wide |
| LinkedIn / generic link card, OG | **1200 × 630** | 1.91:1 | Already exists: `frontend/public/og.png` (1200×630) |
| Product Hunt gallery | **1270 × 760** | ~5:3 | 4–6 images. First image = hero |
| Product Hunt thumbnail | 240 × 240 (<3 MB) | 1:1 | GIF allowed; "B" tile. Gallery needs ≥2 images |
| Reddit avatar / banner | 256 × 256 / 1920 × 384 | 1:1 / 5:1 | Banner: key content in the center third |
| Discord server icon / banner | 512 × 512 / 960 × 540 | 1:1 / 16:9 | Banner needs a server boost level |

**Record once, crop many:** capture the screen at 2560×1440 or higher (Retina) so you can make 9:16, 4:5 and 16:9 crops without upscaling.

### Must-have files by Day 1 morning
- [ ] `logo-B-1080.png` (profile image, all platforms)
- [ ] `logo-M-1080.png` (MixMind, for carousel slides and highlights)
- [ ] `yt-banner-2560x1440.png`
- [ ] `x-header-1500x500.png`
- [ ] `fb-cover-851x315.png`
- [ ] 9 grid images (see `03-content-calendar.md` §Grid)
- [ ] 3 highlight covers: "How it works", "MixMind", "FAQ"
- [ ] 1 hero screen recording (Script 01 in `04-video-scripts.md`)

---

## 9. Press / boilerplate paragraph

> **About BeatMind**
> BeatMind is an AI music-production assistant that works inside Ableton Live 11 and 12. Producers describe a sound in plain English, and BeatMind builds drums, bass and melodies part by part as editable Session-view clips in their own Live Set. It uses installed sounds, adjusts supported device controls and records an audition (macOS) of each part for review. A reference-track workflow provides estimated stems, section timing and optional AI listening notes to guide original parts. The BeatMind brand also includes MixMind, a desktop DJ library manager for Rekordbox 6/7 with a library browser, duplicate finder and AI playlist builder. BeatMind plans start at $19/month, with a 7-day free trial that includes 3 tracks and needs no credit card; MixMind is in early access with the BeatMind Studio plan. BeatMind is made by Zietra Technologies Inc.
> Web: https://www.beatmind.io · Press and support: **support@beatmind.io**
> *Ableton and Live are trademarks of Ableton AG; Rekordbox is a trademark of AlphaTheta Corporation. BeatMind is not affiliated with either.*

**Short (for directories, 150 chars):**
> BeatMind: AI assistant inside Ableton Live. Describe a sound, get editable clips in your Live Set. Plans from $19/mo. 3 tracks free.
(132 chars)

---

## 10. Pricing one-pager

Source of truth: `frontend/src/lib/pricing.ts` (matches live Stripe). If this table and that file ever disagree, the file wins; fix this table.

**Free trial:** 7 days, **no credit card**, includes **3 tracks**, separated on your own Mac, and limited AI (**about 50 messages**). Cloud HQ separations and packs need a paid plan. Nobody is charged unless they choose a plan; starting a plan during the trial ends the trial and begins the plan immediately.

**Paid plans:** cancel anytime. Switch plans anytime from billing settings. Annual = **2 months free**.

| Plan | Monthly | Annual | Tracks / month | Cloud HQ / month | Also includes |
|------|---------|--------|----------------|------------------|---------------|
| **Starter** | $19 | $190 | 10 | — | AI producer (fair use) |
| **Pro** *(Most popular)* | $39 | $390 | 30 | 5 | AI producer (fair use) |
| **Studio** | $79 | $790 | 80 | 20 | AI producer (fair use), **MixMind (early access)**, priority support |

**What a "track" is:** one stem separation of a reference track. High-quality separation runs on your own computer via the Bridge. **Cloud HQ separation** runs on our cloud GPU, for computers that can't run HQ separation locally.

**Allowances reset monthly** (no rollover). **Packs never expire**, are used after the monthly allowance, and need a paid plan:

| Pack | Price |
|------|-------|
| 10 extra tracks | $9 |
| 25 extra tracks | $19 |
| 60 extra tracks | $39 |
| 10 cloud HQ separations | $7.99 |
| 50 cloud HQ separations | $34.99 |

**Founding Member offer:** the first **100 annual subscribers** get **40% off for as long as their subscription stays active** with code **`FOUNDING100`**. Annual plans only.

**MixMind:** early access, included in Studio today. **Coming soon** (not purchasable yet): standalone MixMind $12/mo ($120/yr), Starter + MixMind $25/mo, Pro + MixMind $45/mo (each combo saves $6/mo).

**Say it short:**
- "Plans from $19/mo. Free 7-day trial with 3 tracks, no card."
- "No card for the trial. You only pay if you choose a plan."
- "MixMind is in early access with BeatMind Studio; standalone is coming soon."
- "Founding Member: first 100 annual subscribers get 40% off for as long as their subscription stays active with code FOUNDING100."
