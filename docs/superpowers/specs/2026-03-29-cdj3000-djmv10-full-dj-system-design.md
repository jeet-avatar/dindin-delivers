# CDJ-3000 x2 + DJM-V10 — Full DJ System

## Goal

Build a fully functional dual-deck DJ system in MixMind that replicates every control on two Pioneer CDJ-3000 players and a DJM-V10 mixer. Every button must do exactly what it does on the real hardware.

## Architecture

### Component Structure
```
App.tsx
├── TrackTable (library browser — loads tracks to decks)
└── DJSystem (new top-level component)
    ├── DJDeck (CDJ-3000, deck="A")
    │   ├── CDJScreen (waveform display — existing DJWaveformView logic)
    │   ├── PerformancePads (8 pads, 8 modes)
    │   ├── NeedleSearch (touch strip)
    │   ├── Transport (CUE, PLAY/PAUSE)
    │   ├── JogWheel (virtual jog, vinyl/CDJ mode)
    │   ├── LoopControls (IN/OUT/RELOOP, auto-loop, halve/double)
    │   ├── BeatJump (left/right arrows + value selector)
    │   ├── BeatGrid (nudge left/right + TAP)
    │   ├── MemoryCue (call prev/next, save, delete)
    │   ├── SyncControls (SYNC, MASTER, QUANTIZE, SLIP)
    │   └── PitchFader (tempo slider + MASTER TEMPO + KEY SYNC + RANGE)
    ├── DJMixer (DJM-V10)
    │   ├── BeatFX (14 effects + level/time/beat/tap/x-pad)
    │   ├── SendFX (4 internal + 2 external)
    │   ├── ColorFX (Space/Dub Echo/Crush/Sweep/Gate)
    │   ├── ChannelStrip x2 (trim/comp/4-band EQ/send/color/filter/fader/cue)
    │   ├── Crossfader
    │   ├── MasterSection (3-band isolator + level + booth)
    │   └── HeadphoneSection (dual CUE/MIX)
    └── DJDeck (CDJ-3000, deck="B")
```

### Audio Engine (Web Audio API)
```
Per Deck:
  Audio Element → MediaElementSource
    → GainNode (trim)
    → BiquadFilter (hi) → BiquadFilter (hi-mid) → BiquadFilter (lo-mid) → BiquadFilter (lo)
    → GainNode (compressor sim)
    → BiquadFilter (channel filter — LP/HP sweep)
    → GainNode (channel fader)
    → channelSendGain → sendFxBus
    → crossfaderPanner
    → masterGain

Master Bus:
  crossfaderPanner (both decks) → masterEQ (3-band isolator) → masterGain → destination

Beat FX Bus:
  beatFxInput → effect chain → beatFxWetGain → merge back to master

Send FX Bus:
  sendFxInput → effect chain → sendFxReturn → masterGain

Headphone Bus:
  cueMixGain (blend cue vs master) → headphone destination (if available)
```

