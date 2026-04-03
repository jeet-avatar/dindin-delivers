# Career Companion — SEO Content Machine Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SEO content machine: 4 pillar pages, 32 guide articles, 500 company pages, XML sitemap
**Architecture:** Python Claude API script generates content + HTML; `aws s3 cp` uploads each file
**Tech Stack:** Python 3, Anthropic Claude API (`claude-haiku-4-5-20251001`), AWS S3/CloudFront

**Deploy constants (used throughout):**
```
S3_BUCKET = offerletter.ai
CF_DIST   = E319UG6B4QE97L
BASE_URL  = https://offerletter.ai
```

---

## Chunk 1: Pillar Pages (4 pages)

### Task 1: Create 4 pillar page HTML files and upload to S3

Each pillar page lives at a vanity URL. The HTML file is uploaded to the matching S3 key.

| URL path | S3 key |
|---|---|
| `/guides/interview-preparation` | `guides/interview-preparation/index.html` |
| `/guides/interview-coaching` | `guides/interview-coaching/index.html` |
| `/guides/salary-negotiation` | `guides/salary-negotiation/index.html` |
| `/guides/new-job-success` | `guides/new-job-success/index.html` |

- [ ] **Step 1: Create local output directory**

```bash
mkdir -p /tmp/career-companion-seo/guides/interview-preparation
mkdir -p /tmp/career-companion-seo/guides/interview-coaching
mkdir -p /tmp/career-companion-seo/guides/salary-negotiation
mkdir -p /tmp/career-companion-seo/guides/new-job-success
```

- [ ] **Step 2: Write `generate_pillar_pages.py`**

Save to `/tmp/career-companion-seo/generate_pillar_pages.py`:

