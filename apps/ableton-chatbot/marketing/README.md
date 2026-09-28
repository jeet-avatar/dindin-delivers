# BeatMind Go-To-Market Launch Kit

Launch: **Monday 2026-09-28** · Site: https://www.beatmind.io · All accounts and outreach use **support@beatmind.io**
Brand: **BeatMind** (AI co-producer inside Ableton Live 11/12) + **MixMind by BeatMind** (Rekordbox 6/7 library manager). BeatMind plans: Starter $19/mo, Pro $39/mo, Studio $79/mo (annual = 2 months free). Free trial: 7 days, 3 tracks, about 50 AI messages, no card, never charged unless you choose a plan. MixMind is on sale: $12/mo ($120/yr), Starter + MixMind $25/mo, Pro + MixMind $45/mo (each saves $6/mo vs separate), and included in Studio. The free trial covers BeatMind only, not MixMind. Founding Member offer: first 100 annual subscribers get 40% off for life with **FOUNDING100**. Full table: 05 §10. Company: Zietra Technologies Inc.

| File | What's in it |
|------|--------------|
| [`01-handles-and-accounts.md`](01-handles-and-accounts.md) | Handle choice (**`beatmindio`**, fallback `getbeatmind`) and availability results. Per-platform setup with pasteable, character-counted bios, UTM links, image sizes, highlights/pins, 2FA and the sameAs hand-back |
| [`02-launch-playbook.md`](02-launch-playbook.md) | 28-day plan and community rules (Reddit, Discord, KVR, Gearspace, HN, PH). Creator outreach, email capture and weekly targets. Ready-to-paste drafts: 3 Reddit posts, Show HN, Product Hunt, creator email, launch email |
| [`03-content-calendar.md`](03-content-calendar.md) | The first 9 Instagram grid posts (visuals, slide text, captions, 5 hashtags each, alt text, 3×3 order) plus 14 days of posts across IG/TikTok/Shorts/X/Threads/FB |
| [`04-video-scripts.md`](04-video-scripts.md) | 12 short-form scripts (9 screen-capture, 3 hands/voice), a 6–8 min YouTube walkthrough outline, and recording/export settings |
| [`05-brand-voice-and-assets.md`](05-brand-voice-and-assets.md) | Positioning, one-liners, pitches, voice rules, **what we can and can't claim**, colors and fonts, asset dimensions, press boilerplate, **pricing one-pager (§10)** |

---

## ⚠️ Read before posting anything
1. **No invented numbers.** No user counts, testimonials, ratings or "X tracks made". We don't have verified figures yet.
2. **BeatMind doesn't make finished songs.** It builds editable Session-view parts in your Live Set. See the claims list in 05 §6.
3. **Blog links:** on 2026-09-27 every `/blog/...` URL returned HTTP 200 **but served the homepage**, so the posts aren't live yet. Open each one before linking it.
4. **MixMind USB export video (S10) is gated.** The public MixMind page only claims "detect USB + browse the PIONEER folder", and the CDJ hardware test report isn't filled in. Use the fallback cut until a real export has been confirmed.
5. **Site copy inconsistency to fix (not changed in this kit):** `frontend/src/app/mixmind/page.tsx:309` says BeatMind is "our AI that builds full tracks inside Ableton Live". That contradicts the homepage ("Session scenes are not a finished Arrangement timeline or exported song", `page.tsx:172`). Change it to something like "…that builds editable parts inside Ableton Live" before sending traffic to /mixmind.
6. **CREATOR60 is for 1:1 creator outreach only.** It's BeatMind Pro free for 2 months (max 30 uses, new customers only), then $39/mo unless cancelled, and checkout needs a card. Never post it publicly or put it on the site. Always tell creators about the card and the renewal. See 02 §Creator outreach.

---

## Tomorrow morning: the first 60 minutes

Have ready: the password manager open, an authenticator app on your phone, `logo-B-1080.png`, the G1–G3 assets (see 03), and S01 exported.

| Min | Do this |
|-----|---------|
| 0–5 | Open the **support@beatmind.io** inbox (you'll need verification codes). Open `01-handles-and-accounts.md`. |
| 5–15 | **Instagram:** sign up as `beatmindio` → switch to Professional → Business → category "Software" → name, bio and links (paste from 01) → profile pic → 2FA on. Then **claim Threads** `@beatmindio` from the IG login and paste the Threads bio. |
| 15–22 | **TikTok:** sign up as `beatmindio` → switch to a Business account → name, bio, website → 2FA. |
| 22–28 | **X:** sign up as `beatmindio` → name, bio, website, avatar, header → 2FA. |
| 28–34 | **YouTube:** create the Brand Account channel "BeatMind" → handle `@beatmindio` → description + links → avatar/banner (the banner can wait until tonight). |
| 34–38 | **Reddit:** claim `u/beatmindio` and paste the About. **Facebook Page:** create "BeatMind", category Software, username `beatmindio`, intro text. (If FB fights you, move it to the afternoon. It's the lowest priority.) |
| 38–40 | **If any handle is taken, switch everything to `getbeatmind`.** Consistency matters more than the exact string. Write down every final URL. |
| 40–50 | **Post the first 3 grid posts on Instagram**, in this order: **G1** (setup reel) → **G2** ("Meet BeatMind" carousel) → **G3** (MixMind carousel). Paste captions, hashtags and alt text from 03 (Advanced settings → Accessibility → alt text). |
| 50–53 | **Pin G2.** (Pin G9 and G6 later, once they're posted tonight.) Add the first Highlight, "How it works", from the G1 reel shared to Story. |
| 53–57 | **Post S01 hero** to TikTok and YouTube Shorts. Post the **X launch thread** and pin it. Post the Threads intro. |
| 57–60 | **First Reddit move:** check r/ableton's rules and any weekly thread (02 §Community rules). **Don't post the value post yet** (it's scheduled for Day 2). Today, leave **3 genuinely helpful comments with no links** in r/ableton and r/edmproduction to start building account history. Then **send the profile URLs back** so they go into `SOCIAL_PROFILES` (`frontend/src/lib/site.ts`). |

**The rest of Day 1:** post G4–G6 around midday and G7–G9 in the evening (G9 last, then pin G9 + G6). Send the launch email to your personal network (02). Reply to every comment.
