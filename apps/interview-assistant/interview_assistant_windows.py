#!/usr/bin/env python3
"""
Career Companion (Windows) — Real-time AI coaching during Zoom/Teams interviews
Captures meeting audio -> Whisper transcription -> Claude answers -> Floating overlay
"""

import os, sys, time, queue, threading, io, wave, struct, math

# ── FIX SSL FOR BUNDLED PYINSTALLER APPS ──────────────────────────────────────
import ssl

def _get_ssl_context():
    """Build SSL context that works in PyInstaller bundles."""
    try:
        import certifi
        ca_file = certifi.where()
        if os.path.exists(ca_file):
            return ssl.create_default_context(cafile=ca_file)
    except Exception:
        pass
    try:
        base = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
        ca_file = os.path.join(base, 'certifi', 'cacert.pem')
        if os.path.exists(ca_file):
            return ssl.create_default_context(cafile=ca_file)
    except Exception:
        pass
    try:
        return ssl.create_default_context()
    except Exception:
        pass
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx

_SSL_CONTEXT = _get_ssl_context()

import tkinter as tk
from tkinter import ttk
import numpy as np
import sounddevice as sd
from openai import OpenAI
import anthropic
from datetime import datetime
from pynput import keyboard as pynput_keyboard

# ── HIDE FROM SCREEN CAPTURE (Windows) ───────────────────────────────────────
def hide_from_screen_capture(root_hwnd: int = 0):
    """Exclude window from screen capture on Windows 10 2004+ using WDA_EXCLUDEFROMCAPTURE."""
    try:
        import ctypes
        WDA_EXCLUDEFROMCAPTURE = 0x00000011
        hwnd = root_hwnd or 0
        if hwnd:
            ctypes.windll.user32.SetWindowDisplayAffinity(hwnd, WDA_EXCLUDEFROMCAPTURE)
            print("Window hidden from screen capture")
    except Exception as e:
        print(f"Could not hide from screen capture: {e}")

# ── API KEYS (fetched from config server at startup) ──────────────────────────
import urllib.request as _urllib_request
import json as _json

_APP_TOKEN    = "ia-token-8f3k2p9x"
_CONFIG_URL   = "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config"
_LICENSE_FILE = os.path.expanduser("~/.oa-license")

def _get_device_id():
    """Get unique hardware ID for this Windows PC."""
    try:
        import subprocess
        result = subprocess.run(
            ["wmic", "csproduct", "get", "UUID"],
            capture_output=True, text=True, timeout=5,
        )
        for line in result.stdout.strip().splitlines():
            line = line.strip()
            if line and line != "UUID":
                return line
    except Exception:
        pass
    # Fallback: MAC address hash
    try:
        import uuid
        return str(uuid.getnode())
    except Exception:
        return "unknown"

def _get_license_key():
    """Read license key from ~/.oa-license or prompt via guided dialog on first launch."""
    if os.path.exists(_LICENSE_FILE):
        with open(_LICENSE_FILE) as _f:
            _key = _f.read().strip()
        if _key:
            return _key

    import tkinter as _tk
    import tkinter.messagebox as _tmb

    _root = _tk.Tk()
    _root.withdraw()

    # Step 1: Welcome + instructions
    _tmb.showinfo(
        "Welcome to Career Companion",
        "Thanks for purchasing Career Companion!\n\n"
        "To activate, you need your License Key.\n\n"
        "Here's how to find it:\n\n"
        "1. Go to offerletter.ai/interview in your browser\n"
        "2. If you just purchased, the page should show your License Key\n"
        "3. Click 'Copy License Key' on the page\n"
        "4. Come back here and paste it\n\n"
        "Click OK when you're ready to enter your key.",
    )

    # Step 2: Ask for the key
    import tkinter.simpledialog as _tsd
    _key = _tsd.askstring(
        "Enter License Key",
        "Paste your License Key below:\n\n"
        "(It looks like: cs_live_a1mRf2Ee...)\n",
        parent=_root,
    )
    _root.destroy()

    if _key and _key.strip():
        _key = _key.strip()
        with open(_LICENSE_FILE, "w") as _f:
            _f.write(_key)
        return _key

    raise SystemExit("License key required. Get yours at offerletter.ai/interview after purchasing.")

