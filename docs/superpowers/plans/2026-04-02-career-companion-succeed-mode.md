# Career Companion — Succeed Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fully functional ⭐ Succeed tab to the Career Companion app with four AI-powered tools to help users thrive in their new role from day one.

**Architecture:** Succeed Mode is a `tk.Frame` swapped in by the mode-switcher tab bar (added in Plan 3). Within the frame, a sub-nav row switches between 4 tool panels. All tools share a profile strip at the top (role, company, industry, level). Claude API powers all generation. Business Fluency Coach maintains conversation history.

**Tech Stack:** Python 3.11, tkinter, Anthropic Claude API (`claude-opus-4-6` for 90-day plan, `claude-sonnet-4-6` for all other tools), PyInstaller

**Critical constraints:**
- Windows app source lives IN the git repo at `apps/interview-assistant/`
- Mac app source lives OUTSIDE the git repo at `/Users/jeet/Downloads/interview-assistant/` — apply matching changes there separately
- All UI must use the same dark theme and color palette already used in the app (`#1a1a2e` bg, `#16213e` card, `#0f3460` accent, `#e94560` highlight)
- The mode-switcher tab bar from Plan 3 is assumed to be in place; Succeed Mode registers itself as a tab
- All Claude calls are non-blocking — run in a `threading.Thread`, then use `root.after()` to update the UI
- Streaming is preferred for long responses; use `stream=True` with `with client.messages.stream()` pattern

---

## Chunk 1: Succeed Shell + Sub-Nav

### Task 1.1: Create `SucceedMode` frame class with sub-nav and shared profile strip

**File:** `apps/interview-assistant/interview_assistant_windows.py`

**What to add:** A `SucceedMode(tk.Frame)` class that:
- Inherits from `tk.Frame`
- Renders a profile strip row at the top with four inputs: Role (Entry), Company (Entry), Industry (OptionMenu), Level (OptionMenu)
- Renders a sub-nav row below the profile strip with four buttons: `📅 90-Day Plan`, `🤝 Meeting Prep`, `💬 Business Fluency`, `✉️ Templates`
- Has a content area (`self.content_frame`) below the sub-nav that swaps panels when a sub-nav button is clicked
- Stores active panel reference in `self.active_panel`

**Industry options:** `["Tech / SaaS", "Finance / Banking", "Healthcare", "Retail / E-Commerce", "Consulting", "Manufacturing", "Media / Entertainment", "Education", "Government / Non-profit", "Other"]`

**Level options:** `["Individual Contributor", "Manager", "Senior Manager / Director", "VP / Executive", "C-Suite"]`

- [ ] **Step 1.1.1: Add `SucceedMode` class skeleton**

Insert after the last existing mode class (search for the class definition of `NegotiateMode` or similar, or append before `if __name__ == "__main__"`):

