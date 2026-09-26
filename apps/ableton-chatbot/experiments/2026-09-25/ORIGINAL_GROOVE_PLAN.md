# Original Groove

Reference: Gutenn - Leap of Faith (Wo-Core Remix), the previously selected
122 BPM reference. The reference remains a separate saved set. Its extracted
stems are not sources for this composition.

## Method

Current version: Original Groove - Full Arrangement 02.als. This contains the
full original Arrangement, not only Session clips. A 4:19.672 review WAV and
320 kbps MP3 are in Arrangement 02. Earlier sections below describe historical
checkpoints; their pending-Arrangement notes no longer describe this version.
Final musical approval and release mastering remain separate from these checks.

Build and review one musical part at a time. Audition each part alone and with
the existing groove. After the sound and pattern are approved, refine its tone,
dynamics and appropriate effects; recapture changed sounds. User audibility and
musical approval are distinct from successful writes or measured signal.

## Current Parts

- Bass: original eight-bar Operator MIDI phrase. Speaker audibility confirmed
  by the user after adding harmonics. Retained as the working bass when the user
  requested continuation. No reference audio or transcribed bass line used.
- Kick: DS Kick synthesis, eight bars of quarter-note hits at 122 BPM, with
  velocities 104/99/102/98 repeating. Decay 28%, Env 42%, overdrive 8.01%,
  Overtone 12%, Click On. Awaiting user sound review. No external delay or reverb.
- Closed hat: DS HH synthesis on track 3, eight bars with 42 notes. Stronger
  offbeats, quieter pickups and selected hits delayed by 7.87 ms. Pink noise,
  Decay 8.99%, Pitch 45%, Tone 75 native. Dry; user said it sounds good and
  requested the next part.
- Clap: DS Clap synthesis on the formerly empty fourth track. Eight bars,
  16 hits on beats two/four with a 5.9 ms offset and small velocity differences.
  Decay 24%, Sloppy 12 native, Spread 45%, Tail 35 native, Tone 40%.
  Instrument output reduced from -6 to -14 dB after the initial solo check.
  No added reverb/delay; awaiting user sound review.
- Plucked keys: new fifth track, Operator + Echo. Original eight-bar phrase
  with 50 notes and changing C-minor-compatible voicings, not transcribed from
  the reference. Saw 4, 1.80 kHz low-pass, 6 ms attack, 420 ms decay, -40 dB
  sustain, 260 ms release. Dotted-eighth ping-pong echo, 24% feedback, 18% wet,
  echo filtering 250 Hz-3.50 kHz. Awaiting user sound review.

The fifth part was informed by model listening to the reference Other stem and
full mix at 01:50-02:06. Descriptions of plucked foreground and sustained
background layers are interpretations, not recovered presets or a transcription.
- Atmosphere: new sixth track, Drift + Reverb, with 12 sustained notes across
  four original supporting voicings. 180 Hz high-pass / 1.40 kHz low-pass,
  420 ms attack, 65% sustain, 1.80 s release, 35% spread. Reverb: 25 ms
  predelay, 3.20 s decay, 24% wet. Intended as a background layer under the
  plucked keys; awaiting user review.

The user requested the sixth part while the fifth part's combined verification
was being completed. Both parts require subjective review; continuation is not
proof of an exact reference match. Arrangement development remains pending.

The bass Saturator experiment remains active (Soft Sine, Drive 4 dB, Dry/Wet
35%, Color Off). The user requested the next part without explicitly choosing
the dry or saturated A/B version; do not label the effect approved.

## Proposed Sequence

### Full Arrangement and Timing Correction

- Preserved the eight-part Session version and Before Arrangement checkpoint.
  Created 92 non-overlapping Arrangement clips across eight tracks: 128 bars
  of music plus four bars for the effects tail, at 122 BPM (259.672 seconds).
- Sections: Intro 0:00, Groove 0:31.475, Lift 1:02.951, Build I 1:18.689,
  Main I 1:34.426, Breakdown 2:05.902, Build II 2:37.377, Main II 2:53.115,
  Release 3:24.590, Outro 3:40.328, Tail 4:11.803, End 4:19.672.
- Layer entrances/exits, sparse melodic responses, velocity variations and
  pre-return gaps create development without extra instruments. Added keys/pad
  filter automation, pad balance automation and a final Main fade.
- The first generated draft incorrectly removed the original Swing 16ths 66
  assignment. Corrected every arranged clip to retain source groove ID 4.
  Native readback confirmed all 92 starts/lengths; structured checks confirmed
  32-beat lengths, shared loop origin zero and exact eight-bar downbeats.
  The first draft is retained as Original Groove - Superseded Draft 01.als.
- Early section-capture attempts were invalid: start/continue commands did not
  honor a stopped-position seek. They are NOT proof of section playback.
  Replaced that test with full native render analysis and a non-interrupting
  continuous capture. Live advanced from beat 302.482 to 337.293, with audio,
  no Session override and active keys/pad automation. No seek during that test.
- Exported Main, stereo WAV, 44.1 kHz / 16-bit, triangular dither, no normalize,
  no loop rendering, exactly 132 bars. MP3 derived at 320 kbps, no gain change.
- Full render: sample peak -4.78 dBFS, true peak -4.7 dBTP, -17.6 LUFS,
  no clipped samples. Every musical section has signal; final-second RMS
  -96.33 dBFS. 64 intro kick attacks: maximum deviation from median attack
  offset 2.87 ms, drift across intro -0.41 ms. This is not an assertion that
  every expressive note must be rigidly quantized or that taste is verified.
- Saved Session parts remain available; all 64 rack samples stay collected
  inside the project. Playback was started from bar 1 with loop off, no muted
  or soloed tracks, no Session override, and an expanded Arrangement overview.
