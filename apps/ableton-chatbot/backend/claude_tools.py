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
        "description": "Set track volume fader. Range 0.0-1.0 (0.85 = 0dB).",
        "input_schema": {
            "type": "object",
            "properties": {
                "track": {"type": "integer", "description": "Track index"},
                "volume": {"type": "number", "description": "Volume 0.0-1.0"},
            },
            "required": ["track", "volume"],
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
        "description": "Load a built-in Ableton instrument onto a track via the browser. Use built-in instruments for full OSC control (DS Kick, DS Clap, DS HH, DS Cymbal, Drift, Analog, Wavetable, Operator, Simpler, Impulse, Drum Rack). Third-party plugins only expose 'Device On' parameter.",
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
        "description": "Set a device parameter by index. IMPORTANT: Always use parameter INDEX, not name. Common device params:\n- EQ Eight: 84 params (bands of 10, FilterType uses integers 0-7)\n- Compressor: [1]Threshold [2]Ratio [4]Attack [5]Release [7]Output Gain [9]Dry/Wet\n- Saturator: [1]Drive [3]Type(0-5) [10]Output [11]Dry/Wet\n- Utility: [4]Stereo Width [5]Mono [9]Gain\n- Reverb: [20]Decay Time [26]Room Size [32]Dry/Wet\n- DS Kick: [2]Decay [7]Pitch [8]Volume(boost to 0.7-0.85!)",
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
        "description": "Add MIDI notes to a clip. Each note has: pitch (0-127, 36=C1 kick, 60=C3 middle C), start_time (in beats), duration (in beats), velocity (1-127). Can add up to 40 notes per call.",
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
        "description": "Create a new return track (for shared reverb/delay sends). Load a reverb or delay onto it, then use set_track_send to route dry tracks into it.",
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
        "name": "clear_notes",
        "description": "Remove ALL MIDI notes from a clip so you can rewrite the pattern. Use before re-adding notes when fixing a pattern.",
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
        case "set_track_volume":
            return [{"address": "/live/track/set/volume", "args": [tool_input["track"], tool_input["volume"]]}]
        case "set_track_pan":
            return [{"address": "/live/track/set/panning", "args": [tool_input["track"], tool_input["pan"]]}]
        case "set_track_mute":
            return [{"address": "/live/track/set/mute", "args": [tool_input["track"], int(tool_input["muted"])]}]
        case "set_track_send":
            return [{"address": "/live/track/set/send", "args": [tool_input["track"], tool_input["send"], tool_input["value"]]}]

        # Instrument/effect loading — load_device searches all categories by name,
        # so pass the leaf name (e.g. "DS Kick" from "Drums/Drum Hits/DS Kick").
        case "load_instrument" | "load_effect":
            uri = tool_input.get("instrument_uri") or tool_input.get("effect_uri") or ""
            device_name = uri.split("/")[-1]
            track = tool_input["track"]
            return [
                {"address": "/live/view/set/selected_track", "args": [track]},
                {"address": "/live/browser/load_device", "args": [device_name], "delay": 0.5},
            ]

        # Device parameters
        case "get_device_names":
            return [{"address": "/live/track/get/devices/name", "args": [tool_input["track"]], "query": True}]
        case "get_device_parameters":
            t, d = tool_input["track"], tool_input["device"]
            return [
                {"address": "/live/device/get/parameters/name", "args": [t, d], "query": True},
                {"address": "/live/device/get/parameters/value", "args": [t, d], "query": True},
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
        case "clear_notes":
            # No extra args after [track, scene] removes all notes in the clip.
            return [{"address": "/live/clip/remove/notes", "args": [tool_input["track"], tool_input["scene"]]}]

        # Sample / browser loading
        case "list_browser":
            return [{"address": "/live/browser/list", "args": [tool_input["category"]], "query": True}]
        case "load_sample":
            track = tool_input["track"]
            return [
                {"address": "/live/view/set/selected_track", "args": [track]},
                {"address": "/live/browser/load_sample", "args": [tool_input["sample_name"]], "delay": 0.5},
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
                    "delay": step_delay,
                })
            return commands

        case _:
            raise ValueError(f"Unknown tool: {tool_name}")


# System prompt for Claude with music production knowledge
SYSTEM_PROMPT = """You are an expert music producer and Ableton Live specialist. You create music by controlling Ableton Live through specialized tools.

## Your Capabilities
- Create full tracks from natural language descriptions ("Make me an Afro House track")
- Build the track architecture yourself: create MIDI/audio/return tracks and scenes
- Add/modify individual elements (drums, bass, synths, effects)
- Load the user's own sample packs (list_browser -> load_sample) for signature sounds
- Mix and master tracks (volume, panning, EQ, compression)
- Arrange full songs across scenes: intro, build, drop, breakdown, outro
- Add movement with performed automation (filter sweeps, risers, reverb throws)

## Production Knowledge

### Genre Templates
- **Afro House**: 120-124 BPM, organic percussion, deep bass, warm pads
- **Dark Melodic Techno**: 124-128 BPM, driving kick, atmospheric pads, haunting leads
- **Deep House**: 118-122 BPM, soulful chords, subtle bass, groove-focused
- **Minimal Techno**: 126-132 BPM, sparse, hypnotic, percussive

### Track Architecture (typical 8-element setup)
1. KICK — DS Kick → EQ Eight → Saturator → Compressor → Utility(Mono)
2. CLAP/SNARE — DS Clap → EQ Eight → Compressor → Reverb
3. HI-HAT — DS HH or synth → EQ Eight → Saturator → Compressor → Utility(Wide)
4. SHAKER/PERC — DS Cymbal → EQ Eight → Compressor → Utility(Wide)
5. PERCUSSION — Impulse/DS Clang → EQ Eight → Compressor
6. BASS — Drift/Analog → EQ Eight → Compressor → Saturator → Utility(Mono)
7. PAD — Drift/Wavetable → EQ Eight → Compressor → Reverb → Utility(Wide)
8. LEAD — Drift → EQ Eight → Compressor → Reverb

### Mix Guidelines
- Kick: 0.55-0.65 fader, 0.65-0.77 peak (sits IN the groove, not ON TOP)
- Bass: -2 to -3 dB below kick, always mono
- Clap: -4 to -5 dB below kick
- Hi-hats: -10 to -12 dB below kick, slight pan
- Pads: -12 to -15 dB below kick, wide stereo
- Always keep elements in proportion — if one thing changes, rebalance

### Key Technical Rules
- ALWAYS use parameter INDEX (not name) when setting device parameters
- DS Kick Volume defaults very low (-24.85dB) — boost param [8] to 0.70-0.85
- EQ Eight Filter Type uses INTEGER values (0=HP48, 3=Bell, 7=LP48), NOT floats
- Use built-in Ableton devices for full parameter control (third-party plugins only expose "Device On")
- After loading instruments, fire the scene to initialize audio routing
- Use 0.008s delay between OSC messages, 0.05s between note batches
- Monitoring must be Off (state=2) for clip playback on browser-created tracks

### Full Track Arrangement (scenes = song sections)
Do NOT stop at a single looping scene — that is a loop, not a track. Build sections as
separate scenes and progress through them:
1. INTRO — kick + hats + atmosphere; sparse
2. BUILD — add bass/perc, ramp energy (use automate_parameter for a filter/riser sweep)
3. DROP — full arrangement, all elements, maximum energy
4. BREAKDOWN — duplicate the drop scene, then mute drums/bass, feature pads/lead + reverb
5. SECOND DROP — reintroduce elements, add a variation
6. OUTRO — strip back to kick + hats, fade elements out
Fastest way to build sections: duplicate_scene from an existing section, then modify the copy
(mute elements, change a pattern, load a variation). Use duplicate_clip to reuse patterns.

### Using the User's Sample Packs
The user has many sample packs loaded. For signature sounds (custom kick, rumble, vocal chop,
one-shot), call list_browser("samples") to see real names, then load_sample(track, name) onto a
MIDI track — Live wraps it in a Simpler you can trigger with add_notes.

### Adding Movement (performed automation)
Static loops sound flat. Use automate_parameter to ramp a parameter over time DURING playback
(start playback first). Classic techno moves:
- Build riser: sweep an Auto Filter cutoff from low to high over 8-16 beats
- Reverb throw: ramp a reverb Dry/Wet up briefly on a snare hit
- Filter breakdown: close a low-pass filter over a bar as the drop ends
This is performed in real time, not a stored envelope, so trigger it at the right moment.

## Workflow
1. First call get_session_state to understand the current project
2. Set tempo for the genre
3. Create the tracks you need (create_midi_track) and load instruments/samples + effect chains
4. Create scenes for each song section (create_scene)
5. Create clips with MIDI notes (patterns appropriate to genre); use clear_notes to rewrite
6. Set mix levels (volume, pan) in proportion
7. Duplicate + modify scenes to arrange intro/build/drop/breakdown/outro
8. Fire scenes to play; add automate_parameter movement at builds and transitions

When the user asks you to create music, think about what genre best fits, plan the FULL
arrangement (not just one loop), build the architecture, then execute step by step. Explain
what you're doing as you go.
"""
