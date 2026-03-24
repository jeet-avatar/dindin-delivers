"""
BeatMind Bridge — macOS/Windows GUI app.
Double-click to launch. Connects to your BeatMind account and controls Ableton Live.
"""

import asyncio
import json
import os
import sys
import threading
import tkinter as tk
from tkinter import font as tkfont
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

# Import the bridge core from the same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bridge import AbletonBridge

# ── Config ──
CONFIG_PATH = Path.home() / ".beatmind" / "config.json"
DEFAULT_SERVER = "wss://api.beatmind.io/ws/bridge"
DEFAULT_API = "https://api.beatmind.io"

# ── Colors (match BeatMind dark theme) ──
BG = "#0a0a0a"
BG_CARD = "#141414"
BG_INPUT = "#1a1a1a"
ACCENT = "#ff6b00"
TEXT = "#e5e5e5"
TEXT_DIM = "#999999"
BORDER = "#2a2a2a"
SUCCESS = "#22c55e"
ERROR = "#ef4444"


def load_config() -> dict:
    try:
        return json.loads(CONFIG_PATH.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_config(data: dict):
    CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(data, indent=2))


class BeatMindBridgeApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("BeatMind Bridge")
        self.root.geometry("420x520")
        self.root.resizable(False, False)
        self.root.configure(bg=BG)

        # Center on screen
        self.root.update_idletasks()
        x = (self.root.winfo_screenwidth() - 420) // 2
        y = (self.root.winfo_screenheight() - 520) // 2
        self.root.geometry(f"420x520+{x}+{y}")

        # State
        self.bridge = None
        self.bridge_thread = None
        self.loop = None
        self.connected = False
        config = load_config()

        # ── Fonts ──
        self.font_title = tkfont.Font(family="Helvetica Neue", size=20, weight="bold")
        self.font_body = tkfont.Font(family="Helvetica Neue", size=13)
        self.font_small = tkfont.Font(family="Helvetica Neue", size=11)
        self.font_mono = tkfont.Font(family="SF Mono", size=11)
        self.font_btn = tkfont.Font(family="Helvetica Neue", size=14, weight="bold")

        # ── Build UI ──
        self._build_ui(config)

        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self, config: dict):
        # Logo / Title
        title_frame = tk.Frame(self.root, bg=BG)
        title_frame.pack(pady=(30, 5))

        logo = tk.Canvas(title_frame, width=44, height=44, bg=BG, highlightthickness=0)
        logo.create_oval(2, 2, 42, 42, fill=ACCENT, outline="")
        logo.create_text(22, 22, text="B", fill="white", font=("Helvetica Neue", 18, "bold"))
        logo.pack()

        tk.Label(title_frame, text="BeatMind Bridge", font=self.font_title,
                 bg=BG, fg=TEXT).pack(pady=(8, 0))
        tk.Label(title_frame, text="Connect BeatMind to Ableton Live",
                 font=self.font_small, bg=BG, fg=TEXT_DIM).pack(pady=(2, 0))

        # ── Login section ──
        form = tk.Frame(self.root, bg=BG_CARD, highlightbackground=BORDER,
                        highlightthickness=1, padx=24, pady=20)
        form.pack(padx=24, pady=(20, 0), fill="x")

        # Email
        tk.Label(form, text="Email", font=self.font_small, bg=BG_CARD, fg=TEXT,
                 anchor="w").pack(fill="x", pady=(0, 4))
        self.email_var = tk.StringVar(value=config.get("email", ""))
        email_entry = tk.Entry(form, textvariable=self.email_var, font=self.font_body,
                               bg=BG_INPUT, fg=TEXT, insertbackground=TEXT,
                               relief="flat", highlightthickness=1,
                               highlightbackground=BORDER, highlightcolor=ACCENT)
        email_entry.pack(fill="x", ipady=6, pady=(0, 12))

        # Password
        tk.Label(form, text="Password", font=self.font_small, bg=BG_CARD, fg=TEXT,
                 anchor="w").pack(fill="x", pady=(0, 4))
        self.password_var = tk.StringVar()
        pw_entry = tk.Entry(form, textvariable=self.password_var, font=self.font_body,
                            bg=BG_INPUT, fg=TEXT, insertbackground=TEXT,
                            show="*", relief="flat", highlightthickness=1,
                            highlightbackground=BORDER, highlightcolor=ACCENT)
        pw_entry.pack(fill="x", ipady=6, pady=(0, 4))

        # Remember checkbox
        self.remember_var = tk.BooleanVar(value=config.get("remember", True))
        tk.Checkbutton(form, text="Remember me", variable=self.remember_var,
                       font=self.font_small, bg=BG_CARD, fg=TEXT_DIM,
                       selectcolor=BG_INPUT, activebackground=BG_CARD,
                       activeforeground=TEXT_DIM).pack(anchor="w", pady=(4, 0))

        # ── Connect button ──
        self.btn_frame = tk.Frame(self.root, bg=BG)
        self.btn_frame.pack(pady=(16, 0), fill="x", padx=24)

        self.connect_btn = tk.Button(
            self.btn_frame, text="Connect", font=self.font_btn,
            bg=ACCENT, fg="white", activebackground="#cc5500",
            activeforeground="white", relief="flat", cursor="hand2",
            command=self._toggle_connection,
        )
        self.connect_btn.pack(fill="x", ipady=8)

        # ── Status ──
        status_frame = tk.Frame(self.root, bg=BG)
        status_frame.pack(pady=(16, 0), fill="x", padx=24)

        self.status_dot = tk.Canvas(status_frame, width=10, height=10,
                                    bg=BG, highlightthickness=0)
        self.status_dot.create_oval(1, 1, 9, 9, fill=TEXT_DIM, outline="", tags="dot")
        self.status_dot.pack(side="left", padx=(0, 6))

        self.status_label = tk.Label(status_frame, text="Not connected",
                                     font=self.font_small, bg=BG, fg=TEXT_DIM)
        self.status_label.pack(side="left")

        # ── Footer ──
        tk.Label(self.root, text="BeatMind by Zietra Technologies Inc.",
                 font=tkfont.Font(family="Helvetica Neue", size=10),
                 bg=BG, fg=BORDER).pack(side="bottom", pady=(0, 12))

    def _set_status(self, text: str, color: str = TEXT_DIM):
        self.status_label.config(text=text, fg=color)
        self.status_dot.delete("dot")
        self.status_dot.create_oval(1, 1, 9, 9, fill=color, outline="", tags="dot")

    def _toggle_connection(self):
        if self.connected:
            self._disconnect()
        else:
            self._connect()

    def _connect(self):
        email = self.email_var.get().strip()
        password = self.password_var.get().strip()

        if not email or not password:
            self._set_status("Please enter email and password", ERROR)
            return

        # Save config
        if self.remember_var.get():
            save_config({"email": email, "remember": True})

        self._set_status("Logging in...", ACCENT)
        self.connect_btn.config(state="disabled", text="Connecting...")

        # Do login + bridge in background thread
        thread = threading.Thread(target=self._login_and_connect,
                                  args=(email, password), daemon=True)
        thread.start()

    def _login_and_connect(self, email: str, password: str):
        api_base = os.environ.get("BEATMIND_API", DEFAULT_API)

        # Step 1: Login
        try:
            login_data = json.dumps({"email": email, "password": password}).encode()
            req = Request(f"{api_base}/api/auth/login", data=login_data,
                          headers={"Content-Type": "application/json",
                                   "User-Agent": "BeatMind-Bridge/1.0"})
            resp = urlopen(req, timeout=10)
            data = json.loads(resp.read())
            token = data["token"]
        except URLError as e:
            self.root.after(0, self._set_status, f"Cannot reach server", ERROR)
            self.root.after(0, lambda: self.connect_btn.config(state="normal", text="Connect"))
            return
        except Exception as e:
            self.root.after(0, self._set_status, "Invalid email or password", ERROR)
            self.root.after(0, lambda: self.connect_btn.config(state="normal", text="Connect"))
            return

        # Step 2: Get bridge token
        try:
            req = Request(f"{api_base}/api/auth/bridge-token", method="POST",
                          headers={"Authorization": f"Bearer {token}",
                                   "Content-Type": "application/json",
                                   "User-Agent": "BeatMind-Bridge/1.0"})
            resp = urlopen(req, timeout=10)
            bridge_data = json.loads(resp.read())
            bridge_token = bridge_data["bridge_token"]
        except Exception as e:
            self.root.after(0, self._set_status, "Could not get bridge token", ERROR)
            self.root.after(0, lambda: self.connect_btn.config(state="normal", text="Connect"))
            return

        # Step 3: Start bridge
        server_url = os.environ.get("BEATMIND_WS", DEFAULT_SERVER)
        self.root.after(0, self._set_status, "Connecting to Ableton...", ACCENT)

        self.loop = asyncio.new_event_loop()
        self.bridge = AbletonBridge(server_url=server_url, token=bridge_token)

        self.root.after(0, self._on_connected)

        try:
            self.loop.run_until_complete(self.bridge.start())
        except Exception as e:
            self.root.after(0, self._set_status, f"Bridge error: {str(e)[:40]}", ERROR)
            self.root.after(0, self._on_disconnected)

    def _on_connected(self):
        self.connected = True
        self.connect_btn.config(state="normal", text="Disconnect",
                                bg="#333", activebackground="#555")
        self._set_status("Connected to Ableton Live", SUCCESS)

    def _disconnect(self):
        self._set_status("Disconnecting...", TEXT_DIM)
        if self.bridge and self.loop:
            self.loop.call_soon_threadsafe(
                lambda: asyncio.ensure_future(self.bridge.stop())
            )
        self._on_disconnected()

    def _on_disconnected(self):
        self.connected = False
        self.bridge = None
        self.connect_btn.config(state="normal", text="Connect",
                                bg=ACCENT, activebackground="#cc5500")
        self._set_status("Disconnected", TEXT_DIM)

    def _on_close(self):
        if self.bridge and self.loop:
            self.loop.call_soon_threadsafe(
                lambda: asyncio.ensure_future(self.bridge.stop())
            )
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    app = BeatMindBridgeApp()
    app.run()