```python
#!/usr/bin/env python3
"""Generates 4 pillar pages for offerletter.ai SEO content machine."""

import os, subprocess

PILLARS = [
    {
        "slug": "interview-preparation",
        "title": "Interview Preparation Guide — Ace Every Job Interview",
        "meta_desc": "Complete interview preparation guide: research, practice, mindset, and real-time AI coaching. Land your dream job with Career Companion.",
        "h1": "The Complete Interview Preparation Guide",
        "intro": "Whether you're interviewing at a Fortune 500 or an early-stage startup, preparation is the difference between an offer and a rejection. This guide covers every stage of the interview process — from company research to follow-up emails — and shows you how Career Companion's real-time AI coaching gives you an edge in the room.",
        "articles": [
            ("How to Research a Company Before an Interview", "interview-preparation"),
            ("How to Answer 'Tell Me About Yourself'", "interview-preparation"),
            ("STAR Method: How to Answer Behavioral Questions", "interview-preparation"),
            ("How to Prepare for Technical Interviews", "interview-preparation"),
            ("What to Wear to a Job Interview", "interview-preparation"),
            ("How to Prepare Questions to Ask the Interviewer", "interview-preparation"),
            ("Mock Interview Techniques That Actually Work", "interview-preparation"),
            ("Day-of Interview Preparation Checklist", "interview-preparation"),
        ],
    },
    {
        "slug": "interview-coaching",
        "title": "Interview Coaching — Real-Time AI Feedback During Your Interview",
        "meta_desc": "AI interview coaching that listens during your live interview and whispers the perfect answer. Career Companion gives you real-time suggestions without the interviewer noticing.",
        "h1": "AI Interview Coaching: Real-Time Help When It Matters Most",
        "intro": "Traditional interview coaching ends the moment you walk in the door. Career Companion is different — it listens to the conversation, analyzes each question, and surfaces relevant talking points and answers in real time on your second screen. No more blanking. No more missed opportunities.",
        "articles": [
            ("What Is AI Interview Coaching and How Does It Work?", "interview-coaching"),
            ("How to Use a Second Screen During Remote Interviews", "interview-coaching"),
            ("Real-Time Interview Tips: Staying Calm and Reading Cues", "interview-coaching"),
            ("How AI Coaching Compares to Human Interview Coaches", "interview-coaching"),
            ("Setting Up Career Companion for Your First Interview", "interview-coaching"),
            ("How to Practice with AI Before the Real Interview", "interview-coaching"),
            ("AI Coaching for Phone Screens vs. Video Interviews", "interview-coaching"),
            ("Privacy and Ethics of AI Interview Tools", "interview-coaching"),
        ],
    },
    {
        "slug": "salary-negotiation",
        "title": "Salary Negotiation Guide — Get Paid What You're Worth",
        "meta_desc": "Proven salary negotiation strategies, scripts, and real-time AI coaching. Learn how to negotiate your job offer, counter-offer, and total comp package.",
        "h1": "The Definitive Salary Negotiation Guide",
        "intro": "Most candidates accept the first number offered — leaving thousands on the table. This guide teaches you how to research market rates, time your counter-offer, and handle every pushback scenario. Career Companion's Negotiate Mode gives you live coaching during the salary conversation so you never freeze.",
        "articles": [
            ("How to Research Salary Ranges for Any Job", "salary-negotiation"),
            ("How to Counter a Job Offer (With Scripts)", "salary-negotiation"),
            ("Negotiating Total Compensation: Equity, Bonus, Benefits", "salary-negotiation"),
            ("How to Negotiate Salary Without Losing the Offer", "salary-negotiation"),
            ("Salary Negotiation Scripts That Actually Work", "salary-negotiation"),
            ("When to Negotiate Salary (and When Not To)", "salary-negotiation"),
            ("Negotiating a Raise vs. Negotiating a New Job Offer", "salary-negotiation"),
            ("Using AI to Coach You Through Salary Negotiation", "salary-negotiation"),
        ],
    },
    {
        "slug": "new-job-success",
        "title": "New Job Success Guide — Nail Your First 90 Days",
        "meta_desc": "How to succeed in your first 90 days at a new job. Onboarding strategies, relationship-building tips, and AI coaching for a strong start.",
        "h1": "How to Succeed in Your First 90 Days at a New Job",
        "intro": "Landing the job is just the beginning. The first three months determine whether you're seen as a high-performer or someone who struggles to ramp. This guide covers the 30-60-90 day framework, relationship-building strategies, and how Career Companion's Succeed Mode helps you navigate workplace dynamics in real time.",
        "articles": [
            ("30-60-90 Day Plan Template for New Employees", "new-job-success"),
            ("How to Build Relationships in a New Job", "new-job-success"),
            ("Understanding Company Culture in Your First Month", "new-job-success"),
            ("How to Ask for Feedback Early and Often", "new-job-success"),
            ("Managing Up: Building Trust with Your New Manager", "new-job-success"),
            ("How to Avoid Common New Employee Mistakes", "new-job-success"),
            ("Setting Goals in the First 90 Days", "new-job-success"),
            ("How AI Coaching Helps You Succeed at a New Job", "new-job-success"),
        ],
    },
]

NAV_HTML = """
  <nav style="background:#0f172a;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;">
    <a href="/" style="color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none;">Career Companion</a>
    <div style="display:flex;gap:1.5rem;align-items:center;">
      <a href="/interview.html" style="color:#94a3b8;text-decoration:none;font-size:0.9rem;">How It Works</a>
      <a href="/guides/interview-preparation" style="color:#94a3b8;text-decoration:none;font-size:0.9rem;">Guides</a>
      <a href="/interview.html#download" style="background:#3b82f6;color:#fff;padding:0.5rem 1.2rem;border-radius:6px;text-decoration:none;font-size:0.9rem;font-weight:600;">Download Free</a>
    </div>
  </nav>"""

FOOTER_HTML = """
  <footer style="background:#0f172a;color:#64748b;text-align:center;padding:2rem;font-size:0.85rem;margin-top:4rem;">
    <p>&copy; 2026 Career Companion by Zietra Technologies. All rights reserved.</p>
    <p style="margin-top:0.5rem;"><a href="/privacy.html" style="color:#64748b;">Privacy Policy</a> &nbsp;|&nbsp; <a href="/interview.html" style="color:#64748b;">Home</a></p>
  </footer>"""

def render_article_card(title, pillar_slug):
    article_slug = title.lower().replace("'", "").replace(",", "").replace(":", "").replace("?", "").replace("(", "").replace(")", "").replace(" ", "-").replace("--", "-")
    url = f"/guides/{pillar_slug}/{article_slug}"
    return f"""
      <a href="{url}" style="display:block;background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.5rem;text-decoration:none;transition:border-color 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#334155'">
        <h3 style="color:#e2e8f0;font-size:1rem;margin:0 0 0.5rem;">{title}</h3>
        <span style="color:#3b82f6;font-size:0.85rem;">Read guide &rarr;</span>
      </a>"""

def build_pillar_page(p):
    article_cards = "".join(render_article_card(title, p["slug"]) for title, _ in p["articles"])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{p["title"]}</title>
  <meta name="description" content="{p["meta_desc"]}">
  <meta property="og:title" content="{p["title"]}">
  <meta property="og:description" content="{p["meta_desc"]}">
  <meta property="og:url" content="https://offerletter.ai/guides/{p["slug"]}">
  <link rel="canonical" href="https://offerletter.ai/guides/{p["slug"]}">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{{box-sizing:border-box;margin:0;padding:0;}}
    body{{font-family:'Plus Jakarta Sans',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.7;}}
    .hero{{background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 60%);padding:5rem 2rem 4rem;text-align:center;}}
    .hero h1{{font-size:clamp(1.8rem,4vw,3rem);font-weight:800;color:#fff;max-width:800px;margin:0 auto 1rem;}}
    .hero p{{font-size:1.1rem;color:#94a3b8;max-width:620px;margin:0 auto 2rem;}}
    .container{{max-width:900px;margin:0 auto;padding:3rem 2rem;}}
    .section-title{{font-size:1.4rem;font-weight:700;color:#fff;margin-bottom:1.5rem;}}
    .article-grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:1rem;}}
    .cta-box{{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px;padding:2.5rem;text-align:center;margin:3rem 0;}}
    .cta-box h2{{color:#fff;font-size:1.5rem;margin-bottom:0.75rem;}}
    .cta-box p{{color:#bfdbfe;margin-bottom:1.5rem;}}
    .cta-btn{{display:inline-block;background:#fff;color:#1e40af;font-weight:700;padding:0.85rem 2rem;border-radius:8px;text-decoration:none;font-size:1rem;}}
  </style>
</head>
<body>
{NAV_HTML}
  <div class="hero">
    <h1>{p["h1"]}</h1>
    <p>{p["intro"]}</p>
    <a href="/interview.html#download" style="display:inline-block;background:#3b82f6;color:#fff;padding:0.85rem 2rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:1rem;">Download Career Companion Free &rarr;</a>
  </div>
  <div class="container">
    <p class="section-title">Articles in This Guide</p>
    <div class="article-grid">{article_cards}
    </div>
    <div class="cta-box">
      <h2>Stop Preparing Alone</h2>
      <p>Career Companion listens during your interview and surfaces the perfect answer in real time — on your screen, invisible to the interviewer.</p>
      <a href="/interview.html#download" class="cta-btn">Download Free — Mac &amp; Windows</a>
    </div>
  </div>
{FOOTER_HTML}
</body>
</html>"""

def slugify(title):
    import re
    s = title.lower()
    s = re.sub(r"['\",:()?]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

if __name__ == "__main__":
    out_base = "/tmp/career-companion-seo"
    for p in PILLARS:
        html = build_pillar_page(p)
        path = f"{out_base}/guides/{p['slug']}/index.html"
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w") as f:
            f.write(html)
        print(f"Written: {path}")
    print("Pillar pages done.")
```

