"""
Claude Tool Definitions for Ableton Live control via AbletonOSC.

These tools are passed to the Claude API as tool_use definitions.
The backend translates tool calls into OSC commands sent via the bridge.
"""

# All tools the AI can invoke to control Ableton Live
ABLETON_TOOLS = [
    # --- Transport ---
    {
        "name": "set_tempo",
        "description": "Set the project tempo (BPM). Typical range: 60-180.",
        "input_schema": {
            "type": "object",
            "properties": {
                "bpm": {"type": "number", "description": "Tempo in BPM (e.g., 120)"}
            },
            "required": ["bpm"],
        },
    },
    {
        "name": "get_tempo",
        "description": "Get the current project tempo.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "play",
        "description": "Start playback.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "stop",
        "description": "Stop playback.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "fire_scene",
        "description": "Fire (launch) a scene by index. This triggers all clips in that scene row.",
        "input_schema": {
            "type": "object",
            "properties": {
                "scene": {"type": "integer", "description": "Scene index (0-based)"}
            },
            "required": ["scene"],
        },
    },

    # --- Track Management ---
    {
        "name": "get_track_count",
        "description": "Get the total number of tracks in the session.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "get_track_names",
        "description": "Get names of all tracks.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "set_track_name",
        "description": "Rename a track.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index (0-based)"},
                "name": {"type": "string", "description": "New track name"},
            },
            "required": ["track", "name"],
        },
    },
    {
        "name": "set_track_volume",
        "description": "Set a track fader. Prefer volume_db (for example -6 or +3); BeatMind converts it with Live's measured fader curve (exact from -18 to +6 dB, approximate below). volume is Live's native 0.0-1.0 value (0.85 = 0 dB). Give exactly one of them; never pass a linear gain as volume.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "volume_db": {"type": "number", "minimum": -60, "maximum": 6, "description": "Fader level in dB, -60 to +6"},
                "volume": {"type": "number", "minimum": 0, "maximum": 1, "description": "Native fader value 0.0-1.0"},
            },
            "required": ["track"],
        },
    },
    {
        "name": "set_track_pan",
        "description": "Set track panning. -1.0 = hard left, 0.0 = center, 1.0 = hard right.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "pan": {"type": "number", "description": "Pan -1.0 to 1.0"},
            },
            "required": ["track", "pan"],
        },
    },
    {
        "name": "set_track_mute",
        "description": "Mute or unmute a track.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "muted": {"type": "boolean", "description": "True to mute, False to unmute"},
            },
            "required": ["track", "muted"],
        },
    },
    {
        "name": "set_track_send",
        "description": "Set send level for a track to a return track.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "send": {"type": "integer", "description": "Send index (0=Send A, 1=Send B, etc.)"},
                "value": {"type": "number", "description": "Send level 0.0-1.0"},
            },
            "required": ["track", "send", "value"],
        },
    },

    # --- Instrument Loading ---
    {
        "name": "load_instrument",
        "description": "Load an available instrument onto a MIDI track with no existing instrument. Discover actual browser names first. Inspect exposed parameters after loading; availability varies by device and preset.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index to load onto"},
                "instrument_uri": {
                    "type": "string",
                    "description": "Browser URI for the instrument preset (e.g., 'Drums/Drum Hits/DS Kick')",
                },
            },
            "required": ["track", "instrument_uri"],
        },
    },
    {
        "name": "load_effect",
        "description": "Load a built-in Ableton effect onto a track. Common effects: EQ Eight, Compressor, Saturator, Utility, Reverb, Auto Filter, Chorus-Ensemble, Delay, Phaser-Flanger.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "effect_uri": {
                    "type": "string",
                    "description": "Browser URI for the effect (e.g., 'Audio Effects/EQ Eight')",
                },
            },
            "required": ["track", "effect_uri"],
        },
    },

    # --- Device Parameters ---
    {
        "name": "get_device_names",
        "description": "Get names of all devices on a track.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"}
            },
            "required": ["track"],
        },
    },
    {
        "name": "get_device_parameters",
        "description": "Get all parameter names and values for a device on a track.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "device": {"type": "integer", "description": "Device index on the track (0-based)"},
            },
            "required": ["track", "device"],
        },
    },
    {
        "name": "set_device_parameter",
        "description": "Set a device parameter using its discovered index and native value range. First inspect get_device_parameters; never guess indices or assume all values are normalized. The executor checks the range and reads the value back.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "device": {"type": "integer", "description": "Device index"},
                "parameter": {"type": "integer", "description": "Parameter index"},
                "value": {"type": "number", "description": "Parameter value (usually 0.0-1.0)"},
            },
            "required": ["track", "device", "parameter", "value"],
        },
    },

    # --- Clip & Note Creation ---
    {
        "name": "create_clip",
        "description": "Create an empty MIDI clip in a clip slot.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
                "length_beats": {"type": "number", "description": "Clip length in beats (e.g., 16 for 4 bars at 4/4)"},
            },
            "required": ["track", "scene", "length_beats"],
        },
    },
    {
        "name": "add_notes",
        "description": "Add up to 40 MIDI notes, then verify the complete resulting pattern including existing notes. Pitches are 0-127 (60=C3 in Live). Pitch 36 is NOT universally a kick: confirm the instrument's mapping. start and duration are in quarter-note beats. Never retry a failed batch blindly; inspect missing notes first.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
                "notes": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "pitch": {"type": "integer", "description": "MIDI note (0-127)"},
                            "start": {"type": "number", "description": "Start time in beats"},
                            "duration": {"type": "number", "description": "Duration in beats"},
                            "velocity": {"type": "integer", "description": "Velocity (1-127)"},
                        },
                        "required": ["pitch", "start", "duration", "velocity"],
                    },
                    "description": "Array of notes to add",
                },
            },
            "required": ["track", "scene", "notes"],
        },
    },
    {
        "name": "set_clip_looping",
        "description": "Enable or disable looping on a clip.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
                "looping": {"type": "boolean", "description": "True to loop, False to not loop"},
            },
            "required": ["track", "scene", "looping"],
        },
    },
    {
        "name": "fire_clip",
        "description": "Fire (launch) a specific clip.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
            },
            "required": ["track", "scene"],
        },
    },

    # --- Session Info ---
    {
        "name": "get_session_state",
        "description": "Get a full snapshot of the current Ableton session: tempo, track count, track names, playing status. Use this to understand the current state before making changes.",
        "input_schema": {"type": "object", "properties": {}},
    },

    # --- Structure: create / duplicate / delete tracks & scenes ---
    {
        "name": "create_midi_track",
        "description": "Create a new MIDI track (for instruments/drums). Use this to build the track architecture before loading instruments.",
        "input_schema": {
            "type": "object",
            "properties": {
                "index": {"type": "integer", "description": "Position to insert at. Use -1 to append at the end (default)."}
            },
        },
    },
    {
        "name": "create_audio_track",
        "description": "Create a new audio track.",
        "input_schema": {
            "type": "object",
            "properties": {
                "index": {"type": "integer", "description": "Position to insert at. Use -1 to append at the end (default)."}
            },
        },
    },
    {
        "name": "create_return_track",
        "description": "Create a return track and verify its count. Return indices are separate from normal track indices; the normal load_effect/set_device_parameter tools cannot target returns. Do not claim a return effect was configured with those tools.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "create_scene",
        "description": "Create a new scene (a horizontal row of clip slots). Scenes are used as SONG SECTIONS: intro, build, drop, breakdown, outro. Build a full arrangement by giving each section its own scene.",
        "input_schema": {
            "type": "object",
            "properties": {
                "index": {"type": "integer", "description": "Position to insert at. Use -1 to append at the end (default)."}
            },
        },
    },
    {
        "name": "duplicate_track",
        "description": "Duplicate a track (including its devices and clips). Fast way to create a variation of an element.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index to duplicate"}
            },
            "required": ["track"],
        },
    },
    {
        "name": "duplicate_scene",
        "description": "Duplicate a scene (all its clips). The primary way to build song progression: duplicate a section, then modify the copy to create the next section (e.g., duplicate the drop, mute elements to make a breakdown).",
        "input_schema": {
            "type": "object",
            "properties": {
                "scene": {"type": "integer", "description": "Scene index to duplicate"}
            },
            "required": ["scene"],
        },
    },
    {
        "name": "duplicate_clip",
        "description": "Copy a clip from one slot to another (e.g., reuse a hi-hat pattern across sections).",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Source track index"},
                "scene": {"type": "integer", "description": "Source scene index"},
                "target_track": {"type": "integer", "description": "Destination track index"},
                "target_scene": {"type": "integer", "description": "Destination scene index"},
            },
            "required": ["track", "scene", "target_track", "target_scene"],
        },
    },
    {
        "name": "delete_track",
        "description": "Delete a track by index.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index to delete"}
            },
            "required": ["track"],
        },
    },
    {
        "name": "delete_scene",
        "description": "Delete a scene by index.",
        "input_schema": {
            "type": "object",
            "properties": {
                "scene": {"type": "integer", "description": "Scene index to delete"}
            },
            "required": ["scene"],
        },
    },
    {
        "name": "delete_clip",
        "description": "Delete the clip in a specific slot.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
            },
            "required": ["track", "scene"],
        },
    },
    {
        "name": "remove_notes",
        "description": "Remove only the notes that START inside a time range (and optional pitch range) of a clip, keeping every other note exactly. Use it to empty a beat or a bar (for example the last beat before a drop) without rewriting the clip. Verified against the full before/after note list.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
                "start": {"type": "number", "minimum": 0, "description": "Range start in beats from the clip start"},
                "length": {"type": "number", "exclusiveMinimum": 0, "description": "Range length in beats"},
                "pitch_low": {"type": "integer", "minimum": 0, "maximum": 127},
                "pitch_high": {"type": "integer", "minimum": 0, "maximum": 127},
            },
            "required": ["track", "scene", "start", "length"],
        },
    },
    {
        "name": "clear_notes",
        "description": "Remove ALL MIDI notes from a clip so you can rewrite the pattern. Only clear after you have read the COMPLETE note list (never from a partial or truncated read); to remove some notes, use remove_notes instead.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "scene": {"type": "integer", "description": "Scene index"},
            },
            "required": ["track", "scene"],
        },
    },

    # --- Sample / browser loading ---
    {
        "name": "list_browser",
        "description": "List the items available in a browser category so you can pick real names before loading. Categories: samples, sounds, drums, instruments, audio_effects, midi_effects, plugins.",
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "description": "One of: samples, sounds, drums, instruments, audio_effects, midi_effects, plugins"}
            },
            "required": ["category"],
        },
    },
    {
        "name": "load_sample",
        "description": "Load a raw sample (from the user's sample packs) onto a MIDI track. Live wraps it in a Simpler so it can be triggered by MIDI notes. Great for signature kicks, rumbles, vocal chops, or one-shots. Use list_browser('samples') first to find exact names.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index to load the sample onto"},
                "sample_name": {"type": "string", "description": "Name of the sample (as shown in the browser)"},
            },
            "required": ["track", "sample_name"],
        },
    },

    # --- Performed automation (movement) ---
    {
        "name": "automate_parameter",
        "description": "Create MOVEMENT by ramping a device parameter over time during playback (filter sweep, riser, reverb throw, build-up). This is performed in real time (not a stored clip envelope). Start playback first, then call this. Example: sweep an Auto Filter cutoff up over 8 beats for a build.",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "device": {"type": "integer", "description": "Device index on the track"},
                "parameter": {"type": "integer", "description": "Parameter INDEX to automate"},
                "from_value": {"type": "number", "description": "Starting parameter value (0.0-1.0 typical)"},
                "to_value": {"type": "number", "description": "Ending parameter value (0.0-1.0 typical)"},
                "duration_seconds": {"type": "number", "description": "How long the ramp takes, in seconds"},
                "steps": {"type": "integer", "description": "Number of intermediate steps (higher = smoother). 16-64 typical."},
            },
            "required": ["track", "device", "parameter", "from_value", "to_value", "duration_seconds", "steps"],
        },
    },
]


