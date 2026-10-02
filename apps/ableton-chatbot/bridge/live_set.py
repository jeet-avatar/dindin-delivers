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


async def screen_locked():
    """macOS hides every window while the screen is locked, so Ableton's title cannot be read."""
    process = await asyncio.create_subprocess_exec("/usr/sbin/ioreg", "-n", "Root", "-d1",
                                                   stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
    out, _ = await process.communicate()
    return b'"CGSSessionScreenIsLocked"=Yes' in out


async def window_title():
    if await screen_locked():
        raise RuntimeError("Your Mac is locked. Unlock it so BeatMind can see Ableton, then try again.")
    return await applescript(f'''tell application "System Events"
        if (count of (application processes whose bundle identifier is "com.ableton.live")) is not 1 then error "Open exactly one Ableton Live application."
        tell {PROCESS}
            if (count of windows) is 0 then error "No Ableton window is available."
            set documentWindows to windows whose subrole is "AXStandardWindow"
            if (count of documentWindows) is not 1 then error "Unable to identify one Ableton document window. Close extra document or plug-in windows and check again."
            set documentWindow to item 1 of documentWindows
            if (count of sheets of documentWindow) > 0 then error "Finish or cancel the dialog in Ableton first."
            if not enabled of menu item "New Live Set" of menu 1 of menu bar item "File" of menu bar 1 then error "Finish or cancel the dialog in Ableton first."
            return name of documentWindow
        end tell
    end tell''')


async def empty_set(bridge, track_count):
    """True when no track has a Session clip or an Arrangement clip."""
    scenes = await bridge._query_osc("new-set-check", "/live/song/get/num_scenes", [], 4)
    if scenes.get("status") != "ok":
        return False
    for track in range(track_count):
        arranged = await bridge._query_osc("new-set-check", "/live/track/get/arrangement_clips/name", [track], 4)
        if arranged.get("status") != "ok" or len(arranged.get("args", [])) > 1:
            return False
        for scene in range(scenes["args"][-1]):
            slot = await bridge._query_osc("new-set-check", "/live/clip_slot/get/has_clip", [track, scene], 4)
            if slot.get("status") != "ok" or slot["args"][-1]:
                return False
    return True


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
            await applescript(f'''tell application "System Events"
                tell {PROCESS}
                    set frontmost to true
                    click menu item "{MENUS[operation]}" of menu 1 of menu bar item "File" of menu bar 1
                end tell
            end tell''')
            return {"status": "awaiting_user", "summary": (
                "Save requested. Complete any save-location dialog in Ableton before opening a new set."
                if operation == "save" else "New Live Set requested. If Ableton asks to save, choose Save to keep your work, "
                "or Don't Save if you chose to close it. BeatMind never answers that dialog for you.")}
        state = await bridge._query_osc("new-set-check", "/live/song/get/track_names", [], 4)
        if state.get("status") != "ok":
            return {"status": "unverified", "summary": "Ableton is not responding yet. Finish its dialogs and check again."}
        # A set is ready for a new song when it is untitled and empty. No title comparison is needed, so this works
        # when Live was just launched (the current set is already "Untitled") and after "Close it without saving".
        fresh = title.casefold().startswith("untitled") and await empty_set(bridge, len(state.get("args", [])))
        return {"status": "observed", "title": title, "tracks": state.get("args", []), "new_set_ready": fresh,
                "summary": "A new, empty Live Set is open and responding." if fresh else "Current set inspected. It is not a new empty set (it is saved or already has clips); no production will start automatically."}
    except Exception as error:
        return {"status": "failed", "summary": "Unable to complete the Live Set step: " + str(error)}