- [ ] **Step 3: Run the pillar page generator**

```bash
cd /tmp/career-companion-seo
python3 generate_pillar_pages.py
```

Expected output: 4 lines "Written: ..." followed by "Pillar pages done."

- [ ] **Step 4: Upload pillar pages to S3**

```bash
for slug in interview-preparation interview-coaching salary-negotiation new-job-success; do
  aws s3 cp /tmp/career-companion-seo/guides/$slug/index.html \
    s3://offerletter.ai/guides/$slug/index.html \
    --content-type text/html \
    --cache-control "max-age=3600"
  echo "Uploaded: guides/$slug/index.html"
done
```

- [ ] **Step 5: Verify pillar pages live**

```bash
for slug in interview-preparation interview-coaching salary-negotiation new-job-success; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/guides/$slug/")
  echo "$slug: $STATUS"
done
```

Expected: all 4 return `200`.

---

## Chunk 2: Guide Articles (32 articles)

### Task 2: Write article generation script

- [ ] **Step 1: Save `generate_articles.py` to `/tmp/career-companion-seo/`**

```python
#!/usr/bin/env python3
"""Generates 32 guide articles using Claude Haiku and uploads each to S3."""

import os, re, time, subprocess
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

ARTICLES = [
    # interview-preparation (8)
    ("How to Research a Company Before an Interview", "interview-preparation"),
    ("How to Answer Tell Me About Yourself", "interview-preparation"),
    ("STAR Method How to Answer Behavioral Questions", "interview-preparation"),
    ("How to Prepare for Technical Interviews", "interview-preparation"),
    ("What to Wear to a Job Interview", "interview-preparation"),
    ("How to Prepare Questions to Ask the Interviewer", "interview-preparation"),
    ("Mock Interview Techniques That Actually Work", "interview-preparation"),
    ("Day of Interview Preparation Checklist", "interview-preparation"),
    # interview-coaching (8)
    ("What Is AI Interview Coaching and How Does It Work", "interview-coaching"),
    ("How to Use a Second Screen During Remote Interviews", "interview-coaching"),
    ("Real Time Interview Tips Staying Calm and Reading Cues", "interview-coaching"),
    ("How AI Coaching Compares to Human Interview Coaches", "interview-coaching"),
    ("Setting Up Career Companion for Your First Interview", "interview-coaching"),
    ("How to Practice with AI Before the Real Interview", "interview-coaching"),
    ("AI Coaching for Phone Screens vs Video Interviews", "interview-coaching"),
    ("Privacy and Ethics of AI Interview Tools", "interview-coaching"),
    # salary-negotiation (8)
    ("How to Research Salary Ranges for Any Job", "salary-negotiation"),
    ("How to Counter a Job Offer With Scripts", "salary-negotiation"),
    ("Negotiating Total Compensation Equity Bonus Benefits", "salary-negotiation"),
    ("How to Negotiate Salary Without Losing the Offer", "salary-negotiation"),
    ("Salary Negotiation Scripts That Actually Work", "salary-negotiation"),
    ("When to Negotiate Salary and When Not To", "salary-negotiation"),
    ("Negotiating a Raise vs Negotiating a New Job Offer", "salary-negotiation"),
    ("Using AI to Coach You Through Salary Negotiation", "salary-negotiation"),
    # new-job-success (8)
    ("30 60 90 Day Plan Template for New Employees", "new-job-success"),
    ("How to Build Relationships in a New Job", "new-job-success"),
    ("Understanding Company Culture in Your First Month", "new-job-success"),
    ("How to Ask for Feedback Early and Often", "new-job-success"),
    ("Managing Up Building Trust with Your New Manager", "new-job-success"),
    ("How to Avoid Common New Employee Mistakes", "new-job-success"),
    ("Setting Goals in the First 90 Days", "new-job-success"),
    ("How AI Coaching Helps You Succeed at a New Job", "new-job-success"),
]

PILLAR_LABELS = {
    "interview-preparation": "Interview Preparation",
    "interview-coaching": "Interview Coaching",
    "salary-negotiation": "Salary Negotiation",
    "new-job-success": "New Job Success",
}

def slugify(title):
    s = title.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def generate_article_body(title, pillar):
    prompt = f"""Write an 800-word SEO-optimized guide article for the following:

Title: {title}
Pillar: {PILLAR_LABELS[pillar]}
Target audience: Job seekers preparing for interviews or navigating early career decisions
Product to mention: Career Companion (an AI-powered desktop app that listens during job interviews and provides real-time coaching suggestions on a second screen)

Requirements:
- Write in HTML using only: <h2>, <p>, <ul>, <li>, <strong>, <em> tags (no <html>/<head>/<body>)
- Start with a short introductory paragraph (no heading)
- Include 4 to 6 H2 sections covering the topic thoroughly
- End with a conclusion paragraph that naturally mentions Career Companion once
- Tone: practical, direct, encouraging — like a senior career coach talking to a smart friend
- Do NOT include a title H1 (that is added by the template)
- Do NOT include any markdown, only HTML

Output only the HTML body content, nothing else."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def build_article_html(title, pillar, body_html):
    slug = slugify(title)
    pillar_label = PILLAR_LABELS[pillar]
    meta_desc = f"{title} — practical advice and strategies for job seekers. Part of the Career Companion {pillar_label} guide."
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} | Career Companion</title>
  <meta name="description" content="{meta_desc}">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{meta_desc}">
  <link rel="canonical" href="https://offerletter.ai/guides/{pillar}/{slug}">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{{box-sizing:border-box;margin:0;padding:0;}}
    body{{font-family:'Plus Jakarta Sans',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8;}}
    nav{{background:#0f172a;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;}}
    nav a.logo{{color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none;}}
    nav a.cta{{background:#3b82f6;color:#fff;padding:0.5rem 1.2rem;border-radius:6px;text-decoration:none;font-size:0.9rem;font-weight:600;}}
    .breadcrumb{{max-width:760px;margin:1.5rem auto 0;padding:0 2rem;font-size:0.85rem;color:#64748b;}}
    .breadcrumb a{{color:#64748b;text-decoration:none;}}
    .breadcrumb a:hover{{color:#94a3b8;}}
    article{{max-width:760px;margin:0 auto;padding:2rem 2rem 4rem;}}
    h1{{font-size:clamp(1.6rem,3.5vw,2.4rem);font-weight:800;color:#fff;margin-bottom:1.5rem;line-height:1.3;}}
    h2{{font-size:1.25rem;font-weight:700;color:#f1f5f9;margin:2.5rem 0 0.75rem;}}
    p{{color:#cbd5e1;margin-bottom:1.2rem;}}
    ul{{color:#cbd5e1;margin:0 0 1.2rem 1.5rem;}}
    li{{margin-bottom:0.4rem;}}
    strong{{color:#e2e8f0;}}
    .cta-box{{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px;padding:2rem;text-align:center;margin:3rem 0 1rem;}}
    .cta-box h2{{color:#fff;font-size:1.3rem;margin-bottom:0.75rem;margin-top:0;}}
    .cta-box p{{color:#bfdbfe;margin-bottom:1.25rem;}}
    .cta-btn{{display:inline-block;background:#fff;color:#1e40af;font-weight:700;padding:0.8rem 2rem;border-radius:8px;text-decoration:none;}}
    footer{{background:#0f172a;color:#64748b;text-align:center;padding:2rem;font-size:0.85rem;border-top:1px solid #1e293b;}}
    footer a{{color:#64748b;}}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Career Companion</a>
    <a href="/interview.html#download" class="cta">Download Free</a>
  </nav>
  <div class="breadcrumb">
    <a href="/guides/{pillar}">← {pillar_label} Guide</a>
  </div>
  <article>
    <h1>{title}</h1>
    {body_html}
    <div class="cta-box">
      <h2>Get Real-Time Coaching During Your Interview</h2>
      <p>Career Companion listens to your interview and surfaces the perfect answer on your screen — invisible to the interviewer. Free download for Mac &amp; Windows.</p>
      <a href="/interview.html#download" class="cta-btn">Download Career Companion Free</a>
    </div>
  </article>
  <footer>
    <p>&copy; 2026 Career Companion by Zietra Technologies. <a href="/privacy.html">Privacy Policy</a> &nbsp;|&nbsp; <a href="/interview.html">Home</a></p>
  </footer>
</body>
</html>"""

def upload_to_s3(local_path, s3_key):
    result = subprocess.run([
        "aws", "s3", "cp", local_path,
        f"s3://offerletter.ai/{s3_key}",
        "--content-type", "text/html",
        "--cache-control", "max-age=3600",
    ], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  UPLOAD FAILED: {result.stderr}")
    else:
        print(f"  Uploaded: {s3_key}")

if __name__ == "__main__":
    out_base = "/tmp/career-companion-seo"
    for i, (title, pillar) in enumerate(ARTICLES):
        slug = slugify(title)
        print(f"[{i+1}/{len(ARTICLES)}] Generating: {title}")
        body = generate_article_body(title, pillar)
        html = build_article_html(title, pillar, body)
        local_dir = f"{out_base}/guides/{pillar}/{slug}"
        os.makedirs(local_dir, exist_ok=True)
        local_path = f"{local_dir}/index.html"
        with open(local_path, "w") as f:
            f.write(html)
        s3_key = f"guides/{pillar}/{slug}/index.html"
        upload_to_s3(local_path, s3_key)
        if i < len(ARTICLES) - 1:
            time.sleep(0.3)  # gentle rate limiting
    print(f"\nDone. {len(ARTICLES)} articles generated and uploaded.")
```