```python
class SucceedMode(tk.Frame):
    """⭐ Succeed Mode — AI tools to thrive in your new role."""

    INDUSTRIES = [
        "Tech / SaaS", "Finance / Banking", "Healthcare",
        "Retail / E-Commerce", "Consulting", "Manufacturing",
        "Media / Entertainment", "Education", "Government / Non-profit", "Other",
    ]
    LEVELS = [
        "Individual Contributor", "Manager",
        "Senior Manager / Director", "VP / Executive", "C-Suite",
    ]

    def __init__(self, parent, anthropic_client, **kwargs):
        super().__init__(parent, bg="#1a1a2e", **kwargs)
        self.client = anthropic_client
        self.active_panel = None
        self._build_profile_strip()
        self._build_subnav()
        self._build_content_area()
        # Show first panel by default
        self._switch_panel("90day")

    # ── Profile Strip ──────────────────────────────────────────────────────────
    def _build_profile_strip(self):
        strip = tk.Frame(self, bg="#16213e", pady=8)
        strip.pack(fill="x", padx=0, pady=(0, 2))

        # Role
        tk.Label(strip, text="Role:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(12, 2))
        self.var_role = tk.StringVar()
        tk.Entry(strip, textvariable=self.var_role, bg="#0f3460", fg="white",
                 insertbackground="white", font=("Segoe UI", 9), width=20,
                 relief="flat").pack(side="left", padx=(0, 10))

        # Company
        tk.Label(strip, text="Company:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(0, 2))
        self.var_company = tk.StringVar()
        tk.Entry(strip, textvariable=self.var_company, bg="#0f3460", fg="white",
                 insertbackground="white", font=("Segoe UI", 9), width=18,
                 relief="flat").pack(side="left", padx=(0, 10))

        # Industry
        tk.Label(strip, text="Industry:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(0, 2))
        self.var_industry = tk.StringVar(value=self.INDUSTRIES[0])
        tk.OptionMenu(strip, self.var_industry, *self.INDUSTRIES).pack(
            side="left", padx=(0, 10))

        # Level
        tk.Label(strip, text="Level:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(0, 2))
        self.var_level = tk.StringVar(value=self.LEVELS[0])
        tk.OptionMenu(strip, self.var_level, *self.LEVELS).pack(
            side="left", padx=(0, 10))

        # Style OptionMenus to match dark theme
        for widget in strip.winfo_children():
            if isinstance(widget, tk.OptionMenu):
                widget.config(bg="#0f3460", fg="white", activebackground="#e94560",
                              activeforeground="white", relief="flat",
                              font=("Segoe UI", 9), highlightthickness=0)
                widget["menu"].config(bg="#0f3460", fg="white",
                                      activebackground="#e94560")

    # ── Sub-Nav ────────────────────────────────────────────────────────────────
    def _build_subnav(self):
        self.subnav = tk.Frame(self, bg="#16213e")
        self.subnav.pack(fill="x", pady=(0, 4))
        self._nav_buttons = {}
        panels = [
            ("90day",    "📅 90-Day Plan"),
            ("meeting",  "🤝 Meeting Prep"),
            ("fluency",  "💬 Business Fluency"),
            ("templates","✉️ Templates"),
        ]
        for key, label in panels:
            btn = tk.Button(
                self.subnav, text=label,
                command=lambda k=key: self._switch_panel(k),
                bg="#16213e", fg="#aaaaaa",
                activebackground="#e94560", activeforeground="white",
                relief="flat", padx=14, pady=6,
                font=("Segoe UI", 9, "bold"), cursor="hand2",
            )
            btn.pack(side="left")
            self._nav_buttons[key] = btn

    def _switch_panel(self, key: str):
        # Highlight active button
        for k, btn in self._nav_buttons.items():
            btn.config(bg="#e94560" if k == key else "#16213e",
                       fg="white" if k == key else "#aaaaaa")
        # Destroy previous panel
        if self.active_panel is not None:
            self.active_panel.destroy()
        # Create new panel
        builders = {
            "90day":     self._build_90day_panel,
            "meeting":   self._build_meeting_panel,
            "fluency":   self._build_fluency_panel,
            "templates": self._build_templates_panel,
        }
        self.active_panel = builders[key](self.content_frame)
        self.active_panel.pack(fill="both", expand=True)

    # ── Content Area ───────────────────────────────────────────────────────────
    def _build_content_area(self):
        self.content_frame = tk.Frame(self, bg="#1a1a2e")
        self.content_frame.pack(fill="both", expand=True)

    # ── Panel builders (stubs — filled in subsequent tasks) ───────────────────
    def _build_90day_panel(self, parent):
        f = tk.Frame(parent, bg="#1a1a2e")
        tk.Label(f, text="90-Day Plan panel — coming in Task 2",
                 bg="#1a1a2e", fg="#aaaaaa").pack(pady=40)
        return f

    def _build_meeting_panel(self, parent):
        f = tk.Frame(parent, bg="#1a1a2e")
        tk.Label(f, text="Meeting Prep panel — coming in Task 3",
                 bg="#1a1a2e", fg="#aaaaaa").pack(pady=40)
        return f

    def _build_fluency_panel(self, parent):
        f = tk.Frame(parent, bg="#1a1a2e")
        tk.Label(f, text="Business Fluency panel — coming in Task 4",
                 bg="#1a1a2e", fg="#aaaaaa").pack(pady=40)
        return f

    def _build_templates_panel(self, parent):
        f = tk.Frame(parent, bg="#1a1a2e")
        tk.Label(f, text="Communication Templates panel — coming in Task 5",
                 bg="#1a1a2e", fg="#aaaaaa").pack(pady=40)
        return f
```

- [ ] **Step 1.1.2: Register `SucceedMode` in the mode-switcher tab bar**

In the main `App` class (or wherever the tab bar is built in Plan 3), add the Succeed tab:

```python
# In the tab bar setup — add alongside Research/Interview/Negotiate tabs:
self.succeed_frame = SucceedMode(self.content_area, anthropic_client=self.anthropic_client)

# In the tab switcher:
"⭐ Succeed": self.succeed_frame,
```

- [ ] **Step 1.1.3: Verify shell loads without errors**

```bash
cd apps/interview-assistant
python -c "import tkinter; print('tkinter OK')"
python -m py_compile interview_assistant_windows.py && echo "syntax OK"
```

Expected: both print OK with no tracebacks.

- [ ] **Step 1.1.4: Commit**

```bash
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(succeed): add SucceedMode shell with sub-nav and profile strip"
```

---

## Chunk 2: 90-Day Plan Generator

### Task 2.1: Implement `_build_90day_panel` with full Claude opus generation

**Model:** `claude-opus-4-6` (complex, long structured output)

**Input:** Role, company, industry, level (from profile strip) + start date picker (ttk.DateEntry or manual Entry)

**Output format:** Claude returns a JSON array of week objects. Each week object:
```json
{
  "week": 1,
  "theme": "Orient & Observe",
  "milestones": ["...", "..."],
  "relationships": ["..."],
  "quick_wins": ["..."],
  "learning": ["..."]
}
```

The UI renders each week as a card in a scrollable canvas.

- [ ] **Step 2.1.1: Replace `_build_90day_panel` stub with full implementation**

