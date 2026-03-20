---
phase: quick-209
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - /Users/jeet/Downloads/offerletter-ai/interview.html
autonomous: false
requirements: [Q-209]
must_haves:
  truths:
    - "Video MP4 is served from CloudFront at https://www.offerletter.ai/video/interview-walkthrough.mp4"
    - "Poster JPG is served from CloudFront at https://www.offerletter.ai/video/poster.jpg"
    - "interview.html shows an embedded video player above the setup steps"
    - "CloudFront cache is cleared so new assets are live immediately"
    - "YouTube video is uploaded (manual step) with channel branding"
    - "Google Ads negative keywords list is documented and ready to add"
  artifacts:
    - path: "/Users/jeet/Downloads/offerletter-ai/interview.html"
      provides: "Updated page with embedded video"
      contains: "<video"
  key_links:
    - from: "interview.html <video> tag"
      to: "https://www.offerletter.ai/video/interview-walkthrough.mp4"
      via: "CloudFront E319UG6B4QE97L → s3://offerletter.ai"
      pattern: "offerletter.ai/video/interview-walkthrough.mp4"
---

<objective>
Upload the Interview Assistant walkthrough video (1:13, 5.3MB) to S3/CloudFront, embed it on interview.html above the setup steps, export poster frame, prepare YouTube upload instructions, and document Google Ads negative keywords.

Purpose: Give visitors an instant product preview on the interview.html page before they read the setup steps. Drive traffic via YouTube. Prevent wasted Google Ads spend on irrelevant searches.
Output: Video live on CloudFront, embedded on interview.html, YouTube + Google Ads tasks either automated or documented for manual completion.
</objective>

<execution_context>
@/Users/jeet/.claude/get-shit-done/workflows/execute-plan.md
@/Users/jeet/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/jeet/doordash-p2p/.planning/STATE.md

Key facts from handoff (2026-03-20-offerletter-video-security-complete.md):
- Video rendered: apps/offerletter-video/out/interview-walkthrough.mp4 (1:13, 5.3MB)
- Poster already exported: apps/offerletter-video/out/poster.jpg (12KB, frame 60)
- S3 bucket: s3://offerletter.ai (NOT s3://www.offerletter.ai)
- CloudFront distribution: E319UG6B4QE97L → www.offerletter.ai
- interview.html lives at: /Users/jeet/Downloads/offerletter-ai/interview.html
- interview.html is hosted at s3://offerletter.ai/interview.html
- Stripe payment link: plink_1TBqshJePbhql2pNTKDnISFo → redirects to interview.html
- google-ads Python SDK v29.2.0 is installed (pip3)
- No youtube-upload CLI — YouTube upload will be manual with exact instructions
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upload video + poster to S3 and invalidate CloudFront</name>
  <files>
    apps/offerletter-video/out/interview-walkthrough.mp4
    apps/offerletter-video/out/poster.jpg
  </files>
  <action>
Upload both files to s3://offerletter.ai/video/ with correct content types:

```bash
# Upload video
aws s3 cp /Users/jeet/doordash-p2p/apps/offerletter-video/out/interview-walkthrough.mp4 \
  s3://offerletter.ai/video/interview-walkthrough.mp4 \
  --content-type video/mp4 \
  --cache-control "public, max-age=31536000, immutable"

# Upload poster
aws s3 cp /Users/jeet/doordash-p2p/apps/offerletter-video/out/poster.jpg \
  s3://offerletter.ai/video/poster.jpg \
  --content-type image/jpeg \
  --cache-control "public, max-age=31536000, immutable"

# Invalidate CloudFront so new assets are served immediately
aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/video/*"
```

Verify both URLs are reachable after invalidation completes (~30s):
```bash
curl -I "https://www.offerletter.ai/video/interview-walkthrough.mp4"
curl -I "https://www.offerletter.ai/video/poster.jpg"
```
Both should return HTTP/2 200 with Content-Type: video/mp4 and image/jpeg respectively.
  </action>
  <verify>
