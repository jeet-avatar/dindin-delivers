"""Explicit, user-triggered File-menu actions. Never dismiss save/discard dialogs."""

import asyncio
import sys

MENUS = {"save": "Save Live Set", "new": "New Live Set"}
PROCESS = '(first application process whose bundle identifier is "com.ableton.live")'


async def applescript(script):
    process = await asyncio.create_subprocess_exec(
        "/usr/bin/osascript", "-e", script,
        stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE)
    try:
        out, error = await asyncio.wait_for(process.communicate(), 12)
    except asyncio.TimeoutError:
        process.kill()
        await process.communicate()
        raise RuntimeError("Ableton did not respond. Check its open dialogs before retrying.")
    if process.returncode:
        raise RuntimeError(error.decode().strip())
    return out.decode().strip()


async def window_title():
    return await applescript(f'''tell application "System Events"
        if (count of (application processes whose bundle identifier is "com.ableton.live")) is not 1 then error "Open exactly one Ableton Live application."
        tell {PROCESS}
            if (count of windows) is 0 then error "No Ableton window is available."
            if (count of sheets of window 1) > 0 then error "Finish or cancel the dialog in Ableton first."
            if not enabled of menu item "New Live Set" of menu 1 of menu bar item "File" of menu bar 1 then error "Finish or cancel the dialog in Ableton first."
            return name of window 1
        end tell
    end tell''')


async def live_set_operation(bridge, operation):
    if sys.platform != "darwin":
        return {"status": "failed", "summary": "Automatic File-menu actions currently require macOS. Save and open a new set in Ableton manually."}
    if operation not in {"activate", "save", "new", "inspect"}:
        return {"status": "failed", "summary": "Unsupported Live Set operation."}
    try:
        if operation == "activate":
            await applescript('tell application id "com.ableton.live" to activate')
            return {"status": "observed", "summary": "Ableton brought forward. No set was changed."}
        title = await window_title()
        if operation in MENUS:
            if operation == "new" and title.casefold().startswith("untitled"):
                return {"status": "awaiting_user", "summary": "Save the current untitled set with a name first, then choose Open new Live Set. This lets BeatMind distinguish the new set from the current one."}
            await applescript(f'''tell application "System Events"
                tell {PROCESS}
                    set frontmost to true
                    click menu item "{MENUS[operation]}" of menu 1 of menu bar item "File" of menu bar 1
                end tell
            end tell''')
            if operation == "new":
                bridge.new_set_previous_title = title
            return {"status": "awaiting_user", "summary": (
                "Save requested. Complete any save-location dialog in Ableton before opening a new set."
                if operation == "save" else "New Live Set requested. If Ableton asks to save, choose Save and finish that dialog. BeatMind will not discard your work.")}
        state = await bridge._query_osc("new-set-check", "/live/song/get/track_names", [], 4)
        if state.get("status") != "ok":
            return {"status": "unverified", "summary": "Ableton is not responding yet. Finish its dialogs and check again."}
        previous = getattr(bridge, "new_set_previous_title", None)
        fresh = bool(previous and previous != title and title.casefold().startswith("untitled"))
        return {"status": "observed", "title": title, "tracks": state.get("args", []), "new_set_ready": fresh,
                "summary": "A new untitled Live Set is open and responding." if fresh else "Current set inspected. A new untitled set has not been confirmed; no production will start automatically."}
    except Exception as error:
        return {"status": "failed", "summary": "Unable to complete the Live Set step: " + str(error)}
