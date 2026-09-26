"""Reviewed source timing, kept separate from inferred musical section labels."""

import hashlib
import json
from datetime import datetime, timezone
from typing import Literal

from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator


def fingerprint(directory):
    return hashlib.sha256((directory / 'report.json').read_bytes()).hexdigest()


class Boundary(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=80)
    start_seconds: float = Field(ge=0, le=600, allow_inf_nan=False)
    end_seconds: float = Field(gt=0, le=600, allow_inf_nan=False)


class TimingReview(BaseModel):
    model_config = ConfigDict(extra='forbid')
    analysis_id: str = Field(pattern=r'^[a-f0-9]{64}$')
    revision: int = Field(ge=0)
    bpm: float = Field(ge=20, le=300, allow_inf_nan=False)
    numerator: int = Field(default=4, ge=1, le=16)
    denominator: Literal[2, 4, 8, 16] = 4
    sections: list[Boundary] = Field(min_length=1, max_length=32)
    confirm: bool = False

    @model_validator(mode='after')
    def continuous(self):
        if len({s.name.casefold() for s in self.sections}) != len(self.sections):
            raise ValueError('Section names must be distinct.')
        end = 0.0
        for section in self.sections:
            if abs(section.start_seconds - end) > 0.001 or section.end_seconds <= section.start_seconds:
                raise ValueError('Sections must be contiguous, ordered and non-empty, beginning at zero.')
            end = section.end_seconds
        return self


class StemReview(BaseModel):
    analysis_id: str = Field(pattern=r'^[a-f0-9]{64}$')
    decisions: dict[Literal['drums', 'bass', 'vocals', 'other'], Literal['keep', 'ignore', 'needs_work']]
    heard: bool = False


def proposed(report, analysis_id):
    duration = report['duration_seconds']
    starts = report.get('structure', {}).get('boundary_seconds', [])
    if not starts:
        starts = [0, *report.get('possible_change_points_seconds', [])]
    points = sorted({0.0, float(duration), *(float(s) for s in starts if 0 < s < duration)})
    return {'analysis_id': analysis_id, 'revision': 0, 'status': 'suggested',
            'bpm': report.get('source_metadata', {}).get('bpm') or report['tempo']['bpm'] or 120,
            'numerator': 4, 'denominator': 4,
            'sections': [{'name': f'Section {i + 1}', 'start_seconds': start, 'end_seconds': stop}
                         for i, (start, stop) in enumerate(zip(points, points[1:]))],
            'limitations': ['Section boundaries and tempo are estimates until reviewed.',
                            '4/4 is a proposed meter, not a detected time signature.',
                            'A constant tempo does not recover expressive or changing beat timing.']}


def read(directory):
    analysis_id = fingerprint(directory)
    path = directory / 'timing.json'
    if path.exists():
        data = json.loads(path.read_text())
        if data.get('analysis_id') == analysis_id:
            return data
    return proposed(json.loads((directory / 'report.json').read_text()), analysis_id)


def stem_review(directory):
    path = directory / 'stem-review.json'
    if path.exists():
        result = json.loads(path.read_text())
        if result.get('analysis_id') == fingerprint(directory):
            return result
    return {'analysis_id': fingerprint(directory), 'status': 'pending', 'decisions': {}}


def require_review(directory):
    timing = read(directory)
    if timing['status'] != 'confirmed':
        raise HTTPException(409, 'Review and confirm the reference timing map first.')
    if stem_review(directory)['status'] != 'accepted':
        raise HTTPException(409, 'Listen to the stems and accept or exclude each one first.')
    return timing


def validate_review(request, directory):
    current = read(directory)
    if request.analysis_id != fingerprint(directory) or request.revision != current['revision']:
        raise HTTPException(409, 'The timing analysis changed. Reload before confirming.')
    duration = json.loads((directory / 'report.json').read_text())['duration_seconds']
    if abs(request.sections[-1].end_seconds - duration) > 0.001:
        raise HTTPException(422, 'The timing map must cover the entire reference, including its ending.')
    data = request.model_dump(exclude={'confirm'})
    for index, section in enumerate(data['sections']):
        section['start_seconds'] = data['sections'][index - 1]['end_seconds'] if index else 0.0
    data['sections'][-1]['end_seconds'] = duration
    data.update(revision=current['revision'] + 1, status='confirmed' if request.confirm else 'draft',
                reviewed_at=datetime.now(timezone.utc).isoformat())
    return data