```python
def _build_90day_panel(self, parent):
    """90-Day Plan Generator panel."""
    f = tk.Frame(parent, bg="#1a1a2e")

    # ── Top controls ──────────────────────────────────────────────────────
    ctrl = tk.Frame(f, bg="#16213e", pady=8)
    ctrl.pack(fill="x", padx=0)

    tk.Label(ctrl, text="Start Date (YYYY-MM-DD):", bg="#16213e", fg="#aaaaaa",
             font=("Segoe UI", 9)).pack(side="left", padx=(12, 4))
    self._90day_start = tk.StringVar(value=datetime.today().strftime("%Y-%m-%d"))
    tk.Entry(ctrl, textvariable=self._90day_start, bg="#0f3460", fg="white",
             insertbackground="white", font=("Segoe UI", 9), width=14,
             relief="flat").pack(side="left", padx=(0, 12))

    tk.Button(
        ctrl, text="✨ Generate My 90-Day Plan",
        command=self._generate_90day_plan,
        bg="#e94560", fg="white", activebackground="#c73652",
        relief="flat", padx=16, pady=5,
        font=("Segoe UI", 9, "bold"), cursor="hand2",
    ).pack(side="left")

    self._90day_status = tk.Label(ctrl, text="", bg="#16213e", fg="#aaaaaa",
                                   font=("Segoe UI", 8, "italic"))
    self._90day_status.pack(side="left", padx=8)

    # ── Scrollable card area ───────────────────────────────────────────────
    canvas_frame = tk.Frame(f, bg="#1a1a2e")
    canvas_frame.pack(fill="both", expand=True, padx=8, pady=8)

    self._90day_canvas = tk.Canvas(canvas_frame, bg="#1a1a2e",
                                    highlightthickness=0)
    scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical",
                               command=self._90day_canvas.yview)
    self._90day_cards_frame = tk.Frame(self._90day_canvas, bg="#1a1a2e")

    self._90day_cards_frame.bind(
        "<Configure>",
        lambda e: self._90day_canvas.configure(
            scrollregion=self._90day_canvas.bbox("all"))
    )
    self._90day_canvas.create_window((0, 0), window=self._90day_cards_frame,
                                      anchor="nw")
    self._90day_canvas.configure(yscrollcommand=scrollbar.set)
    self._90day_canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")

    # Mouse wheel scrolling
    self._90day_canvas.bind_all(
        "<MouseWheel>",
        lambda e: self._90day_canvas.yview_scroll(-1 * (e.delta // 120), "units")
    )
    return f

def _generate_90day_plan(self):
    """Kick off Claude opus generation in a background thread."""
    role    = self.var_role.get().strip() or "New Employee"
    company = self.var_company.get().strip() or "your company"
    industry = self.var_industry.get()
    level   = self.var_level.get()
    start   = self._90day_start.get().strip()

    # Clear previous cards
    for w in self._90day_cards_frame.winfo_children():
        w.destroy()

    self._90day_status.config(text="⏳ Generating your plan with Claude Opus…")

    def _run():
        try:
            prompt = f"""You are an expert executive onboarding coach.
Generate a 90-day onboarding plan for:
- Role: {role}
- Company: {company}
- Industry: {industry}
- Level: {level}
- Start Date: {start}

Return ONLY a valid JSON array (no markdown, no prose) of 13 week objects.
Each object must have exactly these keys:
  "week" (int 1-13),
  "theme" (string, 3-5 word title),
  "milestones" (array of 3 strings),
  "relationships" (array of 2 strings — key people to connect with),
  "quick_wins" (array of 2 strings — visible wins to pursue),
  "learning" (array of 2 strings — top learning priorities)

Make the plan highly specific to {industry} and the {level} level.
Do not include any text before or after the JSON array."""

            message = self.client.messages.create(
                model="claude-opus-4-6",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = message.content[0].text.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            import json
            weeks = json.loads(raw)
            self.after(0, lambda: self._render_90day_cards(weeks))
        except Exception as e:
            self.after(0, lambda: self._90day_status.config(
                text=f"❌ Error: {e}", fg="#e94560"))

    threading.Thread(target=_run, daemon=True).start()

def _render_90day_cards(self, weeks: list):
    """Render week cards into the scrollable canvas."""
    self._90day_status.config(text=f"✅ Plan ready — {len(weeks)} weeks generated")
    for w in self._90day_cards_frame.winfo_children():
        w.destroy()

    MONTH_COLORS = ["#0f3460", "#1a4a7a", "#0f5460"]
    for week_data in weeks:
        week_num = week_data.get("week", 0)
        month_idx = min((week_num - 1) // 4, 2)
        card_bg = MONTH_COLORS[month_idx]

        card = tk.Frame(self._90day_cards_frame, bg=card_bg,
                        padx=12, pady=10, relief="flat")
        card.pack(fill="x", padx=4, pady=4)

        # Header row
        header = tk.Frame(card, bg=card_bg)
        header.pack(fill="x")
        tk.Label(header, text=f"Week {week_num}",
                 bg=card_bg, fg="#e94560",
                 font=("Segoe UI", 10, "bold")).pack(side="left")
        tk.Label(header, text=f"  {week_data.get('theme', '')}",
                 bg=card_bg, fg="white",
                 font=("Segoe UI", 10)).pack(side="left")

        # Sections
        sections = [
            ("🎯 Milestones",   week_data.get("milestones", [])),
            ("🤝 Relationships", week_data.get("relationships", [])),
            ("⚡ Quick Wins",    week_data.get("quick_wins", [])),
            ("📚 Learning",      week_data.get("learning", [])),
        ]
        for section_title, items in sections:
            tk.Label(card, text=section_title,
                     bg=card_bg, fg="#aaccff",
                     font=("Segoe UI", 8, "bold")).pack(anchor="w", pady=(6, 0))
            for item in items:
                tk.Label(card, text=f"  • {item}",
                         bg=card_bg, fg="#dddddd",
                         font=("Segoe UI", 8),
                         wraplength=580, justify="left").pack(anchor="w")
```