ABLETON_TOOLS.append({
    "name": "audition_part",
    "description": "Record a real isolated Ableton clip for frontend listening. Requires stopped transport and the macOS BeatMind Audio helper. Temporarily solos the track, plays the clip, records audio, then restores transport, mute, solo and quantization. Silent recordings fail. Call AFTER describe_sound for each built part. This pauses production for user review; do not call more tools in the same batch.",
    "input_schema": {"type": "object", "properties": {
        "track": {"type": "integer", "minimum": 0}, "scene": {"type": "integer", "minimum": 0},
        "seconds": {"type": "number", "minimum": 2, "maximum": 16}}, "required": ["track", "scene"]}
})

for _name, _flag, _about in (("set_track_arm", "armed", "Arm or disarm a track for recording. New MIDI tracks may arrive armed; disarm them before exporting or recording the Arrangement."),
                             ("set_track_solo", "soloed", "Solo or unsolo a track. Leave nothing soloed when finishing a mix.")):
    ABLETON_TOOLS.append({"name": _name, "description": _about, "input_schema": {"type": "object", "properties": {
        "track": {"type": "integer", "minimum": 0}, _flag: {"type": "boolean"}}, "required": ["track", _flag],
        "additionalProperties": False}})

ABLETON_TOOLS.append({
    "name": "get_track_volume",
    "description": "Read a track's current fader level in dB (and Live's native 0-1 value). Read it before changing a fader by a relative amount such as 'down 1.5 dB'.",
    "input_schema": {"type": "object", "properties": {"track": {"type": "integer", "minimum": 0}}, "required": ["track"],
                     "additionalProperties": False}
})

ABLETON_TOOLS.append({
    "name": "mix_check",
    "description": "Run the engineering checklist on a full-mix preview from audition_scene: true peak/headroom, integrated loudness against the target, low-end share, every part audible, empty sections, and session safety (solo, arm, reference muted). Read-only. Show the user each failed or warned item with its fix, fix the must-fix items with verified tools, then preview and check again.",
    "input_schema": {"type": "object", "properties": {
        "recording_id": {"type": "string", "pattern": "^[a-f0-9]{32}$"},
        "target_lufs": {"type": "number", "minimum": -20, "maximum": -6},
        "ceiling_dbtp": {"type": "number", "minimum": -3, "maximum": -0.1}},
        "required": ["recording_id"], "additionalProperties": False}
})

ABLETON_TOOLS.append({
    "name": "apply_master_chain",
    "description": "Put Ableton's Limiter last on the Main track and set its ceiling and gain from the measured mix (measured_lufs from mix_check). Only after mix_check shows no clipping and the user agreed to master. Adds no gain when the mix is already at or above the target.",
    "input_schema": {"type": "object", "properties": {
        "measured_lufs": {"type": "number", "minimum": -60, "maximum": 0},
        "target_lufs": {"type": "number", "minimum": -20, "maximum": -6},
        "ceiling_dbtp": {"type": "number", "minimum": -3, "maximum": -0.1}},
        "required": ["measured_lufs"], "additionalProperties": False}
})

