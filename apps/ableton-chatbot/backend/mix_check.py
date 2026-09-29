"""Engineering checklist for a full-mix preview: headroom, loudness, low end, audibility, structure and safety.

Audio is measured on the saved full-mix recording (EBU R128 loudness and true peak via ffmpeg). Session state is read
from Ableton through the Bridge. Every item says pass, warn or fail with a concrete fix; nothing is changed here.
"""

import re
import subprocess

import numpy as np

import recordings

TARGET_LUFS = -14.0
CEILING_DBTP = -1.0
RATE = 44100


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBTP) of an audio file."""
    report = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(path), "-filter_complex",
                             "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, timeout=60).stderr
    summary = report[report.rfind("Summary:"):]
    integrated = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
    peak = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
    if not integrated or not peak:
        raise ValueError("Loudness could not be measured.")
    value = lambda match: float("-inf") if match.group(1) == "-inf" else float(match.group(1))
    return value(integrated), value(peak)


def low_end_share(path):
    """Share of spectral energy below 120 Hz, in percent."""
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-ac", "1", "-ar", str(RATE),
                              "-f", "f32le", "pipe:1"], capture_output=True, timeout=60)
    samples = np.frombuffer(decoded.stdout, dtype="<f4").astype(float)
    if samples.size < RATE:
        raise ValueError("The recording is too short to analyse.")
    spectrum = np.abs(np.fft.rfft(samples * np.hanning(samples.size))) ** 2
    frequencies = np.fft.rfftfreq(samples.size, 1 / RATE)
    total = float(spectrum[frequencies >= 20].sum()) or 1.0
    return round(100 * float(spectrum[(frequencies >= 20) & (frequencies < 120)].sum()) / total, 1)


def item(key, label, status, detail, fix=None):
    return {"id": key, "label": label, "status": status, "detail": detail, **({"fix": fix} if fix else {})}


async def run(user_id, recording_id, query, target_lufs=TARGET_LUFS, ceiling=CEILING_DBTP):
    """`query(address, args)` returns the Ableton reply args (track/scene index prefixes included)."""
    recording = recordings.owned_recording(recording_id, user_id)
    if not recording:
        return {"status": "failed", "summary": "That recording was not found.", "steps": []}
    if recording.get("kind") != "scene":
        return {"status": "failed", "summary": "Run the mix check on a full-mix preview (audition_scene), not a single part.", "steps": []}
    path = recordings.ROOT / f"{recording_id}.m4a"
    lufs, true_peak = loudness(path)
    low = low_end_share(path)
    scene = recording["scene"]

    names = await query("/live/song/get/track_names", [])
    num_scenes = (await query("/live/song/get/num_scenes", []))[-1]
    tracks = []
    for i, name in enumerate(names):
        tracks.append({"name": name, "mute": bool((await query("/live/track/get/mute", [i]))[-1]),
                       "solo": bool((await query("/live/track/get/solo", [i]))[-1]),
                       "arm": bool((await query("/live/track/get/arm", [i]))[-1]) if (await query("/live/track/get/can_be_armed", [i]))[-1] else False,
                       "volume": float((await query("/live/track/get/volume", [i]))[-1]),
                       "in_scene": bool((await query("/live/clip_slot/get/has_clip", [i, scene]))[-1])})
    empty_scenes = []
    for s in range(num_scenes):
        if not any([(await query("/live/clip_slot/get/has_clip", [i, s]))[-1] for i in range(len(names))]):
            empty_scenes.append((await query("/live/scene/get/name", [s]))[-1] or f"Scene {s + 1}")
    arranged = 0
    for i in range(len(names)):
        if len((await query("/live/track/get/arrangement_clips/name", [i]))[1:]):
            arranged += 1

    checks = []
    if true_peak > 0:
        checks.append(item("headroom", "Headroom", "fail", f"True peak {true_peak:+.1f} dBTP: the mix clips.",
                           f"Lower the loudest parts (check the chords/pad and bass faders) by {true_peak - ceiling:.1f} dB or more, then check again."))
    elif true_peak > ceiling:
        checks.append(item("headroom", "Headroom", "warn", f"True peak {true_peak:+.1f} dBTP, above the {ceiling:.0f} dBTP ceiling.",
                           "Pull the mix down about 1-2 dB, or let the master Limiter set the ceiling."))
    else:
        checks.append(item("headroom", "Headroom", "pass", f"True peak {true_peak:+.1f} dBTP, below {ceiling:.0f} dBTP."))

    if lufs < target_lufs - 2:
        checks.append(item("loudness", "Loudness", "warn", f"{lufs:.1f} LUFS for this section, quieter than the {target_lufs:.0f} LUFS target.",
                           f"Raise it about {target_lufs - lufs:.1f} dB with the master Limiter after the headroom check passes."))
    elif lufs > target_lufs + 2:
        checks.append(item("loudness", "Loudness", "warn", f"{lufs:.1f} LUFS for this section, louder than the {target_lufs:.0f} LUFS target.",
                           f"Lower the loudest faders about {lufs - target_lufs:.1f} dB in total (or reduce the master Limiter "
                           "gain if one is on Main); streaming services turn loud masters down anyway."))
    else:
        checks.append(item("loudness", "Loudness", "pass", f"{lufs:.1f} LUFS for this section (target {target_lufs:.0f} LUFS)."))

    kick = [t for t in tracks if "kick" in t["name"].casefold()]
    bass = [t for t in tracks if "bass" in t["name"].casefold()]
    low_parts = [t["name"] for t in kick + bass if t["in_scene"] and not t["mute"]]
    if low < 10:
        checks.append(item("low_end", "Low end", "warn", f"Only {low}% of the energy is below 120 Hz; the section sounds thin.",
                           "Check the kick and bass levels and their high-pass filters."))
    elif low > 60:
        checks.append(item("low_end", "Low end", "warn", f"{low}% of the energy is below 120 Hz; the low end dominates.",
                           "Trim the bass or the kick's sub, or high-pass the other parts."))
    else:
        checks.append(item("low_end", "Low end", "pass", f"{low}% of the energy below 120 Hz" +
                           (f"; carried by {', '.join(low_parts)}." if low_parts else ".")))

    # Balance: each part's latest solo preview level against the kick's. Melodic parts well above the kick bury it.
    latest = {}
    for rec in recordings.list_recordings(user_id):
        if rec.get("kind", "part") == "part" and isinstance(rec.get("track"), int) and rec["track"] not in latest:
            latest[rec["track"]] = rec
    by_name = {tracks[i]["name"]: latest[i]["metrics"].get("rms_dbfs") for i in latest if i < len(tracks) and tracks[i]["in_scene"]}
    kick_rms = next((v for n, v in by_name.items() if "kick" in n.casefold() and v is not None), None)
    loud = [f"{n} ({v - kick_rms:+.1f} dB vs kick)" for n, v in by_name.items()
            if kick_rms is not None and v is not None and not any(w in n.casefold() for w in ("kick", "bass"))
            and v > kick_rms - 3]
    if kick_rms is None:
        checks.append(item("balance", "Balance", "warn", "No kick preview to compare the other parts against.",
                           "Preview the kick, then run the mix check again."))
    elif loud:
        checks.append(item("balance", "Balance", "warn", "Louder than the kick allows: " + ", ".join(loud) + ".",
                           "In a Drop the kick and bass lead; lower these parts until they sit about 6-10 dB under the kick, "
                           "or thin their tone (less presence boost, fewer notes)."))
    else:
        checks.append(item("balance", "Balance", "pass", "Melodic parts sit below the kick; the kick and bass lead the mix."))

    silent = [t["name"] for t in tracks if t["in_scene"] and t["mute"] and "reference" not in t["name"].casefold()]
    buried = [t["name"] for t in tracks if t["in_scene"] and not t["mute"] and t["volume"] < 0.4]
    if silent or buried:
        checks.append(item("audible", "Every part audible", "warn",
                           "; ".join(filter(None, [f"muted: {', '.join(silent)}" if silent else "",
                                                   f"fader very low: {', '.join(buried)}" if buried else ""])),
                           "Unmute the part or raise its fader, or remove its clip from this section."))
    else:
        checks.append(item("audible", "Every part audible", "pass",
                           f"{sum(t['in_scene'] for t in tracks)} parts play in this section, none muted or buried."))

    checks.append(item("structure", "Song structure", "warn" if empty_scenes else "pass",
                       f"Empty sections: {', '.join(empty_scenes)}." if empty_scenes else f"All {num_scenes} sections have clips." +
                       (f" The Arrangement has clips on {arranged} tracks." if arranged else ""),
                       "Fill or remove the empty sections before recording the Arrangement." if empty_scenes else None))

    soloed = [t["name"] for t in tracks if t["solo"]]
    armed = [t["name"] for t in tracks if t["arm"]]
    loud_reference = [t["name"] for t in tracks if "reference" in t["name"].casefold() and not t["mute"]]
    problems = [f"soloed: {', '.join(soloed)}" if soloed else "", f"armed: {', '.join(armed)}" if armed else "",
                f"reference audible: {', '.join(loud_reference)}" if loud_reference else ""]
    fixes = [f"unsolo {', '.join(soloed)}" if soloed else "", f"disarm {', '.join(armed)}" if armed else "",
             f"mute {', '.join(loud_reference)}" if loud_reference else ""]
    checks.append(item("safety", "Session safety", "warn" if any(problems) else "pass",
                       "; ".join(filter(None, problems)) or "Nothing soloed or armed; reference tracks are muted.",
                       ("Before exporting: " + ", ".join(filter(None, fixes)) + ".") if any(problems) else None))

    counts = {status: sum(c["status"] == status for c in checks) for status in ("pass", "warn", "fail")}
    return {"status": "observed",
            "summary": f"Mix check of {recording.get('scene_name') or 'this section'}: {counts['pass']} pass, "
                       f"{counts['warn']} to improve, {counts['fail']} must fix.",
            "checks": checks, "measurements": {"integrated_lufs": round(lufs, 1), "true_peak_dbtp": round(true_peak, 1),
                                               "low_end_percent": low, "target_lufs": target_lufs, "ceiling_dbtp": ceiling},
            "limitations": ["Measured on a short full-mix preview of one section, not the whole exported song.",
                            "Balance uses each part's latest solo preview; re-preview a part after changing its fader.",
                            "These are measurements, not a judgement of taste; listen as well."],
            "steps": []}
