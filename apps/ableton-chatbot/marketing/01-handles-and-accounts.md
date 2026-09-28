# 01 — Handles and Accounts

**Signup email for EVERY account: `support@beatmind.io`.** Use a password manager entry per platform.
Display name everywhere: **BeatMind** (with an optional descriptor where there's room).

---

## 1. Handle recommendation

### ✅ Use everywhere: **`beatmindio`**
### ↪ Fallback (if `beatmindio` is taken on any platform at signup): **`getbeatmind`**

**Why `beatmindio`:**
- **It's the same string on every platform.** X usernames can't contain periods (letters, digits and `_` only, 4–15 characters). So `beatmind.io`, `beatmind.ai` and `beatmind.studio` could never match on X. `beatmindio` works on X, IG, TikTok, YouTube, Threads, Reddit and Facebook.
- It maps straight to the domain (beatmind.io), so it's easy to say out loud ("beatmind-eye-oh") and easy to guess.
- `@beatmind` is **taken** on X, TikTok and YouTube (see below), so the bare name isn't an option anyway.
- `getbeatmind` is the fallback: it's clean on X/YouTube/TikTok and reads as a CTA. `trybeatmind` works too. `beatmindapp` undersells MixMind and the brand.

**Brand-confusion watch-out:** other accounts named **"BeatMind"** already exist: TikTok `@beatmind` (display name "BeatMind", ~157 videos), TikTok `@beatmind.ai` (display name "BeatMind", 3 videos, 4 followers), YouTube `@beatmind` (channel title "BeatMind"), and X `@beaTMind` (a personal account). **If `@beatmind.ai` on TikTok is yours** (or an old test account), claim it back or delete it. If it isn't, expect some mix-ups. Always pair the name with "AI for Ableton" in display names so people can tell us apart.

### Availability check results (2026-09-27, logged-out, indicative only)

| Handle | Instagram | TikTok | X | YouTube | Threads | Facebook |
|---|---|---|---|---|---|---|
| beatmind | ? ("Profile isn't available") | **TAKEN** ("BeatMind", 157 videos) | **TAKEN** (@beaTMind, personal) | **TAKEN** ("BeatMind") | ? | ? |
| beatmind.ai | ? | **TAKEN** ("BeatMind", 3 videos) | n/a (no periods on X) | looks free (404) | ? | ? |
| **beatmindio** | ? | looks free | **looks free (404)** | **looks free (404)** | ? | ? |
| beatmind.io | ? | looks free | n/a | looks free | ? | ? |
| getbeatmind | ? | looks free | looks free (404) | looks free (404) | ? | ? |
| beatmindapp | ? | looks free | looks free (404) | looks free | ? | ? |
| beatmind.studio | ? | looks free | n/a | looks free | ? | ? |
| trybeatmind | ? | looks free | looks free (404) | looks free | ? | ? |

GitHub: `beatmind` is taken; `beatmindio` and `getbeatmind` look free.

**Caveats (read these):**
- **Instagram:** every candidate returned "Profile isn't available" when logged out. That page shows for nonexistent, deactivated, restricted *and* some existing accounts, and a control check against a known account (@ableton) did load normally. So IG is **inconclusive**. The only reliable test is typing the handle in the signup form.
- **Threads** uses your Instagram username, so it's available if IG is. **Facebook** Page usernames and **Reddit** profiles block logged-out checks (login wall / bot check), so they weren't tested.
- "Looks free" means the public profile URL returned 404 / "user not found". A handle can still be reserved, recently deleted (in a cooldown period) or banned. **Confirm on the signup form.**
- Methods: `curl` of public profile URLs (TikTok page JSON `statusCode` 0 = exists / 10221 = not found; YouTube HTTP status) plus a logged-out browser check for Instagram and X.

**Grab order tomorrow (fastest to get squatted first):** Instagram → TikTok → X → YouTube → Threads (from IG) → Facebook Page → Reddit → Product Hunt → Discord (optional).

---

## 2. Link-in-bio strategy

One destination, **https://www.beatmind.io**, with UTM parameters per platform. **Don't** use a Linktree for launch: one link converts better, and the homepage already links to MixMind.

| Platform | Bio link |
|---|---|
| Instagram | `https://www.beatmind.io/?utm_source=instagram&utm_medium=social&utm_campaign=launch` |
| TikTok | `https://www.beatmind.io/?utm_source=tiktok&utm_medium=social&utm_campaign=launch` |
| YouTube | `https://www.beatmind.io/?utm_source=youtube&utm_medium=social&utm_campaign=launch` |
| X | `https://www.beatmind.io/?utm_source=x&utm_medium=social&utm_campaign=launch` |
| Threads | `https://www.beatmind.io/?utm_source=threads&utm_medium=social&utm_campaign=launch` |
| Facebook | `https://www.beatmind.io/?utm_source=facebook&utm_medium=social&utm_campaign=launch` |
| Reddit profile | `https://www.beatmind.io/?utm_source=reddit&utm_medium=social&utm_campaign=launch` |
| Discord | `https://www.beatmind.io/?utm_source=discord&utm_medium=community&utm_campaign=launch` |
| Product Hunt | `https://www.beatmind.io/?utm_source=producthunt&utm_medium=referral&utm_campaign=launch` |

**Extra links where the platform allows more than one** (Instagram and Threads allow up to 5 bio links for free):
1. Homepage (above) · 2. MixMind: `https://www.beatmind.io/mixmind?utm_source=instagram&utm_medium=social&utm_campaign=launch&utm_content=mixmind` · 3. The newest YouTube video, once it's published.

> Check once: open a UTM link and confirm the site keeps the query string through to `/signup` (or at least that analytics records the landing). If signup doesn't capture `utm_source`, you'll only have the session-level data.

---

## 3. Per-platform setup checklists

Common to all: email **support@beatmind.io** · profile image = the "B" tile (`#ff6b00` on `#0a0a0a`), from a 1080×1080 master · **turn on 2FA with an authenticator app (not SMS)** · save backup codes in the password manager.

### Instagram (do this first)
- [ ] Sign up with support@beatmind.io. Username `beatmindio`.
- [ ] **Name (30 max):** `BeatMind | AI for Ableton` (25). The Name field is searchable, so the keywords help people find you.
- [ ] Switch to a **Professional account → Business**, category **"Software"** (or "App Page" if Software doesn't appear). *Why Business, not Creator:* "Software" describes a product brand honestly, and Business accounts reliably offer that category (whether Creator accounts do is unconfirmed). Don't use "Musician/Band": it misrepresents a software company and pulls in the wrong audience. Business accounts get a limited music library, which doesn't matter because we use our own audio (see 04).
- [ ] **Bio (150 max). Paste this (147 chars; 148 if the 🎛️ variation selector counts as 2):**
  ```
  AI co-producer in Ableton Live 🎛️
  Describe a sound → editable clips in YOUR Live Set
  + MixMind for Rekordbox DJs
  7-day trial · 3 tracks · no card ↓
  ```
  *(Replaces the live bio ending "7-day free trial, no card ↓". Line 1 is shortened from "inside" to "in" to make room for "3 tracks".)*
- [ ] Links: the IG UTM homepage link + the MixMind link (see §2).
- [ ] Contact button: email support@beatmind.io.
- [ ] Profile pic: upload 720×720 (IG stores it at 320×320 and shows it as a circle).
- [ ] **Highlights** (covers 1080×1920, icon in the center ~720×720, orange-on-black line icons):
  1. **How it works**: S06 setup reel + story frames of the 3 steps
  2. **Prompts**: S12 + G8 slides
  3. **MixMind**: S09, S11, G3
  4. **FAQ**: story slides answering "Do I need Ableton?" (Live 11/12 Standard or Suite), "Mac or Windows?" (bridge on both; auditions macOS), "Who owns the music?" (you, 100%), "Does it make full songs?" (no, it builds parts; you finish)
  5. **Limits**: G6 "what it can't do"
- [ ] **Pinned posts:** G9 hero reel, G2 "Meet BeatMind", G6 "What it can't do" (see 03).
- [ ] Threads: log in with the same IG account and claim `@beatmindio`.

### TikTok
- [ ] Sign up with support@beatmind.io. Username `beatmindio`.
- [ ] Switch to a **Business account** (Settings → Account → Switch to Business account), category **Software/Apps** (or the closest tech/software option). *Trade-off:* business accounts get a **clickable website link straight away**, while personal accounts reportedly need 1,000 followers first. But business accounts **only get the Commercial Music Library**. That's fine because we use original audio from BeatMind sessions.
- [ ] **Name (30 max):** `BeatMind` (8). Or `BeatMind · AI for Ableton` (25) to tell us apart from the other @beatmind accounts. Use this one.
- [ ] **Bio (80 max; TikTok doesn't publish its limit, so we stay under 80). Paste (76):**
  ```
  AI co-producer in Ableton Live 🎛️ + MixMind for DJs. 7-day trial, 3 tracks ↓
  ```
- [ ] Website: the TikTok UTM link. Email: support@beatmind.io.
- [ ] Profile pic: 400×400 or larger (200×200 minimum).
- [ ] **Pinned videos (max 3):** S01 hero, S06 setup, S09 MixMind dupes.

### YouTube
- [ ] Create a **Brand Account** channel (so it isn't tied to a personal name) under the Google account for support@beatmind.io. Channel name **BeatMind**.
- [ ] **Handle:** `@beatmindio` (YouTube handles are 3–30 characters and periods are allowed, but use the same string as everywhere else).
- [ ] **Description (1,000 max). Paste (~760):**
  ```
  BeatMind is an AI music-production assistant that works inside Ableton Live 11 and 12. Describe a sound in plain English and it builds drums, bass and melodies as editable Session-view clips in your own Live Set, one part at a time, using sounds you already have installed. You review a recorded audition of each part and decide what stays.

  This channel: real sessions (any speed-ups are labelled), setup guides, prompt ideas, reference-track workflows, and honest notes on what BeatMind can't do yet. Plus MixMind, our Rekordbox library manager for DJs.

  7-day free trial with 3 tracks included, no credit card: https://www.beatmind.io
  Questions / collabs: support@beatmind.io

  Ableton and Live are trademarks of Ableton AG. BeatMind is not affiliated with Ableton.
  ```
- [ ] Links (Customisation → Basic info → Links): the YouTube UTM homepage link, "MixMind" → the /mixmind UTM link. Contact email: support@beatmind.io.
- [ ] Profile 800×800. **Banner 2560×1440**, with text and logo inside the centered **1546×423** safe area (YouTube's official figure is 1235×338 at 2048×1152). Content: "The AI that builds music inside Ableton." + the "B" tile.
- [ ] Channel trailer (for non-subscribers): S01 hero (or the long-form walkthrough once it's live).
- [ ] Featured sections: Shorts → "Setup & basics" playlist → "MixMind" playlist.
- [ ] Turn on 2FA on the Google account.

### X (Twitter)
- [ ] Sign up with support@beatmind.io. Username `beatmindio`.
- [ ] **Display name (50 max):** `BeatMind · AI inside Ableton` (28).
- [ ] **Bio (160 max). Paste (151):**
  ```
  AI co-producer inside Ableton Live. Describe a sound, get editable clips in your Live Set. + MixMind for Rekordbox DJs. 7-day trial, 3 tracks, no card.
  ```
- [ ] Website field: the X UTM link. Location: leave blank or "Ableton Live 11/12" (a small joke that also signals the product).
- [ ] Profile 400×400. **Header 1500×500** (keep the bottom-left clear because the avatar overlaps it; no GIFs).
- [ ] **Pinned post:** the Day 1 launch thread (see 03).
- [ ] Optional: the founder's personal X account links to @beatmindio in its bio. Founder-voice posts do better than brand posts on X.

### Threads
- [ ] Created from Instagram. Handle = `beatmindio`.
- [ ] **Bio (150 max). Paste (131):**
  ```
  AI co-producer inside Ableton Live. Editable clips in your own Live Set, one part at a time. + MixMind for DJs. Founder posts here.
  ```
- [ ] Link: the Threads UTM link. Threads posts are conversational and founder-voiced (see 03).
- [ ] Pinned: the Day 1 launch post.

### Facebook Page
- [ ] Create it from a personal FB account (Pages need an admin profile). Then add support@beatmind.io as the Page contact email. **Page name:** `BeatMind` (FB name rules: no slogans, no generic single words, no "official" unless true. "BeatMind" is fine).
- [ ] Category: **Software** (secondary: "App Page").
- [ ] Username: `beatmindio` → facebook.com/beatmindio.
- [ ] **Intro/bio (101 max). Paste (98):**
  ```
  AI co-producer inside Ableton Live: describe a sound, get editable clips. + MixMind for Rekordbox.
  ```
- [ ] Longer "About"/description (≤255). Paste (248):
  ```
  BeatMind is an AI music-production assistant that works inside Ableton Live 11/12. Describe a sound and it builds editable clips in your own Live Set, part by part. Also: MixMind, a Rekordbox library manager for DJs. 7-day trial, 3 tracks, no card.
  ```
- [ ] Website: the Facebook UTM link. Email: support@beatmind.io. CTA button: **"Sign up"** → the same link.
- [ ] Profile **320×320** (Facebook's official best upload). Cover **851×315** (text in the center ~640 px, because mobile crops the sides).
- [ ] Pinned/featured post: G2 carousel. Cross-post Reels from IG through Meta Business Suite.

### Reddit — u/beatmindio
- [ ] Sign up with support@beatmind.io. Username `beatmindio` (fallback `getbeatmind`). **Reddit usernames can't be changed later.**
- [ ] **Profile About (200 max). Paste (167):**
  ```
  Founder account for BeatMind (AI assistant inside Ableton Live) and MixMind (Rekordbox library tool). I post as the founder and always disclose it. support@beatmind.io
  ```
- [ ] Avatar 256×256, banner 1920×384. Social link: the Reddit UTM link.
- [ ] **Important:** a brand-new account with zero karma gets filtered or removed in most music subs. Better option: **post from the founder's existing personal Reddit account** (if it has history) with a disclosure line, and keep u/beatmindio for support replies. If you only have u/beatmindio, spend Days 1–3 **commenting helpfully** (no links) before posting anything (see 02).

### Discord (optional, recommended by Week 2)
- [ ] Create the server "BeatMind" from a Discord account registered with support@beatmind.io.
- [ ] Description (≈120 max, unverified). Paste (112): `BeatMind users: help, prompt sharing, feature requests, and loops made inside Ableton Live. MixMind DJs welcome.`
- [ ] Channels: #start-here · #announcements · #help · #prompt-sharing · #made-with-beatmind · #mixmind · #feature-requests · #bugs.
- [ ] Icon 512×512. Banner 960×540 (needs a boost level, so skip it at first).
- [ ] Invite link: set it to never expire. Add it to the site footer later (with approval) and the YouTube description.
- [ ] Only open it once you can check it daily. An empty, silent server looks worse than having none.

### Product Hunt — maker profile (set up now, launch ~Day 23; see 02)
- [ ] Sign up with support@beatmind.io (or the founder's personal account: PH is people-first, and a real founder profile does better). Headline: `Founder, BeatMind`.
- [ ] Add a real photo or the founder avatar, and link X and the website.
- [ ] **Start engaging now:** upvote and leave thoughtful comments on 2–3 launches a day in Music/Audio/AI. A maker profile with no activity looks weak on launch day.
- [ ] Create the product page as a draft ("Submit" → Schedule later). Copy and assets are in 02.

### Google Business Profile — **not needed**
Google Business Profile is for businesses with a physical location customers visit, or a service area where you go to them. BeatMind is an online-only software product, so it doesn't qualify under Google's guidelines, and a fake or virtual address risks suspension. Brand-search presence comes from the site's Organization schema + `sameAs` links (below), the YouTube channel, and the blog.

---

## 4. Security checklist (every account)
- [ ] 2FA via an authenticator app (1Password / Authy / Google Authenticator), not SMS.
- [ ] Backup codes saved in the shared password manager.
- [ ] Recovery email = support@beatmind.io. Recovery phone = the founder's phone.
- [ ] Meta: add a second admin to the FB Page / IG via Meta Business Suite (in case of lockout).
- [ ] Never share login codes in DMs. Treat "copyright violation / verify your account" DMs as phishing.

---

## 5. After creating: send the profile URLs back

**Send me the final profile URLs** once they exist, and I'll add them to the site's Organization `sameAs` schema. The list is `SOCIAL_PROFILES` in `frontend/src/lib/site.ts:17`, currently an empty array on purpose ("add each URL here once the account exists. Never add unverified links"), and it's used by `frontend/src/lib/structured-data.ts:56`.

Fill in and send:
```
Instagram: https://www.instagram.com/beatmindio/
TikTok:    https://www.tiktok.com/@beatmindio
YouTube:   https://www.youtube.com/@beatmindio
X:         https://x.com/beatmindio
Threads:   https://www.threads.com/@beatmindio
Facebook:  https://www.facebook.com/beatmindio
Reddit:    https://www.reddit.com/user/beatmindio/
Product Hunt: https://www.producthunt.com/@<maker-handle>
Discord (optional, not for sameAs): https://discord.gg/<invite>
```
(Only URLs that really exist go into `sameAs`. Don't include the Discord invite.)