### State Management
```typescript
interface DeckState {
  track: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;

  // Pitch
  pitchPercent: number;       // -100 to +100
  pitchRange: 6 | 10 | 16 | 100;  // WIDE = 100
  masterTempo: boolean;       // key lock
  keySync: boolean;

  // Hot Cues
  hotCues: (HotCue | null)[];  // 8 slots, A-H
  padMode: 'hotcue' | 'beatloop' | 'beatjump' | 'sampler' | 'keyboard' | 'keyshift' | 'padfx1' | 'padfx2';

  // Loop
  loopActive: boolean;
  loopInMs: number | null;
  loopOutMs: number | null;
  autoLoopBeats: number;      // 0.5, 1, 2, 4, 8, 16, 32

  // Beat Jump
  beatJumpValue: number;      // 1/16, 1/4, 1, 4, 16, 64

  // Beat Grid
  gridOffsetMs: number;       // nudge offset applied to beat grid

  // Sync
  syncEnabled: boolean;
  isMaster: boolean;
  quantize: boolean;
  slip: boolean;

  // Memory Cues
  memoryCues: MemoryCue[];

  // Jog
  jogMode: 'vinyl' | 'cdj';
}

interface MixerState {
  channels: {
    trim: number;        // 0-2 (1 = unity)
    comp: number;        // 0-1
    eqHi: number;        // -1 to 1 (0 = flat, -1 = kill)
    eqHiMid: number;
    eqLoMid: number;
    eqLow: number;
    send: number;        // 0-1
    colorFxAmount: number; // -1 to 1 (0 = off)
    filter: number;      // -1 to 1 (0 = off, -1 = LP, +1 = HP)
    fader: number;       // 0-1
    cueA: boolean;
    cueB: boolean;
    xfaderAssign: 'A' | 'thru' | 'B';
  }[];

  // Beat FX
  beatFx: {
    type: string;        // 14 types
    level: number;       // 0-1
    time: number;        // manual time
    beatFraction: string; // '1/4', '1/2', '1', '2', etc.
    active: boolean;
    channelAssign: number; // which channel
  };

  // Send FX
  sendFx: {
    type: string;
    time: number;
    tone: number;
    size: number;
    mix: number;
    active: boolean;
  };

  // Color FX
  colorFxType: string;   // 'space' | 'dubecho' | 'crush' | 'sweep' | 'gate'
  filterResonance: number;

  // Master
  masterLevel: number;
  masterIsoHi: number;
  masterIsoMid: number;
  masterIsoLow: number;
  boothLevel: number;

  // Crossfader
  crossfader: number;    // -1 (A) to 1 (B)

  // Headphone
  headphoneCueA: number;
  headphoneMixA: number;
  headphoneCueB: number;
  headphoneMixB: number;
}
```

## CDJ-3000 Controls — Exact Behavior

### Transport
| Control | Action |
|---------|--------|
| PLAY/PAUSE | Toggle playback. Green LED when playing. |
| CUE | While paused: set cue point at current position. While playing: return to cue point and pause. Hold: preview from cue (release returns to cue). |

### 8 Performance Pads (Mode-Dependent)
| Mode | Pad Press | Shift+Press |
|------|-----------|-------------|
| HOT CUE | If empty: set cue at current pos. If set: jump to cue. | Delete cue |
| BEAT LOOP | Trigger auto beat loop (1/16, 1/8, 1/4, 1/2, 1, 2, 4, 8) | — |
| BEAT JUMP | Jump forward by value (top 4) or backward (bottom 4) | — |
| SAMPLER | Trigger sample | — |
| KEYBOARD | Play hot cue at different pitches | — |
| KEY SHIFT | Shift key up/down by semitones | — |
| PAD FX 1/2 | Trigger mapped effect | — |

### Loop Section
| Control | Action |
|---------|--------|
| LOOP IN | Set loop-in point. During loop: adjust in point. |
| LOOP OUT | Set loop-out point (activates loop). During loop: adjust out point. |
| RELOOP/EXIT | Exit active loop, or re-enter last loop. |
| Auto-loop (1/2, 1, 2, 4, 8, 16, 32) | Instant loop of N beats from current position. |
| ÷2 | Halve active loop length. |
| ×2 | Double active loop length. |

### Beat Jump
| Control | Action |
|---------|--------|
| ◀ | Jump backward by selected beat value. |
| ▶ | Jump forward by selected beat value. |
| Value selector | 1/16, 1/4, 1, 4, 16, 64 beats. |

### Beat Grid
| Control | Action |
|---------|--------|
| ◀ GRID | Nudge entire grid earlier by 1ms. |
| GRID ▶ | Nudge entire grid later by 1ms. |
| TAP | Tap tempo — recalculate BPM from tap intervals. |

### Memory Cue
| Control | Action |
|---------|--------|
| ◀ CALL | Jump to previous memory cue. |
| CALL ▶ | Jump to next memory cue. |
| MEMORY | Save current position as memory cue. |
| DELETE | Delete current memory cue. |