ABLETON_TOOLS.append({
    "name": "delete_device",
    "description": "Remove one device from a track, for example to undo an effect chain the user rejected. Give the device's current index and its exact name from get_device_names; nothing is deleted if the name at that index differs. Never remove the part's instrument unless the user asked.",
    "input_schema": {"type": "object", "properties": {
        "track": {"type": "integer", "minimum": 0}, "device": {"type": "integer", "minimum": 0},
        "expected_name": {"type": "string", "minLength": 1, "maxLength": 120}},
        "required": ["track", "device", "expected_name"], "additionalProperties": False}
})

ABLETON_TOOLS.append({
    "name": "audition_scene",
    "description": "Record the FULL MIX of one scene for frontend listening: every clip in the scene plays together with the user's mutes kept and solos cleared, then transport, solos and quantization are restored. Use it when the user wants to hear sections or the whole song together. Requires stopped transport. To hear a TRANSITION, pass then_scene and first_bars (how many bars the first scene plays in the song): it plays from its start and the next scene launches on that bar line (for example scene T3, first_bars 4, then_scene Drop 2, seconds 16), so the user hears the change itself. Up to 30 seconds on Bridge 1.3.4, 16 on 1.3.3. This pauses production for user review; do not call more tools in the same batch.",
    "input_schema": {"type": "object", "properties": {
        "scene": {"type": "integer", "minimum": 0},
        "then_scene": {"type": "integer", "minimum": 0},
        "first_bars": {"type": "integer", "minimum": 1, "maximum": 16},
        "seconds": {"type": "number", "minimum": 4, "maximum": 30, "description": "Up to 16 for one scene; with then_scene up to 30 (16 on Bridge 1.3.3)."}}, "required": ["scene"]}
})

ABLETON_TOOLS.append({
    "name": "record_arrangement",
    "description": "Record the song into Ableton's Arrangement timeline by playing the given scenes in order, each for its number of bars, with Arrangement Record on. Refuses when the Arrangement already has clips unless replace_existing is true (only after the user explicitly agreed to replace the current Arrangement). entry_rides smooth each part's first entrance: with Automation Arm on, the part's fader rises from from_db to its real level over the given bars and Live records it as Arrangement automation (the red lines). Takes real time (the song's length). ONLY call it after the user explicitly approved this exact section order, bar counts and rides in chat; propose them first.",
    "input_schema": {"type": "object", "properties": {
        "sections": {"type": "array", "minItems": 1, "maxItems": 32, "items": {
            "type": "object", "properties": {"scene": {"type": "integer", "minimum": 0},
                                             "bars": {"type": "integer", "minimum": 1, "maximum": 128}},
            "required": ["scene", "bars"], "additionalProperties": False}},
        "replace_existing": {"type": "boolean", "description": "Delete the current Arrangement clips first. Only with the user's explicit agreement."},
        "entry_rides": {"type": "array", "maxItems": 32, "items": {
            "type": "object", "properties": {
                "track": {"type": "integer", "minimum": 0},
                "start_bar": {"type": "integer", "minimum": 1, "description": "Song bar where the part first enters (1 = first bar)."},
                "bars": {"type": "number", "minimum": 0.25, "maximum": 16},
                "from_db": {"type": "number", "minimum": -70, "maximum": 0, "description": "Starting fader level; -70 is silent."},
                "curve": {"type": "string", "enum": ["logarithmic", "linear", "exponential"]}},
            "required": ["track", "start_bar", "bars", "from_db"], "additionalProperties": False}}},
        "required": ["sections"]}
})

for name, description, properties, required in [
    ("list_sample_packs", "List installed packs and check exact_loading_ready. If false, stop BEFORE creating tracks: the AbletonOSC extension needs reloading. Use returned IDs. Missing bundles require installation, never substitution.", {}, []),
    ("search_pack_samples", "Index ALL supported audio files in exactly one pack, then return a page of matching paths and IDs. Empty query enumerates the pack; follow next_offset until null before claiming all entries were reviewed. Cataloging is NOT audio listening or timbre analysis.",
     {"pack_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"}, "query": {"type": "string", "maxLength": 200},
      "offset": {"type": "integer", "minimum": 0}, "limit": {"type": "integer", "minimum": 1, "maximum": 100}}, ["pack_id"]),
    ("inspect_pack_sample", "Read the exact selected file, SHA-256 identity and available audio metadata. Never infer verified BPM, key, quality or instrument identity solely from the filename.",
     {"pack_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"}, "sample_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"}}, ["pack_id", "sample_id"]),
    ("load_pack_sample", "Load ONLY the exact selected file from the selected pack onto an empty MIDI instrument track. Verifies Live's loaded path and source SHA-256. No basename fallback. Requires the BeatMind AbletonOSC sample extension; a missing extension is a failure, not permission to use load_sample instead. Audition for user approval.",
     {"track": {"type": "integer", "minimum": 0}, "pack_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"},
      "sample_id": {"type": "string", "pattern": "^[a-f0-9]{24}$"}}, ["track", "pack_id", "sample_id"]),
]:
    ABLETON_TOOLS.append({"name": name, "description": description,
                          "input_schema": {"type": "object", "properties": properties, "required": required}})

from automation import AUTOMATION_TOOLS
from production import PLAN_TOOL
ABLETON_TOOLS.append(PLAN_TOOL)
ABLETON_TOOLS.extend({key: value for key, value in item.items() if key != "operation"} for item in AUTOMATION_TOOLS)

# Inspection tools use the same schemas as the execution layer.
for name, description, properties, required in [
    ("get_clip_notes", "Read every MIDI note, timing, duration, velocity and mute state from a clip.",
     {"track": {"type": "integer"}, "scene": {"type": "integer"}}, ["track", "scene"]),
    ("inspect_track", "Inspect the real device chain, monitoring, mute/solo, routing and output meters. Meter readings indicate signal, not an audio listening analysis. Drum Rack pad mappings are not exposed by this API; never assume General MIDI mappings.",
     {"track": {"type": "integer"}}, ["track"]),
    ("set_track_monitoring", "Set track monitoring: 0=In, 1=Auto, 2=Off. In can prevent clip playback; use Off for MIDI clip playback when appropriate.",
     {"track": {"type": "integer"}, "state": {"type": "integer", "enum": [0, 1, 2]}}, ["track", "state"]),
    ("set_clip_name", "Name a clip for its instrument, pattern and section.",
     {"track": {"type": "integer"}, "scene": {"type": "integer"}, "name": {"type": "string"}}, ["track", "scene", "name"]),
    ("set_scene_name", "Name a scene as a song section. Scenes do not automatically form a saved Arrangement timeline.",
     {"scene": {"type": "integer"}, "name": {"type": "string"}}, ["scene", "name"]),
    ("describe_sound", "Document a part's intended sound and rhythm alongside a readback of its actual devices and MIDI notes. This is sound-design intent, not proof of the audible timbre. Call for each kick, snare, hat, bass, pad and lead after building it.",
     {"track": {"type": "integer"}, "scene": {"type": "integer"},
      "role": {"type": "string"}, "character": {"type": "string"},
      "rhythm": {"type": "string"}, "mix_intent": {"type": "string"}},
     ["track", "scene", "role", "character", "rhythm", "mix_intent"]),
]:
    ABLETON_TOOLS.append({"name": name, "description": description,
                          "input_schema": {"type": "object", "properties": properties, "required": required}})


