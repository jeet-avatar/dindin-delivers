"""Atomic preflight and readback for approved rendered stems in an empty Live Set."""

import math
import os
from pathlib import Path
import re
import wave


def target(song, set_id):
    reason = None
    if song.is_playing or song.record_mode or song.session_record:
        reason = 'Stop playback and recording before importing an approved remix.'
    elif any(list(track.arrangement_clips) or any(slot.has_clip for slot in track.clip_slots) for track in song.tracks):
        reason = 'Open a new empty Live Set first. Existing music will not be cleared or overwritten.'
    elif any(track.solo for track in song.tracks):
        reason = 'Clear track solos before importing into the empty set.'
    elif list(song.master_track.devices):
        reason = 'The master contains effects. Use an empty set without master effects to preserve the approved preview.'
    return {'status': 'observed', 'set_id': set_id, 'ready': reason is None, 'reason': reason,
            'title': str(getattr(song, 'file_path', '') or 'Untitled'), 'bpm': float(song.tempo)}


def execute(song, data, set_id, receipts):
    if data.get('action') == 'remix_target':
        return target(song, set_id)
    if data.get('set_id') != set_id:
        raise ValueError('Live Set changed. Recheck the destination before importing.')
    job_id = data.get('job_id', '')
    if not re.fullmatch(r'[a-f0-9]{32}', job_id):
        raise ValueError('Invalid remix identifier.')
    if job_id in receipts:
        return receipts[job_id]
    state = target(song, set_id)
    if not state['ready']:
        raise ValueError(state['reason'])
    bpm, numerator, denominator = data.get('bpm'), data.get('numerator'), data.get('denominator')
    frames, rate = data.get('frames'), data.get('sample_rate')
    if (type(bpm) not in (int, float) or not math.isfinite(bpm) or not 20 <= bpm <= 300
            or type(numerator) is not int or not 1 <= numerator <= 16
            or denominator not in (2, 4, 8, 16) or type(denominator) is not int
            or type(frames) is not int or not 5 * 44100 <= frames <= 600 * 44100 or rate != 44100):
        raise ValueError('Invalid remix tempo, meter or frame count.')
    files = data.get('files', [])
    allowed = {'drums', 'bass', 'vocals', 'other', 'kick', 'snare', 'toms', 'cymbals'}
    if (not isinstance(files, list) or not 1 <= len(files) <= 8
            or len({entry.get('name') for entry in files}) != len(files)):
        raise ValueError('Invalid remix stem list.')
    root = Path(os.getenv('BEATMIND_STEMS_DIR', str(Path.home() / 'Music/BeatMind Stems'))).resolve() / job_id
    paths = []
    for entry in files:
        name = entry.get('name')
        if name not in allowed:
            raise ValueError('Unknown remix stem.')
        path = Path(entry.get('path', '')).resolve()
        if path != root / (name + '.wav') or not path.is_file():
            raise ValueError('Remix audio must be in its own BeatMind stems folder.')
        with wave.open(str(path), 'rb') as audio:
            if (audio.getnframes(), audio.getframerate(), audio.getnchannels(), audio.getsampwidth()) != (frames, rate, 2, 3):
                raise ValueError('Remix file metadata changed. No tracks were created.')
        paths.append((name, path))
    expected_end = frames / rate * bpm / 60
    first = len(song.tracks)
    receipts[job_id] = {'status': 'needs_inspection', 'set_id': set_id,
                        'summary': 'Remix placement started but was not fully verified. Do not repeat it.'}
    try:
        song.tempo = bpm
        song.signature_numerator = numerator
        song.signature_denominator = denominator
        for name, path in paths:
            song.create_audio_track(-1)
            track = song.tracks[-1]
            track.name = 'Remix ' + name
            track.create_audio_clip(str(path), 0.0)
            if len(track.arrangement_clips) != 1:
                raise ValueError('Ableton did not create exactly one clip for a stem.')
            clip = track.arrangement_clips[0]
            clip.looping = False
            clip.warping = False
            clip.pitch_coarse = 0
            clip.pitch_fine = 0
            clip.muted = False
        rows = []
        if (len(song.tracks) != first + len(paths) or abs(song.tempo - bpm) > 1e-6
                or song.signature_numerator != numerator or song.signature_denominator != denominator):
            raise ValueError('The destination track count, tempo or meter changed during placement.')
        for index, (name, path) in enumerate(paths, first):
            track = song.tracks[index]
            clip = track.arrangement_clips[0]
            if (track.name != 'Remix ' + name or Path(clip.file_path).resolve() != path or clip.warping
                    or clip.muted or clip.looping or clip.pitch_coarse != 0 or clip.pitch_fine != 0
                    or abs(clip.start_time) > 1e-6 or abs(clip.end_time - expected_end) > 0.002):
                raise ValueError('A placed stem failed file, pitch or timeline readback. Inspect the set before continuing.')
            rows.append({'track': index, 'name': track.name, 'file_path': str(path),
                         'start_beats': float(clip.start_time), 'end_beats': float(clip.end_time)})
        receipts[job_id] = {'status': 'verified', 'set_id': set_id, 'tracks': rows, 'bpm': bpm,
                            'summary': 'Approved stems placed and file paths, pitch and timing read back. Audition in Ableton before judging its output.'}
    except Exception as error:
        receipts[job_id]['summary'] = str(error) + ' Some changes may have run; no retry was sent.'
    return receipts[job_id]
