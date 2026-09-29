"""Each producer's own taste: preferences that override BeatMind's rulebook defaults.

The rulebooks (engineering_rules) hold engineering defaults. Producers differ, so every value a producer chooses is
saved here per user and wins over the default in every later track. Only known keys within safe ranges are stored.
"""

import json
import os
from pathlib import Path

import recordings

ROOT = Path(os.getenv("BEATMIND_PROFILES_DIR", str(recordings.ROOT.parent / "producer-profiles")))

# key: (default, allowed, description). allowed is a (min, max) range, a tuple of choices, or bool.
PREFERENCES = {
    "swing_percent": (54.0, (50.0, 66.0), "Effective 16th swing on hats and percussion (50 straight, 66 triplet shuffle)."),
    "swing_parts": ("hats_percussion", ("none", "hats_percussion", "drums_all", "everything_but_kick"), "Which parts swing."),
    "kick_locked": (True, bool, "Keep the kick exactly on the grid (no swing, nudges or chance)."),
    "humanize": ("medium", ("off", "light", "medium", "heavy"), "Microtiming, chance and velocity variation strength."),
    "clap_nudge_ms": (5.0, (-15.0, 15.0), "Clap/snare timing: positive is laid back, negative pushes."),
    "hat_nudge_ms": (3.0, (-15.0, 15.0), "Off-beat hat timing."),
    "ghost_chance": (0.8, (0.3, 1.0), "Probability for ghost and extra percussion hits."),
    "variation_bars": (8, (4, 16), "Loop length for drum and bass variations (a change every bar 4 and a fill in the last bar)."),
    "pad_entry_bars": (8, (0, 16), "Fade-in length when pads or chords first enter (0 = no ride)."),
    "hat_entry_bars": (4, (0, 16), "Fade-in length for hats and percussion entrances."),
    "bass_entry_bars": (2, (0, 8), "Fade-in length for the bass entrance."),
    "drops_full_level": (True, bool, "Drops always hit at full level (no ride into a drop)."),
    "drama": ("medium", ("subtle", "medium", "big"), "How big transitions are: silence, risers, rolls and throws."),
    "throw_level_db": (-12.0, (-30.0, -3.0), "Level that reverb and delay throws jump to."),
    "loudness_target_lufs": (-14.0, (-20.0, -6.0), "Master loudness target."),
    "ceiling_dbtp": (-1.0, (-3.0, -0.1), "Master true-peak ceiling."),
    "vocal_style": ("clear_present", ("clear_present", "airy_wide", "dark_intimate", "aggressive"), "Default vocal character."),
}

HUMANIZE_LEVELS = {"off": {"nudge_scale": 0.0, "velocity_deviation": 0, "chance": 1.0},
                   "light": {"nudge_scale": 0.6, "velocity_deviation": 6, "chance": 0.9},
                   "medium": {"nudge_scale": 1.0, "velocity_deviation": 12, "chance": 0.8},
                   "heavy": {"nudge_scale": 1.6, "velocity_deviation": 18, "chance": 0.65}}


def path(user_id):
    return ROOT / f"{int(user_id)}.json"


def stored(user_id):
    try:
        return json.loads(path(user_id).read_text())
    except (OSError, ValueError):
        return {}


def check(key, value):
    if key not in PREFERENCES:
        return f"Unknown preference '{key}'. Known: {', '.join(PREFERENCES)}."
    default, allowed, _ = PREFERENCES[key]
    if allowed is bool:
        return None if isinstance(value, bool) else f"{key} must be true or false."
    if isinstance(allowed, tuple) and allowed and isinstance(allowed[0], str):
        return None if value in allowed else f"{key} must be one of: {', '.join(allowed)}."
    low, high = allowed
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not low <= value <= high:
        return f"{key} must be a number from {low:g} to {high:g}."
    return None


def profile(user_id):
    """Every preference with its value, whether the producer set it, and what it means."""
    mine = stored(user_id)
    values = {key: {"value": mine.get(key, default), "source": "producer" if key in mine else "default", "meaning": meaning}
              for key, (default, _, meaning) in PREFERENCES.items()}
    level = HUMANIZE_LEVELS[values["humanize"]["value"]]
    return {"status": "observed", "preferences": values, "humanize_detail": level,
            "summary": f"{len(mine)} preference(s) set by the producer; the rest are BeatMind defaults.",
            "rule": "Producer preferences override rulebook defaults. Save a preference only when the producer states it.",
            "steps": []}


def update(user_id, changes, reset=None):
    problems = [p for p in (check(k, v) for k, v in (changes or {}).items()) if p]
    if problems:
        return {"status": "failed", "summary": " ".join(problems), "steps": []}
    mine = stored(user_id)
    mine.update({k: (float(v) if isinstance(v, int) and not isinstance(v, bool) and isinstance(PREFERENCES[k][0], float) else v)
                 for k, v in (changes or {}).items()})
    for key in reset or []:
        mine.pop(key, None)
    ROOT.mkdir(parents=True, exist_ok=True)
    temporary = path(user_id).with_suffix(".tmp")
    temporary.write_text(json.dumps(mine, indent=2, sort_keys=True))
    temporary.replace(path(user_id))
    result = profile(user_id)
    result.update(status="verified", summary=f"Saved {', '.join(changes or {}) or 'no changes'}"
                  + (f"; reset {', '.join(reset)}" if reset else "") + ". These now override the defaults.")
    return result