- [ ] **Step 2.1.2: Verify syntax**

```bash
cd apps/interview-assistant
python -m py_compile interview_assistant_windows.py && echo "syntax OK"
```

- [ ] **Step 2.1.3: Commit**

```bash
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(succeed): implement 90-Day Plan Generator with Claude Opus"
```

---

## Chunk 3: Meeting Prep AI

### Task 3.1: Implement `_build_meeting_panel`

**Model:** `claude-sonnet-4-6`

**Input:** Free-text meeting description (multi-line Entry or Text widget)

**Output:** Four sections rendered as labeled cards:
1. Talking Points (3-5 bullet points)
2. Questions to Ask (3-5 questions)
3. Terms to Know (3-5 glossary terms with one-line definitions)
4. Financial Context (if meeting involves numbers/budget — 2-3 relevant metrics explained)

Claude returns structured JSON; UI renders as 2×2 card grid.

- [ ] **Step 3.1.1: Replace `_build_meeting_panel` stub**

```python
def _build_meeting_panel(self, parent):
    """Meeting Prep AI panel."""
    f = tk.Frame(parent, bg="#1a1a2e")

    # ── Input area ────────────────────────────────────────────────────────
    input_frame = tk.Frame(f, bg="#16213e", pady=10)
    input_frame.pack(fill="x")

    tk.Label(input_frame, text="Describe your upcoming meeting:",
             bg="#16213e", fg="#aaaaaa",
             font=("Segoe UI", 9)).pack(anchor="w", padx=12)

    self._meeting_text = tk.Text(
        input_frame, height=3, bg="#0f3460", fg="white",
        insertbackground="white", font=("Segoe UI", 9),
        relief="flat", padx=8, pady=6, wrap="word",
    )
    self._meeting_text.pack(fill="x", padx=12, pady=(4, 0))
    self._meeting_text.insert("1.0",
        'e.g. "1:1 with my manager to discuss Q2 OKRs and my first 30 days"')
    self._meeting_text.bind("<FocusIn>", self._meeting_clear_placeholder)

    btn_row = tk.Frame(input_frame, bg="#16213e", pady=6)
    btn_row.pack(fill="x", padx=12)
    tk.Button(
        btn_row, text="🧠 Prep Me for This Meeting",
        command=self._generate_meeting_prep,
        bg="#e94560", fg="white", activebackground="#c73652",
        relief="flat", padx=16, pady=5,
        font=("Segoe UI", 9, "bold"), cursor="hand2",
    ).pack(side="left")
    self._meeting_status = tk.Label(btn_row, text="", bg="#16213e",
                                     fg="#aaaaaa", font=("Segoe UI", 8, "italic"))
    self._meeting_status.pack(side="left", padx=8)

    # ── Output 2×2 grid ───────────────────────────────────────────────────
    grid = tk.Frame(f, bg="#1a1a2e")
    grid.pack(fill="both", expand=True, padx=8, pady=8)
    grid.columnconfigure(0, weight=1)
    grid.columnconfigure(1, weight=1)
    grid.rowconfigure(0, weight=1)
    grid.rowconfigure(1, weight=1)

    self._meeting_cards = {}
    cards_config = [
        ("talking_points",    "🗣️ Talking Points",       0, 0),
        ("questions",         "❓ Questions to Ask",      0, 1),
        ("terms",             "📖 Terms to Know",          1, 0),
        ("financial_context", "📊 Financial Context",     1, 1),
    ]
    for key, title, row, col in cards_config:
        card = tk.Frame(grid, bg="#16213e", padx=10, pady=8)
        card.grid(row=row, column=col, sticky="nsew", padx=4, pady=4)
        tk.Label(card, text=title, bg="#16213e", fg="#e94560",
                 font=("Segoe UI", 9, "bold")).pack(anchor="w")
        text_area = tk.Text(card, bg="#16213e", fg="#dddddd",
                            font=("Segoe UI", 8), relief="flat",
                            wrap="word", state="disabled",
                            height=7, padx=4, pady=4)
        text_area.pack(fill="both", expand=True, pady=(4, 0))
        self._meeting_cards[key] = text_area
    return f

def _meeting_clear_placeholder(self, event):
    if self._meeting_text.get("1.0", "end-1c").startswith('e.g. "'):
        self._meeting_text.delete("1.0", "end")
        self._meeting_text.config(fg="white")

def _generate_meeting_prep(self):
    """Generate meeting prep in background thread."""
    desc = self._meeting_text.get("1.0", "end-1c").strip()
    if not desc or desc.startswith('e.g. "'):
        self._meeting_status.config(text="⚠️ Please describe your meeting first")
        return

    role    = self.var_role.get().strip() or "employee"
    company = self.var_company.get().strip() or "your company"
    industry = self.var_industry.get()

    self._meeting_status.config(text="⏳ Prepping you for this meeting…")

    def _run():
        try:
            prompt = f"""You are an expert executive coach preparing a {role} at {company} ({industry}) for a meeting.

Meeting description: {desc}

Return ONLY valid JSON (no markdown) with exactly these keys:
{{
  "talking_points": ["point 1", "point 2", "point 3"],
  "questions": ["question 1", "question 2", "question 3"],
  "terms": [{{"term": "ARR", "definition": "Annual Recurring Revenue — total value of subscriptions per year"}}, ...],
  "financial_context": ["context point 1", "context point 2"]
}}

Make it specific to {industry}. talking_points and questions: 3-5 items each.
terms: 3-5 relevant business/industry terms with plain-English definitions.
financial_context: 2-3 financial metrics or business concepts relevant to this meeting.
If the meeting is not financial, financial_context can address business impact instead."""

            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            import json
            raw = message.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            data = json.loads(raw)
            self.after(0, lambda: self._render_meeting_prep(data))
        except Exception as e:
            self.after(0, lambda: self._meeting_status.config(
                text=f"❌ Error: {e}", fg="#e94560"))

    threading.Thread(target=_run, daemon=True).start()

def _render_meeting_prep(self, data: dict):
    """Populate the 2×2 card grid."""
    self._meeting_status.config(text="✅ Ready — you've got this!")

    def _set_card(key, lines):
        widget = self._meeting_cards[key]
        widget.config(state="normal")
        widget.delete("1.0", "end")
        widget.insert("end", lines)
        widget.config(state="disabled")

    # Talking Points
    pts = "\n".join(f"• {p}" for p in data.get("talking_points", []))
    _set_card("talking_points", pts)

    # Questions
    qs = "\n".join(f"• {q}" for q in data.get("questions", []))
    _set_card("questions", qs)

    # Terms
    terms = data.get("terms", [])
    if terms and isinstance(terms[0], dict):
        terms_text = "\n".join(
            f"• {t['term']}: {t['definition']}" for t in terms
        )
    else:
        terms_text = "\n".join(f"• {t}" for t in terms)
    _set_card("terms", terms_text)

    # Financial context
    fc = "\n".join(f"• {c}" for c in data.get("financial_context", []))
    _set_card("financial_context", fc)
```