### Pitch Fader
| Control | Action |
|---------|--------|
| Slider | Adjust playbackRate. Center = original BPM. |
| RANGE | Cycle ±6%, ±10%, ±16%, WIDE (±100%). |
| MASTER TEMPO | Key lock — change speed without changing pitch. |
| KEY SYNC | Match key to other deck. |

### Sync
| Control | Action |
|---------|--------|
| SYNC | Match BPM + phase to master deck. |
| MASTER | Set this deck as sync master. |
| QUANTIZE | Snap all triggers to beat grid. |
| SLIP | Silent playback continues underneath scratches/loops. |

### Jog Wheel
| Mode | Touch Top | Outer Ring |
|------|-----------|------------|
| VINYL | Stop/scratch (affects playback position) | Pitch bend |
| CDJ | Pitch bend | Pitch bend |

### Needle Search
- Click anywhere on strip = jump to that position in track (% of duration).

## DJM-V10 Controls — Exact Behavior

### Channel Strip (per channel)
| Control | Web Audio Implementation |
|---------|------------------------|
| TRIM | GainNode (0 to 2, unity = 1) |
| COMP | DynamicsCompressorNode threshold/ratio |
| HI EQ | BiquadFilter 'highshelf' at 5kHz |
| HI-MID EQ | BiquadFilter 'peaking' at 2.5kHz |
| LO-MID EQ | BiquadFilter 'peaking' at 500Hz |
| LOW EQ | BiquadFilter 'lowshelf' at 100Hz |
| SEND | GainNode routing to send FX bus |
| COLOR FX | Varies by selected type |
| FILTER | BiquadFilter 'lowpass'/'highpass', frequency mapped from knob |
| Channel Fader | GainNode (0 to 1) |
| CUE A/B | Route to headphone bus A or B |

### 14 Beat FX
| Effect | Web Audio Implementation |
|--------|------------------------|
| DELAY | DelayNode + feedback GainNode |
| ECHO | DelayNode + feedback + decay filter |
| PING PONG | StereoPannerNode alternating L/R delays |
| SPIRAL | ConvolverNode with long IR + feedback |
| HELIX | Looping buffer capture at beat fraction |
| REVERB | ConvolverNode with room IR |
| SHIMMER | ConvolverNode + pitch-shifted reverb tail |
| FLANGER | Short DelayNode with LFO modulation |
| PHASER | Cascaded AllpassFilters with LFO |
| FILTER | BiquadFilter with LFO on frequency |
| TRANS | GainNode with rhythmic on/off pattern |
| ROLL | LoopBuffer capturing and replaying beat fraction |
| PITCH | Playback rate change on captured buffer |
| V.BRAKE | Gradually decrease playbackRate to 0 |

### 4 Send FX
| Effect | Implementation |
|--------|---------------|
| SHORT DELAY | DelayNode ~100ms |
| LONG DELAY | DelayNode ~500ms + feedback |
| DUB ECHO | DelayNode + BiquadFilter feedback loop |
| REVERB | ConvolverNode |

### Sound Color FX (per channel)
| Effect | Implementation |
|--------|---------------|
| SPACE | Short reverb/echo |
| DUB ECHO | Rhythmic delay with filter |
| CRUSH | Bit reduction via WaveShaperNode |
| SWEEP | Filter sweep (LP→HP) |
| GATE | Rhythmic gate/chop |

### Crossfader
- Position -1 (full A) to +1 (full B), 0 = center (both audible)
- Curve: adjustable (smooth blend to sharp cut)
- Channels assigned via A/THRU/B switch

### Master Section
- 3-band master isolator (full kill to +6dB)
- Master level
- Booth level (independent output if available)

## Backend APIs Needed

### Hot Cue Write-Back
```
PUT /api/tracks/{content_id}/cues
Body: { hot_cues: HotCueEntry[], memory_cues: MemoryCueEntry[] }
→ Writes to Rekordbox DjmdCue table
```