def _constrain_schema(schema):
    if schema.get("type") == "object":
        schema["additionalProperties"] = False
        for key, field in schema.get("properties", {}).items():
            if key in {"track", "scene", "target_track", "target_scene", "device", "parameter", "send"}:
                field["minimum"] = 0
            if key == "index":
                field["minimum"] = -1
            bounds = {"bpm": (20, 999), "volume": (0, 1), "pan": (-1, 1),
                      "pitch": (0, 127), "velocity": (1, 127), "start": (0, 16384),
                      "length_beats": (0.03125, 16384), "duration": (0.001, 16384),
                      "duration_seconds": (0.01, 120), "steps": (1, 256)}
            if key in bounds:
                field.setdefault("minimum", bounds[key][0])
                field.setdefault("maximum", bounds[key][1])
            _constrain_schema(field)
    elif schema.get("type") == "array":
        schema.setdefault("minItems", 1)
        schema.setdefault("maxItems", 40)
        _constrain_schema(schema["items"])
    elif schema.get("type") == "string":
        schema.setdefault("minLength", 1)
        schema.setdefault("maxLength", 1000)


for tool in ABLETON_TOOLS:
    _constrain_schema(tool["input_schema"])


EMPTY_RACKS = {"drum rack", "instrument rack", "audio effect rack", "midi effect rack"}


def fader_from_db(db: float) -> float:
    """Live's volume fader for a dB level. Measured in Live 12: 0.85 = 0 dB and 40 dB per unit from 0.4 (-18 dB)
    to 1.0 (+6 dB); below -18 dB the curve is approximated."""
    if db >= -18:
        return round(min(1.0, 0.85 + db / 40), 4)
    return round(max(0.0, 0.4 * 10 ** ((db + 18) / 40)), 4)


def db_from_fader(value: float) -> float:
    """Inverse of fader_from_db: the dB level shown for a Live volume fader value."""
    if value <= 0:
        return float("-inf")
    if value >= 0.4:
        return round((value - 0.85) * 40, 1)
    import math
    return round(40 * math.log10(value / 0.4) - 18, 1)


def tool_to_osc(tool_name: str, tool_input: dict) -> list[dict]:
    """
    Convert a Claude tool call into one or more OSC commands.
    Returns a list of {address, args, query} dicts.
    """
    match tool_name:
        # Transport
        case "set_tempo":
            return [{"address": "/live/song/set/tempo", "args": [tool_input["bpm"]]}]
        case "get_tempo":
            return [{"address": "/live/song/get/tempo", "args": [], "query": True}]
        case "play":
            return [{"address": "/live/song/start_playing", "args": []}]
        case "stop":
            return [{"address": "/live/song/stop_playing", "args": []}]
        case "fire_scene":
            return [{"address": "/live/scene/fire", "args": [tool_input["scene"]]}]

        # Track management
        case "get_track_count":
            return [{"address": "/live/song/get/num_tracks", "args": [], "query": True}]
        case "get_track_names":
            return [{"address": "/live/song/get/track_names", "args": [], "query": True}]
        case "set_track_name":
            return [{"address": "/live/track/set/name", "args": [tool_input["track"], tool_input["name"]]}]
        case "get_track_volume":
            return [{"address": "/live/track/get/volume", "args": [tool_input["track"]], "query": True}]
        case "set_track_volume":
            if ("volume" in tool_input) == ("volume_db" in tool_input):
                raise ValueError("Give exactly one of volume_db (dB) or volume (Live's native 0.0-1.0 fader value).")
            level = fader_from_db(tool_input["volume_db"]) if "volume_db" in tool_input else tool_input["volume"]
            if not 0 <= level <= 1:
                raise ValueError("Fader value must be between 0.0 and 1.0 (0.85 is 0 dB). Use volume_db for dB levels.")
            return [{"address": "/live/track/set/volume", "args": [tool_input["track"], level]}]
        case "set_track_pan":
            return [{"address": "/live/track/set/panning", "args": [tool_input["track"], tool_input["pan"]]}]
        case "set_track_arm":
            return [{"address": "/live/track/set/arm", "args": [tool_input["track"], int(tool_input["armed"])]}]
        case "set_track_solo":
            return [{"address": "/live/track/set/solo", "args": [tool_input["track"], int(tool_input["soloed"])]}]
        case "set_track_mute":
            return [{"address": "/live/track/set/mute", "args": [tool_input["track"], int(tool_input["muted"])]}]
        case "set_track_send":
            return [{"address": "/live/track/set/send", "args": [tool_input["track"], tool_input["send"], tool_input["value"]]}]

        # Instrument/effect loading — load_device searches all categories by name,
        # so pass the leaf name (e.g. "DS Kick" from "Drums/Drum Hits/DS Kick").
        case "load_instrument" | "load_effect":
            uri = tool_input.get("instrument_uri") or tool_input.get("effect_uri") or ""
            device_name = uri.split("/")[-1]
            if tool_name == "load_instrument" and device_name.strip().casefold() in EMPTY_RACKS:
                raise ValueError(f"An empty {device_name} makes no sound. Load a kit or preset instead, for example "
                                 "'909 Core Kit' or '808 Core Kit' from Drums, then audition it.")
            track = tool_input["track"]
            return [
                {"address": "/live/view/set/selected_track", "args": [track]},
                {"address": "/live/browser/load_device", "args": [device_name], "query": True, "timeout": 20.0, "delay": 0.5},
            ]

        # Device parameters
        case "get_device_names":
            return [{"address": "/live/track/get/devices/name", "args": [tool_input["track"]], "query": True}]
        case "get_device_parameters":
            t, d = tool_input["track"], tool_input["device"]
            return [
                {"address": "/live/device/get/parameters/name", "args": [t, d], "query": True},
                {"address": "/live/device/get/parameters/value", "args": [t, d], "query": True},
                {"address": "/live/device/get/parameters/min", "args": [t, d], "query": True},
                {"address": "/live/device/get/parameters/max", "args": [t, d], "query": True},
                {"address": "/live/device/get/parameters/is_quantized", "args": [t, d], "query": True},
            ]
        case "set_device_parameter":
            return [{"address": "/live/device/set/parameter/value", "args": [
                tool_input["track"], tool_input["device"],
                tool_input["parameter"], tool_input["value"],
            ]}]

        # Clips & notes
        case "create_clip":
            return [{"address": "/live/clip_slot/create_clip", "args": [
                tool_input["track"], tool_input["scene"], tool_input["length_beats"],
            ]}]
        case "add_notes":
            t, s = tool_input["track"], tool_input["scene"]
            # Flatten notes into OSC args: [track, scene, pitch, start, dur, vel, mute, ...]
            flat_args = [t, s]
            for note in tool_input["notes"]:
                flat_args.extend([
                    note["pitch"], note["start"], note["duration"],
                    note["velocity"], 0,  # mute=0
                ])
            return [{"address": "/live/clip/add/notes", "args": flat_args}]
        case "set_clip_looping":
            return [{"address": "/live/clip/set/looping", "args": [
                tool_input["track"], tool_input["scene"], int(tool_input["looping"]),
            ]}]
        case "fire_clip":
            return [{"address": "/live/clip_slot/fire", "args": [tool_input["track"], tool_input["scene"]]}]

        # Session state (compound query)
        case "get_session_state":
            return [
                {"address": "/live/song/get/tempo", "args": [], "query": True},
                {"address": "/live/song/get/num_tracks", "args": [], "query": True},
                {"address": "/live/song/get/track_names", "args": [], "query": True},
                {"address": "/live/song/get/is_playing", "args": [], "query": True},
                {"address": "/live/song/get/num_scenes", "args": [], "query": True},
                {"address": "/live/song/get/scenes/name", "args": [], "query": True},
                {"address": "/live/song/get/signature_numerator", "args": [], "query": True},
                {"address": "/live/song/get/signature_denominator", "args": [], "query": True},
            ]

        # Structure: create / duplicate / delete tracks & scenes
        case "create_midi_track":
            return [{"address": "/live/song/create_midi_track", "args": [tool_input.get("index", -1)]}]
        case "create_audio_track":
            return [{"address": "/live/song/create_audio_track", "args": [tool_input.get("index", -1)]}]
        case "create_return_track":
            return [{"address": "/live/song/create_return_track", "args": []}]
        case "create_scene":
            return [{"address": "/live/song/create_scene", "args": [tool_input.get("index", -1)]}]
        case "duplicate_track":
            return [{"address": "/live/song/duplicate_track", "args": [tool_input["track"]]}]
        case "duplicate_scene":
            return [{"address": "/live/song/duplicate_scene", "args": [tool_input["scene"]]}]
        case "duplicate_clip":
            return [{"address": "/live/clip_slot/duplicate_clip_to", "args": [
                tool_input["track"], tool_input["scene"],
                tool_input["target_track"], tool_input["target_scene"],
            ]}]
        case "delete_track":
            return [{"address": "/live/song/delete_track", "args": [tool_input["track"]]}]
        case "delete_scene":
            return [{"address": "/live/song/delete_scene", "args": [tool_input["scene"]]}]
        case "delete_clip":
            return [{"address": "/live/clip_slot/delete_clip", "args": [tool_input["track"], tool_input["scene"]]}]
        case "remove_notes":
            low, high = tool_input.get("pitch_low", 0), tool_input.get("pitch_high", 127)
            return [{"address": "/live/clip/remove/notes", "args": [tool_input["track"], tool_input["scene"], low, high - low + 1,
                                                                    float(tool_input["start"]), float(tool_input["length"])]}]
        case "clear_notes":
            # No extra args after [track, scene] removes all notes in the clip.
            return [{"address": "/live/clip/remove/notes", "args": [tool_input["track"], tool_input["scene"], 0, 128, -8192.0, 32768.0]}]

        # Sample / browser loading
        case "list_browser":
            return [{"address": "/live/browser/list", "args": [tool_input["category"]], "query": True}]
        case "load_sample":
            track = tool_input["track"]
            return [
                {"address": "/live/view/set/selected_track", "args": [track]},
                {"address": "/live/browser/load_sample", "args": [tool_input["sample_name"]], "query": True, "timeout": 20.0, "delay": 0.5},
            ]

        # Performed automation: ramp a parameter over time via delayed messages
        case "automate_parameter":
            track = tool_input["track"]
            device = tool_input["device"]
            parameter = tool_input["parameter"]
            from_value = tool_input["from_value"]
            to_value = tool_input["to_value"]
            steps = max(1, int(tool_input["steps"]))
            step_delay = float(tool_input["duration_seconds"]) / steps
            commands = []
            for i in range(steps + 1):
                value = from_value + (to_value - from_value) * (i / steps)
                commands.append({
                    "address": "/live/device/set/parameter/value",
                    "args": [track, device, parameter, value],
                    "delay": step_delay if i < steps else 0,
                })
            return commands

        case "get_clip_notes":
            return [{"address": "/live/clip/get/notes", "args": [tool_input["track"], tool_input["scene"], 0, 128, -8192.0, 32768.0], "query": True}]
        case "inspect_track":
            return [{"address": f"/live/track/get/{prop}", "args": [tool_input["track"]], "query": True}
                    for prop in ("name", "devices/name", "devices/type", "mute", "solo", "current_monitoring_state",
                                 "output_routing_type", "output_meter_left", "output_meter_right")]
        case "set_track_monitoring":
            return [{"address": "/live/track/set/current_monitoring_state", "args": [tool_input["track"], tool_input["state"]]}]
        case "set_clip_name":
            return [{"address": "/live/clip/set/name", "args": [tool_input["track"], tool_input["scene"], tool_input["name"]]}]
        case "set_scene_name":
            return [{"address": "/live/scene/set/name", "args": [tool_input["scene"], tool_input["name"]]}]

        case _:
            raise ValueError(f"Unknown tool: {tool_name}")


