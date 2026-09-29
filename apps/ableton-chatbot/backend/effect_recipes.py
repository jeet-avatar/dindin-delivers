"""Starting-point effect chains per part role, using Ableton's built-in devices.

These are engineering defaults, not presets: the producer proposes them to the user, adjusts them by ear and by
reference measurements, and every setting is applied and read back in Ableton. Third-party plugins are optional
alternatives, offered only when installed and when the user has opted in.
"""

ROLES = ("kick", "drums", "percussion", "bass", "chords", "lead", "fx", "vocal")

# Each device: (built-in device name, purpose, settings as plain engineering targets).
RECIPES = {
    "kick": [
        ("EQ Eight", "Remove sub-rumble and add click", ["high-pass 30 Hz, 24 dB/oct", "+2 dB bell at 3-5 kHz, Q 1.0 for the beater"]),
        ("Saturator", "Weight and loudness without extra peak", ["Analog Clip or Soft Sine", "drive 2-4 dB", "output trimmed so the peak does not rise"]),
        ("Utility", "Keep the low end centred", ["width 0% (mono)"]),
    ],
    "drums": [
        ("EQ Eight", "Clear low end for the kick and bass", ["high-pass 150-250 Hz", "tame harshness: -2 dB around 3 kHz if needed"]),
        ("Drum Buss", "Punch and glue for claps and hats", ["drive low", "transients +", "crunch off or subtle"]),
        ("Glue Compressor", "Hold the kit together", ["ratio 2:1", "attack 10 ms", "release auto", "1-2 dB gain reduction"]),
    ],
    "percussion": [
        ("EQ Eight", "Keep percussion above the bass", ["high-pass 200-300 Hz", "gentle air shelf +1-2 dB above 8 kHz"]),
        ("Auto Pan", "Movement and width", ["amount 20-30%", "rate synced 1/8 or 1/16"]),
    ],
    "bass": [
        ("EQ Eight", "Tight, clear low end", ["high-pass 30-35 Hz", "-2 to -3 dB around 250 Hz to remove mud"]),
        ("Compressor", "Even level note to note", ["ratio 4:1", "attack 10-20 ms", "release 50-100 ms", "2-4 dB gain reduction"]),
        ("Saturator", "Harmonics so the bass is heard on small speakers", ["Soft Sine", "drive 2-4 dB", "dry/wet 30-50%"]),
        ("Utility", "Mono below the mix", ["width 0% or bass mono on"]),
    ],
    "chords": [
        ("EQ Eight", "Stay out of the kick and bass", ["high-pass 120-200 Hz", "-2 dB around 300-500 Hz if boxy"]),
        ("Chorus-Ensemble", "Width and movement", ["mode Ensemble or Classic", "dry/wet 20-35%"]),
    ],
    "lead": [
        ("EQ Eight", "Space for the chords and a clear top", ["high-pass 200 Hz", "+1-2 dB presence at 2-4 kHz"]),
        ("Compressor", "Consistent level", ["ratio 3:1", "1-3 dB gain reduction"]),
    ],
    "fx": [
        ("EQ Eight", "Keep effects out of the low end", ["high-pass 300 Hz"]),
        ("Auto Filter", "Sweeps for builds", ["high-pass or low-pass, automated per section"]),
    ],
    "vocal": [
        ("EQ Eight", "Clean and present", ["high-pass 100 Hz", "-2 dB around 300 Hz", "+2 dB presence at 3-5 kHz"]),
        ("Compressor", "Steady level", ["ratio 3:1", "attack 5-10 ms", "3-5 dB gain reduction"]),
    ],
}

# Send levels to the BeatMind Starter returns (A Reverb, B Delay) as native 0-1 send values.
SENDS = {"kick": [], "drums": [("A Reverb", 0.1)], "percussion": [("A Reverb", 0.15)], "bass": [],
         "chords": [("A Reverb", 0.3)], "lead": [("A Reverb", 0.15), ("B Delay", 0.2)],
         "fx": [("A Reverb", 0.25)], "vocal": [("A Reverb", 0.2), ("B Delay", 0.15)]}

