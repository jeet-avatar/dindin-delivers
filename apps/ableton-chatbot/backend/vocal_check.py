"""Vocal check: detect what a vocal actually needs before any processing (the rulebook's "detect" step).

Measures a solo vocal preview (audition_part on the vocal track): clipping and headroom, sub rumble, tonal bands that
stand out from a typical voice's balance (boom, mud, boxiness, nasal, harshness), a dull top, narrow resonances,
sibilant bursts and phrase-level consistency. With solo previews of other parts it also scores masking in the vocal's
1-5 kHz intelligibility range. Every finding carries the rulebook action; anything that passes says "skip", so no
fixed chain is applied. Measurements, not taste: the user listens as well.
"""

import numpy as np

import engineering_rules
import mastering
import recordings

RATE = mastering.RATE
# Octave-ish regions the rulebook searches, with the rule each one maps to.
BANDS = [("boom", "Boominess", 100, 250), ("mud", "Mud", 200, 500), ("box", "Boxiness", 300, 800),
         ("nasal", "Nasal", 700, 1500), ("presence", "Poor intelligibility", 1000, 4000),
         ("harsh", "Harshness", 2500, 6000), ("air", "Dull vocal", 8000, 16000)]
STAND_OUT_DB = 5.0   # a band this far above a typical voice's balance stands out
DULL_DB = -8.0       # air this far below a typical voice reads as dull (after harshness and sibilance are checked)
# Long-term average spectrum of voice (Byrne et al. 1994 LTASS, rounded), dB per octave relative to 250-500 Hz.
LTASS = [(125, -3.0), (250, 0.0), (500, -1.0), (1000, -6.0), (2000, -11.0), (4000, -15.0), (8000, -20.0), (16000, -27.0)]


def action(problem):
    rule = next(r for r in engineering_rules.RULEBOOKS["vocal"]["rules"] if r[0].startswith(problem))
    return rule[2]


def item(key, label, status, detail, fix=None):
    return {"id": key, "label": label, "status": status, "detail": detail, **({"fix": fix} if fix else {})}


def spectrum(mono, size=8192):
    """Welch average over sounding frames: the spectral envelope, not the harmonics of one held note."""
    count = mono.size // size
    if count < 2:
        power = np.abs(np.fft.rfft(mono * np.hanning(mono.size))) ** 2
        return np.fft.rfftfreq(mono.size, 1 / RATE), power
    blocks = mono[:count * size].reshape(count, size)
    blocks = blocks[(blocks ** 2).mean(axis=1) > 1e-6] if ((blocks ** 2).mean(axis=1) > 1e-6).any() else blocks
    power = (np.abs(np.fft.rfft(blocks * np.hanning(size), axis=1)) ** 2).mean(axis=0)
    return np.fft.rfftfreq(size, 1 / RATE), power


def band_db(freqs, power, low, high):
    selected = power[(freqs >= low) & (freqs < high)]
    return 10 * np.log10(selected.mean() + 1e-20) if selected.size else -200.0


def typical(frequency):
    points = np.array(LTASS)
    return float(np.interp(np.log10(frequency), np.log10(points[:, 0]), points[:, 1]))


def tonal_bands(freqs, power):
    """Each band's level against a typical voice's balance (LTASS). The overall offset is the median deviation
    across third-octaves from 125 Hz to 8 kHz, so one exaggerated band cannot hide itself."""
    centres = np.geomspace(125, 8000, 19)
    offset = float(np.median([band_db(freqs, power, c / 1.12, c * 1.12) - typical(c) for c in centres]))
    return {key: round(band_db(freqs, power, low, high) - offset - typical(np.sqrt(low * high)), 1)
            for key, _, low, high in BANDS}


def resonances(freqs, power, limit=3):
    """Narrow peaks well above the locally smoothed spectrum between 150 Hz and 8 kHz."""
    edges = np.geomspace(150, 8000, 97)
    centres = np.sqrt(edges[:-1] * edges[1:])
    fine = np.array([band_db(freqs, power, a, b) for a, b in zip(edges[:-1], edges[1:])])
    smooth = np.convolve(np.pad(fine, 4, mode="edge"), np.ones(9) / 9, mode="valid")
    excess = fine - smooth
    peaks = [(float(excess[i]), float(centres[i])) for i in range(1, len(excess) - 1)
             if excess[i] > 8 and excess[i] >= excess[i - 1] and excess[i] >= excess[i + 1]]
    return [{"hz": round(f), "above_neighbours_db": round(e, 1)} for e, f in sorted(peaks, reverse=True)[:limit]]