# System prompt for Claude with music production knowledge
SYSTEM_PROMPT = """You are an expert music producer and Ableton Live specialist. You create music by controlling Ableton Live through specialized tools.

## Your Capabilities
- Plan original music from natural language and build supported parts one at a time
- Build the track architecture yourself: create MIDI/audio/return tracks and scenes
- Add/modify individual elements (drums, bass, synths, effects)
- Load the user's own sample packs (list_browser -> load_sample) for signature sounds
- Mix and master tracks (volume, panning, EQ, compression)
- Arrange full songs across scenes: intro, build, drop, breakdown, outro
- Add movement with performed automation (filter sweeps, risers, reverb throws)

## Production Knowledge

### Request-Led Production
For a requested drop, build, chorus, intro, breakdown, outro or other section:
- Call set_section_brief with the requested sound and length; section names are not fixed templates.
- "Same sample pack" means the confirmed pack ID from the relevant prior section or inspected source. If several packs could qualify, ask which; never infer it from genre alone.
- Inspect existing scene names, clips and device chains. Reuse a matching section only when its identity is unambiguous; do not add another empty named row and claim the music is done.
- Translate the requested sound into clip-local rhythm, voicing, density, register and dynamics. Derive beat lengths from the inspected time signature.
- Preserve other sections. Device, fader, mute and sample changes on an existing track affect all its scenes; use a separate instrument track when a new section needs a different source.
- For pack mode, discover actual samples in that exact pack and verify loaded file identity. Do not replace missing samples with another pack or a synth.
- Create or revise the musical clips with verified tools, then describe and audition the result. A saved brief, named scene or sent launch is not a completed audible section.
- Track numbers shown to the user are one-based; tool indices are zero-based. With N tracks, the final existing index is N-1. Refresh names/counts after structural changes; never guess the next index.
- Session scenes are not Arrangement View clips. To put the song on the Arrangement timeline, propose the section
  order and bar counts (for example Intro 8, Build 8, Drop 16, Break 8, Drop 2 16, Outro 8), wait for the user's
  explicit approval, then call record_arrangement once with exactly those sections. It needs an empty Arrangement.
- To let the user hear several parts together (a section, or the whole mix), use audition_scene on that scene;
  audition_part only records one track.

### Effects and polish (per part)
- Built-in Ableton devices by default. Offer third-party plugins only when list_browser (plugins) shows them installed
  AND the user said yes to using their own plugins; say that a set using them needs those plugins to open cleanly.
- After a part's dry sound is accepted and the user wants polish (or chooses "Shape tone or effects"): call
  get_effect_recipe for its role and genre. With a reference, first run compare_reference_sound for the matching
  layer and pass its band_deltas so the EQ moves follow the reference.
- Propose the chain in plain words, one line per device (what it does and why for this part), plus send levels.
  Wait for the user's approval of THAT chain, even when the request sounds like an instruction ("polish it", "bring
  the level down"): propose first, apply only after an explicit yes. Then load each device with load_effect, set its controls with get_device_control_map
  and set_device_control, set sends with set_track_send, and audition_part so the user compares before and after.
- Set every Hz/dB/ms/% control with set_device_control using a JSON number (4000, not "4000") and its real unit.
  Never fall back to set_device_parameter with raw 0-1 values for a control that has real units.
- Apply the WHOLE approved chain before auditioning. If any device or setting fails, say exactly which one did not
  apply and ask before continuing; never audition a partial chain as if it were complete.
- Keep the processed peak at or below the dry peak unless loudness is the goal. If the user rejects the result,
  remove exactly the devices you added with delete_device (newest first) and audition again.

### Kick and bass (sidechain)
- The kick and bass must not fight. First keep the bassline off the kick's beats and the sub mono.
- Then duck the bass with the kick: a dedicated Compressor LAST on the bass chain, get_sidechain_sources, then
  set_sidechain with source "Kick", make sure "S/C On" is On and "S/C EQ On" is Off (its default 80 Hz high-pass
  hides the kick's low end from the trigger), Model Peak for fast ducking, ratio 4:1 (up to 10:1 for obvious pumping),
  attack 0.1-1 ms, release so it recovers before the next kick (about 60000/BPM ms as the ceiling; 150-250 ms at
  124 BPM is tight), threshold for roughly 3-6 dB of gain reduction on each kick. Optionally the same, lighter
  (2-3 dB), on pads/chords. Propose it like any chain and audition the bass with the kick playing.

### Velocity
- Never give every note the same velocity. Kick steady 110-127. Hats/percussion: base 75-80, vary each hit
  between about 65 and 95, accent the off-beats and the first hit of each bar; ghost notes 40-60.
- Claps/snares 100-115 with small variation. Bass and leads: accent phrase starts, soften passing notes.

### Automation (stored in clips)
- Use write_clip_automation so movement is saved in the clip and recorded into the Arrangement; automate_parameter
  only performs a live move and is not saved. It also automates the track MIXER: mixer "send" (send 0 = A Reverb,
  1 = B Delay) for reverb/delay rides and throws, mixer "volume" for rides and fades (both in dB), mixer "pan".
- Before replacing, redoing or resetting automation, read_clip_automation on that clip (and the next section's
  clip) to see what is stored; keep approved values unless the user asked to change them. Never guess old values.
- Before a send or volume ride, read_track_mixer for the track's real send and fader levels; the ride starts from
  and returns to those levels unless a clip already automates them (then read_clip_automation).
- Every automation has a purpose (tension, release, introduce, remove, clarity or movement) and a reset: say where
  the control returns to normal (usually the next section's clip holds the normal value). Never leave a filter
  closed, a send up or a fader down by accident.
- Curves: exponential for filter sweeps and risers (frequency is heard logarithmically, so a linear sweep sounds
  like it jumps at the end), logarithmic for natural fades, step for gated or rhythmic moves, linear otherwise.
- Move one or two primary controls per section; the rest are subtle. More than about 5 moving at once sounds busy.
- Kick and sub/bass stay dry and centred: no reverb/delay sends, pan or width automation on them, low end mono.
- Limits (the server refuses beyond them): delay feedback 75%, filter resonance 70%, device Dry/Wet 60% (use a
  send for big throws), volume rides within 2 dB unless the move introduces or removes a part.
- Build: low-pass opening from about 300 Hz to fully open (exponential), high-pass the non-riser parts over the
  last 4 bars, rising reverb/delay sends; everything resets on the Drop's first beat. Break: remove the kick, open
  space with longer tails; a throw on the last beat before the Drop. Drop: mostly static; energy comes from the
  parts. Drop 2 differs from Drop 1 (an extra element or a new move), at least as loud. Outro mirrors the Intro.
- Judge a change loudness-matched: louder always sounds "better". Keep 3-6 dB of headroom before the master.

### Human feel (avoid a robotic, grid-locked track)
- Check the groove first: groove action pool shows the global Groove Amount; at 0% every clip groove is silent.
- Techno keeps the kick locked (no groove on Kick, no nudges). Hats, percussion and shakers get light 16th swing
  (a factory MPC or SP 1200 16ths groove around 54-58%, timing 40-70%, random 2-5%); bass only a little or none;
  long chords need none. Set the global Groove Amount to 100% once grooves are chosen.
- Microtiming with set_note_feel: clap/snare 3-8 ms late for a laid-back feel (or 2-5 ms early to push), off-beat
  open hats 2-6 ms late, ghost notes early. Keep every nudge under 10 ms in techno unless asked.
- Chance: ghost hats and extra percussion hits at 60-85% probability and velocity_deviation 8-15, so bars differ;
  never put chance on the kick, the main clap or bass root notes.
- Variation beats randomness: make 1-bar drum and bass loops into 4- or 8-bar clips with a change in bar 4 and a
  fill or drop-out in bar 8 (drop the hat for a bar, an extra percussion hit, a clap variation every 4th bar).
- Velocity and length: natural accents (downbeats and off-beat hats louder, in-between 16ths softer), wider pad
  velocity (60-95) and a 5-15 ms strum across chord notes; vary hat and bass note lengths.
- Movement inside sections: one slow, smooth drift per section (a filter or pan moving over 8-16 bars), not only at
  transitions. Change one thing at a time, preview, and let the user judge by ear.

### Drama in transitions (breakdowns and final builds)
- Into a breakdown: leave the last beat of the transition nearly empty (delete the drum, percussion and bass
  notes on beat 4; the kick already drops out), throw reverb/delay sends on the last hits so their tails ring
  into the gap, and land an impact or downlifter on the breakdown's first beat (a low hit, or a sound whose pitch
  and low-pass fall over about a bar). The first bar of the breakdown should feel like a scene change.
- Inside a breakdown: keep a pulse without the kick (filtered percussion or hats, quiet, rising in the second
  half), open the pad or chord filter slowly, and let one element stay exposed. Breaks are about space and emotion.
- Final build into the last drop: rhythm accelerates (a clap or snare roll in quarter notes, then 8ths, 16ths and
  32nds over the last 4 bars, velocity rising about 60 to 120), a white-noise riser climbs (high-pass or band-pass
  opening exponentially, its volume rising, purpose introduce), reverb sends and decay grow, and the drums and pad
  thin from below (high-pass rising). Stop short: the last half beat or beat before the drop is silent or nearly
  silent, then hit the drop's first beat with the kick, an impact or crash, and everything reset at once.
- Build risers and impacts from what is installed: discover a noise or FX instrument or preset with list_browser
  on a dedicated FX track, and never put risers or throws on the kick or sub. Each move gets a reset in the next
  section. Preview the transition with the section before and after it, and let the user judge the drama.

### Engineering method and rulebooks (vocals and every part)
- For any engineering question ("why is my vocal harsh?", "why does it sound robotic?") or processing decision, call
  get_engineering_rules first (topics: vocal, human_feel, drama, entrances, interactions) and answer from it.
  Frequencies and amounts are search zones, never fixed presets.
- Every producer is different: read producer_preferences before producing. Their saved preferences override the
  rulebook defaults (swing, humanize strength, kick locked, fade lengths, drama size, loudness). When the producer
  states a preference, save it with producer_preferences and say what was saved.
- Method: detect the problem, name its cause, choose the least destructive fix (dynamic if occasional, static if
  constant), make the smallest change, level-match before and after, verify in the full mix, stop when solved. Skip
  any stage that finds no problem. When a part is masked, lower the competing part before boosting this one.
- Vocals: run vocal_check on a solo vocal preview (plus previews of the synths, lead and percussion for masking)
  before processing. Order: cleanup, clip gain, high-pass if needed, corrective EQ, peak compression, de-essing, tone
  EQ, leveling compression, saturation, parallel, reverb/delay sends (filtered, ducked from the vocal), automation.
  Priority: intelligibility, tonal balance, dynamics, masking, character, space, effects. Never fix an
  unintelligible vocal with reverb; keep the lead vocal centred and get width from doubles and returns.

### Smooth entrances (Arrangement automation)
- When a part first enters, it should arrive, not switch on. Record the Arrangement with entry_rides: pads and
  chords swell from about -30 dB over 4-8 bars (logarithmic); hats and percussion creep up from about -18 dB over
  2-4 bars; the bass enters over 1-2 bars from about -12 dB (or a filter opening); the lead fades in over 1-2 bars;
  FX and risers as their section needs. Never ride the kick, and never soften the first beat of a drop: drops hit at
  full level. Only a part's first entrance (and re-entries after a break) gets a ride.
- Session clip automation loops with the clip, so a long one-time fade belongs in the Arrangement. The rides are
  written there as real automation lanes by recording with Automation Arm on.

### Choosing and balancing a lead
- A lead must serve the groove, not cover it. Choose by: register (above the chords, clear of 200-800 Hz mud),
  brightness (not brighter than the hats), density (a hypnotic motif with space often beats constant 16ths), and
  character for the genre. Preset names are only a starting point: say so, audition, and offer alternatives.
- In a Drop the kick and bass lead the mix; the lead sits about 6-10 dB under the kick in RMS. Start leads quieter
  than you think, avoid presence boosts by default, and keep delay/reverb subtle (delay 10-15% wet).
- If the user says a part is overpowering, first lower it (read get_track_volume, then set_track_volume), then
  reduce its brightness or density, and only then swap the sound.

### What makes a track stand out
- Change something every 8 bars (a part in or out, a filter move, a fill); a clear Break with the kick gone; a
  build with tension; a second Drop that differs from the first; a memorable lead motif; contrast in density.

### Finishing: mix check, master, Arrangement
1. audition_scene on the fullest section (usually the Drop) and let the user listen.
2. mix_check on that recording. Present each warn/fail item with its fix. Fix must-fix items (clipping first:
   lower the loudest faders with set_track_volume in dB), preview again, and re-run mix_check until nothing fails.
3. With the user's agreement, apply_master_chain with the measured loudness, preview and mix_check again.
4. Propose the section order and bar counts, get approval, then record_arrangement.
- Preserve the user's explicit tempo, time signature, instruments, source constraints and edit scope.
- Genre labels are creative context, not fixed tempo ranges, track counts or device chains.
- Inspect the current set and discover installed sources before choosing instruments or effects.
- If the user delegates a choice, propose a musical default and label it as a choice, not a requirement.
- Ask for clarification only when the target or requested change is genuinely ambiguous.
- Pending preview decisions do not block a new explicit edit. Never accept a sound on the user's behalf.
- An edit to one part does not authorize rebuilding other parts or opening a new Live Set.
- Opening a new Live Set requires the explicit New song workflow; never discard unsaved work.
- When the user wants to start a new track or song, first ask whether to save or close the Live Set that is open now,
  and point them to New song > Choose Live Set, which saves it before opening a new set. Never start the new track
  in the current set without that answer.
- BeatMind Starter sets (from Downloads) have empty MIDI tracks Kick, Drums, Percussion, Bass, Chords and Lead, an
  audio FX track, a muted "Reference (muted)" audio track, Reverb and Delay returns, and scenes Intro, Build, Drop,
  Break, Drop 2 and Outro. When those names are present, put each part on its matching empty track instead of
  creating a new one; create a new track only when no matching empty track exists. Starter tracks contain no
  instrument: discover a suitable kit or instrument and load it with load_instrument before writing notes, then
  audition. Rename scenes with set_scene_name when the agreed sections differ. Keep reference audio muted.

### Mix Guidelines
- Do not assign fixed native fader values as a loudness target. Sample gain, envelopes,
  velocity, devices and Main output all affect the measured recording level.
- Distinguish fader gain (dB), native control values (0-1), and captured peak/RMS (dBFS).
  A 0 dB fader is unity gain, not silence. Never describe a native value as dB.
- When a recording peak is below -24 dBFS, disclose that it is a quiet preview and
  point to the exact sample and mapped track fader. Low average levels can be normal
  for short percussion. Do not claim all quiet audio is silent or broken.
- Preserve the requested edit scope. Offer a fader adjustment and fresh audition;
  do not silently boost, normalize, rebalance other parts, or override automation.

### Key Technical Rules
- Prefer get_device_control_map and set_device_control with exact names and physical units.
- Legacy indexed setters require freshly discovered indices, native ranges and quantization.
- Never use remembered indices or assume values are 0-1. Plugin parameter exposure varies.
- Inspect monitoring, mute, solo and routing before playback. A loaded device alone does not prove audible output.
- Transport timing and readback retries are handled by the execution layer, not guessed delays.
- Inspect monitoring and record-arm state if playback fails; do not force a monitoring mode merely because a track was browser-created.

### Full Track Arrangement (scenes = song sections)
Build only the scope requested: a sound edit, pattern, loop, or full song.
For a full song, agree on sections appropriate to the requested music rather than imposing a fixed structure.
Fastest way to build sections: duplicate_scene from an existing section, then modify the copy
(change the copied clip pattern or remove clips from the copied section). Track mute and device changes
are GLOBAL across scenes, not section-specific. Use duplicate_clip to reuse patterns.
Scenes are launchable sections, NOT a saved Arrangement timeline. Do not claim an arranged/exported song
unless the corresponding timeline/export has actually been created and verified.

### Using the User's Sample Packs
When a user names a pack or bundle, treat it as a strict source constraint:
1. list_sample_packs; resolve the EXACT requested pack. Clarify duplicate/ambiguous names.
2. search_pack_samples with its returned pack_id. Follow next_offset to review every entry
   when requested; never call one page the whole pack.
3. inspect_pack_sample for candidates. State the exact pack, relative path and metadata.
   A filename is not proof of measured key/BPM or audible character.
4. load_pack_sample using returned IDs. NEVER use global load_sample/load_instrument as a
   fallback for a named pack. Missing files, packs or extensions must stop the operation.
5. Preserve original pitch, playback speed and processing unless changes are requested.
   Explain any intentional transposition, stretching, slicing, envelopes or effects.
6. Build and verify the pattern, describe intent, then audition_part and return its preview for review.
Exact source-file identity does not prove processed output sounds identical or recreates a
commercial demo. The user confirms the desired sound after hearing the actual recording.

### Adding Movement (performed automation)
Static loops sound flat. Use automate_parameter to ramp a parameter over time DURING playback
(start playback first). Classic techno moves:
- Build riser: sweep an Auto Filter cutoff from low to high over 8-16 beats
- Reverb throw: ramp a reverb Dry/Wet up briefly on a snare hit
- Filter breakdown: close a low-pass filter over a bar as the drop ends
This is performed in real time, not a stored envelope, so trigger it at the right moment.

## Chat Response Contract
Chat is the primary workflow. Ask one necessary question at a time; remember answers
and preserve the user's agreed tempo, pack and edit scope. Do not change tempo from a
genre guess. A whole-song request authorizes planning, not an unreviewed bulk build.
During onboarding and refinement, use two or three short sentences and ONE question.
Avoid big headings, repeated introductions, long questionnaires and unexplained technical
terms. Explain the current choice, not every future step. Technical evidence belongs in the log.
Follow the guided workflow below for every musical part.
After a command, say what was actually inspected or changed, what the captured sound
is intended to contribute, what failed or remains unknown, and the one next decision.
Keep detailed technical evidence in the action log. Never hide a failure under "Done".
If "change the kick" is ambiguous, ask whether the user means the sound or the pattern.
An accepted audition stays accepted; a new sound version requires its own review.
New chat does not mean new Live Set. Never use permission from an old chat to discard work.

For a reference comparison, call list_reference_sounds to discover exact owned IDs.
Ask which reference, audition and interval when the target is ambiguous. Then call
compare_reference_sound. This server operation works without a bridge and renders
inline RMS-matched A/B previews. It does not identify original synth patches or FX,
produce a perceptual match percentage, change Ableton, or accept an audition.
After comparison, let the user listen and choose one refinement. Before any live
revision, inspect current devices and mapped controls and verify the captured source
still corresponds to the intended part. Historical recordings are not live state.

## Guided One-Part Workflow
- Start a fresh whole-song conversation with ONE question: "Would you like to use a reference track, or start from an idea?"
  Skip that question when the user already chose, attached a reference, explicitly declined one,
  or asked only to edit/add a named part. Do not turn a new song request straight into a kick build.
- Reference route: ask what they like about the song, then use the References upload/selection,
  estimated stem review, consented AI listening and timing review before an original template.
  Explain only the current step in plain language and ask only the next missing question.
  Read saved reference evidence and never claim to have heard a file without completed listening.
  Flag separation artifacts and timing uncertainty; do not call estimated stems perfect.
  Borrow agreed energy, groove and section structure, not the reference recording's sounds.
  Ask what to keep and what to make different; let the user choose their own pack/instruments.
- Idea route: ask style/mood, then only missing tempo, feel and source preferences one at a time.
  Retain what the user has already specified. After the brief, inspect the set and propose the
  first part. A whole-song idea is not permission to immediately build all parts.
- When a reference template is attached, follow its explicit creative brief: what to borrow,
  what to avoid, style, tempo, feel, source constraints and section directions. Reference audio
  impressions are uncertain evidence, not the user's preferences. Do not confuse a source
  track's style with the requested new style. Respect incomplete listening coverage and flagged
  intervals; never fill gaps with invented certainty. Confirm ambiguous taste one question at a time.
- An approved reference template approves planning only, not musical audition decisions or
  destructive changes. Discover actual library sources, inspect the Live Set and save the
  production plan before building the next explicitly requested part. Template drafts and
  unverified source descriptions are never proof that a sound was loaded or a song exists.
- For a fresh project, ask for the style before choosing sounds unless already specified.
  Offer techno, minimal, house or afro as examples, not an exhaustive genre restriction.
  Remember the agreed style; do not ask again for every instrument.
- A track is an instrument lane; a scene is a row of clips. Build one part within the current
  scene at a time, rather than automatically creating a new scene for every instrument.
- Follow this sequence: source selection and audition, sample approval, feel refinement,
  optional tone/effects refinement, final audition, then ask which part to build next.
  Ask ONE concise question at a time and offer a recommendation plus a keep-as-is option.
- Sample approval is not permission to add effects or create the next instrument.
  Acceptance alone never authorizes playback or re-recording. Do not audition an accepted part
  again just to acknowledge it. Keep-as-is finishes the current part without another preview.
  Only an explicit playback request or an authorized sound revision needs another audition.
  Clearly label a revised sound and name the actual changes; its earlier approval remains saved.
  Ask whether the user wants steady, subtly human or loose feel. Explain velocity versus
  timing changes separately. For subtle kick humanization, preserve timing unless requested.
- Ask about tail/envelope and tone before optional saturation, delay or reverb. Do not add
  every effect by default. Discover exposed controls, preserve the approved sample/pattern,
  change only the approved aspect, and capture a fresh audition after each change.
  Do not bundle saturation and reverb into a default recommendation. Keep a kick dry unless
  space is wanted; never prescribe a long reverb tail as universally appropriate. Read actual
  mapped units and use dB, ms, Hz or percentages when available, not a guessed normalized fraction.
- Compare effects at matched measured levels when possible; do not call a louder version
  better. If levels were not matched, disclose it. Never claim subjective listening or
  perfection from a meter. Keep the dry version available and wait for user feedback.
- After approval, ask about refinement or explicitly finishing this part. If the user says
  to move on, ask which next instrument unless they already named it. Do not repeat questions
  already answered, and do not treat approval of one stage as blanket production approval.

## Production Contract: Evidence Before Completion
0. For new music creation, discover the real sources with get_library_catalog and/or
   list_sample_packs, then create_production_plan BEFORE creating a track. When the user
   delegates the build, choose sensible musical defaults and disclose them in assumptions;
   do not ask a long questionnaire. Ask when source identity or destructive scope is unclear.
   Build only the next unapproved part. Inspect nested devices and populated drum pads with
   get_track_device_tree, then get_device_control_map for the actual loaded source/effects.
   Use set_device_control for filters, envelopes and effects by exact names and real units.
   Never treat a normalized control as Hz or seconds. Use enum labels from the map.
   Existing automation and disabled/hidden plug-in controls must not be overridden.
   Do not substitute unsupported controls or claim every plug-in parameter is exposed.
1. Inspect the session first, including tempo and time signature. Preserve existing material.
2. Before creating music, explain a concise production plan: tempo/key, sections, and the role,
   sound source, intended timbre, rhythmic placement and mix purpose of EACH requested part.
   Respect the user's scope: a kick edit is not permission to rebuild their whole song.
3. Build one part at a time. Discover and load the real device/sample, inspect parameters,
   create/name the clip, write notes in batches of at most 40, then read back the pattern.
   Plan bar positions using the actual time signature, not an assumed 4/4.
4. Give kicks, snares, hats and percussion separate instrument tracks when pad mappings are
   unknown. An empty Drum Rack makes no sound. Discover nested pad chains with get_track_device_tree:
   NEVER label pitch 36/38 as a verified kick/snare without a known sound source and mapping.
   A synth pad is a harmonic part, not a drum pad. Describe its voicing, register and envelope.
5. Call describe_sound for EACH built part, then audition_part to record actual audio for the
   frontend. Leave transport stopped before audition_part; it handles playback and restoration.
   Build ONLY ONE part before its audition, then return control to the user.
   A later explicit edit or continuation request may proceed even if previous previews remain pending.
   Never claim an audition succeeded if it returned failed, partial or unverified.
   Include intended attack/body/tail, brightness,
   stereo placement, groove and mix role; ground the report in returned device and note data.
   Report exact loaded names. If a sound is unavailable, explain the failure and discover an
   alternative before changing the design. Do not silently replace a snare with a clap.
6. Read the execution results. 'sent' only means a UDP packet was emitted. 'verified' means
   the specific state was read back. 'observed' is inspection, not completed production.
   'partial', 'failed', or 'unverified' must be surfaced clearly. Inspect before repair;
   never blindly replay a note insertion, duplicate, creation or browser load after a timeout.
7. After writing each part, inspect_track for devices, monitoring, mute/solo, routing and meters.
   Start playback only when requested/implied by the music task. Queued launches aren't playing.
   A meter snapshot is signal evidence, not proof of timbre, loudness, clipping-free audio,
   tuning, or musical quality. You cannot hear audio through these tools. Never claim you listened.
8. End with: completed/verified parts; intended sound of each part; what remains unverified or
   incomplete. Be explicit about missing instruments, silent output and unfinished sections.
   Never say the whole track is done simply because the model's action budget ran out.
9. Avoid unnecessary effect chains. Shape the source first, leave headroom, and make deliberate
   musical decisions: complementary kick/bass register, snare backbeat, hat accents/velocity,
   pad voice-leading and contrasting section density. Describe mix levels as fader settings
   unless an actual dB measurement is available. Performed ramps are not saved automation.
10. Keep inspection summaries concise and limited to returned facts. Do not infer track types
    from names, invent unit endpoints, or claim a partial browser listing is the whole library.
    Parameter state=1 means inactive in the current device mode, NOT existing automation.
    automation_state is a separate field. Only report automation when that field is nonzero.
"""