def _fetch_api_keys():
    """Fetch API keys from config server using purchase license key + device ID."""
    _session_id = _get_license_key()
    _device_id = _get_device_id()
    try:
        _req = _urllib_request.Request(
            _CONFIG_URL,
            data=_json.dumps({"app_token": _APP_TOKEN, "session_id": _session_id, "device_id": _device_id}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with _urllib_request.urlopen(_req, timeout=15, context=_SSL_CONTEXT) as _resp:
            _data = _json.loads(_resp.read())
        if "error" in _data:
            # Delete invalid license so user can re-enter
            if os.path.exists(_LICENSE_FILE):
                os.remove(_LICENSE_FILE)
            import tkinter as _tk
            import tkinter.messagebox as _tmb
            _r = _tk.Tk(); _r.withdraw()
            _tmb.showerror(
                "Invalid License Key",
                f"Your license key was not recognized.\n\n"
                f"Error: {_data['error']}\n\n"
                f"Please check that you copied the full key from\n"
                f"offerletter.ai/interview after purchasing.\n\n"
                f"Restart the app to try again."
            )
            _r.destroy()
            raise SystemExit(f"License error: {_data['error']}")
        return _data["openai_key"], _data["anthropic_key"]
    except SystemExit:
        raise
    except Exception as _e:
        print(f"Could not fetch API config: {_e}")
        import tkinter as _tk
        import tkinter.messagebox as _tmb
        _r = _tk.Tk(); _r.withdraw()
        _tmb.showerror(
            "Connection Error",
            f"Could not connect to the activation server.\n\n"
            f"Error: {_e}\n\n"
            f"Please check your internet connection and try again.\n"
            f"If this persists, contact support@offerletter.ai"
        )
        _r.destroy()
        raise SystemExit("Cannot start: failed to load API configuration.")

OPENAI_API_KEY, ANTHROPIC_API_KEY = _fetch_api_keys()

openai_client    = OpenAI(api_key=OPENAI_API_KEY)
anthropic_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

# ── AUDIO CONFIG ──────────────────────────────────────────────────────────────
SAMPLE_RATE       = 44100   # VB-Audio CABLE native rate
CHANNELS          = 2       # Stereo capture
SILENCE_THRESHOLD  = 0.001   # RMS below this = silence
SILENCE_END_SECS   = 1.5    # send buffer after this many seconds of silence
MAX_BUFFER_SECS    = 12     # send buffer anyway if it gets this long

# ── JITHESH'S RESUME CONTEXT ──────────────────────────────────────────────────
RESUME_CONTEXT = """
CANDIDATE: Jithesh Manoharan
ROLE TARGET: NetSuite Administrator / ERP Solution Architect / Head of AI

SUMMARY:
18+ years ERP/NetSuite experience. NetSuite Certified Administrator (ID: 9939), ERP Consultant (ID: 10549), SuiteFoundation (ID: 9106). Led 125+ person global teams. Secured $2M+ in NetSuite licensing. Delivered enterprise deployments across healthcare, cosmetics, fashion, F&B, fintech industries.

CERTIFICATIONS:
- NetSuite Certified Administrator (ID: 9939, 2018)
- NetSuite Certified ERP Consultant (ID: 10549, 2018)
- NetSuite SuiteFoundation (ID: 9106, 2017)
- NetSuite Certified Financial User (2018)
- SuiteBilling (ID: 11072), ARM Implementation, Fixed Assets (2018)
- AWS Solutions Architect Associate (2023), AWS Cloud Practitioner (2024)
- AI/ML Certification (2024), Data Engineer (2020)
- PMP (No. 4027141), Agile Certified Practitioner
- Salesforce Administrator (2017), Salesforce Developer (2016)

NETSUITE MODULES EXPERTISE:
Financial Management, Advanced Revenue Management (ARM), Fixed Asset Management,
NetSuite OneWorld (multi-subsidiary), SuiteBilling, A/P & A/R, Order to Cash (OTC),
Procure to Pay (P2P), Inventory Management, WMS Integration, EDI/SPS Commerce,
3PL Integration, SuiteScript 2.x, SuiteFlow/Workflows, SuiteAnalytics, PSA Module,
SuiteCommerce, Celigo, Dell Boomi, MuleSoft, Shopify integration, Salesforce CRM

EXPERIENCE:
1. TechCloudPro — NetSuite & Salesforce Business Head (Feb 2017 – Nov 2024)
   Led 125+ member global team (US, Canada, Philippines, India). Clients include:

   - Wellness Forever (Healthcare, 1,000+ pharmacy outlets): First enterprise-wide NetSuite
     deployment in Indian healthcare retail. Architected NetSuite with EHR integration, P2P
     automation, patient billing. Built AI-powered KPI dashboards. 35% faster A/R processing.

   - Orveon Global / Laura Mercier / Bare Minerals / Buxom (Beauty, Feb 2022–Oct 2023):
     Post-merger SAP → NetSuite migration. EDI integrations (888, 943, 944, 940, 945, 947, 846).
     Internal portal saved $250K/yr. Shopify-3PL-ERP integration saved $500K+/yr.

   - Care DX (Healthcare Tech, Jan 2021–Jan 2022): $2M+ NetSuite + $600K Salesforce licensing.
     Legacy ERP replacement. P2P automation cut cycle times by 30%. 100% data integrity.

   - BH Cosmetics (Mar 2020–Jan 2021): ERP rescue during CEO transition. OTC/P2P/ARM/WMS/TMS.
     Packaging optimization algorithm saved $1–2/package. Shopify-Celigo integration.

   - Berlitz Language School (Jul 2019–Mar 2020): NetSuite OneWorld across 75 subsidiaries.
     Salesforce-NetSuite via Dell Boomi. 40% less manual data entry. Custom LIMS integration.

   - Fashion Nova (Jan 2019–Jul 2019): NetSuite instance migration, new OMS, 3PL integration.

   - Anastasia Beverly Hills (Feb 2018–Jan 2019): WMS + TMS go-live, ERP transition.

2. Beach House Group — Interim CTO (Mar 2019 – Aug 2019): Multi-brand consumer products.

3. Aspect Software — Solution Architect NetSuite (Mar 2018 – Mar 2019):
   ARM/ASC 606, Fixed Asset Management, PSA module, Salesforce-NetSuite middleware integration.

4. Hampton Creek — Principal NetSuite Consultant (Nov 2017 – Sep 2018): OTC, P2P, Inventory.

5. Wells Fargo — Senior Technology PM (Dec 2015 – Jul 2018): Enterprise systems.

6. Michelson Found Animals Foundation — ERP BA & Implementation Head (Aug 2015–Dec 2016):
   Full ERP selection, RFP, gap analysis, implementation, training for non-profit.

7. PayPal / eBay (via Accenture, Jul 2009–Feb 2015): Technical Project Manager.
   eBay: ERP integration, custom APIs, middleware. Two promotions + multiple awards.
   PayPal: Custom CRM architecture, workflow automation, 20% reduction in resolution times.

8. HR Bay Area — Technical Recruiter (Apr 2004–Jun 2009): ERP/CRM tech recruitment.

AI CAPABILITIES (Current, via TechCloudPro / Zietra Technologies):
- Built production AI platforms: Dollor.ai (rideshare + food delivery P2P marketplace)
- RAG pipelines, LLM application development (Python/FastAPI), Agentic AI workflows
- AWS ECS, SageMaker, ElastiCache, RDS deployment
- AI automation integrated into NetSuite workflows (intelligent process agents, predictive analytics)

INDUSTRIES: Healthcare, Beauty/Cosmetics, Fashion/Apparel, Food & Beverage, eCommerce/DTC,
Fintech, SaaS/Technology, Non-Profit, Manufacturing, Education, Professional Services

STRENGTHS:
- Can lead enterprise NetSuite implementations from pre-sales to go-live
- Deep financial module expertise (ARM, Fixed Assets, Multi-subsidiary, Revenue Recognition)
- Integration expert: Celigo, Dell Boomi, MuleSoft, SPS Commerce EDI, Shopify, 3PL
- Sold $2M+ in licenses; strong C-level stakeholder communication
- Now bringing AI automation layer on top of traditional ERP — unique differentiator
"""

SYSTEM_PROMPT = f"""You are Jithesh Manoharan's real-time interview coach. You are secretly helping him during a live job interview.

The interviewer's question will be transcribed and given to you. Your job is to give Jithesh a CONCISE, CONFIDENT answer he can speak naturally — as if it's coming from his own memory.

RULES:
1. Answer in FIRST PERSON as Jithesh ("I led...", "My experience with...", "At Orveon I...")
2. Be CONCISE — 3-5 sentences max. He needs to speak it, not read an essay.
3. Pull from his ACTUAL experience below — cite real companies, real numbers, real modules.
4. If it's a technical NetSuite question, give the technical answer directly.
5. If it's a behavioral question, use the STAR format briefly (Situation, Action, Result).
6. If it's about salary/compensation, say: "I'm targeting $X-Y range based on market rate for this level."
7. Start with the STRONGEST point first.
8. Never say "Based on your resume..." — just answer directly.

JITHESH'S PROFILE:
{RESUME_CONTEXT}

FORMAT YOUR RESPONSE AS:
💬 ANSWER: [the spoken answer — 3-5 sentences]
📌 KEY POINT: [one-line strongest differentiator to emphasize]
"""

# ── RESEARCH PROMPT CONSTANTS ─────────────────────────────────────────────────
RESEARCH_COMPANY_PROMPT = """You are a career research assistant. Given a company name, provide a concise brief for a job candidate preparing for an interview.

Return exactly these sections (use the exact headers):
## Company Overview
2-3 sentences: what they do, size/stage, key markets.

## Business Model
How they make money. 2-3 bullet points.

## Recent News & Strategy
Top 2-3 notable recent developments (funding, product launches, acquisitions, layoffs, pivots).

## Culture & Values
Their stated values and what employees say about working there. 2-3 bullets.

## Talking Points
3 things the candidate should mention to show they did their homework.

Be factual and concise. If you don't know something, say so rather than fabricate."""

RESEARCH_ROLE_PROMPT = """You are a career research assistant. Given a job role title, explain what this role actually involves day-to-day.

Return exactly these sections (use the exact headers):
## Role Overview
What this person does in 2-3 sentences.

## Core Responsibilities
Top 5 day-to-day responsibilities as bullet points.

## Key Skills Required
Technical and soft skills — 5-6 bullets.

## Common Interview Questions
5 questions typically asked for this role.

## Success Metrics
How performance is typically measured in this role. 3-4 bullets.

Be practical and specific. Focus on what actually matters for the role."""

RESEARCH_PEOPLE_PROMPT = """You are a career research assistant. Given a company name, provide insights about typical team culture and key people dynamics.

Return exactly these sections (use the exact headers):
## Hiring Manager Mindset
What hiring managers at this type of company typically look for. 3-4 bullets.

## Team Culture Signals
What to look for in the interview to understand the team dynamic. 3-4 bullets.

## Questions to Ask Them
5 smart questions the candidate can ask to impress and learn.

## Red Flags to Watch For
3-4 potential warning signs based on common patterns for this company type.

Be candid and practical. This is confidential career coaching."""

RESEARCH_CHEATSHEET_PROMPT = """You are a career research assistant. Create a quick-reference cheat sheet for an interview.

Return exactly these sections (use the exact headers):
## 30-Second Pitch
A template the candidate can customize: "I'm [X] with [Y] years in [Z], specializing in [A]. I've [achievement]. I'm excited about [company] because [reason]."

## STAR Stories to Prepare
4 behavioral question templates with the situation archetype to prepare for:
- Leadership story
- Conflict resolution story
- Failure/learning story
- Achievement story

## Numbers to Know
Key metrics about the company to drop naturally: funding, employee count, growth rate, key customers.

## One-Line Differentiators
3 ways to stand out from other candidates for this role.

Keep it actionable — this is a last-minute prep sheet."""

# ── QUEUES ────────────────────────────────────────────────────────────────────
audio_queue     = queue.Queue()
answer_queue    = queue.Queue()

# ── STATE ─────────────────────────────────────────────────────────────────────
is_running      = threading.Event()
is_running.set()
recent_transcript = []    # rolling window of transcribed text
last_question   = ""

# ─────────────────────────────────────────────────────────────────────────────
# AUDIO CAPTURE
# ─────────────────────────────────────────────────────────────────────────────

def find_windows_loopback_device():
    """Find VB-Audio Virtual Cable or WASAPI Stereo Mix loopback device."""
    devices = sd.query_devices()
    # Priority 1: VB-Audio Virtual Cable output (the loopback capture side)
    for i, d in enumerate(devices):
        if 'cable output' in d['name'].lower() and d['max_input_channels'] > 0:
            return i, d['name']
    # Priority 2: WASAPI Stereo Mix
    for i, d in enumerate(devices):
        if 'stereo mix' in d['name'].lower() and d['max_input_channels'] > 0:
            return i, d['name']
    # Priority 3: Any loopback
    for i, d in enumerate(devices):
        name = d['name'].lower()
        if ('loopback' in name or 'virtual' in name) and d['max_input_channels'] > 0:
            return i, d['name']
    return None, None


def find_best_input_device():
    """Find best available input: VB-Audio CABLE -> Stereo Mix -> default mic."""
    lb_idx, lb_name = find_windows_loopback_device()
    if lb_idx is not None:
        return lb_idx, lb_name, True
    default = sd.default.device[0]
    devices = sd.query_devices()
    return default, devices[default]['name'], False


def audio_chunk_to_wav_bytes(chunk: np.ndarray) -> bytes:
    """Convert numpy float32 array to WAV bytes for Whisper (stereo -> mono mix)."""
    # Mix stereo to mono for Whisper
    if chunk.ndim == 1:
        mono = chunk
    else:
        mono = chunk.mean(axis=1)
    chunk_int16 = (mono * 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(chunk_int16.tobytes())
    buf.seek(0)
    return buf.read()


def audio_capture_thread(device_idx, status_callback):
    """Accumulate audio into speech buffer, send to Whisper after sustained silence."""
    speech_buffer = []          # accumulates ALL audio (speech + brief pauses)
    silent_frames  = 0
    silence_end_frames = int(SAMPLE_RATE * SILENCE_END_SECS)
    max_buffer_frames  = int(SAMPLE_RATE * MAX_BUFFER_SECS)
    has_speech = False          # did we capture any speech yet?

    def callback(indata, frames, time_info, status):
        nonlocal silent_frames, has_speech

        chunk = indata.copy()
        rms = math.sqrt(np.mean(chunk**2))
        is_silent = rms < SILENCE_THRESHOLD

        if not is_silent:
            # Speech detected — add to buffer, reset silence counter
            speech_buffer.append(chunk)
            silent_frames = 0
            has_speech = True
            status_callback("🎙️ Capturing speech...")
        else:
            if has_speech:
                # Keep buffering silence (it may be a mid-sentence pause)
                speech_buffer.append(chunk)
                silent_frames += len(chunk)

                if silent_frames >= silence_end_frames:
                    # Sentence ended — send full buffer to Whisper
                    full_audio = np.concatenate(speech_buffer, axis=0)
                    audio_queue.put(full_audio)
                    speech_buffer.clear()
                    silent_frames = 0
                    has_speech = False
                    status_callback("👂 Listening...")
            else:
                status_callback("👂 Listening...")

        # Safety: flush if buffer is too long
        total = sum(len(b) for b in speech_buffer)
        if total >= max_buffer_frames:
            full_audio = np.concatenate(speech_buffer, axis=0)
            audio_queue.put(full_audio)
            speech_buffer.clear()
            silent_frames = 0
            has_speech = False

    try:
        with sd.InputStream(
            device=device_idx,
            channels=CHANNELS,
            samplerate=SAMPLE_RATE,
            dtype='float32',
            callback=callback,
            blocksize=1024
        ):
            status_callback("🎙️ Audio capture active")
            while is_running.is_set():
                time.sleep(0.1)
    except Exception as e:
        status_callback(f"⚠️ Audio error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# TRANSCRIPTION + ANSWER
# ─────────────────────────────────────────────────────────────────────────────

def is_question(text: str) -> bool:
    """Heuristic: is this likely a question from an interviewer?"""
    text_lower = text.lower().strip()
    question_words = ['?', 'tell me', 'describe', 'explain', 'what is', 'what are',
                      'how did', 'how do', 'how would', 'can you', 'could you',
                      'have you', 'do you', 'did you', 'walk me through',
                      'give me an example', 'why did', 'why do', 'where do',
                      'what experience', 'what modules', 'what version',
                      'salary', 'compensation', 'available', 'start date',
                      'strength', 'weakness', 'challenge', 'accomplishment']
    return any(q in text_lower for q in question_words)


def transcription_thread(update_transcript_callback, status_callback):
    """Get audio chunks, transcribe with Whisper, detect questions."""
    global last_question
    while is_running.is_set():
        try:
            chunk = audio_queue.get(timeout=1)
            status_callback("⚡ Transcribing...")
            wav_bytes = audio_chunk_to_wav_bytes(chunk)

            # Send to Whisper
            audio_file = io.BytesIO(wav_bytes)
            audio_file.name = "audio.wav"

            result = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                language="en"
            )
            text = result.text.strip()

            if not text or len(text) < 8:
                status_callback("👂 Listening...")
                continue

            update_transcript_callback(text)
            recent_transcript.append(text)
            if len(recent_transcript) > 10:
                recent_transcript.pop(0)

            # Only generate answer if it looks like a question
            combined = " ".join(recent_transcript[-3:])
            if is_question(combined) and combined != last_question:
                last_question = combined
                status_callback("🤖 Generating answer...")
                answer_queue.put(combined)
            else:
                status_callback("👂 Listening...")

        except queue.Empty:
            continue
        except Exception as e:
            status_callback(f"⚠️ Transcription error: {e}")
            time.sleep(1)


def answer_generation_thread(update_answer_callback, stream_chunk_callback, status_callback):
    """Get questions, generate answers with Claude (streaming)."""
    while is_running.is_set():
        try:
            question = answer_queue.get(timeout=1)
            status_callback("🤖 Answering...")
            stream_chunk_callback("", reset=True)  # clear answer box

            full_answer = ""
            with anthropic_client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                system=SYSTEM_PROMPT,
                messages=[{
                    "role": "user",
                    "content": f"Interviewer just said: \"{question}\"\n\nGive me my answer."
                }]
            ) as stream:
                for text in stream.text_stream:
                    full_answer += text
                    stream_chunk_callback(text)

            status_callback("✅ Ready")

        except queue.Empty:
            continue
        except Exception as e:
            status_callback(f"⚠️ Answer error: {e}")
            time.sleep(1)


# ─────────────────────────────────────────────────────────────────────────────
# FLOATING OVERLAY UI
# ─────────────────────────────────────────────────────────────────────────────

class InterviewOverlay:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🎯 Career Companion")
        # Position bottom-right corner — out of typical shared window area
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        self.root.geometry(f"420x640+{sw-440}+{sh-680}")
        self.root.configure(bg="#0f1923")
        self.root.attributes("-topmost", True)
        self.root.attributes("-alpha", 0.93)
        self.root.resizable(True, True)
        self.root.focus_force()

        # Make draggable
        self._drag_x = 0
        self._drag_y = 0

        self._visible = True   # track our own visibility state

        self._build_ui()
        self._start_threads()

        # Hide from screen capture after window is fully rendered
        def _hide_win():
            hwnd = self.root.winfo_id()
            hide_from_screen_capture(hwnd)
        self.root.after(500, _hide_win)

        # Global hotkey (works even when window is hidden)
        self._start_global_hotkey()

        # Fallback tkinter bindings (when window is focused)
        self.root.bind("<Escape>",    lambda e: self._toggle_visibility())
        self.root.protocol("WM_DELETE_WINDOW", self._quit)

    def _configure_styles(self):
        """Configure ttk styles for the mode switcher tab bar."""
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("Career.TNotebook",
            background="#0f1923",
            borderwidth=0,
            tabmargins=[0, 0, 0, 0]
        )
        style.configure("Career.TNotebook.Tab",
            background="#1a2635",
            foreground="#94a3b8",
            padding=[14, 8],
            font=("Inter", 10, "bold"),
            borderwidth=0,
            focuscolor="#0f1923"
        )
        style.map("Career.TNotebook.Tab",
            background=[("selected", "#0f1923"), ("active", "#1e3a5f")],
            foreground=[("selected", "#7dd3fc"), ("active", "#e2e8f0")]
        )

    def _build_ui(self):
        root = self.root
        self._configure_styles()

        # ── Top bar ──
        top = tk.Frame(root, bg="#1a2635", pady=8)
        top.pack(fill="x")

        tk.Label(top, text="🎯  Career Companion",
                 bg="#1a2635", fg="#7dd3fc",
                 font=("Inter", 13, "bold")).pack(side="left", padx=14)

        tk.Button(top, text="✕", bg="#1a2635", fg="#64748b",
                  relief="flat", font=("Inter", 13),
                  command=self._quit).pack(side="right", padx=8)

        tk.Button(top, text="⊟", bg="#1a2635", fg="#64748b",
                  relief="flat", font=("Inter", 13),
                  command=self._toggle_visibility).pack(side="right")

        # ── Status bar ──
        self.status_var = tk.StringVar(value="⏳ Starting up...")
        tk.Label(root, textvariable=self.status_var,
                 bg="#0f1923", fg="#94a3b8",
                 font=("Inter", 10), anchor="w",
                 padx=14).pack(fill="x")

        # ── Device label ──
        self.device_var = tk.StringVar(value="")
        tk.Label(root, textvariable=self.device_var,
                 bg="#0f1923", fg="#475569",
                 font=("Inter", 9, "italic"), anchor="w",
                 padx=14).pack(fill="x")

        tk.Frame(root, bg="#1e3a5f", height=1).pack(fill="x", pady=6)

        # ── Bottom bar (pack before notebook so expand works correctly) ──
        bottom = tk.Frame(root, bg="#1a2635", pady=6)
        bottom.pack(fill="x", side="bottom")
        tk.Label(bottom,
                 text="Ctrl+Shift+H hide/show  •  Alt+F4 quit  •  drag to move",
                 bg="#1a2635", fg="#374151",
                 font=("Inter", 9)).pack()

        # ── Mode switcher notebook ──
        self.notebook = ttk.Notebook(root, style="Career.TNotebook")
        self.notebook.pack(fill="both", expand=True, padx=0, pady=0)

        self.research_frame  = tk.Frame(self.notebook, bg="#0f1923")
        self.interview_frame = tk.Frame(self.notebook, bg="#0f1923")
        self.negotiate_frame = NegotiateFrame(self.notebook, anthropic_client)
        self.succeed_frame   = SucceedMode(self.notebook, anthropic_client=anthropic_client)

        self.notebook.add(self.research_frame,  text="🔍 Research")
        self.notebook.add(self.interview_frame, text="🎤 Interview")
        self.notebook.add(self.negotiate_frame, text="🤝 Negotiate")
        self.notebook.add(self.succeed_frame,   text="🚀 Succeed")

        self._build_research_tab()
        self._build_interview_tab()
        # NegotiateFrame and SucceedMode build themselves

        # Make draggable via top bar
        top.bind("<Button-1>",   self._on_drag_start)
        top.bind("<B1-Motion>",  self._on_drag_motion)

    def _build_interview_tab(self):
        """Build the Interview tab — existing transcript + manual entry + answer widgets."""
        root = self.interview_frame

        # ── Interviewer transcript ──
        tk.Label(root, text="🎤  INTERVIEWER",
                 bg="#0f1923", fg="#0891b2",
                 font=("Inter", 10, "bold"), anchor="w",
                 padx=14).pack(fill="x", pady=(8, 0))

        self.transcript_text = tk.Text(
            root, height=5, bg="#111d2b", fg="#cbd5e1",
            font=("Inter", 12), wrap="word",
            relief="flat", padx=12, pady=10,
            insertbackground="#7dd3fc",
            selectbackground="#1e3a5f"
        )
        self.transcript_text.pack(fill="x", padx=12, pady=(2, 8))
        self.transcript_text.config(state="disabled")

        tk.Frame(root, bg="#1e3a5f", height=1).pack(fill="x", pady=2)

        # ── Manual question input ──
        manual_frame = tk.Frame(root, bg="#0f1923")
        manual_frame.pack(fill="x", padx=12, pady=(4, 6))

        tk.Label(manual_frame, text="✏️",
                 bg="#0f1923", fg="#94a3b8",
                 font=("Inter", 11)).pack(side="left", padx=(0, 6))

        self.manual_entry = tk.Entry(
            manual_frame,
            bg="#1a2635", fg="#e2e8f0",
            font=("Inter", 11),
            relief="flat",
            insertbackground="#7dd3fc",
            highlightthickness=1,
            highlightcolor="#0891b2",
            highlightbackground="#1e3a5f"
        )
        self.manual_entry.pack(side="left", fill="x", expand=True, ipady=5)
        self.manual_entry.insert(0, "Type question here and press Enter...")
        self.manual_entry.config(fg="#475569")

        def on_focus_in(e):
            if self.manual_entry.get() == "Type question here and press Enter...":
                self.manual_entry.delete(0, "end")
                self.manual_entry.config(fg="#e2e8f0")

        def on_focus_out(e):
            if not self.manual_entry.get():
                self.manual_entry.insert(0, "Type question here and press Enter...")
                self.manual_entry.config(fg="#475569")

        self.manual_entry.bind("<FocusIn>",   on_focus_in)
        self.manual_entry.bind("<FocusOut>",  on_focus_out)
        self.manual_entry.bind("<Return>",    self._submit_manual_question)
        self.manual_entry.bind("<Button-1>",  lambda e: self.manual_entry.focus_force())

        tk.Button(
            manual_frame, text="Ask",
            bg="#0891b2", fg="white",
            font=("Inter", 10, "bold"),
            relief="flat", padx=10,
            command=self._submit_manual_question
        ).pack(side="left", padx=(6, 0))

        tk.Frame(root, bg="#1e3a5f", height=1).pack(fill="x", pady=2)

        # ── Answer ──
        tk.Label(root, text="💡  YOUR ANSWER",
                 bg="#0f1923", fg="#f59e0b",
                 font=("Inter", 10, "bold"), anchor="w",
                 padx=14).pack(fill="x", pady=(6, 0))

        self.answer_text = tk.Text(
            root, height=14, bg="#111d2b", fg="#f1f5f9",
            font=("Inter", 12), wrap="word",
            relief="flat", padx=12, pady=10,
            insertbackground="#f59e0b",
            selectbackground="#2d4a6e"
        )
        self.answer_text.pack(fill="both", expand=True, padx=12, pady=(2, 8))
        self.answer_text.config(state="disabled")

        self.answer_text.tag_configure("answer_label",
            foreground="#7dd3fc", font=("Inter", 11, "bold"))
        self.answer_text.tag_configure("answer_body",
            foreground="#f1f5f9", font=("Inter", 12))
        self.answer_text.tag_configure("key_label",
            foreground="#f59e0b", font=("Inter", 11, "bold"))
        self.answer_text.tag_configure("key_body",
            foreground="#fcd34d", font=("Inter", 11, "italic"))

    def _build_placeholder_tab(self, frame, icon, title, description):
        """Build a coming-soon placeholder tab."""
        tk.Label(frame, text=icon, bg="#0f1923", fg="#94a3b8",
                 font=("Inter", 40)).pack(pady=(60, 12))
        tk.Label(frame, text=title, bg="#0f1923", fg="#7dd3fc",
                 font=("Inter", 16, "bold")).pack()
        tk.Label(frame, text=description, bg="#0f1923", fg="#64748b",
                 font=("Inter", 11), justify="center").pack(pady=(12, 0))

    def _build_research_tab(self):
        """Build the Research tab — company/role inputs + scrollable card area."""
        root = self.research_frame

        # ── Input area ──
        input_frame = tk.Frame(root, bg="#1a2635", pady=10)
        input_frame.pack(fill="x", padx=0, pady=0)

        # Company row
        company_row = tk.Frame(input_frame, bg="#1a2635")
        company_row.pack(fill="x", padx=12, pady=(0, 6))
        tk.Label(company_row, text="🏢 Company:", bg="#1a2635", fg="#94a3b8",
                 font=("Inter", 10), width=10, anchor="w").pack(side="left")
        self.company_entry = tk.Entry(
            company_row, bg="#0f1923", fg="#e2e8f0",
            font=("Inter", 11), relief="flat",
            insertbackground="#7dd3fc",
            highlightthickness=1, highlightcolor="#0891b2",
            highlightbackground="#1e3a5f"
        )
        self.company_entry.pack(side="left", fill="x", expand=True, ipady=4)

        # Role row
        role_row = tk.Frame(input_frame, bg="#1a2635")
        role_row.pack(fill="x", padx=12, pady=(0, 8))
        tk.Label(role_row, text="💼 Role:", bg="#1a2635", fg="#94a3b8",
                 font=("Inter", 10), width=10, anchor="w").pack(side="left")
        self.role_entry = tk.Entry(
            role_row, bg="#0f1923", fg="#e2e8f0",
            font=("Inter", 11), relief="flat",
            insertbackground="#7dd3fc",
            highlightthickness=1, highlightcolor="#0891b2",
            highlightbackground="#1e3a5f"
        )
        self.role_entry.pack(side="left", fill="x", expand=True, ipady=4)

        # Generate button
        self.research_btn = tk.Button(
            input_frame, text="🔍  Generate Research Brief",
            bg="#0891b2", fg="white",
            font=("Inter", 11, "bold"),
            relief="flat", pady=8,
            command=self._start_research
        )
        self.research_btn.pack(fill="x", padx=12, pady=(0, 4))

        # Research status label
        self.research_status_var = tk.StringVar(value="")
        tk.Label(root, textvariable=self.research_status_var,
                 bg="#0f1923", fg="#94a3b8",
                 font=("Inter", 9, "italic"), anchor="w",
                 padx=14).pack(fill="x")

        # ── Scrollable card area ──
        canvas_container = tk.Frame(root, bg="#0f1923")
        canvas_container.pack(fill="both", expand=True, padx=0, pady=0)

        self.research_canvas = tk.Canvas(
            canvas_container, bg="#0f1923",
            highlightthickness=0, borderwidth=0
        )
        scrollbar = tk.Scrollbar(canvas_container, orient="vertical",
                                  command=self.research_canvas.yview)
        self.research_canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side="right", fill="y")
        self.research_canvas.pack(side="left", fill="both", expand=True)

        self.research_cards_frame = tk.Frame(self.research_canvas, bg="#0f1923")
        self._research_canvas_window = self.research_canvas.create_window(
            (0, 0), window=self.research_cards_frame, anchor="nw"
        )

        def _on_frame_configure(e):
            self.research_canvas.configure(
                scrollregion=self.research_canvas.bbox("all")
            )

        def _on_canvas_configure(e):
            self.research_canvas.itemconfig(
                self._research_canvas_window, width=e.width
            )

        self.research_cards_frame.bind("<Configure>", _on_frame_configure)
        self.research_canvas.bind("<Configure>", _on_canvas_configure)

        # Mouse wheel scrolling
        def _on_mousewheel(e):
            self.research_canvas.yview_scroll(int(-1 * (e.delta / 120)), "units")
        self.research_canvas.bind("<MouseWheel>", _on_mousewheel)

    def _render_research_card(self, title: str, content: str):
        """Render a collapsible research card into the cards frame."""
        card = tk.Frame(self.research_cards_frame, bg="#1a2635",
                        relief="flat", bd=0)
        card.pack(fill="x", padx=12, pady=(6, 0))

        # State
        is_open = [True]

        # Header row
        header = tk.Frame(card, bg="#1e3a5f", cursor="hand2")
        header.pack(fill="x")

        toggle_lbl = tk.Label(header, text="▼", bg="#1e3a5f", fg="#7dd3fc",
                               font=("Inter", 10), padx=6)
        toggle_lbl.pack(side="left")

        tk.Label(header, text=title, bg="#1e3a5f", fg="#e2e8f0",
                 font=("Inter", 10, "bold"), anchor="w",
                 pady=6).pack(side="left", fill="x", expand=True)

        # Body
        body = tk.Frame(card, bg="#1a2635")
        body.pack(fill="x")

        text_widget = tk.Text(
            body, bg="#1a2635", fg="#cbd5e1",
            font=("Inter", 10), wrap="word",
            relief="flat", padx=10, pady=8,
            height=1,  # will auto-expand via pack
            state="normal"
        )
        text_widget.insert("end", content)
        text_widget.config(state="disabled")
        # Calculate height based on content lines
        line_count = content.count("\n") + 1
        text_widget.config(height=min(line_count + 1, 20))
        text_widget.pack(fill="x")

        def toggle(_event=None):
            if is_open[0]:
                body.pack_forget()
                toggle_lbl.config(text="▶")
                is_open[0] = False
            else:
                body.pack(fill="x")
                toggle_lbl.config(text="▼")
                is_open[0] = True

        header.bind("<Button-1>", toggle)
        toggle_lbl.bind("<Button-1>", toggle)

    def _start_research(self):
        """Validate inputs and launch research thread."""
        company = self.company_entry.get().strip()
        role    = self.role_entry.get().strip()
        if not company or not role:
            self.research_status_var.set("⚠️  Enter both company and role to generate a brief.")
            return

        # Clear existing cards
        for widget in self.research_cards_frame.winfo_children():
            widget.destroy()

        self.research_btn.config(state="disabled", text="🔄  Researching...")
        self.research_status_var.set("⏳  Generating research brief — this takes ~30 seconds...")

        t = threading.Thread(
            target=self._run_research_thread,
            args=(company, role),
            daemon=True
        )
        t.start()

    def _run_research_thread(self, company: str, role: str):
        """Run 4 sequential Claude API calls and render cards as each completes."""
        cards = [
            ("🏢 Company Brief",       RESEARCH_COMPANY_PROMPT,    f"Research this company for a job interview: {company}"),
            ("💼 Role Breakdown",      RESEARCH_ROLE_PROMPT,       f"Break down this role for a job interview: {role} at {company}"),
            ("👥 People & Culture",    RESEARCH_PEOPLE_PROMPT,     f"Give me people and culture insights for: {company}"),
            ("⚡ Interview Cheatsheet", RESEARCH_CHEATSHEET_PROMPT, f"Create an interview cheat sheet for: {role} at {company}"),
        ]

        for title, system_prompt, user_msg in cards:
            try:
                self.root.after(0, lambda t=title: self.research_status_var.set(f"⏳  Generating: {t}..."))
                response = anthropic_client.messages.create(
                    model="claude-haiku-4-5-20251001",
                    max_tokens=600,
                    system=system_prompt,
                    messages=[{"role": "user", "content": user_msg}]
                )
                content = response.content[0].text.strip()
                self.root.after(0, lambda t=title, c=content: self._render_research_card(t, c))
            except Exception as e:
                err_content = f"Error generating {title}: {e}"
                self.root.after(0, lambda t=title, c=err_content: self._render_research_card(t, c))

        self.root.after(0, lambda: self.research_btn.config(
            state="normal", text="🔍  Generate Research Brief"
        ))
        self.root.after(0, lambda: self.research_status_var.set("✅  Research complete!"))

    def _on_drag_start(self, event):
        self._drag_x = event.x
        self._drag_y = event.y

    def _on_drag_motion(self, event):
        x = self.root.winfo_x() + event.x - self._drag_x
        y = self.root.winfo_y() + event.y - self._drag_y
        self.root.geometry(f"+{x}+{y}")

    def _toggle_visibility(self):
        """Toggle show/hide — uses our own flag, not root.state()."""
        def _do():
            if self._visible:
                self._visible = False
                self.root.withdraw()
            else:
                self._visible = True
                self.root.deiconify()
                self.root.lift()
                self.root.attributes("-topmost", True)
                self.root.focus_force()
                self.root.after(100, lambda: hide_from_screen_capture(self.root.winfo_id()))
        self.root.after(0, _do)  # must run on main thread

    def _start_global_hotkey(self):
        """Listen for Ctrl+Shift+H globally."""
        current_keys = set()

        def on_press(key):
            current_keys.add(key)
            ctrl  = pynput_keyboard.Key.ctrl
            shift = pynput_keyboard.Key.shift
            try:
                h = pynput_keyboard.KeyCode.from_char('h')
            except Exception:
                return
            if ctrl in current_keys and shift in current_keys and h in current_keys:
                self._toggle_visibility()

        def on_release(key):
            current_keys.discard(key)

        listener = pynput_keyboard.Listener(on_press=on_press, on_release=on_release)
        listener.daemon = True
        listener.start()

    def _submit_manual_question(self, event=None):
        text = self.manual_entry.get().strip()
        if not text or text == "Type question here and press Enter...":
            return
        # Show in transcript box
        self.update_transcript(text)
        # Push directly to answer queue
        answer_queue.put(text)
        self.update_status("🤖 Generating answer...")
        # Clear the entry
        self.manual_entry.delete(0, "end")

    def _quit(self):
        is_running.clear()
        self.root.destroy()

    # ── Thread-safe UI updates ──
    def update_status(self, text):
        self.root.after(0, lambda: self.status_var.set(text))

    def update_device(self, text):
        self.root.after(0, lambda: self.device_var.set(text))

    def update_transcript(self, text):
        def _update():
            self.transcript_text.config(state="normal")
            self.transcript_text.delete("1.0", "end")
            self.transcript_text.insert("end", text)
            self.transcript_text.config(state="disabled")
        self.root.after(0, _update)

    def stream_answer_chunk(self, chunk, reset=False):
        def _update():
            self.answer_text.config(state="normal")
            if reset:
                self.answer_text.delete("1.0", "end")
            else:
                self.answer_text.insert("end", chunk, "answer_body")
                self.answer_text.see("end")
            self.answer_text.config(state="disabled")
        self.root.after(0, _update)

    def update_answer(self, question, answer):
        def _update():
            self.answer_text.config(state="normal")
            self.answer_text.delete("1.0", "end")
            lines = answer.split("\n")
            for line in lines:
                line = line.strip()
                if not line:
                    self.answer_text.insert("end", "\n")
                elif line.startswith("💬 ANSWER:"):
                    self.answer_text.insert("end", "💬 ANSWER\n", "answer_label")
                    body = line.replace("💬 ANSWER:", "").strip()
                    self.answer_text.insert("end", body + "\n\n", "answer_body")
                elif line.startswith("📌 KEY POINT:"):
                    self.answer_text.insert("end", "📌 KEY POINT\n", "key_label")
                    body = line.replace("📌 KEY POINT:", "").strip()
                    self.answer_text.insert("end", body + "\n", "key_body")
                else:
                    self.answer_text.insert("end", line + "\n", "answer_body")
            self.answer_text.config(state="disabled")
        self.root.after(0, _update)

    # ── Start background threads ──
    def _start_threads(self):
        device_idx, device_name, is_meeting = find_best_input_device()

        if is_meeting:
            self.update_device(f"🎧 Capturing: {device_name}")
            self.update_status("🎙️ Listening to meeting audio...")
        else:
            self.update_device(f"🎤 Mic fallback: {device_name}  (VB-Audio CABLE not found)")
            self.update_status("🎤 Listening via microphone...")

        # Audio capture thread
        t1 = threading.Thread(
            target=audio_capture_thread,
            args=(device_idx, self.update_status),
            daemon=True
        )
        t1.start()

        # Transcription thread
        t2 = threading.Thread(
            target=transcription_thread,
            args=(self.update_transcript, self.update_status),
            daemon=True
        )
        t2.start()

        # Answer generation thread
        t3 = threading.Thread(
            target=answer_generation_thread,
            args=(self.update_answer, self.stream_answer_chunk, self.update_status),
            daemon=True
        )
        t3.start()

    def run(self):
        self.root.mainloop()


# ─────────────────────────────────────────────────────────────────────────────
# NEGOTIATE MODE
# ─────────────────────────────────────────────────────────────────────────────

class OfferAnalyzerFrame(tk.Frame):
    """Paste an offer letter → structured breakdown + counter script."""

    BG      = "#0f0f1a"
    CARD_BG = "#1a1a2e"
    FG      = "#e2e8f0"
    ACCENT  = "#7c3aed"
    BTN_FG  = "#ffffff"

    _EXTRACT_SYSTEM = (
        "You are a compensation analyst. Extract structured data from the offer letter text "
        "provided by the user. Respond ONLY with a JSON object — no prose, no markdown fences. "
        'Schema: {"base_salary": string, "signing_bonus": string, "annual_bonus": string, '
        '"equity": string, "vesting_schedule": string, "pto_days": string, '
        '"health_benefits": string, "retirement": string, "start_date": string, '
        '"notable_clauses": [list of strings]}. '
        'Use "Not mentioned" for any field absent from the letter.'
    )

    _COUNTER_SYSTEM = (
        "You are a senior salary negotiation coach. Given the structured offer data, write a "
        "word-for-word counter script the candidate can read verbatim on a phone call. "
        "Format:\n"
        "## Opening (30 seconds)\n<script>\n\n"
        "## Counter Ask\n<script>\n\n"
        "## If They Push Back\n<script>\n\n"
        "## Closing\n<script>\n\n"
        "Be confident, professional, and specific. Do not add preamble."
    )

    def __init__(self, parent, client, **kwargs):
        super().__init__(parent, bg=self.BG, **kwargs)
        self._client  = client
        self._parsed  = {}
        self._build()

    def _build(self):
        tk.Label(self, text="📄 Offer Letter Analyzer",
                 bg=self.BG, fg=self.ACCENT,
                 font=("Helvetica", 15, "bold"),
                 anchor="w", padx=20, pady=14).pack(fill="x")

        tk.Label(self, text="Paste your full offer letter below.",
                 bg=self.BG, fg="#94a3b8",
                 font=("Helvetica", 10), anchor="w", padx=20).pack(fill="x")

        input_card = tk.Frame(self, bg=self.CARD_BG, padx=16, pady=12)
        input_card.pack(fill="x", padx=20, pady=(8, 0))

        self._offer_text = tk.Text(
            input_card, height=10, wrap="word",
            bg="#16213e", fg=self.FG,
            insertbackground=self.FG,
            font=("Helvetica", 10),
            relief="flat", bd=0,
        )
        self._offer_text.pack(fill="both", expand=True)
        self._offer_text.insert("1.0", "Paste offer letter text here...")
        self._offer_text.bind("<FocusIn>",  self._clear_placeholder)
        self._offer_text.bind("<FocusOut>", self._restore_placeholder)

        self._analyze_btn = tk.Button(
            self, text="Analyze Offer →",
            bg=self.ACCENT, fg=self.BTN_FG,
            activebackground="#6d28d9",
            font=("Helvetica", 11, "bold"),
            relief="flat", bd=0, padx=20, pady=8,
            cursor="hand2",
            command=self._run_analysis,
        )
        self._analyze_btn.pack(anchor="e", padx=20, pady=(8, 0))

        self._status = tk.Label(self, text="",
                                bg=self.BG, fg="#94a3b8",
                                font=("Helvetica", 9))
        self._status.pack(anchor="e", padx=20)

        results_outer = tk.Frame(self, bg=self.BG)
        results_outer.pack(fill="both", expand=True, padx=20, pady=10)

        left = tk.Frame(results_outer, bg=self.CARD_BG, padx=12, pady=10)
        left.pack(side="left", fill="both", expand=True, padx=(0, 6))

        tk.Label(left, text="Offer Breakdown",
                 bg=self.CARD_BG, fg=self.ACCENT,
                 font=("Helvetica", 11, "bold")).pack(anchor="w")

        self._breakdown_text = tk.Text(
            left, wrap="word", state="disabled",
            bg=self.CARD_BG, fg=self.FG,
            font=("Helvetica", 10), relief="flat", bd=0,
        )
        self._breakdown_text.pack(fill="both", expand=True)

        right = tk.Frame(results_outer, bg=self.CARD_BG, padx=12, pady=10)
        right.pack(side="left", fill="both", expand=True, padx=(6, 0))

        tk.Label(right, text="Counter Script",
                 bg=self.CARD_BG, fg=self.ACCENT,
                 font=("Helvetica", 11, "bold")).pack(anchor="w")

        self._script_text = tk.Text(
            right, wrap="word", state="disabled",
            bg=self.CARD_BG, fg=self.FG,
            font=("Helvetica", 10), relief="flat", bd=0,
        )
        self._script_text.pack(fill="both", expand=True)

    def _clear_placeholder(self, _event=None):
        if self._offer_text.get("1.0", "end-1c") == "Paste offer letter text here...":
            self._offer_text.delete("1.0", "end")
            self._offer_text.configure(fg=self.FG)

    def _restore_placeholder(self, _event=None):
        if not self._offer_text.get("1.0", "end-1c").strip():
            self._offer_text.insert("1.0", "Paste offer letter text here...")
            self._offer_text.configure(fg="#64748b")

    def _set_text(self, widget: tk.Text, content: str):
        widget.configure(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", content)
        widget.configure(state="disabled")

    def _run_analysis(self):
        raw = self._offer_text.get("1.0", "end-1c").strip()
        if not raw or raw == "Paste offer letter text here...":
            self._status.configure(text="⚠ Paste an offer letter first.", fg="#f59e0b")
            return

        self._analyze_btn.configure(state="disabled", text="Analyzing…")
        self._status.configure(text="Step 1/2 — extracting data…", fg="#94a3b8")
        self._set_text(self._breakdown_text, "")
        self._set_text(self._script_text, "")

        threading.Thread(target=self._analysis_worker, args=(raw,), daemon=True).start()

    def _analysis_worker(self, raw: str):
        import json as _j
        try:
            resp1 = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1024,
                system=self._EXTRACT_SYSTEM,
                messages=[{"role": "user", "content": raw}],
            )
            json_str = resp1.content[0].text.strip()
            if json_str.startswith("```"):
                lines = json_str.split("\n")
                json_str = "\n".join(lines[1:-1])
            self._parsed = _j.loads(json_str)

            lines = []
            labels = [
                ("base_salary",      "Base Salary"),
                ("signing_bonus",    "Signing Bonus"),
                ("annual_bonus",     "Annual Bonus / Target"),
                ("equity",           "Equity / RSUs"),
                ("vesting_schedule", "Vesting Schedule"),
                ("pto_days",         "PTO"),
                ("health_benefits",  "Health Benefits"),
                ("retirement",       "401k / Retirement"),
                ("start_date",       "Start Date"),
            ]
            for key, label in labels:
                val = self._parsed.get(key, "Not mentioned")
                lines.append(f"{label}:\n  {val}\n")

            clauses = self._parsed.get("notable_clauses", [])
            if clauses:
                lines.append("Notable Clauses:")
                for c in clauses:
                    lines.append(f"  • {c}")

            breakdown_output = "\n".join(lines)
            self.after(0, lambda: self._set_text(self._breakdown_text, breakdown_output))
            self.after(0, lambda: self._status.configure(
                text="Step 2/2 — writing counter script…", fg="#94a3b8"))

            summary = "\n".join(f"{k}: {v}" for k, v in self._parsed.items())
            resp2 = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1500,
                system=self._COUNTER_SYSTEM,
                messages=[{"role": "user", "content": summary}],
            )
            script = resp2.content[0].text.strip()

            self.after(0, lambda: self._set_text(self._script_text, script))
            self.after(0, lambda: self._status.configure(
                text="Done — review your breakdown and counter script.", fg="#22c55e"))

        except Exception as exc:
            self.after(0, lambda: self._status.configure(
                text=f"Error: {exc}", fg="#ef4444"))
        finally:
            self.after(0, lambda: self._analyze_btn.configure(
                state="normal", text="Analyze Offer →"))


