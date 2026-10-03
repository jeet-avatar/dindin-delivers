"""Song labels describe the user's brief, not verified Ableton playback state."""

import math
import re

from jsonschema import Draft202012Validator

TOOL = {
    'name': 'update_song_details',
    'description': 'Save a song name, genre or intended BPM explicitly supplied by the user in this turn. '
                   'Available during setup and discussion; changes chat metadata only, never Ableton. '
                   'Use title only when the user names or renames THEIR song, not a reference, sample, instrument or pack. '
                   'Use exact user wording for title/genre and quote evidence from the current user message. '
                   'Omit unknown fields and alternatives posed as questions. Never invent a title, genre or BPM. '
                   'Genre/BPM updates preserve an explicit song name. Updating this metadata does not set Live tempo.',
    'input_schema': {'type': 'object', 'additionalProperties': False, 'properties': {
        'title': {'type': 'string', 'minLength': 1, 'maxLength': 70},
        'genre': {'type': 'string', 'minLength': 1, 'maxLength': 50},
        'bpm': {'type': 'number', 'minimum': 20, 'maximum': 300},
        'evidence': {'type': 'string', 'minLength': 1, 'maxLength': 2000},
    }, 'required': ['evidence']},
}


def valid_bpm(value):
    return type(value) in (int, float) and math.isfinite(value) and 20 <= value <= 300


def display_title(project):
    title = str(project.get('title') or '').strip()
    if project.get('title_source') == 'user' or (title and title != 'New song' and project.get('title_source') != 'auto'):
        return title
    genre = str(project.get('genre') or '').strip()[:50]
    bpm = project.get('bpm')
    parts = [genre[:1].upper() + genre[1:]] if genre else []
    if valid_bpm(bpm):
        parts.append(f'{bpm:g} BPM')
    return ' - '.join(parts) or 'New song'


def refresh(project, plan=None):
    if not project:
        return project
    updated = dict(project)
    if plan:
        if not updated.get('genre') and isinstance(plan.get('genre'), str):
            updated['genre'] = plan['genre'].strip()[:50]
        if not valid_bpm(updated.get('bpm')) and valid_bpm(plan.get('bpm')):
            updated['bpm'] = plan['bpm']
    title = display_title(updated)
    if title != updated.get('title'):
        updated.update(title=title, title_source='auto')
    return updated


def update(project, data, user_message):
    errors = list(Draft202012Validator(TOOL['input_schema']).iter_errors(data))
    if errors or not project or not any(key in data for key in ('title', 'genre', 'bpm')):
        return {'status': 'failed', 'summary': 'Song details need a current song and valid metadata.', 'steps': []}
    evidence = data['evidence'].strip()
    normalize = lambda value: ' '.join(value.casefold().split())
    if not evidence or normalize(evidence) not in normalize(user_message):
        return {'status': 'failed', 'summary': 'Song details must quote the current user request; nothing was renamed.', 'steps': []}
    for key in ('title', 'genre'):
        if key in data and (not data[key].strip() or normalize(data[key]) not in normalize(evidence)):
            return {'status': 'failed', 'summary': f'{key.capitalize()} was not found in the quoted request; nothing was renamed.', 'steps': []}
    if 'bpm' in data:
        numbers = re.findall(r'(?<![\w.])\d+(?:\.\d+)?(?=bpm\b|[^\w.]|$)', evidence, re.IGNORECASE)
        if not valid_bpm(data['bpm']) or not any(float(n) == data['bpm'] for n in numbers):
            return {'status': 'failed', 'summary': 'BPM was not found in the quoted request; nothing was renamed.', 'steps': []}
    updated = dict(project)
    for key in ('title', 'genre', 'bpm'):
        if key in data:
            updated[key] = data[key].strip() if isinstance(data[key], str) else data[key]
    if 'title' in data:
        updated['title_source'] = 'user'
    updated = refresh(updated)
    project.clear()
    project.update(updated)
    return {'status': 'observed', 'summary': f"Song details saved: {project['title']}. Ableton is unchanged.",
            'project': dict(project), 'steps': []}
