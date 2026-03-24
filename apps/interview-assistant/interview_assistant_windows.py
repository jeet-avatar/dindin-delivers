#!/usr/bin/env python3
"""
Interview Assistant (Windows) — Real-time AI coaching during Zoom/Teams interviews
Captures meeting audio -> Whisper transcription -> Claude answers -> Floating overlay
"""

import os, sys, time, queue, threading, io, wave, struct, math
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

_APP_TOKEN  = "ia-token-8f3k2p9x"
_CONFIG_URL = "https://0q8mtozfra.execute-api.us-east-1.amazonaws.com/get-app-config"

def _fetch_api_keys():
    """Fetch API keys from config server at startup."""
    try:
        req = _urllib_request.Request(
            _CONFIG_URL,
            data=_json.dumps({"app_token": _APP_TOKEN}).encode(),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with _urllib_request.urlopen(req, timeout=10) as resp:
            data = _json.loads(resp.read())
        return data["openai_key"], data["anthropic_key"]
    except Exception as e:
        print(f"\u26a0\ufe0f  Could not fetch API config: {e}")
        raise SystemExit("Cannot start: failed to load API configuration. Check your internet connection.")

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
        self.root.title("🎯 Interview Assistant")
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

    def _build_ui(self):
        root = self.root

        # ── Top bar ──
        top = tk.Frame(root, bg="#1a2635", pady=8)
        top.pack(fill="x")

        tk.Label(top, text="🎯  Interview Assistant",
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

        # ── Interviewer transcript ──
        tk.Label(root, text="🎤  INTERVIEWER",
                 bg="#0f1923", fg="#0891b2",
                 font=("Inter", 10, "bold"), anchor="w",
                 padx=14).pack(fill="x")

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

        # Clear placeholder on focus
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

        # ── Tag styles ──
        self.answer_text.tag_configure("answer_label",
            foreground="#7dd3fc", font=("Inter", 11, "bold"))
        self.answer_text.tag_configure("answer_body",
            foreground="#f1f5f9", font=("Inter", 12))
        self.answer_text.tag_configure("key_label",
            foreground="#f59e0b", font=("Inter", 11, "bold"))
        self.answer_text.tag_configure("key_body",
            foreground="#fcd34d", font=("Inter", 11, "italic"))

        # ── Bottom bar ──
        bottom = tk.Frame(root, bg="#1a2635", pady=6)
        bottom.pack(fill="x", side="bottom")
        tk.Label(bottom,
                 text="Ctrl+Shift+H hide/show  •  Alt+F4 quit  •  drag to move",
                 bg="#1a2635", fg="#374151",
                 font=("Inter", 9)).pack()

        # Make draggable via top bar
        top.bind("<Button-1>",   self._on_drag_start)
        top.bind("<B1-Motion>",  self._on_drag_motion)

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
# ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("🎯 Interview Assistant (Windows) starting...")
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