- [ ] **Step 3.1.2: Verify syntax**

```bash
python -m py_compile apps/interview-assistant/interview_assistant_windows.py && echo "syntax OK"
```

- [ ] **Step 3.1.3: Commit**

```bash
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(succeed): implement Meeting Prep AI with 2x2 card grid"
```

---

## Chunk 4: Business Fluency Coach (Chat UI)

### Task 4.1: Implement `_build_fluency_panel` as a persistent chat

**Model:** `claude-sonnet-4-6`

**Design:** A chat UI with:
- Scrollable message history (alternating user/AI bubbles)
- Multi-line input at the bottom with Send button + Enter key binding
- Conversation history maintained in `self._fluency_history` list (list of `{"role": ..., "content": ...}` dicts)
- System prompt primes Claude as a plain-English business tutor adapted to the user's industry/level

**Quick-start suggestion chips:** Row of clickable example questions above the input box.

- [ ] **Step 4.1.1: Replace `_build_fluency_panel` stub**

```python
def _build_fluency_panel(self, parent):
    """Business Fluency Coach chat panel."""
    f = tk.Frame(parent, bg="#1a1a2e")
    self._fluency_history = []

    # ── Chat history area ─────────────────────────────────────────────────
    chat_frame = tk.Frame(f, bg="#1a1a2e")
    chat_frame.pack(fill="both", expand=True, padx=8, pady=(8, 0))

    self._fluency_canvas = tk.Canvas(chat_frame, bg="#1a1a2e",
                                      highlightthickness=0)
    scrollbar = ttk.Scrollbar(chat_frame, orient="vertical",
                               command=self._fluency_canvas.yview)
    self._fluency_msg_frame = tk.Frame(self._fluency_canvas, bg="#1a1a2e")
    self._fluency_msg_frame.bind(
        "<Configure>",
        lambda e: self._fluency_canvas.configure(
            scrollregion=self._fluency_canvas.bbox("all"))
    )
    self._fluency_canvas.create_window((0, 0), window=self._fluency_msg_frame,
                                        anchor="nw")
    self._fluency_canvas.configure(yscrollcommand=scrollbar.set)
    self._fluency_canvas.pack(side="left", fill="both", expand=True)
    scrollbar.pack(side="right", fill="y")
    self._fluency_canvas.bind_all(
        "<MouseWheel>",
        lambda e: self._fluency_canvas.yview_scroll(-1 * (e.delta // 120), "units")
    )

    # Welcome message
    self._fluency_add_message(
        "assistant",
        f"Hi! I'm your Business Fluency Coach. Ask me anything about business "
        f"concepts, finance, strategy, or {self.var_industry.get()} terminology "
        f"— I'll explain it in plain English at the {self.var_level.get()} level."
    )

    # ── Suggestion chips ──────────────────────────────────────────────────
    chips_frame = tk.Frame(f, bg="#1a1a2e")
    chips_frame.pack(fill="x", padx=8, pady=(4, 0))
    tk.Label(chips_frame, text="Try asking:", bg="#1a1a2e", fg="#888888",
             font=("Segoe UI", 8)).pack(side="left", padx=(0, 6))
    suggestions = [
        "What is ARR?",
        "Explain EBITDA",
        "What is burn rate?",
        "How to read a P&L?",
        "What does YoY mean?",
    ]
    for s in suggestions:
        tk.Button(
            chips_frame, text=s,
            command=lambda q=s: self._fluency_send(q),
            bg="#0f3460", fg="#aaaaaa", activebackground="#e94560",
            activeforeground="white", relief="flat", padx=8, pady=2,
            font=("Segoe UI", 8), cursor="hand2",
        ).pack(side="left", padx=2)

    # ── Input row ─────────────────────────────────────────────────────────
    input_row = tk.Frame(f, bg="#16213e", pady=8)
    input_row.pack(fill="x", padx=0, pady=(4, 0))

    self._fluency_input = tk.Text(
        input_row, height=2, bg="#0f3460", fg="white",
        insertbackground="white", font=("Segoe UI", 9),
        relief="flat", padx=8, pady=4, wrap="word",
    )
    self._fluency_input.pack(side="left", fill="x", expand=True,
                              padx=(12, 6), pady=0)
    self._fluency_input.bind("<Return>", self._fluency_on_enter)
    self._fluency_input.bind("<Shift-Return>", lambda e: None)  # allow newline

    tk.Button(
        input_row, text="Send ↩",
        command=lambda: self._fluency_send(),
        bg="#e94560", fg="white", activebackground="#c73652",
        relief="flat", padx=12, pady=6,
        font=("Segoe UI", 9, "bold"), cursor="hand2",
    ).pack(side="left", padx=(0, 12))

    return f

def _fluency_add_message(self, role: str, text: str):
    """Add a chat bubble to the fluency message frame."""
    is_user = role == "user"
    bubble_bg = "#0f3460" if is_user else "#16213e"
    anchor    = "e" if is_user else "w"
    padx_args = (80, 8) if is_user else (8, 80)

    bubble = tk.Frame(self._fluency_msg_frame, bg=bubble_bg,
                      padx=10, pady=8)
    bubble.pack(fill="x", padx=padx_args, pady=3, anchor=anchor)

    if not is_user:
        tk.Label(bubble, text="🤖 Coach", bg=bubble_bg, fg="#e94560",
                 font=("Segoe UI", 8, "bold")).pack(anchor="w")

    tk.Label(bubble, text=text, bg=bubble_bg, fg="white",
             font=("Segoe UI", 9), wraplength=480,
             justify="left").pack(anchor="w")

    # Auto-scroll to bottom
    self._fluency_canvas.update_idletasks()
    self._fluency_canvas.yview_moveto(1.0)

def _fluency_on_enter(self, event):
    """Send on Enter; Shift+Enter inserts newline."""
    if not event.state & 0x1:  # Shift not held
        self._fluency_send()
        return "break"

def _fluency_send(self, prefill: str = ""):
    """Send message to Business Fluency Coach."""
    if prefill:
        user_msg = prefill
    else:
        user_msg = self._fluency_input.get("1.0", "end-1c").strip()
        self._fluency_input.delete("1.0", "end")

    if not user_msg:
        return

    self._fluency_add_message("user", user_msg)
    self._fluency_history.append({"role": "user", "content": user_msg})

    # Thinking indicator
    thinking = tk.Label(self._fluency_msg_frame, text="⏳ Coach is thinking…",
                        bg="#1a1a2e", fg="#888888",
                        font=("Segoe UI", 8, "italic"))
    thinking.pack(anchor="w", padx=12)
    self._fluency_canvas.update_idletasks()
    self._fluency_canvas.yview_moveto(1.0)

    def _run():
        try:
            system = (
                f"You are a friendly, direct Business Fluency Coach helping a "
                f"{self.var_level.get()} in {self.var_industry.get()} at "
                f"{self.var_company.get() or 'a company'}. "
                f"Explain business concepts in plain English. Be concise — "
                f"2-4 paragraphs max. Use simple analogies. Avoid jargon unless "
                f"you explain it. If asked about financial metrics, give a "
                f"practical example with numbers."
            )
            response = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=800,
                system=system,
                messages=self._fluency_history,
            )
            reply = response.content[0].text.strip()
            self._fluency_history.append({"role": "assistant", "content": reply})
            self.after(0, lambda: [thinking.destroy(),
                                    self._fluency_add_message("assistant", reply)])
        except Exception as e:
            self.after(0, lambda: [thinking.destroy(),
                                    self._fluency_add_message(
                                        "assistant", f"Sorry, I hit an error: {e}")])

    threading.Thread(target=_run, daemon=True).start()
```

