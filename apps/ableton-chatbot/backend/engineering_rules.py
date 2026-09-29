"""BeatMind's engineering rulebooks: how a producer detects a problem, chooses the least destructive fix and verifies it.

Each rule is (problem, detection, action). Frequencies and amounts are search zones and starting points, never fixed
presets: the producer measures or listens first, changes as little as possible, level-matches before/after and stops
once the problem is solved. The system prompt only carries the method and an index; answers and processing decisions
look the rules up here with get_engineering_rules so every user gets the same, correct guidance.
"""

METHOD = [
    "Detect the problem first; never process because a rule exists.",
    "Name the likely cause: frequency, dynamics, timing, space or tone.",
    "Choose the least destructive processor that solves it; dynamic processing when the problem is occasional, static when it is constant.",
    "Make the smallest effective change, level-match before and after, and judge it in the full mix.",
    "Bypass to verify it is actually better; stop as soon as the problem is solved. Skip any stage that detects no problem.",
    "When something is masked, consider lowering the competing part before boosting this one.",
]

LIVE_DEVICES = {
    "cleanup": "Gate (noise between phrases), clip gain / clip volume envelope for breaths, plosives and uneven words",
    "high-pass / corrective EQ": "EQ Eight (bells, shelves, 12 or 48 dB/oct high-pass)",
    "dynamic EQ / resonance control": "Multiband Dynamics on one band, or EQ Eight automation when the problem is in one place",
    "peak compressor": "Compressor (Peak mode, fast attack)",
    "leveling compressor": "Compressor (RMS mode, slower attack) or Glue Compressor",
    "de-esser": "Multiband Dynamics: high band from about 4-10 kHz, downward compression only above threshold",
    "saturation": "Saturator (Analog Clip or Soft Sine) or Roar, used subtly",
    "parallel compression": "Audio Effect Rack with a dry chain and a heavily compressed chain blended low",
    "reverb": "Reverb or Hybrid Reverb on a return, with its own EQ (high-pass 120-300 Hz, low-pass 5-12 kHz)",
    "reverb ducking": "Compressor after the reverb on the return, sidechained from the dry vocal track",
    "delay": "Delay or Echo on a return, filtered, tempo-synced (1/4, 1/8, dotted 1/8, dotted 1/4, slapback, ping-pong)",
    "masking control": "EQ Eight cut on the competing part, or Multiband Dynamics on it sidechained from the vocal",
    "width": "Utility on doubles and returns; the lead stays centred",
}