def align_template(template, timing, decisions=None):
    # Seconds are authoritative. Never round boundaries to whole bars to fit a recipe.
    bpm = timing['bpm']
    beats_per_bar = timing['numerator'] * 4 / timing['denominator']
    seconds_per_bar = 60 / bpm * beats_per_bar
    directions = {s['name']: s['direction'] for s in template['brief']['sections']}
    sections = []
    for i, boundary in enumerate(timing['sections']):
        start, end = boundary['start_seconds'], boundary['end_seconds']
        sections.append({**boundary, 'bars': (end - start) / seconds_per_bar,
                         'start_bar': 1 + start / seconds_per_bar,
                         'end_bar_exclusive': 1 + end / seconds_per_bar,
                         'direction': directions.get(boundary['name'],
                         'Choose replacement sounds while preserving this confirmed interval.')})
    template.update(sections=sections, duration_seconds=sections[-1]['end_seconds'],
                    total_bars=sections[-1]['end_bar_exclusive'] - 1,
                    timing_revision=timing['revision'], timing_analysis_id=timing['analysis_id'],
                    timing_mode='reference_seconds', scope='reference_timeline_blueprint',
                    stem_decisions=decisions or {})
    template['brief'].update(bpm=bpm, numerator=timing['numerator'], denominator=timing['denominator'],
                             sections=[{k: s[k] for k in ('name', 'bars', 'direction')} for s in sections])
    template['limitations'][0] = 'Exact confirmed timestamps are preserved in the blueprint; this is not yet a built Ableton Arrangement.'
    return template


def template_current(template, directory):
    if template.get('timing_mode') != 'reference_seconds':
        return True
    timing = read(directory)
    return (timing['status'] == 'confirmed' and stem_review(directory)['status'] == 'accepted'
            and template.get('timing_revision') == timing['revision']
            and template.get('stem_decisions') == stem_review(directory)['decisions']
            and template.get('timing_analysis_id') == timing['analysis_id'])


def export_package(template, directory):
    import io
    import zipfile
    import mido
    if template['status'] != 'approved' or not template_current(template, directory):
        raise HTTPException(409, 'Approve the current template and timing map before downloading.')
    midi = mido.MidiFile(type=1, ticks_per_beat=960, charset='utf8')
    track = mido.MidiTrack()
    midi.tracks.append(track)
    brief = template['brief']
    tempo = mido.bpm2tempo(brief['bpm'])
    track.append(mido.MetaMessage('track_name', name='Reference Timing Guide - no instrument'))
    track.append(mido.MetaMessage('set_tempo', tempo=tempo))
    track.append(mido.MetaMessage('time_signature', numerator=brief['numerator'], denominator=brief['denominator']))
    events = []
    for section in template['sections']:
        start = round(mido.second2tick(section['start_seconds'], midi.ticks_per_beat, tempo))
        end_seconds = section.get('end_seconds', section['start_seconds'] + section['bars'] * brief['numerator'] * 4 / brief['denominator'] * 60 / brief['bpm'])
        end = round(mido.second2tick(end_seconds, midi.ticks_per_beat, tempo))
        events.extend([(start, 1, mido.MetaMessage('marker', text=section['name'])),
                       (start, 2, mido.Message('note_on', note=0, velocity=1)),
                       (end, 0, mido.Message('note_off', note=0, velocity=0))])
    previous = 0
    for tick, _, event in sorted(events, key=lambda e: (e[0], e[1])):
        track.append(event.copy(time=tick - previous))
        previous = tick
    stream = io.BytesIO()
    midi.save(file=stream)
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        archive.writestr('template.json', json.dumps(template, indent=2))
        archive.writestr('timing-guide.mid', stream.getvalue())
        archive.writestr('README.txt', 'BeatMind reference template package\n\n'
            'The MIDI file is a timing guide, not musical transcription. It contains very low velocity note-0 placeholders '
            'spanning each section so Live can import the tempo map. Keep its track muted and without an instrument. '
            'Import tempo only into a new or deliberately prepared Live Set. MIDI markers may not become Live locators. '
            'template.json contains the exact confirmed seconds, source constraints and proposed effects. '
            'No source-song audio, recovered MIDI notes, installed instruments or effects are included. '
            'Audition and approve your own sounds before applying effects.\n')
    return output.getvalue()