- [ ] **Step 4.1.2: Verify syntax**

```bash
python -m py_compile apps/interview-assistant/interview_assistant_windows.py && echo "syntax OK"
```

- [ ] **Step 4.1.3: Commit**

```bash
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(succeed): implement Business Fluency Coach chat with conversation history"
```

---

## Chunk 5: Communication Templates

### Task 5.1: Implement `_build_templates_panel`

**Model:** `claude-sonnet-4-6`

**Design:**
- Dropdown to select template type
- Optional "Context" text field (user adds their specific details)
- Generate button → Claude fills the template → result shown in a large read-only Text widget
- Copy to Clipboard button

**Templates:**
1. First-Day Introduction Email
2. Weekly Status Update
3. Respectful Push-Back Email
4. Feedback Request
5. 1:1 Meeting Agenda
6. Thank-You After a Meeting
7. Escalation Email

- [ ] **Step 5.1.1: Replace `_build_templates_panel` stub**

```python
def _build_templates_panel(self, parent):
    """Communication Templates panel."""
    f = tk.Frame(parent, bg="#1a1a2e")

    TEMPLATES = [
        "First-Day Introduction Email",
        "Weekly Status Update",
        "Respectful Push-Back Email",
        "Feedback Request Email",
        "1:1 Meeting Agenda",
        "Thank-You After a Meeting",
        "Escalation Email",
    ]

    # ── Controls ──────────────────────────────────────────────────────────
    ctrl = tk.Frame(f, bg="#16213e", pady=10)
    ctrl.pack(fill="x")

    tk.Label(ctrl, text="Template:", bg="#16213e", fg="#aaaaaa",
             font=("Segoe UI", 9)).pack(side="left", padx=(12, 4))
    self._tmpl_var = tk.StringVar(value=TEMPLATES[0])
    menu = tk.OptionMenu(ctrl, self._tmpl_var, *TEMPLATES)
    menu.config(bg="#0f3460", fg="white", activebackground="#e94560",
                relief="flat", font=("Segoe UI", 9), highlightthickness=0)
    menu["menu"].config(bg="#0f3460", fg="white", activebackground="#e94560")
    menu.pack(side="left", padx=(0, 12))

    tk.Button(
        ctrl, text="✍️ Generate Template",
        command=self._generate_template,
        bg="#e94560", fg="white", activebackground="#c73652",
        relief="flat", padx=16, pady=5,
        font=("Segoe UI", 9, "bold"), cursor="hand2",
    ).pack(side="left")

    self._tmpl_status = tk.Label(ctrl, text="", bg="#16213e", fg="#aaaaaa",
                                  font=("Segoe UI", 8, "italic"))
    self._tmpl_status.pack(side="left", padx=8)

    # ── Optional context field ────────────────────────────────────────────
    ctx_frame = tk.Frame(f, bg="#16213e", padx=12, pady=(0, 8))
    ctx_frame.pack(fill="x")
    tk.Label(ctx_frame, text="Optional context (meeting topic, recipient, situation):",
             bg="#16213e", fg="#888888",
             font=("Segoe UI", 8)).pack(anchor="w")
    self._tmpl_context = tk.Text(
        ctx_frame, height=2, bg="#0f3460", fg="white",
        insertbackground="white", font=("Segoe UI", 9),
        relief="flat", padx=6, pady=4, wrap="word",
    )
    self._tmpl_context.pack(fill="x", pady=(2, 0))

    # ── Output area ───────────────────────────────────────────────────────
    out_frame = tk.Frame(f, bg="#16213e", padx=12, pady=8)
    out_frame.pack(fill="both", expand=True)

    copy_row = tk.Frame(out_frame, bg="#16213e")
    copy_row.pack(fill="x", pady=(0, 4))
    tk.Label(copy_row, text="Generated Template:", bg="#16213e", fg="#aaaaaa",
             font=("Segoe UI", 8, "bold")).pack(side="left")
    tk.Button(
        copy_row, text="📋 Copy to Clipboard",
        command=self._copy_template,
        bg="#0f3460", fg="white", activebackground="#e94560",
        relief="flat", padx=10, pady=2,
        font=("Segoe UI", 8), cursor="hand2",
    ).pack(side="right")

    self._tmpl_output = tk.Text(
        out_frame, bg="#0f3460", fg="white",
        insertbackground="white", font=("Segoe UI", 9),
        relief="flat", padx=8, pady=8, wrap="word",
        state="disabled",
    )
    self._tmpl_output.pack(fill="both", expand=True)
    return f

def _generate_template(self):
    """Generate communication template via Claude."""
    template_name = self._tmpl_var.get()
    context = self._tmpl_context.get("1.0", "end-1c").strip()
    role    = self.var_role.get().strip() or "employee"
    company = self.var_company.get().strip() or "your company"
    industry = self.var_industry.get()
    level   = self.var_level.get()

    self._tmpl_status.config(text="⏳ Generating template…")
    self._tmpl_output.config(state="normal")
    self._tmpl_output.delete("1.0", "end")
    self._tmpl_output.config(state="disabled")

    def _run():
        try:
            context_clause = f"\n\nAdditional context: {context}" if context else ""
            prompt = f"""You are an expert business communication coach.
Generate a professional {template_name} for:
- Name/Role: {role}
- Company: {company}
- Industry: {industry}
- Seniority: {level}{context_clause}

Write the complete, ready-to-send email or document.
Use [brackets] for parts they should customize.
Be professional, warm, and concise.
Do not add any explanation or commentary — just the template itself."""

            message = self.client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}],
            )
            result = message.content[0].text.strip()
            self.after(0, lambda: self._render_template(result))
        except Exception as e:
            self.after(0, lambda: self._tmpl_status.config(
                text=f"❌ Error: {e}", fg="#e94560"))

    threading.Thread(target=_run, daemon=True).start()

def _render_template(self, text: str):
    self._tmpl_status.config(text="✅ Template ready — edit as needed")
    self._tmpl_output.config(state="normal")
    self._tmpl_output.delete("1.0", "end")
    self._tmpl_output.insert("1.0", text)
    self._tmpl_output.config(state="disabled")

def _copy_template(self):
    text = self._tmpl_output.get("1.0", "end-1c")
    if text.strip():
        self.clipboard_clear()
        self.clipboard_append(text)
        self._tmpl_status.config(text="✅ Copied to clipboard!")
```