- [ ] **Step 2: Run article generator**

Set your Anthropic API key first, then run:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
cd /tmp/career-companion-seo
python3 generate_articles.py
```

Expected: 32 articles generated and uploaded. Runtime ~5-8 minutes.

- [ ] **Step 3: Spot-check 3 articles**

```bash
curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/guides/interview-preparation/how-to-research-a-company-before-an-interview/"
curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/guides/salary-negotiation/how-to-counter-a-job-offer-with-scripts/"
curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/guides/new-job-success/30-60-90-day-plan-template-for-new-employees/"
```

Expected: all `200`.

---

## Chunk 3: Company Pages (500 pages)

### Task 3: Company data JSON file

- [ ] **Step 1: Create `companies.json`**

Save to `/tmp/career-companion-seo/companies.json`. Below is the seed list of 20 companies. Expand to 500 by adding companies from the Fortune 500, major tech firms, consulting firms, finance firms, and healthcare companies. Each entry: `{"name": "...", "slug": "...", "industry": "..."}`.

```json
[
  {"name": "Google", "slug": "google", "industry": "Technology"},
  {"name": "Amazon", "slug": "amazon", "industry": "Technology / E-Commerce"},
  {"name": "Meta", "slug": "meta", "industry": "Technology / Social Media"},
  {"name": "Apple", "slug": "apple", "industry": "Technology / Consumer Electronics"},
  {"name": "Microsoft", "slug": "microsoft", "industry": "Technology / Cloud"},
  {"name": "McKinsey & Company", "slug": "mckinsey", "industry": "Management Consulting"},
  {"name": "Goldman Sachs", "slug": "goldman-sachs", "industry": "Investment Banking"},
  {"name": "JPMorgan Chase", "slug": "jpmorgan-chase", "industry": "Banking / Finance"},
  {"name": "Salesforce", "slug": "salesforce", "industry": "Enterprise Software"},
  {"name": "Netflix", "slug": "netflix", "industry": "Technology / Streaming"},
  {"name": "Stripe", "slug": "stripe", "industry": "Financial Technology"},
  {"name": "Airbnb", "slug": "airbnb", "industry": "Technology / Hospitality"},
  {"name": "Uber", "slug": "uber", "industry": "Technology / Transportation"},
  {"name": "Deloitte", "slug": "deloitte", "industry": "Professional Services"},
  {"name": "Boston Consulting Group", "slug": "boston-consulting-group", "industry": "Management Consulting"},
  {"name": "Johnson & Johnson", "slug": "johnson-and-johnson", "industry": "Healthcare / Pharmaceuticals"},
  {"name": "Procter & Gamble", "slug": "procter-and-gamble", "industry": "Consumer Goods"},
  {"name": "Tesla", "slug": "tesla", "industry": "Automotive / Technology"},
  {"name": "SpaceX", "slug": "spacex", "industry": "Aerospace"},
  {"name": "OpenAI", "slug": "openai", "industry": "Artificial Intelligence"}
]
```

To expand to 500, append entries following the same format. Sources for company lists:
- Fortune 500: https://fortune.com/fortune500/
- Glassdoor top employers
- LinkedIn top companies

### Task 4: Company page generation script

- [ ] **Step 1: Save `generate_company_pages.py` to `/tmp/career-companion-seo/`**

```python
#!/usr/bin/env python3
"""Generates 500 company interview prep pages using Claude Haiku and uploads to S3."""