GENRE_NOTES = {
    "techno": "Keep the low end mono and dry; reverb stays off the kick and bass. Hypnotic parts favour subtle movement.",
    "house": "Warmer, rounder low end; claps and hats can be a little wetter; chords breathe with chorus and reverb.",
    "trance": "Wider, brighter leads and pads with longer reverb and tempo-synced delay.",
    "ambient": "Long reverbs and gentle saturation; compression very light.",
}

# Optional third-party alternatives, used only when installed and the user opted in.
THIRD_PARTY = {
    "EQ Eight": ["FabFilter Pro-Q 3", "FabFilter Pro-Q 4"],
    "Compressor": ["FabFilter Pro-C 2"],
    "Glue Compressor": ["FabFilter Pro-C 2"],
    "Saturator": ["FabFilter Saturn 2", "Soundtoys Decapitator"],
    "Reverb": ["Valhalla VintageVerb", "FabFilter Pro-R 2"],
}

BAND_LABELS = {"25-80": "sub", "80-200": "low", "200-800": "low-mids", "800-2500": "mids",
               "2500-8000": "presence", "8000-20000": "air"}


def normalize_role(role):
    text = str(role or "").casefold()
    for key, words in (("kick", ("kick",)), ("bass", ("bass", "sub")), ("percussion", ("perc", "shaker", "conga", "tom")),
                       ("drums", ("drum", "clap", "snare", "hat", "cymbal")), ("chords", ("chord", "pad", "keys", "stab")),
                       ("lead", ("lead", "pluck", "arp", "synth", "melody")), ("vocal", ("vocal", "vox")),
                       ("fx", ("fx", "riser", "sweep", "impact"))):
        if any(word in text for word in words):
            return key
    return None


def reference_adjustments(band_deltas):
    """Suggest EQ moves from a reference comparison: candidate minus reference, in percentage points of energy."""
    moves = []
    for band, delta in sorted((band_deltas or {}).items(), key=lambda item: -abs(item[1])):
        label = BAND_LABELS.get(band.replace(" Hz", ""), band)
        if abs(delta) < 3:
            continue
        direction = "cut" if delta > 0 else "boost"
        amount = "1.5-2" if abs(delta) < 8 else "3-4"
        moves.append(f"{direction} {amount} dB in the {label} ({band.replace(' Hz', '')} Hz): the part has {abs(delta):.1f} points "
                     f"{'more' if delta > 0 else 'less'} energy there than the reference")
        if len(moves) == 3:
            break
    return moves


def recipe(role, genre=None, band_deltas=None, installed_plugins=None, allow_third_party=False):
    key = normalize_role(role)
    if key is None:
        return {"status": "failed", "summary": f"No recipe for role '{role}'. Use one of: {', '.join(ROLES)}.", "steps": []}
    installed = {name.casefold(): name for name in installed_plugins or []}
    chain = []
    for device, purpose, settings in RECIPES[key]:
        alternatives = [installed[a.casefold()] for a in THIRD_PARTY.get(device, []) if a.casefold() in installed]
        chain.append({"device": device, "purpose": purpose, "settings": settings,
                      **({"installed_alternatives": alternatives} if alternatives and allow_third_party else {})})
    genre_note = next((note for name, note in GENRE_NOTES.items() if name in str(genre or "").casefold()), None)
    result = {"status": "observed", "role": key, "chain": chain,
              "sends": [{"return": name, "value": value} for name, value in SENDS[key]],
              "summary": f"Starting chain for {key}: " + " -> ".join(d["device"] for d in chain) + ".",
              "rules": ["Propose this chain to the user in plain words and wait for approval before loading anything.",
                        "Start subtle; keep the processed peak at or below the dry peak unless loudness is the goal.",
                        "Audition after applying and let the user compare before and after at matched level."],
              "steps": []}
    if genre_note:
        result["genre_note"] = genre_note
    adjustments = reference_adjustments(band_deltas)
    if adjustments:
        result["reference_adjustments"] = adjustments
    return result
