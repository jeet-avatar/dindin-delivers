"""Vocal rulebook lookup and vocal_check detection on synthetic, vocal-like signals."""
import json
import tempfile
import wave
from pathlib import Path
from unittest.mock import patch

import numpy as np

import engineering_rules
import recordings
import vocal_check

RATE = 44100


def write(path, signal):
    data = (np.clip(signal, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE); out.writeframes(np.repeat(data, 2).tobytes())


def voice(seconds=6.0, f0=180.0, mud=False, sibilant=False, level=0.25, rng=None):
    """Sung-voice stand-in: vibrato and a slow glide, harmonics shaped like a typical voice (LTASS), phrase gaps,
    optional 200-500 Hz mud bump and sibilant noise bursts."""
    rng = rng or np.random.default_rng(3)
    t = np.arange(int(RATE * seconds)) / RATE
    pitch = f0 * (1 + 0.03 * np.sin(2 * np.pi * 5.5 * t)) * (1 + 0.15 * np.sin(2 * np.pi * 0.2 * t))
    phase = 2 * np.pi * np.cumsum(pitch) / RATE
    tone = np.zeros_like(t)
    for k in range(1, 60):
        freq = f0 * k
        if freq > 16000:
            break
        gain = 10 ** (vocal_check.typical(max(freq, 125)) / 20) * (2.5 if mud and 200 <= freq <= 500 else 1.0)
        tone += gain * np.sin(k * phase)
    phrases = (np.sin(2 * np.pi * 0.5 * t) > -0.6).astype(float)
    signal = level * tone / np.abs(tone).max() * phrases
    if sibilant:
        noise = rng.normal(0, 1, t.size)
        spectrum = np.fft.rfft(noise); freqs = np.fft.rfftfreq(t.size, 1 / RATE)
        spectrum[(freqs < 5000) | (freqs > 9000)] = 0
        hiss = np.fft.irfft(spectrum, t.size); hiss /= np.abs(hiss).max()
        bursts = ((t % 0.5) < 0.08).astype(float)
        signal = signal * (1 - bursts) + 0.3 * hiss * bursts
    return signal


def checks_for(signal):
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "v.wav"
        write(path, signal)
        measured = vocal_check.analyse(path)
    return {c["id"]: c for c in vocal_check.findings(measured)}, measured


def test_rulebook_lookup_narrows_to_the_problem_and_keeps_the_method():
    result = engineering_rules.lookup("vocal", "sibilance")
    assert result["status"] == "observed" and result["method"][0].startswith("Detect")
    assert any("4-10 kHz" in r["action"] for r in result["rules"])
    assert all("sibil" in (r["problem"] + r["detect"] + r["action"]).casefold() for r in result["rules"])
    assert result["hierarchy"][0] == "intelligibility"
    assert engineering_rules.lookup("my vox is harsh")["topic"] == "vocal"
    assert "Vocal vs synth" in [r["problem"] for r in engineering_rules.lookup("interactions")["rules"]]
    assert engineering_rules.lookup("guitar amp")["status"] == "failed"


def test_clean_voice_skips_stages():
    checks, _ = checks_for(voice())
    assert checks["headroom"]["status"] == "pass" and checks["sibilance"]["status"] == "pass"
    assert checks["mud"]["status"] == "pass" and "skip" in checks["mud"]["detail"]


def test_mud_sibilance_and_clipping_are_detected_with_rulebook_fixes():
    checks, measured = checks_for(voice(mud=True))
    assert checks["mud"]["status"] == "warn" and "1-4 dB" in checks["mud"]["fix"]
    checks, measured = checks_for(voice(sibilant=True))
    assert checks["sibilance"]["status"] == "warn" and "4-10 kHz" in checks["sibilance"]["fix"]
    checks, _ = checks_for(voice(level=1.6))
    assert checks["clipping"]["status"] == "fail" and "before any plugin" in checks["clipping"]["fix"]


def test_run_scores_masking_against_other_parts():
    with tempfile.TemporaryDirectory() as directory, patch.object(recordings, "ROOT", Path(directory)):
        for rid, name, signal in (("a" * 32, "Vocal", voice()), ("b" * 32, "Lead", voice(f0=440, level=0.6)),
                                  ("c" * 32, "Bass", voice(f0=55, level=0.2))):
            write(Path(directory) / f"{rid}.m4a", signal)
            (Path(directory) / f"{rid}.json").write_text(json.dumps({"id": rid, "user_id": 7, "track_name": name,
                                                                     "created_at": "2026-09-29T00:00:00"}))
        result = vocal_check.run(7, "a" * 32, ["b" * 32, "c" * 32])
    masking = next(c for c in result["checks"] if c["id"] == "masking")
    assert masking["status"] == "warn" and "Lead" in masking["detail"] and "Bass" not in masking["detail"]
    assert result["order"][0].startswith("noise")


def test_vocal_recipe_is_conditional_and_prompt_points_to_the_rulebook():
    import effect_recipes
    from claude_tools import SYSTEM_PROMPT
    assert effect_recipes.normalize_role("Lead Vocal") == "vocal"
    chain = effect_recipes.recipe("lead vocal")["chain"]
    assert all(step["purpose"].startswith("Only if") or "only if" in step["purpose"] for step in chain)
    assert "Multiband Dynamics" in [step["device"] for step in chain]
    for phrase in ("get_engineering_rules first", "vocal_check on a solo vocal preview", "Never fix an"):
        assert phrase in SYSTEM_PROMPT


def test_new_rulebook_topics_and_word_matching():
    assert engineering_rules.lookup("why does it sound robotic")["topic"] == "human_feel"
    assert engineering_rules.lookup("drama", "riser")["rules"][0]["problem"] == "Weak final build"
    assert engineering_rules.lookup("smooth fade in")["topic"] == "entrances"


def test_producer_preferences_override_defaults_and_validate(tmp_path):
    import asyncio
    import chat_tools
    import producer_profile
    with patch.object(producer_profile, "ROOT", tmp_path):
        run = lambda inputs: asyncio.run(chat_tools.execute("producer_preferences", inputs, 42))
        base = run({"action": "get"})
        assert base["preferences"]["swing_percent"] == {"value": 54.0, "source": "default", "meaning": producer_profile.PREFERENCES["swing_percent"][2]}
        saved = run({"action": "set", "values": {"swing_percent": 58, "humanize": "heavy", "kick_locked": False}})
        assert saved["status"] == "verified"
        assert saved["preferences"]["swing_percent"]["value"] == 58.0 and saved["preferences"]["swing_percent"]["source"] == "producer"
        assert saved["humanize_detail"]["chance"] == 0.65
        assert run({"action": "set", "values": {"swing_percent": 80}})["status"] == "failed"
        assert run({"action": "set", "values": {"colour": "red"}})["status"] == "failed"
        rules = asyncio.run(chat_tools.execute("get_engineering_rules", {"topic": "human_feel"}, 42))
        assert rules["producer_preferences"]["swing_percent"] == 58.0 and "override" in rules["precedence"]
        other = asyncio.run(chat_tools.execute("get_engineering_rules", {"topic": "human_feel"}, 43))
        assert other["producer_preferences"] == {}
        cleared = run({"action": "reset", "reset": ["swing_percent"]})
        assert cleared["preferences"]["swing_percent"]["source"] == "default" and cleared["preferences"]["humanize"]["value"] == "heavy"