def frames(mono, seconds):
    size = int(RATE * seconds)
    count = mono.size // size
    return mono[:count * size].reshape(count, size)


def sibilance(mono):
    """Sibilant bursts: 20 ms frames where 4-10 kHz energy exceeds the 300 Hz-3 kHz body by 6 dB or more."""
    blocks = frames(mono, 0.02)
    if not len(blocks):
        return 0, None
    freqs = np.fft.rfftfreq(blocks.shape[1], 1 / RATE)
    power = np.abs(np.fft.rfft(blocks * np.hanning(blocks.shape[1]), axis=1)) ** 2
    ess = power[:, (freqs >= 4000) & (freqs < 10000)].sum(axis=1)
    body = power[:, (freqs >= 300) & (freqs < 3000)].sum(axis=1)
    loud = 20 * np.log10(np.sqrt((blocks ** 2).mean(axis=1)) + 1e-12) > -45
    ratio = 10 * np.log10((ess + 1e-20) / (body + 1e-20))
    bursts = int(((ratio > 6) & loud).sum())
    return bursts, (round(float(ratio[loud].max()), 1) if loud.any() else None)


def phrase_spread(mono):
    """Spread (90th minus 10th percentile, dB) of 400 ms levels inside phrases: frames whose neighbours also sound,
    so the fade into a gap is not counted as an uneven word."""
    levels = 20 * np.log10(np.sqrt((frames(mono, 0.4) ** 2).mean(axis=1)) + 1e-12)
    sounding = levels > levels.max() - 30
    inside = sounding & np.roll(sounding, 1) & np.roll(sounding, -1)
    inside[[0, -1]] = False
    active = levels[inside]
    return round(float(np.percentile(active, 90) - np.percentile(active, 10)), 1) if active.size >= 4 else None


def presence_level(path):
    freqs, power = spectrum(mastering.stereo_samples(path).mean(axis=1))
    return band_db(freqs, power, 1000, 5000)


def analyse(path):
    samples = mastering.stereo_samples(path)
    mono = samples.mean(axis=1)
    peak = float(np.abs(samples).max())
    clipped_runs = int(np.sum(np.diff((np.abs(mono) > 0.999).astype(int)) == 1))
    freqs, power = spectrum(mono)
    total = float(power[freqs >= 20].sum()) or 1.0
    sub_share = round(100 * float(power[(freqs >= 20) & (freqs < 80)].sum()) / total, 1)
    bursts, worst = sibilance(mono)
    return {"peak_dbfs": round(20 * np.log10(peak + 1e-12), 1), "clipped_runs": clipped_runs,
            "sub_percent": sub_share, "bands_vs_tilt_db": tonal_bands(freqs, power),
            "resonances": resonances(freqs, power), "sibilant_bursts_per_min": round(bursts * 60 / (mono.size / RATE), 1),
            "worst_sibilance_db": worst, "phrase_spread_db": phrase_spread(mono), "seconds": round(mono.size / RATE, 1)}


