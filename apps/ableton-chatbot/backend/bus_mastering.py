"""Per-stem-bus mastering: group the producer's own tracks into the reference's four buses
(drums/bass/vocals/other) and compare each bus against the matching reference stem."""

from fastapi import HTTPException

import mastering
import recordings
import references
import sound_comparison
from stems import DRUM_PARTS  # ('kick', 'snare', 'toms', 'cymbals') — import, don't copy, so this
                               # can't drift if stems.py's taxonomy ever changes

DRUM_WORDS = ('kick', 'snare', 'hat', 'clap', 'perc', 'cymbal', 'tom', 'drum')
BASS_WORDS = ('bass', 'sub', '808')
VOCAL_WORDS = ('vocal', 'vox', 'voice')
OTHER_WORDS = ('pad', 'chords', 'lead', 'synth', 'keys', 'strings', 'guitar', 'arp')


def classify(name):
    lowered = name.casefold()
    if any(word in lowered for word in VOCAL_WORDS):
        return 'vocals'
    if any(word in lowered for word in BASS_WORDS):
        return 'bass'
    if any(word in lowered for word in DRUM_WORDS):
        return 'drums'
    if any(word in lowered for word in OTHER_WORDS):
        return 'other'
    return None


def classify_tracks(names):
    return [classify(name) for name in names]


def _reference_bus_samples(reference_id, bus):
    """The reference's audio for one bus, as samples — merged drums.wav if present, otherwise summed
    detailed kick/snare/toms/cymbals stems for the 'drums' bus. Returns None if nothing is saved.

    Reads `mastering.REFERENCES_ROOT` freshly on every call (not aliased to a local module-level name)
    so that patching `mastering.REFERENCES_ROOT` in tests actually takes effect here — a
    `REFERENCES_ROOT = mastering.REFERENCES_ROOT` alias at import time would bind a stale copy that a
    later patch on `mastering` wouldn't reach."""
    directory = mastering.REFERENCES_ROOT / reference_id
    merged = directory / f'{bus}.wav'
    if merged.is_file():
        return mastering.stereo_samples(merged)
    if bus != 'drums':
        return None
    parts = [directory / f'{part}.wav' for part in DRUM_PARTS]
    if not all(path.is_file() for path in parts):
        return None
    part_samples = [mastering.stereo_samples(path) for path in parts]
    length = min(len(samples) for samples in part_samples)
    return sum(samples[:length] for samples in part_samples)


# Known limitation, not a bug: summing 4 detailed drum-part stems can push some samples' peak amplitude
# over sound_comparison.measure()'s "digital full scale" guard (peak >= 0.999) even when no individual
# part clips on its own (e.g. a kick+snare transient coinciding). measure() already raises a clear
# ValueError in that case and compare_bus()'s caller (_bus_tool, a later task) already surfaces it as a
# normal failed result — so this needs no extra code, just awareness that a well-mixed detailed-stem
# reference can fail 'drums' bus comparison somewhat more often than a merged drums.wav would.


async def compare_bus(user_id, reference_id, bus, scene, query, send, capture_scene, seconds=8):
    """`capture_scene(request)` must both capture AND save (see _bus_tool in main.py, a later task, for
    the real composition: `recordings.save_recording(bridge.user_id, await bridge.local_operation(...))`),
    returning a dict with `recording.id` once saved to `recordings.ROOT/{id}.m4a` — a bare
    `bridge.local_operation` call alone only returns base64 bytes, not a file on disk."""
    try:
        references.owned(reference_id, user_id)
    except (ValueError, HTTPException) as error:
        summary = error.detail if isinstance(error, HTTPException) else str(error)
        return {'status': 'failed', 'summary': summary, 'steps': []}
    reference_samples = _reference_bus_samples(reference_id, bus)
    if reference_samples is None:
        return {'status': 'failed', 'summary': f'No saved {bus} stem for this reference. '
                'Complete the reference stem review first.', 'steps': []}
    names = await query('/live/song/get/track_names', [])
    buses = classify_tracks(names)
    if bus not in buses:
        return {'status': 'failed', 'summary': f'No track classified as {bus} to compare.', 'steps': []}
    other_tracks = [i for i, b in enumerate(buses) if b != bus]
    original_mute = {}
    try:
        for track in other_tracks:
            original_mute[track] = (await query('/live/track/get/mute', [track]))[-1]
            if not original_mute[track]:
                await send('/live/track/set/mute', [track, 1])
        capture = await capture_scene({'scene': scene, 'seconds': seconds})
        if capture.get('status') != 'verified':
            return {'status': 'failed', 'summary': f'Could not record the {bus} bus: '
                    f'{capture.get("summary", "unknown error")}', 'steps': []}
        candidate_id = capture['recording']['id']
        candidate_samples = mastering.stereo_samples(recordings.ROOT / f'{candidate_id}.m4a')
        length = min(len(candidate_samples), len(reference_samples))
        report, _, _ = sound_comparison.compare_arrays(reference_samples[:length], candidate_samples[:length])
        return {'status': 'measured', 'bus': bus, 'comparison': report, 'steps': []}
    finally:
        for track, was_muted in original_mute.items():
            if not was_muted:
                await send('/live/track/set/mute', [track, 0])