import os, re, json, time, subprocess
import anthropic

client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

def slugify(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def generate_company_content(name, industry):
    prompt = f"""You are writing an interview preparation page for people interviewing at {name} ({industry}).

Write the following sections in HTML using only <h2>, <p>, <ul>, <li>, <strong> tags (no full HTML document):

1. **Company Overview** (1 paragraph, 60-80 words): What {name} does, its scale, and what makes it distinctive as an employer.

2. **Culture Signals** (bullet list of 4-5 points): Key cultural values, work environment traits, and what interviewers at {name} look for in candidates.

3. **Common Interview Questions** (numbered list of exactly 5 questions): Real-world questions commonly asked at {name} interviews. Mix behavioral, situational, and role-specific questions.

4. **Salary Ranges** (1 paragraph): Typical compensation ranges for common roles (software engineer, product manager, analyst, etc.) at {name}. Use market data ranges.

5. **Interview Process** (bullet list of 4-5 steps): The typical hiring process at {name} from application to offer.

Output only HTML body content. Be specific and accurate to {name}. No generic filler."""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def build_company_html(name, slug, industry, body_html):
    meta_desc = f"Preparing for a {name} interview? Get company culture insights, common interview questions, salary ranges, and AI coaching with Career Companion."
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{name} Interview Prep — Questions, Salary & Tips | Career Companion</title>
  <meta name="description" content="{meta_desc}">
  <meta property="og:title" content="{name} Interview Preparation Guide">
  <meta property="og:description" content="{meta_desc}">
  <link rel="canonical" href="https://offerletter.ai/interview-prep/{slug}">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *{{box-sizing:border-box;margin:0;padding:0;}}
    body{{font-family:'Plus Jakarta Sans',sans-serif;background:#0f172a;color:#e2e8f0;line-height:1.8;}}
    nav{{background:#0f172a;padding:1rem 2rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #1e293b;}}
    nav a.logo{{color:#fff;font-weight:700;font-size:1.1rem;text-decoration:none;}}
    nav a.cta{{background:#3b82f6;color:#fff;padding:0.5rem 1.2rem;border-radius:6px;text-decoration:none;font-size:0.9rem;font-weight:600;}}
    .hero{{background:linear-gradient(135deg,#1e3a5f 0%,#0f172a 60%);padding:3.5rem 2rem 3rem;text-align:center;}}
    .hero .badge{{display:inline-block;background:#1e40af;color:#93c5fd;font-size:0.8rem;font-weight:600;padding:0.3rem 0.8rem;border-radius:20px;margin-bottom:1rem;letter-spacing:0.05em;text-transform:uppercase;}}
    .hero h1{{font-size:clamp(1.6rem,3.5vw,2.5rem);font-weight:800;color:#fff;max-width:700px;margin:0 auto 0.75rem;line-height:1.3;}}
    .hero p{{color:#94a3b8;font-size:1rem;}}
    article{{max-width:760px;margin:0 auto;padding:2.5rem 2rem 4rem;}}
    h2{{font-size:1.2rem;font-weight:700;color:#f1f5f9;margin:2.5rem 0 0.75rem;padding-bottom:0.5rem;border-bottom:1px solid #1e293b;}}
    p{{color:#cbd5e1;margin-bottom:1.2rem;}}
    ul,ol{{color:#cbd5e1;margin:0 0 1.2rem 1.5rem;}}
    li{{margin-bottom:0.5rem;}}
    strong{{color:#e2e8f0;}}
    .cta-box{{background:linear-gradient(135deg,#1e40af,#3b82f6);border-radius:16px;padding:2.5rem;text-align:center;margin:3rem 0;}}
    .cta-box h2{{color:#fff;font-size:1.4rem;margin-bottom:0.75rem;border:none;padding:0;}}
    .cta-box p{{color:#bfdbfe;margin-bottom:1.5rem;}}
    .cta-btn{{display:inline-block;background:#fff;color:#1e40af;font-weight:700;padding:0.85rem 2rem;border-radius:8px;text-decoration:none;font-size:1rem;}}
    footer{{background:#0f172a;color:#64748b;text-align:center;padding:2rem;font-size:0.85rem;border-top:1px solid #1e293b;}}
    footer a{{color:#64748b;}}
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Career Companion</a>
    <a href="/interview.html#download" class="cta">Download Free</a>
  </nav>
  <div class="hero">
    <div class="badge">{industry}</div>
    <h1>Preparing for a {name} Interview?</h1>
    <p>Company culture, common questions, salary ranges &amp; real-time AI coaching</p>
  </div>
  <article>
    {body_html}
    <div class="cta-box">
      <h2>Get Real-Time Coaching at Your {name} Interview</h2>
      <p>Career Companion listens during your interview and surfaces the perfect answer on your screen — invisible to the interviewer. Used by candidates at {name} and 500+ top companies.</p>
      <a href="/interview.html#download" class="cta-btn">Download Free — Mac &amp; Windows</a>
    </div>
  </article>
  <footer>
    <p>&copy; 2026 Career Companion by Zietra Technologies. <a href="/privacy.html">Privacy Policy</a> &nbsp;|&nbsp; <a href="/interview.html">Home</a></p>
  </footer>
</body>
</html>"""

def upload_to_s3(local_path, s3_key):
    result = subprocess.run([
        "aws", "s3", "cp", local_path,
        f"s3://offerletter.ai/{s3_key}",
        "--content-type", "text/html",
        "--cache-control", "max-age=3600",
    ], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"  UPLOAD FAILED: {result.stderr.strip()}")
    else:
        print(f"  Uploaded: {s3_key}")

if __name__ == "__main__":
    out_base = "/tmp/career-companion-seo/interview-prep"
    os.makedirs(out_base, exist_ok=True)

    with open("/tmp/career-companion-seo/companies.json") as f:
        companies = json.load(f)

    print(f"Generating {len(companies)} company pages...")
    for i, company in enumerate(companies):
        name = company["name"]
        slug = company["slug"]
        industry = company.get("industry", "Technology")
        print(f"[{i+1}/{len(companies)}] {name}")
        try:
            body = generate_company_content(name, industry)
            html = build_company_html(name, slug, industry, body)
            local_path = f"{out_base}/{slug}.html"
            with open(local_path, "w") as f:
                f.write(html)
            upload_to_s3(local_path, f"interview-prep/{slug}/index.html")
        except Exception as e:
            print(f"  ERROR: {e}")
        if i < len(companies) - 1:
            time.sleep(0.5)

    print(f"\nDone. {len(companies)} company pages processed.")
```

- [ ] **Step 2: Run company page generator**

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
cd /tmp/career-companion-seo
python3 generate_company_pages.py
```

Expected: Generates and uploads one page per company. Runtime for 500 companies: ~25-40 minutes.

- [ ] **Step 3: Spot-check 3 company pages**

```bash
curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/interview-prep/google/"
curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/interview-prep/mckinsey/"
curl -s -o /dev/null -w "%{http_code}" "https://offerletter.ai/interview-prep/openai/"
```

Expected: all `200`.

---

## Chunk 4: Sitemap + Verification

### Task 5: Generate XML sitemap

- [ ] **Step 1: Save `generate_sitemap.py` to `/tmp/career-companion-seo/`**

```python
#!/usr/bin/env python3
"""Generates sitemap.xml covering all static pages, guide articles, and company pages."""

import json, re, os
from datetime import date

TODAY = date.today().isoformat()
BASE = "https://offerletter.ai"

STATIC_PAGES = [
    ("/", "1.0", "weekly"),
    ("/interview.html", "0.9", "weekly"),
    ("/guides/interview-preparation", "0.9", "weekly"),
    ("/guides/interview-coaching", "0.9", "weekly"),
    ("/guides/salary-negotiation", "0.9", "weekly"),
    ("/guides/new-job-success", "0.9", "weekly"),
]

ARTICLES = [
    # interview-preparation
    ("How to Research a Company Before an Interview", "interview-preparation"),
    ("How to Answer Tell Me About Yourself", "interview-preparation"),
    ("STAR Method How to Answer Behavioral Questions", "interview-preparation"),
    ("How to Prepare for Technical Interviews", "interview-preparation"),
    ("What to Wear to a Job Interview", "interview-preparation"),
    ("How to Prepare Questions to Ask the Interviewer", "interview-preparation"),
    ("Mock Interview Techniques That Actually Work", "interview-preparation"),
    ("Day of Interview Preparation Checklist", "interview-preparation"),
    # interview-coaching
    ("What Is AI Interview Coaching and How Does It Work", "interview-coaching"),
    ("How to Use a Second Screen During Remote Interviews", "interview-coaching"),
    ("Real Time Interview Tips Staying Calm and Reading Cues", "interview-coaching"),
    ("How AI Coaching Compares to Human Interview Coaches", "interview-coaching"),
    ("Setting Up Career Companion for Your First Interview", "interview-coaching"),
    ("How to Practice with AI Before the Real Interview", "interview-coaching"),
    ("AI Coaching for Phone Screens vs Video Interviews", "interview-coaching"),
    ("Privacy and Ethics of AI Interview Tools", "interview-coaching"),
    # salary-negotiation
    ("How to Research Salary Ranges for Any Job", "salary-negotiation"),
    ("How to Counter a Job Offer With Scripts", "salary-negotiation"),
    ("Negotiating Total Compensation Equity Bonus Benefits", "salary-negotiation"),
    ("How to Negotiate Salary Without Losing the Offer", "salary-negotiation"),
    ("Salary Negotiation Scripts That Actually Work", "salary-negotiation"),
    ("When to Negotiate Salary and When Not To", "salary-negotiation"),
    ("Negotiating a Raise vs Negotiating a New Job Offer", "salary-negotiation"),
    ("Using AI to Coach You Through Salary Negotiation", "salary-negotiation"),
    # new-job-success
    ("30 60 90 Day Plan Template for New Employees", "new-job-success"),
    ("How to Build Relationships in a New Job", "new-job-success"),
    ("Understanding Company Culture in Your First Month", "new-job-success"),
    ("How to Ask for Feedback Early and Often", "new-job-success"),
    ("Managing Up Building Trust with Your New Manager", "new-job-success"),
    ("How to Avoid Common New Employee Mistakes", "new-job-success"),
    ("Setting Goals in the First 90 Days", "new-job-success"),
    ("How AI Coaching Helps You Succeed at a New Job", "new-job-success"),
]

def slugify(s):
    s = s.lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def url_entry(loc, priority="0.7", changefreq="monthly"):
    return f"""  <url>
    <loc>{BASE}{loc}</loc>
    <lastmod>{TODAY}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>"""

entries = []

# Static pages
for path, priority, freq in STATIC_PAGES:
    entries.append(url_entry(path, priority, freq))

# Guide articles
for title, pillar in ARTICLES:
    slug = slugify(title)
    entries.append(url_entry(f"/guides/{pillar}/{slug}", "0.7", "monthly"))

# Company pages
with open("/tmp/career-companion-seo/companies.json") as f:
    companies = json.load(f)

for c in companies:
    entries.append(url_entry(f"/interview-prep/{c['slug']}", "0.6", "monthly"))

sitemap = """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
""" + "\n".join(entries) + "\n</urlset>"

out_path = "/tmp/career-companion-seo/sitemap.xml"
with open(out_path, "w") as f:
    f.write(sitemap)

total = len(STATIC_PAGES) + len(ARTICLES) + len(companies)
print(f"Sitemap written: {out_path} ({total} URLs)")
```

- [ ] **Step 2: Run sitemap generator**

```bash
cd /tmp/career-companion-seo
python3 generate_sitemap.py
```

Expected: `Sitemap written: /tmp/career-companion-seo/sitemap.xml (538 URLs)` (6 static + 32 articles + 500 companies).

- [ ] **Step 3: Upload sitemap to S3**

```bash
aws s3 cp /tmp/career-companion-seo/sitemap.xml \
  s3://offerletter.ai/sitemap.xml \
  --content-type application/xml \
  --cache-control "max-age=3600"
```

- [ ] **Step 4: Verify sitemap**

```bash
curl -s "https://offerletter.ai/sitemap.xml" | head -10
```

Expected: XML header + first `<url>` entry visible.

### Task 6: CloudFront invalidation + final verification

- [ ] **Step 1: Invalidate CloudFront cache**

```bash
aws cloudfront create-invalidation \
  --distribution-id E319UG6B4QE97L \
  --paths "/*"
```

Note the `Invalidation.Id` in the output. Propagation takes 1-3 minutes.

- [ ] **Step 2: Final smoke test**

```bash
# Pillar pages
for slug in interview-preparation interview-coaching salary-negotiation new-job-success; do
  echo -n "Pillar $slug: "
  curl -s -o /dev/null -w "%{http_code}\n" "https://offerletter.ai/guides/$slug/"
done

# Sample guide articles
echo -n "Article (interview prep): "
curl -s -o /dev/null -w "%{http_code}\n" "https://offerletter.ai/guides/interview-preparation/how-to-research-a-company-before-an-interview/"

echo -n "Article (salary): "
curl -s -o /dev/null -w "%{http_code}\n" "https://offerletter.ai/guides/salary-negotiation/how-to-counter-a-job-offer-with-scripts/"

# Sample company pages
echo -n "Company (google): "
curl -s -o /dev/null -w "%{http_code}\n" "https://offerletter.ai/interview-prep/google/"

echo -n "Company (mckinsey): "
curl -s -o /dev/null -w "%{http_code}\n" "https://offerletter.ai/interview-prep/mckinsey/"

# Sitemap
echo -n "Sitemap: "
curl -s -o /dev/null -w "%{http_code}\n" "https://offerletter.ai/sitemap.xml"
```

Expected: all `200`.

- [ ] **Step 3: Submit sitemap to Google Search Console**

Manual step (cannot be automated without GSC API key):
1. Go to Google Search Console for `offerletter.ai`
2. Navigate to: Sitemaps
3. Submit: `https://offerletter.ai/sitemap.xml`

---

## Summary

| Deliverable | Count | Location |
|---|---|---|
| Pillar pages | 4 | `s3://offerletter.ai/guides/{pillar}/index.html` |
| Guide articles | 32 | `s3://offerletter.ai/guides/{pillar}/{slug}/index.html` |
| Company pages | 500 | `s3://offerletter.ai/interview-prep/{slug}/index.html` |
| XML sitemap | 1 | `s3://offerletter.ai/sitemap.xml` |
| **Total new pages** | **537** | |

**Estimated API cost:** ~$2-4 for 532 Haiku calls (32 articles + 500 company pages at ~$0.005-0.008/call).

**Estimated runtime:** 35-50 minutes total (dominated by API calls and S3 uploads for company pages).