- Subjective audibility/timing feedback requested from the user. Do not claim
  their approval, a mastered release, or production-app support for these local
  arrangement-generation and verification scripts.

### Eighth Part: Sparse Dub Percussion

- Added YOUR Dub Percussion using the installed Drum Essentials preset
  64 Pads Dub Techno Kit, loaded through its exact discovered browser path.
- The full nested device-tree response exceeded the OSC UDP size limit after
  loading. Confirmed one rack/instrument on the new track; did not reload it.
  Used native saved-set XML to read actual ReceivingNote assignments, not GM.
- Selected Wood Dub (note 73), Stick Unv Dub (89), A-Shaker 1 (63). Authored
  30 notes across eight bars: 10 wood hits, four stick accents, 16 quiet shaker
  hits. Velocities 35-61; timing offsets about 5-9 ms. No additional kick,
  clap, chord loop or reference recording used in this part.
- Rack macros read back: cutoff 6.50 kHz, Overdrive minimum 3.00 dB, Glue 10
  native, Comp 5%, Delay 6%, Reverb 12%. Requested 1 dB Overdrive was rejected
  before writing as outside the range; inspected and used its actual minimum.
  New track fader native 0.65; external sends zero. Prior seven parts, faders,
  sends and kick returns checked unchanged against the before-state snapshot.
- Solo actual capture: 17.04 seconds, peak -15.10 dBFS, RMS -35.14 dBFS.
  Eight-part mix: 17.02 seconds, peak -4.84 dBFS, RMS -16.25 dBFS.
- Saved Original Groove - Dub Percussion 01.als and natively collected all 64
  rack samples into the project. Saved XML verified eight Session clips,
  MIDI counts [32, 30, 42, 16, 50, 12, 16, 30], all 64 media paths local and
  present. Before-dub and earlier dry/effect checkpoints retained.
- Subjective musical approval remains pending. Full Arrangement and sidechain
  are still separate work; this is an eight-part Session groove.

### Kick Space Experiment

- Preserved Original Groove - Before Kick Space.als and a before-state snapshot.
  Used the previously unused A-Reverb and B-Delay returns, feeding only the kick.
- Reverb: 400 ms decay, 20 ms predelay, input low/high cuts enabled, filter
  frequency 1 kHz and width 4.6; 100% wet. Delay: linked eighth notes, zero
  timing offsets, feedback 12%, filter enabled at 1 kHz / width 4, 100% wet.
- Initial sends were too restrained. Preserved those captures, then increased
  sends to -10 dB reverb and -18 dB delay (AX linear amplitudes 0.316228 and
  0.125893; OSC native values 0.75 and 0.55). Dry kick fader unchanged.
- Individually captured returns with kick temporarily routed Sends Only and
  other instruments muted. Restored Main routing, all mutes and both sends.
  Final reverb-only peak -45.70 dBFS; delay-only peak -32.89 dBFS. Reverb is
  intentionally light; signal detection is not subjective musical approval.
- Captures and before/after data are in Kick Space 01. No kick/bass/pad
  sidechain was added. Other instruments' sends remain zero.
- Final full capture: peak -4.80 dBFS, RMS -16.27 dBFS, 8.50 seconds.
  Saved Original Groove - Kick Space 01.als; saved note counts remain
  [32, 30, 42, 16, 50, 12, 16], with no audio clips. Dry comparison capture
  RMS -16.27 dBFS, so integrated average levels are closely matched naturally;
  no loudness normalization was applied. All seven Session clips left playing.
- User asked whether a subtle dub-techno Drum Rack would fit. Suggested sparse
  woody rim, soft shaker and textured percussion, avoiding another heavy kick
  or bass loop. No Drum Rack has been added for this suggestion.

### Seventh Part Checkpoint

- Added YOUR Lead: Drift + Echo, 16 original notes across eight bars. Triangle
  oscillator, HP 150 Hz / LP 3.20 kHz, attack 18 ms, decay 899 ms, sustain 55%,
  release 450 ms. Quarter-note ping-pong echo, feedback 22%, wet 14%, filtered
  from 400 Hz to 4.50 kHz. Earlier six parts' MIDI read back unchanged.
- Solo recording: peak -27.96 dBFS, RMS -40.89 dBFS. This is a quiet layer;
  presence in the full mix requires user listening, not just a signal check.
- Seven-part recording: 17.02 seconds, peak -4.77 dBFS, RMS -16.30 dBFS.
  All seven Session clips checked playing. Saved Original Groove - Ensemble
  01.als; parsed saved notes [32, 30, 42, 16, 50, 12, 16], no audio clips.
- User asked about kick delay and sidechain. Suggested subtle kick-triggered
  bass/pad ducking first, then a separate quiet filtered kick delay for comparison.
  Neither change has been applied. Arrangement and musical approval remain pending.

1. Review the kick against the bass; refine decay, attack and balance if needed.
2. Add a closed-hat/shaker groove with restrained velocity and timing variation.
3. Add a clap or snare accent, chosen with the user.
4. Add a complementary percussion part only if the groove needs it.
5. Write original chords/pad and an original lead or motif, one at a time.
6. Add transitions and fills after the core parts are approved.
7. Arrange the approved parts along the reference-derived timing map, reviewing
   intro, build, main sections, breakdown and outro by listening.
8. Refine automation, EQ, dynamics, shared reverb/delay and transitions in context.
9. Check full playback, speaker/headphone translation, headroom and export.

The existing seven section locators are estimates, not verified musical labels.
The original reference duration is 4:20. Section labels and transitions still
need review; the current writing Arrangement has no musical clips yet.
Do not call the song complete from a Session loop or a signal check.