- [ ] **Step 5.1.2: Verify syntax**

```bash
python -m py_compile apps/interview-assistant/interview_assistant_windows.py && echo "syntax OK"
```

- [ ] **Step 5.1.3: Commit**

```bash
git add apps/interview-assistant/interview_assistant_windows.py
git commit -m "feat(succeed): implement Communication Templates with copy-to-clipboard"
```

---

## Chunk 6: Windows Parity + Build

### Task 6.1: Verify all imports are present

The new Succeed Mode code uses: `threading`, `datetime`, `json`, `tkinter`, `tkinter.ttk`.

- [ ] **Step 6.1.1: Confirm imports at top of file**

```bash
grep -n "^import threading\|^from datetime\|^import json\|^from tkinter import ttk" \
  apps/interview-assistant/interview_assistant_windows.py
```

Expected: at least these lines present:
- `import threading`
- `from datetime import datetime`
- `import json`
- `from tkinter import ttk`

If any are missing, add them to the imports block at the top of the file.

- [ ] **Step 6.1.2: Full syntax check**

```bash
python -m py_compile apps/interview-assistant/interview_assistant_windows.py && echo "PASS"
```

### Task 6.2: PyInstaller spec — no new dependencies required

Succeed Mode uses only standard library + `anthropic` (already in spec). No new packages needed.

