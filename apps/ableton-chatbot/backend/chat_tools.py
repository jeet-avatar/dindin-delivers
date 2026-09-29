"""Server-side tools. They never issue Ableton commands or approve recordings."""

import json
from fastapi import HTTPException
from pydantic import ValidationError
import recordings
import references
from sound_comparison import ComparisonRequest

COMPARISON_SCHEMA = ComparisonRequest.model_json_schema()
TOOLS = [
    {'name': 'list_reference_sounds', 'description': 'Inspect your saved reference tracks and captured Ableton auditions before comparing. These are historical audio snapshots, not current Live state. Never guess an ID.',
     'input_schema': {'type': 'object', 'properties': {}, 'additionalProperties': False}},
    {'name': 'compare_reference_sound', 'description': 'Compare a selected reference layer/interval with an owned saved Ableton audition. Produces inline RMS-matched A/B audio and DSP differences, not a perceptual match score. No Ableton changes or approval. Ask for the intended recording/interval if ambiguous.',
     'input_schema': {'type': 'object', 'properties': {'reference_id': {'type': 'string', 'pattern': '^[a-f0-9]{32}$'},
                       **COMPARISON_SCHEMA['properties']},
                      'required': ['reference_id', 'recording_id', 'layer', 'reference_start_seconds', 'recording_start_seconds', 'duration_seconds'],
                      'additionalProperties': False}}
]
TOOLS.append({'name': 'get_effect_recipe', 'description': 'Get a starting effect chain for one part role (kick, drums, percussion, bass, chords, lead, fx, vocal) built from Ableton built-in devices, with send levels, genre notes and, when band_deltas from compare_reference_sound are given, reference-based EQ moves. Pass installed_plugins (from list_browser plugins) and allow_third_party=true only when the user opted in to their own plugins. Read-only; propose the chain to the user before loading anything.',
     'input_schema': {'type': 'object', 'properties': {
         'role': {'type': 'string', 'maxLength': 40}, 'genre': {'type': 'string', 'maxLength': 60},
         'band_deltas': {'type': 'object', 'additionalProperties': {'type': 'number'}},
         'installed_plugins': {'type': 'array', 'items': {'type': 'string', 'maxLength': 120}, 'maxItems': 200},
         'allow_third_party': {'type': 'boolean'}},
      'required': ['role'], 'additionalProperties': False}})
NAMES = {tool['name'] for tool in TOOLS}


async def execute(name, inputs, user_id):
    from jsonschema import validate, ValidationError as SchemaError
    try:
        validate(inputs, next(tool['input_schema'] for tool in TOOLS if tool['name'] == name))
        if name == 'get_effect_recipe':
            import effect_recipes
            return effect_recipes.recipe(inputs['role'], inputs.get('genre'), inputs.get('band_deltas'),
                                         inputs.get('installed_plugins'), inputs.get('allow_third_party', False))
        if name == 'list_reference_sounds':
            saved = []
            for path in references.ROOT.glob('*/meta.json'):
                try:
                    _, item = references.owned(path.parent.name, user_id)
                    saved.append({key: item[key] for key in ('id', 'name', 'status', 'created_at')})
                except (HTTPException, OSError, ValueError):
                    continue
            sounds = [{key: item.get(key) for key in ('id', 'track_name', 'created_at', 'decision', 'sample_source')}
                      | {'duration_seconds': item.get('metrics', {}).get('duration_seconds')} for item in recordings.list_recordings(user_id)]
            return {'status': 'observed', 'summary': 'Saved references and auditions inspected; no Ableton changes.',
                    'references': saved, 'recordings': sounds, 'steps': []}
        reference_id = inputs['reference_id']
        references.owned(reference_id, user_id)
        request = ComparisonRequest.model_validate({key: value for key, value in inputs.items() if key != 'reference_id'})
        with references.operation_lease():
            result = await references.create_comparison(reference_id, request, user_id)
        return {'status': 'observed', 'summary': 'Saved audio compared. RMS-matched previews are ready; no Ableton changes or approvals.',
                'comparison': {'id': result['id'], 'reference_id': reference_id},
                'measurements': result['candidate_minus_reference'], 'next_checks': result['next_checks'],
                'band_deltas': result.get('band_delta_percentage_points', {}),
                'limitations': result['limitations'], 'steps': []}
    except (HTTPException, ValidationError, SchemaError) as error:
        return {'status': 'failed', 'summary': error.detail if isinstance(error, HTTPException) else
                'Comparison inputs are invalid. Discover the exact saved sources and select valid intervals.', 'steps': []}