def findings(m, masking=None):
    checks = []
    if m["clipped_runs"] or m["peak_dbfs"] > -0.3:
        checks.append(item("clipping", "Clipping", "fail", f"Peak {m['peak_dbfs']} dBFS, {m['clipped_runs']} clipped run(s).", action("Clipping")))
    elif m["peak_dbfs"] > -3:
        checks.append(item("headroom", "Headroom", "warn", f"Peak {m['peak_dbfs']} dBFS before processing.",
                           "Lower the vocal's clip gain or input so peaks sit around -12 to -6 dBFS before heavy processing."))
    else:
        checks.append(item("headroom", "Headroom", "pass", f"Peak {m['peak_dbfs']} dBFS; skip gain changes."))
    if m["sub_percent"] > 8:
        checks.append(item("sub", "Rumble / plosives", "warn", f"{m['sub_percent']}% of the energy is below 80 Hz.", action("Excess sub")))
    else:
        checks.append(item("sub", "Rumble / plosives", "pass", f"{m['sub_percent']}% below 80 Hz; no high-pass needed for rumble."))
    bands = m["bands_vs_tilt_db"]
    for key, problem, low, high in BANDS:
        value = bands[key]
        if key == "presence":
            continue
        if key == "air":
            standing = value < DULL_DB and m["sibilant_bursts_per_min"] < 20
            detail = f"{low}-{high} Hz sits {value:+.1f} dB against a typical voice's balance."
            checks.append(item(key, "Air", "warn" if standing else "pass", detail,
                               action("Dull vocal") if standing else None))
            continue
        standing = value > STAND_OUT_DB
        checks.append(item(key, problem, "warn" if standing else "pass",
                           f"{low}-{high} Hz sits {value:+.1f} dB against a typical voice's balance" + ("." if standing else "; skip."),
                           action(problem) if standing else None))
    if m["resonances"]:
        listed = ", ".join(f"{r['hz']} Hz (+{r['above_neighbours_db']} dB)" for r in m["resonances"])
        checks.append(item("resonances", "Resonances", "warn", f"Narrow peaks: {listed}.", action("Resonances")))
    else:
        checks.append(item("resonances", "Resonances", "pass", "No narrow peak stands 8 dB above its neighbours; skip."))
    if m["sibilant_bursts_per_min"] >= 20:
        checks.append(item("sibilance", "Sibilance", "warn",
                           f"{m['sibilant_bursts_per_min']} sibilant bursts per minute (worst {m['worst_sibilance_db']} dB above the body).",
                           action("Sibilance")))
    else:
        checks.append(item("sibilance", "Sibilance", "pass", f"{m['sibilant_bursts_per_min']} sibilant bursts per minute; skip de-essing."))
    spread = m["phrase_spread_db"]
    if spread is None:
        checks.append(item("dynamics", "Phrase consistency", "warn", "Too little sung audio to judge consistency.",
                           "Preview a longer vocal passage."))
    elif spread > 14:
        checks.append(item("dynamics", "Phrase consistency", "warn", f"Phrase levels spread {spread} dB.",
                           action("Uneven phrases") + " Then " + action("Overall inconsistency")))
    else:
        checks.append(item("dynamics", "Phrase consistency", "pass", f"Phrase levels spread {spread} dB; gentle compression at most."))
    if masking is not None:
        crowded = [f"{name} ({delta:+.1f} dB vs vocal)" for name, delta in masking if delta > -3]
        checks.append(item("masking", "Masking (1-5 kHz)", "warn" if crowded else "pass",
                           ("Competing in the vocal's intelligibility range: " + ", ".join(crowded) + ".") if crowded
                           else "No other previewed part is within 3 dB of the vocal at 1-5 kHz.",
                           action("Vocal buried") + " For example cut the synth about 2 dB at 1-5 kHz while the vocal sings." if crowded else None))
    return checks


def run(user_id, recording_id, compare_ids=None):
    vocal = recordings.owned_recording(recording_id, user_id)
    if not vocal:
        return {"status": "failed", "summary": "That recording was not found.", "steps": []}
    path = recordings.ROOT / f"{recording_id}.m4a"
    measured = analyse(path)
    masking = None
    if compare_ids:
        vocal_presence = presence_level(path)
        masking = []
        for other_id in compare_ids:
            other = recordings.owned_recording(other_id, user_id)
            if other and other_id != recording_id:
                name = other.get("track_name") or other_id[:8]
                masking.append((name, round(presence_level(recordings.ROOT / f"{other_id}.m4a") - vocal_presence, 1)))
    checks = findings(measured, masking)
    counts = {s: sum(c["status"] == s for c in checks) for s in ("pass", "warn", "fail")}
    return {"status": "observed",
            "summary": f"Vocal check of {vocal.get('track_name') or 'the vocal'}: {counts['fail']} must fix, "
                       f"{counts['warn']} to improve, {counts['pass']} fine (skip those stages).",
            "checks": checks, "measurements": measured,
            "order": engineering_rules.RULEBOOKS["vocal"]["chain"],
            "limitations": ["Measured on a short solo preview; phrases, breaths and plosives outside it are not seen.",
                            "Previews are AAC, so peaks can read up to about 1 dB high.",
                            "Tonal findings compare the vocal with a typical voice's average spectrum (LTASS); voices and styles differ, so confirm by ear in the full mix."],
            "steps": []}