RULEBOOKS = {
    "vocal": {
        "title": "Vocal engineering",
        "goal": ("Clear, intelligible, controlled, powerful, tonally balanced and emotionally present; free from mud, "
                 "harshness, boom, excessive sibilance, clipping and resonances; consistent without sounding "
                 "over-compressed; spacious without being washed out; translating to mono, headphones, monitors, "
                 "clubs and streaming."),
        "chain": ["noise / click / plosive repair", "clip gain / vocal riding", "high-pass when needed",
                  "corrective dynamic EQ", "peak compressor", "de-esser", "tone EQ", "leveling compressor",
                  "saturation", "optional parallel compression", "reverb send (EQ + ducking) and delay send (EQ + automation)",
                  "vocal bus", "final automation"],
        "hierarchy": ["intelligibility", "tonal balance", "dynamic control", "masking control", "character", "space",
                      "special effects"],
        "never": ["Do not destroy natural dynamics or over-compress for loudness.",
                  "Do not make the vocal bright with excessive top end; control harshness and sibilance first.",
                  "Do not strip all low-mids: 200-500 Hz also holds warmth and body.",
                  "Do not add reverb until the vocal is intelligible; never fix an unintelligible vocal with a big reverb.",
                  "Never try to EQ clipping away; reduce gain before any plugin.",
                  "If clarity drops after processing, revert or reduce the processing."],
        "rules": [
            ("Noise", "Hiss, room tone or fan noise between phrases", "Edit, gate or expander (or spectral cleanup) before compression."),
            ("Clicks / pops", "Short transient artifacts", "Repair or fade them manually before processing."),
            ("Breaths too loud", "Breaths jump forward after compression", "Clip-gain breaths down a few dB; keep the ones that support phrasing, never delete every breath."),
            ("Uneven phrases", "Some words far louder than others", "Clip gain first, compression second, automation third."),
            ("Clipping", "Flattened waveform or distortion", "Reduce gain before any plugin; aim for roughly -12 to -6 dBFS peaks before heavy processing."),
            ("Excess sub / plosives", "Rumble or plosive energy below the useful voice range", "High-pass cautiously: search 50-100 Hz on deep voices, 70-140 Hz on higher voices; lower the cutoff if useful voice is lost, raise it until rumble goes, stop before the vocal thins. Fix single plosives locally (clip gain or dynamic EQ), not with a global filter."),
            ("Boominess", "Chest-heavy or boxy", "Search about 100-250 Hz; reduce only if necessary."),
            ("Mud", "Lacks separation and definition", "Inspect about 200-500 Hz; find the resonant region, cut about 1-4 dB with a moderate Q, compare in the full mix; dynamic EQ if it only happens on some notes."),
            ("Boxiness", "Enclosed, cardboard sound", "Inspect about 300-800 Hz."),
            ("Nasal", "Honky or nasal resonance", "Inspect about 700 Hz-1.5 kHz."),
            ("Resonances", "A band clearly louder than its neighbours, constantly or now and then", "Narrow and unpleasant: narrow dynamic cut. Broad: broader tonal EQ. Judge by audible improvement."),
            ("Poor intelligibility", "Words disappear in a dense mix", "Investigate about 1-4 kHz and the competing parts; often cut the synth about 2 dB there instead of boosting the vocal 4 dB."),
            ("Harshness", "Hurts at high volume", "Control about 2.5-6 kHz, dynamically when possible; leave it untouched if it is not over threshold."),
            ("Sibilance", "S, T, SH, CH jump forward", "De-ess around 4-10 kHz (find the singer's band); trigger only when sibilance exceeds the surrounding vocal; aim for control, not a lisp."),
            ("Dull vocal", "Lacks openness", "Gentle presence or air (high shelf around 8-16 kHz) only after harshness and sibilance are controlled."),
            ("Excessive air", "Thin, hissy, artificial", "Reduce the top end rather than adding more body."),
            ("Peak instability", "Some syllables leap out", "Peak compressor: 2:1-4:1, fast-to-medium attack, natural release, about 1-5 dB (2-4 dB in a two-stage chain)."),
            ("Overall inconsistency", "Sentences move too much in level", "Leveling compressor: about 1.5:1-3:1, medium/slower attack, musical release, 1-4 dB; plus automation. Two gentle stages beat one doing 10 dB."),
            ("Compression problems", "Consonants lose punch / pumping / always compressing / flat", "Attack too fast / release too fast / threshold or release wrong / reduce ratio or gain reduction."),
            ("Lifeless vocal", "Compression removed expression", "Lower the ratio or gain reduction, or lengthen the attack."),
            ("Lacks excitement", "Clean but boring", "Subtle saturation (tape smoother, tube warmer, console denser; add until noticed, then back off), parallel compression blended low, delay automation."),
            ("Vocal buried", "Level is right but it is masked", "Make spectral space in the competing parts rather than raising the vocal."),
            ("Too dry", "Feels disconnected", "Short ambience or reverb."),
            ("Too distant", "Reverb masks consonants", "Lower the wet level, lengthen pre-delay (about 20-100 ms), shorten decay; high-pass the reverb 120-300 Hz and low-pass it 5-12 kHz."),
            ("Space without mud", "Needs space but reverb costs clarity", "Use a filtered tempo delay before more reverb; duck the reverb from the dry vocal so it rises when a phrase ends."),
            ("Delay throws", "Phrase ends, key words, transitions, pre-drop lines", "Throw delay on those moments only, not constantly."),
            ("Lacks width", "Lead feels narrow", "Keep the lead centred; width comes from doubles, harmonies, reverbs, delays and micro-shift; check mono."),
            ("Doubles", "Doubles distract", "Fix distracting timing but keep human micro-timing; never make doubles identical."),
            ("Disappears in the drop", "Density rises around it", "Automate the vocal up or duck the competing parts while it sings."),
            ("Section automation", "Build / drop / break", "Word, phrase and section rides; more space in builds, drier and denser in drops, more reverb, stereo and delay in breaks, as the song needs."),
            ("Vocal bus", "Cohesion", "Small EQ, gentle glue compression, tiny saturation, light peak control; do not redo the channel processing."),
        ],
        "formula": ("Clarity = clean recording + controlled low-mids + controlled resonances + stable dynamics + "
                    "controlled sibilance + enough presence + less masking + right level + controlled reverb + automation."),
    },
    "human_feel": {
        "title": "Human feel (groove, microtiming, variation)",
        "rules": [
            ("Silent grooves", "Clips have grooves but nothing swings", "Check the Groove Pool's global Groove Amount; at 0% every groove is off. Set it to 100% once grooves are chosen."),
            ("Swing", "Hats and percussion feel mechanical", "Light 16th swing (MPC or SP 1200 16ths groove, effective 54-57% by default) on hats and percussion; timing 40-70%, random 2-5%. Bass little or none; long chords none. Producer preference swing_percent overrides."),
            ("Locked kick", "Kick wanders", "Techno keeps the kick on the grid: no groove, nudge or chance (unless the producer turns kick_locked off)."),
            ("Microtiming", "Everything lands exactly together", "Clap/snare 3-8 ms late for laid back (or 2-5 ms early to push), off-beat open hats 2-6 ms late, ghosts early; under 10 ms in techno."),
            ("Identical bars", "1-bar loops repeat unchanged", "Make drum and bass loops 4-8 bars: a small change in bar 4, a fill or drop-out in the last bar; a clap variation every 4th bar."),
            ("Chance", "Bars sound copy-pasted", "Ghost hats and extra percussion at 60-85% probability with velocity deviation 8-15; never on the kick, main clap or bass roots."),
            ("Flat velocity", "Every hit the same strength", "Accent downbeats and off-beat hats, soften in-between 16ths; pads 60-95 with lower notes louder; strum chord notes 5-15 ms apart."),
            ("Same note lengths", "Every note identical length", "Vary hat and bass note lengths slightly; long notes release at slightly different times."),
            ("Static sections", "Nothing moves inside a section", "One slow, smooth drift per section (a filter or pan over 8-16 bars)."),
        ],
    },
    "drama": {
        "title": "Drama in transitions (breakdowns and final builds)",
        "rules": [
            ("Flat drop into a break", "The breakdown just starts", "Leave the transition's last beat nearly empty (remove drums, percussion and bass on beat 4), throw reverb/delay on the last hits so tails ring into the gap, impact or downlifter on the break's first beat."),
            ("Break loses the groove", "No pulse without the kick", "A quiet pulse (filtered percussion or hats) rising in the break's second half; open the pad filter slowly; one exposed element."),
            ("Weak final build", "The last drop does not feel earned", "Accelerating roll (quarters, 8ths, 16ths, 32nds over the last 4 bars, velocity about 60 to 120), white-noise riser opening exponentially with rising volume, growing reverb, drums and pad thinned from below."),
            ("No release", "The drop arrives softly", "Stop short: silence the last half beat, then kick, crash or impact and every reset on the drop's first beat; crash and impacts on non-looping clips so they hit once."),
            ("Preview", "Is the change dramatic enough?", "Preview the transition itself with audition_scene then_scene and first_bars; let the producer judge."),
        ],
    },
    "entrances": {
        "title": "Smooth entrances and Arrangement automation",
        "rules": [
            ("Parts switch on abruptly", "A part appears at full level", "Record the Arrangement with entry_rides: pads/chords swell from about -30 dB over 4-8 bars (logarithmic), hats/percussion from about -18 dB over 2-4 bars, bass from about -12 dB over 1-2 bars, lead over 1-2 bars."),
            ("Softened drops", "A drop loses its punch", "Never ride the kick and never soften a drop's first beat (drops_full_level)."),
            ("Fades that repeat", "A long fade restarts every bar", "Session clip automation loops with the clip; one-time fades belong in the Arrangement, recorded with Automation Arm on."),
            ("Resets", "A control stays moved", "Every automation has a purpose and a reset in the next section; read clips and mixers before changing them."),
        ],
    },
    "interactions": {
        "title": "Interaction rules (mix like a producer, not channel by channel)",
        "rules": [
            ("Kick vs bass", "Low end smears or pumps unevenly", "Sidechain the bass from the kick (Peak, 4:1, 0.1-1 ms attack, release under one beat, 3-6 dB ducking); both mono; decide which owns the sub."),
            ("Vocal vs synth", "Vocal unclear while synths play", "Cut the synth about 2 dB around the vocal's 1-5 kHz presence, ideally only while the vocal sings (Multiband Dynamics sidechained from the vocal)."),
            ("Lead vs vocal", "Two melodies fight", "Lower or thin the lead while the vocal sings, move it to gaps between phrases, or change its register."),
            ("Percussion vs vocal", "Hats and shakers mask sibilance and consonants", "Soften or high-cut percussion in 5-10 kHz under the vocal; de-ess before adding air."),
            ("FX vs intelligibility", "Risers, reverbs and delays hide words", "Duck FX and returns from the vocal; throws go in the gaps."),
            ("Pads vs everything", "Mix is cloudy", "High-pass pads and cut 200-500 Hz where they overlap the vocal and bass."),
        ],
    },
}