curl -I "https://www.offerletter.ai/video/interview-walkthrough.mp4" returns HTTP/2 200 with Content-Type: video/mp4
curl -I "https://www.offerletter.ai/video/poster.jpg" returns HTTP/2 200 with Content-Type: image/jpeg
  </verify>
  <done>Both assets return 200 from CloudFront with correct content types. Video is 5.3MB+ (non-zero Content-Length).</done>
</task>

<task type="auto">
  <name>Task 2: Embed video player in interview.html and re-upload to S3</name>
  <files>/Users/jeet/Downloads/offerletter-ai/interview.html</files>
  <action>
Insert a `<video>` block ABOVE the `<div class="setup-steps">` at line 465, inside the `#mac` method panel. Place it between the `.download-card` div (ends ~line 463) and the `.setup-steps` div (starts line 465).

Add this CSS to the `<style>` block (before the closing `</style>` tag):

```css
/* ── WALKTHROUGH VIDEO ──────────────────────────────── */
.walkthrough-video-wrap {
  margin-bottom: 16px;
  border-radius: var(--radius);
  overflow: hidden;
  background: #0F172A;
  border: 1px solid var(--border);
}
.walkthrough-video-wrap video {
  display: block;
  width: 100%;
  height: auto;
  max-height: 240px;
  object-fit: cover;
}
.walkthrough-video-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-align: center;
  padding: 6px 0 2px;
  letter-spacing: 0.4px;
  text-transform: uppercase;
}
```

Add this HTML immediately before `<div class="setup-steps">` (line 465):

```html
<!-- WALKTHROUGH VIDEO -->
<div class="walkthrough-video-wrap">
  <div class="walkthrough-video-label">See it in action — 1 min overview</div>
  <video
    src="https://www.offerletter.ai/video/interview-walkthrough.mp4"
    poster="https://www.offerletter.ai/video/poster.jpg"
    controls
    preload="none"
    playsinline
    aria-label="Interview Assistant walkthrough video"
  ></video>
</div>
```

After editing, upload the updated interview.html to S3 and invalidate:

```bash
aws s3 cp /Users/jeet/Downloads/offerletter-ai/interview.html \
  s3://offerletter.ai/interview.html \
  --content-type "text/html" \
  --cache-control "no-cache"

aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/interview.html"
```
  </action>
  <verify>