- [ ] **Step 6.2.1: Confirm `anthropic` is in the spec's `hiddenimports`**

```bash
grep -n "anthropic" apps/interview-assistant/InterviewAssistant_Windows.spec
```

Expected: at least one line referencing `anthropic` in `hiddenimports`.

- [ ] **Step 6.2.2: Trigger Windows GitHub Actions build**

Push changes, then trigger the Windows build workflow:

```bash
git push origin main
gh workflow run build-windows.yml --ref main
gh run list --workflow=build-windows.yml --limit 3
```

Monitor until complete:
```bash
gh run watch <run-id>
```

- [ ] **Step 6.2.3: Download and smoke-test the EXE**

```bash
gh run download <run-id>
# Verify CareerCompanion.exe exists (not InterviewAssistant.exe)
ls *.exe
```

Expected: `CareerCompanion.exe` present.

- [ ] **Step 6.2.4: Commit final Windows parity notes**

```bash
git add apps/interview-assistant/
git commit -m "feat(succeed): Windows build verified — Succeed Mode all 4 panels included"
```

### Task 6.3: Mac source parity

The Mac app source lives OUTSIDE the git repo at `/Users/jeet/Downloads/interview-assistant/`. Apply the same `SucceedMode` class to the Mac version manually:

- [ ] **Step 6.3.1: Copy class from Windows source to Mac source**

```bash
# Verify Mac source file exists
ls /Users/jeet/Downloads/interview-assistant/*.py
```

- [ ] **Step 6.3.2: Manually diff and apply SucceedMode class**

Copy the full `SucceedMode` class (and the `_switch_panel` logic + registration in `App`) into the Mac Python file. Mac version uses the same tkinter API — no platform-specific changes needed for Succeed Mode.

- [ ] **Step 6.3.3: Mac build + notarization**

Follow the existing Mac build + notarization workflow documented in `docs/superpowers/plans/2026-04-01-career-companion-foundation.md` (Chunk 4).

---

## Verification Checklist

Before declaring Succeed Mode complete, verify each layer:

```
## Verification
- [ ] Grep proof: SucceedMode class exists in Windows source
      grep -n "class SucceedMode" apps/interview-assistant/interview_assistant_windows.py

- [ ] Grep proof: All 4 panel builders present
      grep -n "_build_90day_panel\|_build_meeting_panel\|_build_fluency_panel\|_build_templates_panel" \
        apps/interview-assistant/interview_assistant_windows.py

- [ ] Syntax proof: py_compile passes with zero errors
      python -m py_compile apps/interview-assistant/interview_assistant_windows.py && echo PASS

- [ ] Import proof: All required imports present
      grep -n "import threading\|from datetime\|import json\|from tkinter import ttk" \
        apps/interview-assistant/interview_assistant_windows.py

- [ ] Build proof: gh run view shows Windows build succeeded
      gh run list --workflow=build-windows.yml --limit 1

- [ ] EXE proof: CareerCompanion.exe artifact contains Succeed Mode
      (Manual test: launch EXE, click ⭐ Succeed tab, verify sub-nav and all 4 panels load)

- [ ] Claude proof: 90-Day Plan generates without error
      (Manual test: fill profile strip, click generate, verify cards render)

- [ ] Claude proof: Meeting Prep generates without error
      (Manual test: type a meeting description, click prep, verify 2×2 grid populates)

- [ ] Claude proof: Business Fluency Coach responds
      (Manual test: type "What is ARR?", press Enter, verify AI reply appears)

- [ ] Claude proof: Communication Template generates + copy works
      (Manual test: select template, click generate, click copy, paste into Notepad)
```

---

## Summary

| Chunk | Deliverable | Model Used | Lines (approx) |
|-------|-------------|------------|----------------|
| 1 | SucceedMode shell, profile strip, sub-nav, 4 stub panels | — | ~120 |
| 2 | 90-Day Plan Generator with week cards | claude-opus-4-6 | ~120 |
| 3 | Meeting Prep AI with 2×2 card grid | claude-sonnet-4-6 | ~110 |
| 4 | Business Fluency Coach chat + history | claude-sonnet-4-6 | ~130 |
| 5 | Communication Templates + copy button | claude-sonnet-4-6 | ~110 |
| 6 | Windows build verification + Mac parity | — | — |

**Total new code:** ~590 lines added to `interview_assistant_windows.py`
**New dependencies:** None (anthropic already in PyInstaller spec)
**Commits:** 6 atomic commits (one per chunk)