TOPIC_WORDS = {
    "vocal": ("vocal", "vox", "voice", "sing", "sibilan", "de-ess", "deess", "breath", "plosive", "lyric"),
    "interactions": ("mask", "interaction", "versus", " vs ", "fight", "compete", "sidechain", "duck"),
    "human_feel": ("human", "robotic", "swing", "groove", "shuffle", "microtiming", "nudge", "chance", "probability", "velocity", "humaniz", "stiff"),
    "drama": ("drama", "breakdown", "break down", "build", "riser", "roll", "tension", "transition", "impact", "downlifter"),
    "entrances": ("entrance", "fade in", "fade-in", "smooth", "swell", "enters", "automation lane", "arrangement automation"),
}


def match_topics(text):
    lowered = f" {str(text or '').casefold()} "
    return [topic for topic, words in TOPIC_WORDS.items() if any(word in lowered for word in words)]


def lookup(topic, problem=None):
    """Rules for a topic, narrowed to the problems that match `problem` when given."""
    key = str(topic or "").casefold().strip()
    if key not in RULEBOOKS:
        found = match_topics(key)
        if not found:
            return {"status": "failed", "summary": f"No rulebook for '{topic}'. Topics: {', '.join(RULEBOOKS)}.", "steps": []}
        key = found[0]
    book = RULEBOOKS[key]
    rules = book["rules"]
    if problem:
        words = [w for w in str(problem).casefold().replace("-", " ").split() if len(w) > 2]
        narrowed = [r for r in rules if any(w in " ".join(r).casefold() for w in words)]
        rules = narrowed or rules
    return {"status": "observed", "topic": key, "title": book["title"], "method": METHOD,
            "rules": [{"problem": p, "detect": d, "action": a} for p, d, a in rules],
            **{k: book[k] for k in ("goal", "chain", "hierarchy", "never", "formula") if k in book},
            "live_devices": LIVE_DEVICES,
            "summary": f"{book['title']}: {len(rules)} rule(s)" + (f" matching '{problem}'" if problem else "") + ".",
            "steps": []}