1. grep -c 'walkthrough-video-wrap' /Users/jeet/Downloads/offerletter-ai/interview.html → returns 2+ (CSS + HTML)
2. grep 'offerletter.ai/video/interview-walkthrough.mp4' /Users/jeet/Downloads/offerletter-ai/interview.html confirms src URL
3. curl -s "https://www.offerletter.ai/interview.html" | grep -c 'walkthrough-video' → returns 2+ after invalidation
  </verify>
  <done>Video tag is present in interview.html with correct S3/CloudFront src and poster URLs. Page re-uploaded and invalidated. Video renders above setup steps at https://www.offerletter.ai/interview.html.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Task 1: Video + poster uploaded to S3, CloudFront invalidated.
    Task 2: interview.html updated with embedded video player, re-uploaded to S3.

    YouTube upload: No CLI available (youtube-upload not installed). Manual upload required — see instructions below.

    Google Ads negative keywords: google-ads Python SDK v29.2.0 is installed but requires OAuth setup (customer ID + developer token). Exact keywords to add manually are listed below.
  </what-built>
  <how-to-verify>
    **1. Verify live video embed:**
    Visit https://www.offerletter.ai/interview.html
    - You should see a video player labeled "See it in action — 1 min overview" ABOVE the setup steps
    - Click play — video should load from CloudFront and play the full 1:13 walkthrough
    - Poster frame should show while video is paused/unplayed

    **2. YouTube upload (manual — required before closing this task):**
    a. Go to https://studio.youtube.com → Create → Upload video
    b. Upload file: ~/Desktop/Interview Assistant Walkthrough.mp4 (or apps/offerletter-video/out/interview-walkthrough.mp4)
    c. Title: "Interview Assistant by OfferLetter.ai — AI Whispers Answers in Your Earbuds (Invisible to Zoom)"
    d. Description:
       ```
       OfferLetter.ai's Interview Assistant listens to your interview in real-time and whispers AI-generated answers into your earbuds — completely invisible to Zoom and Teams screen share.

       ✅ Works on Mac and phone browser
       ✅ No audio delay
       ✅ Screen-share invisible
       ✅ $19 one-time — no subscription

       Try it: https://www.offerletter.ai/interview.html

       #interview #jobinterview #AItools #interviewtips #interviewcoach
       ```
    e. Thumbnail: Upload apps/offerletter-video/out/poster.jpg as custom thumbnail
    f. Visibility: Public
    g. Playlist: Create new playlist "Interview Assistant" if none exists
    h. Save the video URL after upload

    **3. YouTube channel branding (manual — do while in YouTube Studio):**
    a. Go to YouTube Studio → Customization → Branding
    b. Channel icon: Use the OfferLetter.ai logo (from https://www.offerletter.ai/favicon.svg or request user to export a 800x800 PNG)
    c. Channel art (banner): Size 2560x1440px. Text: "OfferLetter.ai — AI Interview Coach" on a dark blue (#1E3A8A) background. Export any banner image at this size.
    d. Go to YouTube Studio → Customization → Basic Info
    e. Channel description:
       ```
       OfferLetter.ai — AI-powered interview coaching. Our Interview Assistant whispers real-time answers into your earbuds during live interviews, invisible to screen share. $19 one-time. Try it at offerletter.ai
       ```
    f. Channel URL: Set custom handle to @offerletterdotai (or @offerletterai if available)

    **4. Google Ads negative keywords (manual — add to ALL active campaigns):**
    Go to Google Ads → Campaigns → Keywords → Negative keywords → Add to campaign (shared list preferred):

    EXACT MATCH negatives (high confidence irrelevant):
    - [free interview coach]
    - [free ai interview]
    - [mock interview free]
    - [interview practice free]
    - [free resume builder]
    - [resume template]
    - [cover letter generator]
    - [offer letter template]
    - [job offer letter template]
    - [free offer letter]
    - [offer letter sample]
    - [internship]
    - [college interview]
    - [medical school interview]
    - [salary negotiation]
    - [amazon oa]
    - [leetcode]
    - [coding interview]
    - [technical interview questions]
    - [glassdoor]
    - [indeed]

    BROAD MATCH negatives (save budget on clear mismatches):
    - free
    - template
    - sample
    - example
    - resume
    - cover letter
    - internship
    - college

    Note: Do NOT add "interview" or "AI" as negative — those are your core keywords.
  </how-to-verify>
  <resume-signal>Type "done" after completing YouTube upload + channel branding + adding negative keywords. Share the YouTube video URL.</resume-signal>
</task>

</tasks>

<verification>
- [ ] https://www.offerletter.ai/video/interview-walkthrough.mp4 → HTTP 200, Content-Type: video/mp4
- [ ] https://www.offerletter.ai/video/poster.jpg → HTTP 200, Content-Type: image/jpeg
- [ ] https://www.offerletter.ai/interview.html contains walkthrough-video-wrap div and video src pointing to CloudFront
- [ ] Video player visible above setup steps on live interview.html page
- [ ] YouTube video uploaded and publicly accessible
- [ ] YouTube channel has description + branding
- [ ] Google Ads negative keyword list added to campaigns
</verification>

<success_criteria>
1. Video plays inline on interview.html without leaving the page — visitors see the product before reading setup steps
2. Assets served from CloudFront (not S3 directly) with correct content-type headers
3. YouTube video is public and linked from channel
4. Google Ads campaigns protected from wasted spend on free/template/resume queries
</success_criteria>

<output>
After completion, create .planning/quick/209-offerletter-ai-post-launch-upload-video-/209-SUMMARY.md with:
- S3 upload commands run and output
- CloudFront invalidation IDs
- YouTube video URL
- Confirmation that negative keywords were added
</output>
