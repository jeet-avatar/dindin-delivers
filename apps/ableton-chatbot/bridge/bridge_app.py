"""
BeatMind Bridge — macOS/Windows GUI app.
Double-click to launch. Connects to your BeatMind account and controls Ableton Live.
"""

# Frozen workers must dispatch before importing or initializing the GUI.
if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()

import asyncio
import json
import os
import sys
import threading
import tkinter as tk
from tkinter import font as tkfont, ttk
import webbrowser
from pathlib import Path
from urllib.request import Request, urlopen

# Import the bridge core from the same directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bridge import AbletonBridge, BRIDGE_VERSION, SignInRejected
import credentials
import updater
from launch_link import register_mac_launch
from bridge_network import tls_context, connection_error, network_check

# ── Config ──
CONFIG_PATH = Path.home() / ".beatmind" / "config.json"
DEFAULT_SERVER = "wss://api.beatmind.io/ws/bridge"
DEFAULT_API = "https://api.beatmind.io"
CHAT_URL = "https://www.beatmind.io/dashboard"
START_LABEL = "Let's make music"
UPDATE_CHECK_MS = 6 * 60 * 60 * 1000
USER_AGENT = f"BeatMind-Bridge/{BRIDGE_VERSION}"

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
        self.busy = False
        self.closing = False
        self.bridge_token = None
        self.latest = None
        config = load_config()

        # ── Fonts ──
        self.font_title = tkfont.Font(family="Helvetica Neue", size=20, weight="bold")
        self.font_body = tkfont.Font(family="Helvetica Neue", size=13)
        self.font_small = tkfont.Font(family="Helvetica Neue", size=11)
        self.font_mono = tkfont.Font(family="SF Mono", size=11)
        self.font_btn = tkfont.Font(family="Helvetica Neue", size=14, weight="bold")
        # Aqua's classic buttons ignore background colors. Clam paints both
        # foreground and background, including disabled and pressed states.
        self.style = ttk.Style(self.root)
        self.style.theme_use('clam')
        self.style.configure('Music.TButton', font=self.font_btn, padding=(12, 10),
                             background=ACCENT, foreground=BG, borderwidth=1,
                             bordercolor=ACCENT, focuscolor=TEXT, relief='flat')
        self.style.map('Music.TButton',
                       background=[('disabled', '#242424'), ('pressed', '#e85d00'), ('active', '#ff8533')],
                       foreground=[('disabled', '#b8b8b8'), ('pressed', BG), ('active', BG)])
        self.style.configure('Disconnect.TButton', font=self.font_small, padding=(8, 10),
                             background=BG_CARD, foreground=TEXT, bordercolor=BORDER,
                             focuscolor=TEXT, relief='flat')
        self.style.map('Disconnect.TButton', background=[('active', '#303030')],
                       foreground=[('disabled', TEXT_DIM), ('active', TEXT)])

        # ── Build UI ──
        self._build_ui(config)
        if sys.platform == 'darwin':
            register_mac_launch(self.root)

        # Handle window close
        self.root.protocol("WM_DELETE_WINDOW", self._on_close)

        saved = credentials.load() if config.get("remember", True) else None
        if saved:
            self.root.after(300, self._resume, saved)
        self.root.after(2000, self._check_updates)
        updater.clean_previous()

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
        self.email_entry = email_entry

        # Password
        tk.Label(form, text="Password", font=self.font_small, bg=BG_CARD, fg=TEXT,
                 anchor="w").pack(fill="x", pady=(0, 4))
        self.password_var = tk.StringVar()
        pw_entry = tk.Entry(form, textvariable=self.password_var, font=self.font_body,
                            bg=BG_INPUT, fg=TEXT, insertbackground=TEXT,
                            show="*", relief="flat", highlightthickness=1,
                            highlightbackground=BORDER, highlightcolor=ACCENT)
        pw_entry.pack(fill="x", ipady=6, pady=(0, 4))
        self.password_entry = pw_entry
        pw_entry.bind('<Return>', lambda event: self._connect())

        # Remember checkbox
        self.remember_var = tk.BooleanVar(value=config.get("remember", True))
        tk.Checkbutton(form, text="Remember me", variable=self.remember_var,
                       font=self.font_small, bg=BG_CARD, fg=TEXT_DIM,
                       selectcolor=BG_INPUT, activebackground=BG_CARD,
                       activeforeground=TEXT_DIM).pack(anchor="w", pady=(4, 0))

        # ── Connect button ──
        self.btn_frame = tk.Frame(self.root, bg=BG)
        self.btn_frame.pack(pady=(16, 0), fill="x", padx=24)

        self.connect_btn = ttk.Button(
            self.btn_frame, text=START_LABEL,
            style='Music.TButton', cursor="hand2", takefocus=True,
            command=self._toggle_connection,
        )
        self.connect_btn.pack(side='left', fill="x", expand=True)
        self.disconnect_btn = ttk.Button(self.btn_frame, text='Disconnect',
                                         style='Disconnect.TButton', command=self._disconnect,
                                         takefocus=True)
        self.sign_out_btn = ttk.Button(self.btn_frame, text='Sign out',
                                       style='Disconnect.TButton', command=self._sign_out,
                                       takefocus=True)

        # ── Status ──
        status_frame = tk.Frame(self.root, bg=BG)
        status_frame.pack(pady=(16, 0), fill="x", padx=24)

        self.status_dot = tk.Canvas(status_frame, width=10, height=10,
                                    bg=BG, highlightthickness=0)
        self.status_dot.create_oval(1, 1, 9, 9, fill=TEXT_DIM, outline="", tags="dot")
        self.status_dot.pack(side="left", padx=(0, 6))

        self.status_label = tk.Label(status_frame, text="Not connected",
                                     font=self.font_small, bg=BG, fg=TEXT_DIM, wraplength=340, justify='left')
        self.status_label.pack(side="left")

        # ── Update (installed only when the user clicks) ──
        self.update_frame = tk.Frame(self.root, bg=BG)
        update_text_frame = tk.Frame(self.update_frame, bg=BG)
        update_text_frame.pack(side="left", fill="x", expand=True)
        self.update_label = tk.Label(update_text_frame, text="", font=self.font_small, bg=BG, fg=ACCENT,
                                     wraplength=230, justify='left')
        self.update_label.pack(anchor="w")
        changelog_link = tk.Label(update_text_frame, text="Full changelog ↗", font=self.font_small,
                                  bg=BG, fg=TEXT_DIM, cursor="hand2")
        changelog_link.pack(anchor="w", pady=(2, 0))
        changelog_link.bind("<Button-1>", lambda _e: self._open_changelog())
        self.update_btn = ttk.Button(self.update_frame, text='Install update', style='Disconnect.TButton',
                                     command=self._install_update, takefocus=True)
        self.update_btn.pack(side="right", anchor="n")

        if sys.platform == "darwin":
            integration = tk.Frame(self.root, bg=BG)
            integration.pack(fill="x", padx=24, pady=(12, 0))
            self.integration_btn = ttk.Button(integration, text="Update Ableton integration",
                style='Disconnect.TButton', command=self._install_integration)
            self.integration_btn.pack(anchor="w")
            self.integration_status = tk.Label(integration, text="", bg=BG, fg=TEXT_DIM,
                font=self.font_small, wraplength=350, justify="left")
            self.integration_status.pack(anchor="w")

        # ── Footer ──
        tk.Label(self.root, text=f"BeatMind Bridge {BRIDGE_VERSION} by Zietra Technologies Inc.",
                 font=tkfont.Font(family="Helvetica Neue", size=10),
                 bg=BG, fg=BORDER).pack(side="bottom", pady=(0, 12))

    def _set_status(self, text: str, color: str = TEXT_DIM):
        self.status_label.config(text=text, fg=color)
        self.status_dot.delete("dot")
        self.status_dot.create_oval(1, 1, 9, 9, fill=color, outline="", tags="dot")

    def _install_integration(self):
        from extension_installer import install
        if self.busy or (self.bridge and self.bridge.local.jobs):
            self.integration_status.config(text="Wait for the current connection or separation task to finish.")
            return
        try:
            install()
            self.integration_status.config(text="Integration updated; backup saved. Save your set, restart Ableton, then reconnect the Bridge.")
        except Exception as error:
            self.integration_status.config(text=str(error))
        self.root.update_idletasks()
        self.root.geometry(f"{self.root.winfo_width()}x{max(self.root.winfo_height(), self.root.winfo_reqheight())}")

    def _toggle_connection(self):
        if self.connected:
            webbrowser.open(CHAT_URL)
        else:
            self._connect()

    def _open_changelog(self):
        webbrowser.open(f"{CHAT_URL.rsplit('/', 1)[0]}/changelog")

    def _connect(self):
        if self.busy or self.connected:
            return
        email = self.email_var.get().strip()
        password = self.password_var.get()

        if not email or not password:
            self._set_status("Please enter email and password", ERROR)
            return

        if self.remember_var.get():
            save_config({"email": email, "remember": True})
        else:
            save_config({"remember": False})
            credentials.forget()

        self._set_status("Logging in...", ACCENT)
        self.busy = True
        self.root.focus_set()
        self.connect_btn.config(state="disabled", text="Connecting...")

        # Do login + bridge in background thread
        thread = threading.Thread(target=self._login_and_connect,
                                  args=(email, password), daemon=True)
        thread.start()

    def _post(self, callback, *args):
        if not self.closing:
            self.root.after(0, callback, *args)

    def _login_failed(self, message):
        self.busy = False
        self.connect_btn.config(state='normal', text=START_LABEL)
        self._set_status(message, ERROR)
        self.connect_btn.focus_set()

    def _login_and_connect(self, email: str, password: str):
        api_base = os.environ.get("BEATMIND_API", DEFAULT_API)

        # Step 1: Login
        try:
            login_data = json.dumps({"email": email, "password": password}).encode()
            req = Request(f"{api_base}/api/auth/login", data=login_data,
                          headers={"Content-Type": "application/json",
                                   "User-Agent": USER_AGENT})
            with urlopen(req, timeout=10, context=tls_context()) as resp:
                data = json.loads(resp.read())
            token = data["token"]
        except Exception as e:
            self._post(self._login_failed, connection_error(e))
            return

        # Step 2: Get bridge token
        try:
            req = Request(f"{api_base}/api/auth/bridge-token", method="POST",
                          headers={"Authorization": f"Bearer {token}",
                                   "Content-Type": "application/json",
                                   "User-Agent": USER_AGENT})
            with urlopen(req, timeout=10, context=tls_context()) as resp:
                bridge_data = json.loads(resp.read())
            bridge_token = bridge_data["bridge_token"]
        except Exception as e:
            self._post(self._login_failed, connection_error(e, 'bridge_token'))
            return

        if self.remember_var.get():
            try:
                credentials.save(bridge_token)
            except Exception:
                pass  # Still connects; the user just signs in again next launch.
        self._run_bridge(bridge_token)

    def _resume(self, bridge_token):
        """Reconnect with the saved sign-in, without asking for the password."""
        if self.busy or self.connected:
            return
        self.busy = True
        self.email_entry.config(state='disabled')
        self.password_entry.config(state='disabled')
        self.connect_btn.config(state="disabled", text="Connecting...")
        self._set_status("Signing you back in...", ACCENT)
        threading.Thread(target=self._run_bridge, args=(bridge_token,), daemon=True).start()

    def _run_bridge(self, bridge_token):
        server_url = os.environ.get("BEATMIND_WS", DEFAULT_SERVER)
        if self.closing:
            return
        self.bridge_token = bridge_token
        self._post(self._set_status, "Connecting to BeatMind...", ACCENT)

        loop = asyncio.new_event_loop()
        bridge = AbletonBridge(server_url=server_url, token=bridge_token,
                                    on_connection=lambda connected: self._post(self._connection_changed, connected))
        self.loop, self.bridge = loop, bridge
        message = 'Disconnected'

        try:
            loop.run_until_complete(bridge.start())
        except SignInRejected:
            credentials.forget()
            self.bridge_token = None
            message = 'Please sign in to BeatMind again.'
        except Exception:
            message = 'Bridge connection failed. Please try again.'
        finally:
            try:
                loop.run_until_complete(bridge.stop())
            finally:
                loop.close()
                self._post(self._on_disconnected, message)

    def _connection_changed(self, connected):
        if connected:
            self._on_connected()
        elif self.bridge and self.bridge.running:
            self.connected = False
            self.busy = True
            self.connect_btn.config(state='disabled', text='Reconnecting...')
            self._set_status('Connection interrupted. Reconnecting...', TEXT_DIM)

    def _on_connected(self):
        self.connected = True
        self.busy = False
        self.password_var.set('')
        self.email_entry.config(state='disabled')
        self.password_entry.config(state='disabled')
        self.connect_btn.config(state="normal", text=START_LABEL)
        self.disconnect_btn.pack(side='right', padx=(8, 0))
        self.sign_out_btn.pack(side='right', padx=(8, 0))
        self.connect_btn.focus_set()
        self._set_status("Connected to BeatMind", SUCCESS)

    def _disconnect(self):
        self._set_status("Disconnecting...", TEXT_DIM)
        self.connected = False
        self.busy = True
        self.connect_btn.config(state='disabled', text='Disconnecting...')
        if self.bridge and self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(self.bridge.stop(), self.loop)
        else:
            self._on_disconnected()

    def _on_disconnected(self, message='Disconnected'):
        self.connected = False
        self.busy = False
        self.bridge = None
        self.loop = None
        self.email_entry.config(state='normal')
        self.password_entry.config(state='normal')
        self.disconnect_btn.pack_forget()
        self.sign_out_btn.pack_forget()
        self.connect_btn.config(state="normal", text=START_LABEL)
        self.connect_btn.focus_set()
        self._set_status(message, TEXT_DIM if message == 'Disconnected' else ERROR)

    def _sign_out(self):
        """Forget this computer's sign-in everywhere, then disconnect."""
        token, self.bridge_token = self.bridge_token, None
        credentials.forget()
        if token:
            threading.Thread(target=self._revoke, args=(token,), daemon=True).start()
        self._disconnect()

    def _revoke(self, token):
        api_base = os.environ.get("BEATMIND_API", DEFAULT_API)
        try:
            req = Request(f"{api_base}/api/auth/bridge-token/revoke", method="POST",
                          data=json.dumps({"bridge_token": token}).encode(),
                          headers={"Content-Type": "application/json", "User-Agent": USER_AGENT})
            urlopen(req, timeout=10, context=tls_context()).close()
        except Exception:
            pass  # The local copy is already gone; the server token expires on its own.

    def _check_updates(self):
        if self.closing:
            return
        threading.Thread(target=self._fetch_update, daemon=True).start()
        self.root.after(UPDATE_CHECK_MS, self._check_updates)

    def _fetch_update(self):
        try:
            latest = updater.check(BRIDGE_VERSION)
        except Exception:
            return  # Offline or bad metadata: try again at the next check.
        if latest:
            self._post(self._show_update, latest)

    def _show_update(self, latest):
        self.latest = latest
        notes = str(latest.get('notes') or '').strip()
        whats_new = f" What's new: {notes}." if notes else ''
        self.update_label.config(text=f"BeatMind Bridge {latest['version']} is available.{whats_new} "
                                      "Your Ableton set stays open.", fg=ACCENT)
        self.update_btn.config(state='normal')
        self.update_frame.pack(pady=(14, 0), fill="x", padx=24)
        self._fit_window()

    def _fit_window(self):
        """The window has a fixed size; grow it so a newly shown row is never cut off below the footer."""
        self.root.update_idletasks()
        needed = self.root.winfo_reqheight()
        if needed > self.root.winfo_height():
            self.root.geometry(f"{self.root.winfo_width()}x{needed}")

    def _separating(self):
        return bool(self.bridge and self.bridge.local.jobs)

    def _install_update(self):
        if not self.latest:
            return
        if self._separating():
            self.update_label.config(text="A track is separating. Install when it finishes.", fg=TEXT_DIM)
            return
        self.update_btn.config(state='disabled')
        threading.Thread(target=self._download_update, args=(self.latest,), daemon=True).start()

    def _download_update(self, latest):
        def progress(text):
            self._post(self.update_label.config, {"text": text, "fg": TEXT_DIM})
        try:
            app = updater.install(latest, progress)
        except Exception as error:
            self._post(self._update_failed, str(error) or "The update could not be installed.")
            return
        self._post(self._restart_into, app)

    def _update_failed(self, message):
        self.update_label.config(text=message, fg=ERROR)
        self.update_btn.config(state='normal')

    def _restart_into(self, app):
        """Relaunch the new Bridge. It signs back in on its own; Ableton is not touched."""
        updater.relaunch(app)
        self._on_close()

    def _on_close(self):
        self.closing = True
        if self.bridge and self.loop and self.loop.is_running():
            asyncio.run_coroutine_threadsafe(self.bridge.stop(), self.loop)
        self.root.destroy()

    def run(self):
        self.root.mainloop()


if __name__ == "__main__":
    if len(sys.argv) == 3 and sys.argv[1] == '--network-check':
        result = asyncio.run(network_check())
        Path(sys.argv[2]).write_text(json.dumps(result))
    elif len(sys.argv) == 3 and sys.argv[1] == '--separate':
        # The packaged app re-runs itself as the separation worker (see local_separation.worker_command).
        import reference_worker
        reference_worker.analyze(Path(sys.argv[2]))
    else:
        app = BeatMindBridgeApp()
        app.run()
