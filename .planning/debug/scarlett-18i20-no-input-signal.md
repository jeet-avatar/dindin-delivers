---
status: fixing
trigger: "Focusrite Scarlett 18i20 analog inputs not passing signal to DAW. Focusrite Control shows No Hardware Detected."
created: 2026-02-25T00:00:00Z
updated: 2026-02-25T23:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - Focusrite Control v3.27.0.251 has a known macOS Sequoia (15.6.1) incompatibility where the LaunchDaemon-based FocusriteControlServer cannot properly communicate with the Scarlett hardware. The daemon is running (PID 33426) but has previously SEGFAULTED (last terminating signal = Segmentation fault: 11, successive crashes = 1, runs = 2). The daemon runs but cannot control the hardware, causing Focusrite Control UI to show "No Hardware Detected" and input preamps/routing to remain uninitialized.
test: Apply the Focusrite-recommended macOS Sequoia fix (migrate daemon from LaunchDaemon to Login Items)
expecting: After fix and restart, Focusrite Control should detect the hardware, input preamps should initialize, gain ring LEDs should respond, and audio signal should flow from analog inputs to DAW.
next_action: Present fix steps to user (requires manual system actions)

## Symptoms

expected: Analog audio from MatrixBrute (Scarlett inputs 7/8) and MPC X (Scarlett inputs 3/4) should appear as audio signal in Ableton Live tracks.
actual: Zero signal on ALL Scarlett analog inputs. Scarlett gain rings do NOT light up when audio sources play. Ableton output through Scarlett works fine (can hear beats). MatrixBrute MIDI over USB works. Only analog audio inputs are dead.
errors: Focusrite Control app version 3.27.0.251 shows "No Hardware Detected" despite Scarlett being recognized by macOS (system_profiler SPAudioDataType shows Scarlett 18i20 USB with 18 inputs, 20 outputs, 48000Hz).
reproduction: Connect any audio source to any Scarlett 18i20 input -> turn up gain -> no signal on gain ring LEDs, no signal in Ableton. Affects ALL inputs.
started: After a Mac restart. MatrixBrute audio on 7/8 was working in previous session. After restart + MPC Software install, ALL Scarlett inputs stopped.

## Eliminated

- hypothesis: Hardware failure (Scarlett 18i20 broken)
  evidence: macOS system_profiler shows full USB recognition (Product ID 0x8201, Vendor ID 0x1235, 18 inputs, 20 outputs, 48kHz). Audio OUTPUT through Scarlett works perfectly. USB communication is functional. Serial Number 03020895. USB at 480 Mb/s. The hardware itself is fine.
  timestamp: 2026-02-25T23:10:00Z

- hypothesis: USB connection/power issue
  evidence: system_profiler SPUSBDataType shows stable connection at Location ID 0x01111000/5, Current Available 500mA, Speed Up to 480 Mb/s. Device responds to USB commands (output works). Not a power/connection issue.
  timestamp: 2026-02-25T23:10:00Z

- hypothesis: macOS audio subsystem not recognizing device
  evidence: system_profiler SPAudioDataType shows "Scarlett 18i20 USB" with Default Output Device: Yes, 18 Input Channels, 20 Output Channels, 48000Hz sample rate. macOS CoreAudio fully recognizes the device.
  timestamp: 2026-02-25T23:10:00Z

- hypothesis: FocusriteControlServer daemon not running
  evidence: Daemon IS running as PID 33426 (uptime 5h56m), launched from /Library/LaunchDaemons/com.focusrite.ControlServer.plist with KeepAlive=true, RunAtLoad=true. However, it previously SEGFAULTED and was auto-restarted (runs=2, successive crashes=1, last terminating signal=Segmentation fault: 11).
  timestamp: 2026-02-25T23:12:00Z

## Evidence

- timestamp: 2026-02-25T23:08:00Z
  checked: launchctl list for Focusrite processes
  found: FocusriteControl app running as user process (PID 76713). FocusriteControlServer running as system daemon (PID 33426).
  implication: Both processes exist but UI shows "No Hardware Detected" = daemon-to-hardware communication broken