class MultiOfferFrame(tk.Frame):
    """Side-by-side comparison of up to 3 offers with Claude recommendation."""

    BG      = "#0f0f1a"
    CARD_BG = "#1a1a2e"
    FG      = "#e2e8f0"
    ACCENT  = "#7c3aed"
    BTN_FG  = "#ffffff"
    COL_HDR = "#6d28d9"

    _COMPARE_SYSTEM = (
        "You are a compensation strategy expert. The user has provided details for up to 3 job "
        "offers. Produce a structured comparison covering:\n"
        "1. Total Comp (Year 1 and Year 4)\n"
        "2. Equity analysis\n"
        "3. Growth trajectory\n"
        "4. Risk factors\n"
        "5. Your recommendation with a clear rationale\n\n"
        'Be direct and specific. Use markdown headers. If a field is blank, note it as '
        '"Not provided" rather than skipping it.'
    )

    _FIELDS = [
        ("company",    "Company Name"),
        ("role",       "Role / Title"),
        ("base",       "Base Salary"),
        ("bonus",      "Bonus / Target"),
        ("equity",     "Equity (total $)"),
        ("vesting",    "Vesting (years)"),
        ("pto",        "PTO (days)"),
        ("location",   "Location / Remote"),
        ("start_date", "Start Date"),
    ]

    def __init__(self, parent, client, **kwargs):
        super().__init__(parent, bg=self.BG, **kwargs)
        self._client = client
        self._entries: list = []
        self._build()

    def _build(self):
        tk.Label(self, text="⚖️  Multi-Offer Comparison",
                 bg=self.BG, fg=self.ACCENT,
                 font=("Helvetica", 15, "bold"),
                 anchor="w", padx=20, pady=14).pack(fill="x")

        tk.Label(self, text="Fill in details for up to 3 offers, then click Compare.",
                 bg=self.BG, fg="#94a3b8",
                 font=("Helvetica", 10), anchor="w", padx=20).pack(fill="x")

        grid_frame = tk.Frame(self, bg=self.BG)
        grid_frame.pack(fill="x", padx=20, pady=(10, 0))

        headers = ["Offer A", "Offer B", "Offer C"]
        for col, hdr in enumerate(headers):
            tk.Label(grid_frame, text=hdr,
                     bg=self.COL_HDR, fg="#ffffff",
                     font=("Helvetica", 10, "bold"),
                     anchor="center", pady=6).grid(
                row=0, column=col + 1, sticky="ew", padx=3)
            self._entries.append({})

        grid_frame.columnconfigure(0, weight=0, minsize=130)
        for c in range(1, 4):
            grid_frame.columnconfigure(c, weight=1)

        for row_idx, (key, label) in enumerate(self._FIELDS):
            tk.Label(grid_frame, text=label,
                     bg=self.BG, fg=self.FG,
                     font=("Helvetica", 9),
                     anchor="w").grid(row=row_idx + 1, column=0, sticky="w", pady=2, padx=(0, 6))

            for col_idx in range(3):
                var = tk.StringVar()
                entry = tk.Entry(grid_frame, textvariable=var,
                                 bg="#16213e", fg=self.FG,
                                 insertbackground=self.FG,
                                 font=("Helvetica", 9),
                                 relief="flat", bd=1,
                                 highlightthickness=1,
                                 highlightcolor=self.ACCENT,
                                 highlightbackground="#3b3b5c")
                entry.grid(row=row_idx + 1, column=col_idx + 1,
                           sticky="ew", padx=3, pady=2, ipady=3)
                self._entries[col_idx][key] = var

        btn_row = tk.Frame(self, bg=self.BG)
        btn_row.pack(fill="x", padx=20, pady=8)

        self._compare_btn = tk.Button(
            btn_row, text="Compare Offers →",
            bg=self.ACCENT, fg=self.BTN_FG,
            activebackground="#6d28d9",
            font=("Helvetica", 11, "bold"),
            relief="flat", bd=0, padx=20, pady=8,
            cursor="hand2",
            command=self._run_compare,
        )
        self._compare_btn.pack(side="right")

        self._status = tk.Label(btn_row, text="",
                                bg=self.BG, fg="#94a3b8",
                                font=("Helvetica", 9))
        self._status.pack(side="right", padx=12)

        result_card = tk.Frame(self, bg=self.CARD_BG, padx=16, pady=12)
        result_card.pack(fill="both", expand=True, padx=20, pady=(0, 14))

        tk.Label(result_card, text="Analysis & Recommendation",
                 bg=self.CARD_BG, fg=self.ACCENT,
                 font=("Helvetica", 11, "bold")).pack(anchor="w")

        self._result_text = tk.Text(
            result_card, wrap="word", state="disabled",
            bg=self.CARD_BG, fg=self.FG,
            font=("Helvetica", 10), relief="flat", bd=0,
        )
        self._result_text.pack(fill="both", expand=True)

    def _set_text(self, widget: tk.Text, content: str):
        widget.configure(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", content)
        widget.configure(state="disabled")

    def _run_compare(self):
        offer_blocks = []
        for idx, offer_vars in enumerate(self._entries):
            company = offer_vars["company"].get().strip()
            if not company:
                continue
            lines = [f"=== Offer {chr(65 + idx)} ({company}) ==="]
            for key, label in self._FIELDS:
                val = offer_vars[key].get().strip() or "Not provided"
                lines.append(f"{label}: {val}")
            offer_blocks.append("\n".join(lines))

        if not offer_blocks:
            self._status.configure(text="⚠ Fill in at least one offer.", fg="#f59e0b")
            return

        self._compare_btn.configure(state="disabled", text="Comparing…")
        self._status.configure(text="Asking Claude…", fg="#94a3b8")
        self._set_text(self._result_text, "")

        prompt = "\n\n".join(offer_blocks)
        threading.Thread(target=self._compare_worker, args=(prompt,), daemon=True).start()

    def _compare_worker(self, prompt: str):
        try:
            resp = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=2000,
                system=self._COMPARE_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            result = resp.content[0].text.strip()
            self.after(0, lambda: self._set_text(self._result_text, result))
            self.after(0, lambda: self._status.configure(text="Done.", fg="#22c55e"))
        except Exception as exc:
            self.after(0, lambda: self._status.configure(
                text=f"Error: {exc}", fg="#ef4444"))
        finally:
            self.after(0, lambda: self._compare_btn.configure(
                state="normal", text="Compare Offers →"))


class TotalCompFrame(tk.Frame):
    """
    Pure-math total compensation calculator.
    Inputs: base, bonus%, signing, equity_shares, strike_price, current_fmv,
            vesting_years, benefits_annual.
    Outputs: Year 1 TC, Year 4 TC, equity value at vest.
    Bar chart: tkinter Canvas only — no matplotlib dependency.
    """

    BG      = "#0f0f1a"
    CARD_BG = "#1a1a2e"
    FG      = "#e2e8f0"
    ACCENT  = "#7c3aed"
    BARS    = ["#7c3aed", "#2563eb", "#059669", "#d97706", "#dc2626"]

    BAR_LABELS = [
        "Base Salary",
        "Annual Bonus",
        "Benefits",
        "Equity (Year 1)",
        "Equity (Year 4)",
    ]

    def __init__(self, parent, **kwargs):
        super().__init__(parent, bg=self.BG, **kwargs)
        self._vars: dict = {}
        self._build()

    def _build(self):
        tk.Label(self, text="🧮 Total Comp Calculator",
                 bg=self.BG, fg=self.ACCENT,
                 font=("Helvetica", 15, "bold"),
                 anchor="w", padx=20, pady=14).pack(fill="x")

        tk.Label(self, text="Pure math — no AI used. Enter your offer details.",
                 bg=self.BG, fg="#94a3b8",
                 font=("Helvetica", 10), anchor="w", padx=20).pack(fill="x")

        body = tk.Frame(self, bg=self.BG)
        body.pack(fill="both", expand=True, padx=20, pady=10)

        input_card = tk.Frame(body, bg=self.CARD_BG, padx=16, pady=14)
        input_card.pack(side="left", fill="y", padx=(0, 10))

        fields = [
            ("base",            "Base Salary ($)"),
            ("bonus_pct",       "Target Bonus (%)"),
            ("signing",         "Signing Bonus ($)"),
            ("equity_shares",   "Equity Shares / RSUs"),
            ("strike_price",    "Strike / Grant Price ($)"),
            ("current_fmv",     "Current FMV per Share ($)"),
            ("vesting_years",   "Vesting Period (years)"),
            ("benefits_annual", "Benefits Value ($/year)"),
        ]

        for key, label in fields:
            tk.Label(input_card, text=label,
                     bg=self.CARD_BG, fg=self.FG,
                     font=("Helvetica", 9), anchor="w").pack(fill="x", pady=(4, 0))
            var = tk.StringVar(value="0")
            entry = tk.Entry(input_card, textvariable=var,
                             bg="#16213e", fg=self.FG,
                             insertbackground=self.FG,
                             font=("Helvetica", 10),
                             relief="flat", bd=1,
                             highlightthickness=1,
                             highlightcolor=self.ACCENT,
                             highlightbackground="#3b3b5c",
                             width=18)
            entry.pack(fill="x", pady=(0, 2), ipady=4)
            self._vars[key] = var

        tk.Button(
            input_card, text="Calculate →",
            bg=self.ACCENT, fg="#ffffff",
            activebackground="#6d28d9",
            font=("Helvetica", 11, "bold"),
            relief="flat", bd=0, pady=8,
            cursor="hand2",
            command=self._calculate,
        ).pack(fill="x", pady=(12, 0))

        self._error_label = tk.Label(input_card, text="",
                                     bg=self.CARD_BG, fg="#ef4444",
                                     font=("Helvetica", 9), wraplength=160)
        self._error_label.pack(fill="x", pady=(4, 0))

        right = tk.Frame(body, bg=self.BG)
        right.pack(side="left", fill="both", expand=True)

        summary_card = tk.Frame(right, bg=self.CARD_BG, padx=16, pady=12)
        summary_card.pack(fill="x")

        self._summary_labels: dict = {}
        for key, label in [
            ("year1_tc",   "Year 1 Total Comp"),
            ("year4_tc",   "Year 4 Total Comp"),
            ("equity_val", "Equity Value at Full Vest"),
        ]:
            row = tk.Frame(summary_card, bg=self.CARD_BG)
            row.pack(fill="x", pady=3)
            tk.Label(row, text=label + ":",
                     bg=self.CARD_BG, fg="#94a3b8",
                     font=("Helvetica", 10)).pack(side="left")
            lbl = tk.Label(row, text="—",
                           bg=self.CARD_BG, fg="#22c55e",
                           font=("Helvetica", 12, "bold"))
            lbl.pack(side="right")
            self._summary_labels[key] = lbl

        chart_card = tk.Frame(right, bg=self.CARD_BG, padx=16, pady=12)
        chart_card.pack(fill="both", expand=True, pady=(10, 0))

        tk.Label(chart_card, text="Compensation Breakdown",
                 bg=self.CARD_BG, fg=self.ACCENT,
                 font=("Helvetica", 10, "bold")).pack(anchor="w")

        self._canvas = tk.Canvas(chart_card, bg=self.CARD_BG,
                                 highlightthickness=0, height=200)
        self._canvas.pack(fill="both", expand=True, pady=(6, 0))
        self._canvas.bind("<Configure>", self._redraw_chart)
        self._chart_values: list = []

    @staticmethod
    def _parse(var: tk.StringVar) -> float:
        raw = var.get().replace("$", "").replace(",", "").strip()
        if not raw:
            return 0.0
        return float(raw)

    def calculate(
        self,
        base: float,
        bonus_pct: float,
        signing: float,
        equity_shares: float,
        strike_price: float,
        current_fmv: float,
        vesting_years: float,
        benefits_annual: float,
    ) -> dict:
        """
        Pure-math total comp calculation.
        Returns dict with year1_tc, year4_tc, equity_value_at_vest,
        annual_bonus, shares_per_year, equity_year1, equity_year4.
        """
        annual_bonus    = base * (bonus_pct / 100.0)
        equity_gain_per = max(0.0, current_fmv - strike_price)
        vesting_y       = max(1.0, vesting_years)
        shares_per_year = equity_shares / vesting_y
        equity_year1    = shares_per_year * equity_gain_per
        equity_year4    = min(4.0, vesting_y) / vesting_y * equity_shares * equity_gain_per

        year1_tc = base + annual_bonus + signing + equity_year1 + benefits_annual
        year4_tc = (base * 4) + (annual_bonus * 4) + equity_year4 + (benefits_annual * 4)

        return {
            "year1_tc":             year1_tc,
            "year4_tc":             year4_tc,
            "equity_value_at_vest": equity_shares * equity_gain_per,
            "annual_bonus":         annual_bonus,
            "equity_year1":         equity_year1,
            "equity_year4":         equity_year4,
        }

    def _calculate(self):
        try:
            base            = self._parse(self._vars["base"])
            bonus_pct       = self._parse(self._vars["bonus_pct"])
            signing         = self._parse(self._vars["signing"])
            equity_shares   = self._parse(self._vars["equity_shares"])
            strike_price    = self._parse(self._vars["strike_price"])
            current_fmv     = self._parse(self._vars["current_fmv"])
            vesting_years   = self._parse(self._vars["vesting_years"])
            benefits_annual = self._parse(self._vars["benefits_annual"])
        except ValueError:
            self._error_label.configure(text="⚠ Enter numbers only (no letters).")
            return

        self._error_label.configure(text="")

        result = self.calculate(
            base, bonus_pct, signing, equity_shares,
            strike_price, current_fmv, vesting_years, benefits_annual,
        )

        def fmt(n: float) -> str:
            return f"${n:,.0f}"

        self._summary_labels["year1_tc"].configure(text=fmt(result["year1_tc"]))
        self._summary_labels["year4_tc"].configure(text=fmt(result["year4_tc"]))
        self._summary_labels["equity_val"].configure(
            text=fmt(result["equity_value_at_vest"]))

        self._chart_values = [
            base,
            result["annual_bonus"],
            benefits_annual,
            result["equity_year1"],
            result["equity_year4"],
        ]
        self._redraw_chart()

    def _redraw_chart(self, _event=None):
        self._canvas.delete("all")
        values = self._chart_values
        if not values or max(values) <= 0:
            return

        w = self._canvas.winfo_width()
        h = self._canvas.winfo_height()
        if w < 10 or h < 10:
            return

        padding_left  = 110
        padding_right = 60
        padding_top   = 10
        padding_bot   = 10

        n_bars     = len(values)
        bar_area_h = h - padding_top - padding_bot
        bar_h      = max(12, (bar_area_h // n_bars) - 6)
        max_val    = max(values)
        bar_max_w  = w - padding_left - padding_right

        for i, (val, label) in enumerate(zip(values, self.BAR_LABELS)):
            y_center = padding_top + i * (bar_area_h // n_bars) + bar_h // 2
            y0 = y_center - bar_h // 2
            y1 = y_center + bar_h // 2

            self._canvas.create_text(
                padding_left - 6, y_center,
                text=label, anchor="e",
                fill=self.FG, font=("Helvetica", 8),
            )

            fill_w = int(bar_max_w * (val / max_val)) if max_val > 0 else 0
            color  = self.BARS[i % len(self.BARS)]
            if fill_w > 0:
                self._canvas.create_rectangle(
                    padding_left, y0,
                    padding_left + fill_w, y1,
                    fill=color, outline="",
                )

            self._canvas.create_text(
                padding_left + fill_w + 4, y_center,
                text=f"${val:,.0f}", anchor="w",
                fill="#94a3b8", font=("Helvetica", 8),
            )


class EmailDraftFrame(tk.Frame):
    """
    Inputs: company, role, current offer, target comp, notes.
    Claude generates 3 sections: Subject Line, Negotiation Email, Follow-Up Email.
    Each section has its own Copy button.
    """

    BG      = "#0f0f1a"
    CARD_BG = "#1a1a2e"
    FG      = "#e2e8f0"
    ACCENT  = "#7c3aed"
    BTN_FG  = "#ffffff"

    _EMAIL_SYSTEM = (
        "You are a professional career coach specializing in salary negotiation. "
        "Generate exactly three sections separated by the delimiters shown. "
        "Do not deviate from this format.\n\n"
        "===SUBJECT===\n<one-line email subject>\n"
        "===EMAIL===\n<full negotiation email body>\n"
        "===FOLLOWUP===\n<full follow-up email body (send if no reply after 5 days)>\n\n"
        "Rules:\n"
        "- Address the hiring manager by name if provided\n"
        "- Be warm, confident, and professional — not aggressive\n"
        "- Anchor to a specific number in the counter\n"
        "- Keep the email under 200 words\n"
        "- Keep the follow-up under 120 words\n"
        "- No placeholders like [YOUR NAME] — use the details provided"
    )

    _SECTIONS = [
        ("subject",  "Subject Line",     "===SUBJECT===",  "===EMAIL==="),
        ("email",    "Negotiation Email", "===EMAIL===",    "===FOLLOWUP==="),
        ("followup", "Follow-Up Email",  "===FOLLOWUP===", None),
    ]

    def __init__(self, parent, client, **kwargs):
        super().__init__(parent, bg=self.BG, **kwargs)
        self._client       = client
        self._input_vars: dict = {}
        self._section_texts: dict = {}
        self._build()

    def _build(self):
        tk.Label(self, text="✉️  Negotiation Email Generator",
                 bg=self.BG, fg=self.ACCENT,
                 font=("Helvetica", 15, "bold"),
                 anchor="w", padx=20, pady=14).pack(fill="x")

        body = tk.Frame(self, bg=self.BG)
        body.pack(fill="both", expand=True, padx=20, pady=(0, 14))

        input_card = tk.Frame(body, bg=self.CARD_BG, padx=16, pady=14)
        input_card.pack(side="left", fill="y", padx=(0, 10))

        single_fields = [
            ("hiring_manager", "Hiring Manager Name"),
            ("company",        "Company"),
            ("role",           "Role / Title"),
            ("current_offer",  "Current Offer ($)"),
            ("target_comp",    "Your Counter ($)"),
        ]

        for key, label in single_fields:
            tk.Label(input_card, text=label,
                     bg=self.CARD_BG, fg=self.FG,
                     font=("Helvetica", 9), anchor="w").pack(fill="x", pady=(4, 0))
            var = tk.StringVar()
            tk.Entry(input_card, textvariable=var,
                     bg="#16213e", fg=self.FG,
                     insertbackground=self.FG,
                     font=("Helvetica", 10),
                     relief="flat", bd=1,
                     highlightthickness=1,
                     highlightcolor=self.ACCENT,
                     highlightbackground="#3b3b5c",
                     width=22).pack(fill="x", ipady=4, pady=(0, 2))
            self._input_vars[key] = var

        tk.Label(input_card, text="Additional Notes",
                 bg=self.CARD_BG, fg=self.FG,
                 font=("Helvetica", 9), anchor="w").pack(fill="x", pady=(4, 0))
        self._notes = tk.Text(
            input_card, height=4, wrap="word",
            bg="#16213e", fg=self.FG,
            insertbackground=self.FG,
            font=("Helvetica", 9),
            relief="flat", bd=1,
            highlightthickness=1,
            highlightcolor=self.ACCENT,
            highlightbackground="#3b3b5c",
            width=22,
        )
        self._notes.pack(fill="x", ipady=4, pady=(0, 8))

        self._generate_btn = tk.Button(
            input_card, text="Generate Emails →",
            bg=self.ACCENT, fg=self.BTN_FG,
            activebackground="#6d28d9",
            font=("Helvetica", 11, "bold"),
            relief="flat", bd=0, pady=8,
            cursor="hand2",
            command=self._run_generate,
        )
        self._generate_btn.pack(fill="x")

        self._status = tk.Label(input_card, text="",
                                bg=self.CARD_BG, fg="#94a3b8",
                                font=("Helvetica", 9), wraplength=170)
        self._status.pack(fill="x", pady=(4, 0))

        right = tk.Frame(body, bg=self.BG)
        right.pack(side="left", fill="both", expand=True)

        for key, title, _start_delim, _end_delim in self._SECTIONS:
            section = tk.Frame(right, bg=self.CARD_BG, padx=12, pady=8)
            section.pack(fill="both", expand=True, pady=(0, 6))

            hdr = tk.Frame(section, bg=self.CARD_BG)
            hdr.pack(fill="x")
            tk.Label(hdr, text=title,
                     bg=self.CARD_BG, fg=self.ACCENT,
                     font=("Helvetica", 10, "bold")).pack(side="left")
            tk.Button(
                hdr, text="Copy",
                bg="#3b3b5c", fg="#c4b5fd",
                activebackground="#4c1d95",
                font=("Helvetica", 8),
                relief="flat", bd=0, padx=8, pady=2,
                cursor="hand2",
                command=lambda k=key: self._copy_section(k),
            ).pack(side="right")

            txt = tk.Text(
                section, wrap="word", state="disabled",
                bg=self.CARD_BG, fg=self.FG,
                font=("Helvetica", 9), relief="flat", bd=0,
                height=4,
            )
            txt.pack(fill="both", expand=True, pady=(4, 0))
            self._section_texts[key] = txt

    def _set_text(self, widget: tk.Text, content: str):
        widget.configure(state="normal")
        widget.delete("1.0", "end")
        widget.insert("1.0", content)
        widget.configure(state="disabled")

    def _copy_section(self, key: str):
        txt = self._section_texts[key]
        content = txt.get("1.0", "end-1c").strip()
        if content:
            self.clipboard_clear()
            self.clipboard_append(content)

    @staticmethod
    def parse_sections(raw: str) -> dict:
        """Parse Claude output into {subject, email, followup}."""
        result = {}
        delimiters = ["===SUBJECT===", "===EMAIL===", "===FOLLOWUP==="]
        keys       = ["subject",       "email",       "followup"]

        for i, (delim, key) in enumerate(zip(delimiters, keys)):
            start = raw.find(delim)
            if start == -1:
                result[key] = ""
                continue
            content_start = start + len(delim)
            end = len(raw)
            if i + 1 < len(delimiters):
                next_pos = raw.find(delimiters[i + 1], content_start)
                if next_pos != -1:
                    end = next_pos
            result[key] = raw[content_start:end].strip()

        return result

    def _run_generate(self):
        company       = self._input_vars["company"].get().strip()
        current_offer = self._input_vars["current_offer"].get().strip()
        target_comp   = self._input_vars["target_comp"].get().strip()

        if not company or not current_offer or not target_comp:
            self._status.configure(
                text="⚠ Fill in Company, Current Offer, and Target.", fg="#f59e0b")
            return

        hiring_manager = self._input_vars["hiring_manager"].get().strip() or "the hiring team"
        role           = self._input_vars["role"].get().strip()
        notes          = self._notes.get("1.0", "end-1c").strip()

        prompt = (
            f"Hiring Manager: {hiring_manager}\n"
            f"Company: {company}\n"
            f"Role: {role}\n"
            f"Current Offer: {current_offer}\n"
            f"My Counter: {target_comp}\n"
        )
        if notes:
            prompt += f"Additional Context: {notes}\n"

        self._generate_btn.configure(state="disabled", text="Generating…")
        self._status.configure(text="Drafting emails…", fg="#94a3b8")
        for txt in self._section_texts.values():
            self._set_text(txt, "")

        threading.Thread(target=self._generate_worker, args=(prompt,), daemon=True).start()

    def _generate_worker(self, prompt: str):
        try:
            resp = self._client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=1500,
                system=self._EMAIL_SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw      = resp.content[0].text
            sections = self.parse_sections(raw)

            for key, content in sections.items():
                self.after(0, lambda t=self._section_texts[key], c=content:
                           self._set_text(t, c))

            self.after(0, lambda: self._status.configure(
                text="Done — click Copy to use each section.", fg="#22c55e"))
        except Exception as exc:
            self.after(0, lambda: self._status.configure(
                text=f"Error: {exc}", fg="#ef4444"))
        finally:
            self.after(0, lambda: self._generate_btn.configure(
                state="normal", text="Generate Emails →"))


class NegotiateFrame(tk.Frame):
    """💰 Negotiate Mode — four salary tools in a left-nav layout."""

    NAV_WIDTH  = 170
    NAV_BG     = "#1e1e2e"
    NAV_SEL    = "#7c3aed"
    NAV_FG     = "#e2e8f0"
    CONTENT_BG = "#0f0f1a"

    TOOLS = [
        ("📄", "Offer Analyzer"),
        ("⚖️",  "Compare Offers"),
        ("🧮", "Total Comp"),
        ("✉️",  "Email Draft"),
    ]

    def __init__(self, parent, client, **kwargs):
        super().__init__(parent, bg=self.CONTENT_BG, **kwargs)
        self._client   = client
        self._nav_btns = []
        self._frames   = {}
        self._active   = None

        self._build_layout()
        self._show_tool(0)

    def _build_layout(self):
        self._nav = tk.Frame(self, width=self.NAV_WIDTH, bg=self.NAV_BG)
        self._nav.pack(side="left", fill="y")
        self._nav.pack_propagate(False)

        tk.Label(
            self._nav, text="💰 Negotiate",
            bg=self.NAV_BG, fg="#a78bfa",
            font=("Helvetica", 13, "bold"),
            pady=18,
        ).pack(fill="x")

        tk.Frame(self._nav, bg="#3b3b5c", height=1).pack(fill="x", padx=12)

        for idx, (icon, label) in enumerate(self.TOOLS):
            btn = tk.Button(
                self._nav,
                text=f"  {icon}  {label}",
                anchor="w",
                bg=self.NAV_BG, fg=self.NAV_FG,
                activebackground=self.NAV_SEL,
                activeforeground="#ffffff",
                relief="flat", bd=0,
                padx=10, pady=11,
                font=("Helvetica", 11),
                cursor="hand2",
                command=lambda i=idx: self._show_tool(i),
            )
            btn.pack(fill="x")
            self._nav_btns.append(btn)

        self._content = tk.Frame(self, bg=self.CONTENT_BG)
        self._content.pack(side="left", fill="both", expand=True)

        self._frames[0] = OfferAnalyzerFrame(self._content, self._client)
        self._frames[1] = MultiOfferFrame(self._content, self._client)
        self._frames[2] = TotalCompFrame(self._content)
        self._frames[3] = EmailDraftFrame(self._content, self._client)

        for frame in self._frames.values():
            frame.place(relwidth=1, relheight=1)

    def _show_tool(self, idx: int):
        for i, btn in enumerate(self._nav_btns):
            if i == idx:
                btn.configure(bg=self.NAV_SEL, fg="#ffffff")
            else:
                btn.configure(bg=self.NAV_BG, fg=self.NAV_FG)

        self._frames[idx].lift()
        self._active = idx


# ─────────────────────────────────────────────────────────────────────────────
# SUCCEED MODE
# ─────────────────────────────────────────────────────────────────────────────

class SucceedMode(tk.Frame):
    """🚀 Succeed Mode — AI tools to thrive in your new role."""

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
        self._switch_panel("90day")

    # ── Profile Strip ──────────────────────────────────────────────────────────
    def _build_profile_strip(self):
        strip = tk.Frame(self, bg="#16213e", pady=8)
        strip.pack(fill="x", padx=0, pady=(0, 2))

        tk.Label(strip, text="Role:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(12, 2))
        self.var_role = tk.StringVar()
        tk.Entry(strip, textvariable=self.var_role, bg="#0f3460", fg="white",
                 insertbackground="white", font=("Segoe UI", 9), width=20,
                 relief="flat").pack(side="left", padx=(0, 10))

        tk.Label(strip, text="Company:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(0, 2))
        self.var_company = tk.StringVar()
        tk.Entry(strip, textvariable=self.var_company, bg="#0f3460", fg="white",
                 insertbackground="white", font=("Segoe UI", 9), width=18,
                 relief="flat").pack(side="left", padx=(0, 10))

        tk.Label(strip, text="Industry:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(0, 2))
        self.var_industry = tk.StringVar(value=self.INDUSTRIES[0])
        tk.OptionMenu(strip, self.var_industry, *self.INDUSTRIES).pack(
            side="left", padx=(0, 10))

        tk.Label(strip, text="Level:", bg="#16213e", fg="#aaaaaa",
                 font=("Segoe UI", 9)).pack(side="left", padx=(0, 2))
        self.var_level = tk.StringVar(value=self.LEVELS[0])
        tk.OptionMenu(strip, self.var_level, *self.LEVELS).pack(
            side="left", padx=(0, 10))

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
            ("90day",     "📅 90-Day Plan"),
            ("meeting",   "🤝 Meeting Prep"),
            ("fluency",   "💬 Business Fluency"),
            ("templates", "✉️ Templates"),
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
        for k, btn in self._nav_buttons.items():
            btn.config(bg="#e94560" if k == key else "#16213e",
                       fg="white" if k == key else "#aaaaaa")
        if self.active_panel is not None:
            self.active_panel.destroy()
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

    # ── 90-Day Plan Panel ──────────────────────────────────────────────────────
    def _build_90day_panel(self, parent):
        """90-Day Plan Generator panel."""
        f = tk.Frame(parent, bg="#1a1a2e")

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

        self._90day_canvas.bind_all(
            "<MouseWheel>",
            lambda e: self._90day_canvas.yview_scroll(-1 * (e.delta // 120), "units")
        )
        return f

    def _generate_90day_plan(self):
        """Kick off Claude Opus generation in a background thread."""
        role     = self.var_role.get().strip() or "New Employee"
        company  = self.var_company.get().strip() or "your company"
        industry = self.var_industry.get()
        level    = self.var_level.get()
        start    = self._90day_start.get().strip()

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
            week_num  = week_data.get("week", 0)
            month_idx = min((week_num - 1) // 4, 2)
            card_bg   = MONTH_COLORS[month_idx]

            card = tk.Frame(self._90day_cards_frame, bg=card_bg,
                            padx=12, pady=10, relief="flat")
            card.pack(fill="x", padx=4, pady=4)

            header = tk.Frame(card, bg=card_bg)
            header.pack(fill="x")
            tk.Label(header, text=f"Week {week_num}",
                     bg=card_bg, fg="#e94560",
                     font=("Segoe UI", 10, "bold")).pack(side="left")
            tk.Label(header, text=f"  {week_data.get('theme', '')}",
                     bg=card_bg, fg="white",
                     font=("Segoe UI", 10)).pack(side="left")

            sections = [
                ("🎯 Milestones",    week_data.get("milestones", [])),
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

    # ── Meeting Prep Panel ─────────────────────────────────────────────────────
    def _build_meeting_panel(self, parent):
        """Meeting Prep AI panel."""
        f = tk.Frame(parent, bg="#1a1a2e")

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

        grid = tk.Frame(f, bg="#1a1a2e")
        grid.pack(fill="both", expand=True, padx=8, pady=8)
        grid.columnconfigure(0, weight=1)
        grid.columnconfigure(1, weight=1)
        grid.rowconfigure(0, weight=1)
        grid.rowconfigure(1, weight=1)

        self._meeting_cards = {}
        cards_config = [
            ("talking_points",    "🗣️ Talking Points",   0, 0),
            ("questions",         "❓ Questions to Ask",  0, 1),
            ("terms",             "📖 Terms to Know",      1, 0),
            ("financial_context", "📊 Financial Context", 1, 1),
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

        role     = self.var_role.get().strip() or "employee"
        company  = self.var_company.get().strip() or "your company"
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

        pts = "\n".join(f"• {p}" for p in data.get("talking_points", []))
        _set_card("talking_points", pts)

        qs = "\n".join(f"• {q}" for q in data.get("questions", []))
        _set_card("questions", qs)

        terms = data.get("terms", [])
        if terms and isinstance(terms[0], dict):
            terms_text = "\n".join(
                f"• {t['term']}: {t['definition']}" for t in terms
            )
        else:
            terms_text = "\n".join(f"• {t}" for t in terms)
        _set_card("terms", terms_text)

        fc = "\n".join(f"• {c}" for c in data.get("financial_context", []))
        _set_card("financial_context", fc)

    # ── Business Fluency Coach Panel ───────────────────────────────────────────
    def _build_fluency_panel(self, parent):
        """Business Fluency Coach chat panel."""
        f = tk.Frame(parent, bg="#1a1a2e")
        self._fluency_history = []

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

        self._fluency_add_message(
            "assistant",
            f"Hi! I'm your Business Fluency Coach. Ask me anything about business "
            f"concepts, finance, strategy, or {self.var_industry.get()} terminology "
            f"— I'll explain it in plain English at the {self.var_level.get()} level."
        )

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
        self._fluency_input.bind("<Shift-Return>", lambda e: None)

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
        is_user   = role == "user"
        bubble_bg = "#0f3460" if is_user else "#16213e"
        anchor    = "e" if is_user else "w"
        padx_args = (80, 8) if is_user else (8, 80)

        bubble = tk.Frame(self._fluency_msg_frame, bg=bubble_bg, padx=10, pady=8)
        bubble.pack(fill="x", padx=padx_args, pady=3, anchor=anchor)

        if not is_user:
            tk.Label(bubble, text="🤖 Coach", bg=bubble_bg, fg="#e94560",
                     font=("Segoe UI", 8, "bold")).pack(anchor="w")

        tk.Label(bubble, text=text, bg=bubble_bg, fg="white",
                 font=("Segoe UI", 9), wraplength=480,
                 justify="left").pack(anchor="w")

        self._fluency_canvas.update_idletasks()
        self._fluency_canvas.yview_moveto(1.0)

    def _fluency_on_enter(self, event):
        """Send on Enter; Shift+Enter inserts newline."""
        if not event.state & 0x1:
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

    # ── Communication Templates Panel ──────────────────────────────────────────
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
        context  = self._tmpl_context.get("1.0", "end-1c").strip()
        role     = self.var_role.get().strip() or "employee"
        company  = self.var_company.get().strip() or "your company"
        industry = self.var_industry.get()
        level    = self.var_level.get()

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


# ─────────────────────────────────────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🎯 Career Companion (Windows) starting...")
    print("   Ctrl+Shift+H = hide/show   |   Alt+F4 = quit   |   drag title bar to move")
    print()

    # Show available devices
    print("Available audio input devices:")
    for i, d in enumerate(sd.query_devices()):
        if d['max_input_channels'] > 0:
            marker = " <- VB-Audio CABLE Output (use this)" if 'cable output' in d['name'].lower() else ""
            print(f"  [{i}] {d['name']}{marker}")
    print()

    lb_idx, lb_name = find_windows_loopback_device()
    if lb_idx is None:
        print("VB-Audio CABLE not found — running in MICROPHONE mode.")
        print("   To capture Zoom/Teams audio, install VB-Audio Virtual Cable (free):")
        print("   https://vb-audio.com/Cable/")
        print("   Then set Zoom audio output to 'CABLE Input (VB-Audio Virtual Cable)'")
        print()

    overlay = InterviewOverlay()
    overlay.run()