### Beat Grid Write-Back
```
PUT /api/tracks/{content_id}/grid
Body: { offset_ms: number }
→ Adjusts grid offset in Rekordbox ANLZ data
```

### USB Export
```
POST /api/export/usb
Body: { track_ids: string[], target_path: string }
→ Writes tracks + ANLZ + cues to Pioneer USB format
```

## Implementation Phases

### Phase 1: Self-Contained Deck (Audio + Transport + Pitch)
- DJDeck component with own Audio element
- PLAY/PAUSE, CUE buttons functional
- Pitch fader with playbackRate
- Master Tempo (preservesPitch)
- Remove MiniPlayer dependency

### Phase 2: Hot Cues + Pads
- 8 hot cue pads (set, trigger, delete)
- Colors from Rekordbox palette
- Pad mode selector (start with HOT CUE mode)
- Memory cue save/recall/delete

### Phase 3: Loop + Beat Jump + Grid
- Loop IN/OUT/RELOOP
- Auto-loop (beat-quantized)
- Loop halve/double
- Beat jump left/right
- Beat grid nudge

### Phase 4: Sync + Quantize + Slip
- SYNC (match BPM to other deck)
- MASTER deck designation
- QUANTIZE (snap triggers to grid)
- SLIP mode

### Phase 5: DJM-V10 Mixer Core
- Web Audio routing (per-channel EQ, filter, fader)
- Crossfader
- Master section with isolator
- VU meters

### Phase 6: DJM-V10 Effects
- 14 Beat FX implementations
- 4 Send FX
- Sound Color FX
- X-PAD

### Phase 7: Jog Wheel
- Virtual jog (mouse drag)
- Vinyl mode (scratch) vs CDJ mode (pitch bend)
- Visual rotation

### Phase 8: Cue Write-Back + USB Export
- PUT API for cues → Rekordbox DB
- PUT API for grid offset
- POST API for USB export (Pioneer format)

## File Structure
```
apps/mixmind/frontend/src/
  components/
    dj/
      DJSystem.tsx          — top-level layout (2 decks + mixer)
      DJDeck.tsx            — single CDJ-3000 unit
      CDJScreen.tsx         — waveform display (refactored from DJWaveformView)
      PerformancePads.tsx   — 8 pads + mode selector
      Transport.tsx         — CUE + PLAY/PAUSE
      JogWheel.tsx          — virtual jog wheel
      LoopControls.tsx      — loop section
      BeatJump.tsx          — beat jump section
      BeatGrid.tsx          — grid adjust + TAP
      MemoryCue.tsx         — memory cue section
      SyncControls.tsx      — SYNC/MASTER/QUANT/SLIP
      PitchFader.tsx        — tempo slider + controls
      NeedleSearch.tsx      — touch strip
      DJMixer.tsx           — DJM-V10 mixer
      ChannelStrip.tsx      — single channel (EQ/filter/fader)
      BeatFX.tsx            — 14 beat effects
      SendFX.tsx            — send/return effects
      CrossFader.tsx        — crossfader
      MasterSection.tsx     — master isolator + level
    hooks/
      useAudioEngine.ts     — Web Audio graph per deck
      useMixerEngine.ts     — mixer audio routing
      useBeatSync.ts        — BPM matching between decks
      useLoopEngine.ts      — loop in/out with audio buffer
```

## Anti-Hallucination
| Fact | Source |
|------|--------|
| Audio stream URL | `/api/audio/stream?path={file_path}` — audio_routes.py |
| Hot cue data | `DjmdCue` table, Kind 6=hot, 5=loop, 1=memory — anlz_parser.py |
| Beat grid field | `beat` (1-4), not `beat_number` — anlz_parser.py |
| ANLZ endpoint | `GET /api/tracks/{content_id}/anlz` — library.py |
| playbackRate | HTMLAudioElement.playbackRate — Web API standard |
| preservesPitch | HTMLAudioElement.preservesPitch — master tempo |