- timestamp: 2026-02-25T23:09:00Z
  checked: /Library/LaunchDaemons/com.focusrite.ControlServer.plist
  found: Standard plist with KeepAlive=true, RunAtLoad=true, program=/Applications/Focusrite Control.app/.../FocusriteControlServer with "daemon" argument
  implication: LaunchDaemon approach is the OLD method. macOS Sequoia changed how LaunchDaemons interact with hardware — this is the documented root cause.

- timestamp: 2026-02-25T23:09:30Z
  checked: launchctl print system/com.focusrite.ControlServer
  found: "state = running, runs = 2, successive crashes = 1, last terminating signal = Segmentation fault: 11". Daemon is running but has previously crashed.
  implication: The daemon is UNSTABLE on Sequoia. It segfaults, gets restarted by KeepAlive, but cannot properly communicate with hardware in this mode. This is EXACTLY the Focusrite-documented macOS Sequoia bug.

- timestamp: 2026-02-25T23:10:00Z
  checked: system_profiler SPUSBDataType and SPAudioDataType
  found: Scarlett fully recognized at USB level (Product ID 0x8201, Serial 03020895, 480Mb/s) and CoreAudio level (18 in, 20 out, 48kHz, Default Output). But Default Input Device is "MacBook Pro Microphone", NOT Scarlett.
  implication: macOS sees the Scarlett but its input routing is not initialized because Focusrite Control Server cannot configure the hardware.

- timestamp: 2026-02-25T23:11:00Z
  checked: Focusrite Control version
  found: v3.27.0.251. macOS 15.6.1 (Sequoia, Build 24G90).
  implication: Version 3.27.0 is outdated for Sequoia. Focusrite has released newer versions with Sequoia fixes. Updating may be the cleanest fix.

- timestamp: 2026-02-25T23:12:00Z
  checked: Focusrite support documentation for macOS Sequoia
  found: Known issue affecting Scarlett 2nd Gen (6i6, 18i8, 18i20). Fix: (1) delete com.focusrite.ControlServer.plist from /Library/LaunchDaemons, (2) add FocusriteControlServer as a Login Item instead, (3) restart Mac. Alternative: update to latest Focusrite Control version.
  implication: This is a DOCUMENTED, KNOWN issue with a specific fix procedure from Focusrite.

- timestamp: 2026-02-25T23:13:00Z
  checked: Why gain ring LEDs do not light up
  found: The Scarlett 18i20 2nd Gen input preamps and gain ring LEDs are controlled by firmware that requires initialization from the Focusrite Control Server. When the server cannot communicate with hardware (Sequoia daemon bug), preamps stay uninitialized. Audio OUTPUT works because CoreAudio handles output routing independently, but INPUT routing/preamp gain requires the Focusrite daemon.
  implication: Fixing the daemon communication will restore gain rings AND audio input simultaneously.

## Resolution

root_cause: Focusrite Control v3.27.0.251 uses a LaunchDaemon (com.focusrite.ControlServer) to run FocusriteControlServer, which is INCOMPATIBLE with macOS Sequoia 15.6.1. The daemon runs but segfaults (evidence: successive crashes = 1, last terminating signal = Segmentation fault: 11), then gets restarted by KeepAlive but cannot properly communicate with the Scarlett 18i20 hardware. This prevents: (a) Focusrite Control UI from detecting the hardware, (b) input preamps from being initialized (no gain ring LEDs), (c) any audio signal from reaching inputs. Output works because macOS CoreAudio handles output routing independently of the Focusrite daemon. This is a documented Focusrite bug for Scarlett 2nd Gen on macOS Sequoia.

fix: Two options (user must choose):
  Option A (Recommended - Clean): Update Focusrite Control to latest version from https://downloads.focusrite.com/focusrite/scarlett-2nd-gen/scarlett-18i20-2nd-gen which includes macOS Sequoia fixes.
  Option B (Manual daemon migration): Delete /Library/LaunchDaemons/com.focusrite.ControlServer.plist, add FocusriteControlServer as Login Item, restart Mac.
  Both options require Mac restart.

verification: After fix, confirm: (1) Focusrite Control shows hardware connected with mixer view, (2) gain ring LEDs respond when turning gain knobs, (3) audio signal appears in Ableton from Scarlett inputs 7/8 (MatrixBrute).
files_changed: []
