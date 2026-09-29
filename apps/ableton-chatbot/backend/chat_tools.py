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
TOOLS.append({'name': 'get_engineering_rules', 'description': "Look up BeatMind's engineering rulebook before answering an engineering question or making a processing decision: the method (detect, least destructive fix, smallest change, verify, stop), the order of processing, problem/detection/action rules with frequency and amount search zones, what never to do, and which built-in Ableton device does each job. Topics: vocal, interactions (kick vs bass, vocal vs synth, lead vs vocal, percussion vs vocal, FX vs intelligibility). Pass problem (for example 'sibilance', 'mud', 'reverb too distant') to narrow the rules. Read-only.",
     'input_schema': {'type': 'object', 'properties': {'topic': {'type': 'string', 'maxLength': 60}, 'problem': {'type': 'string', 'maxLength': 200}},
                      'required': ['topic'], 'additionalProperties': False}})
TOOLS.append({'name': 'vocal_check', 'description': "Detect what a vocal actually needs before processing it, from a solo vocal preview (audition_part on the vocal track): clipping and headroom, rumble, boom, mud, boxiness, nasal and harsh bands measured against the vocal's own tilt, narrow resonances, sibilant bursts, dull top and phrase-level consistency. Pass compare_recording_ids (solo previews of synths, lead, pads, percussion) to score masking in the vocal's 1-5 kHz range. Each finding has the rulebook fix; passing stages say skip. Read-only; propose fixes, apply only after the user agrees.",
     'input_schema': {'type': 'object', 'properties': {'recording_id': {'type': 'string', 'pattern': '^[a-f0-9]{32}$'},
                       'compare_recording_ids': {'type': 'array', 'items': {'type': 'string', 'pattern': '^[a-f0-9]{32}$'}, 'maxItems': 8}},
                      'required': ['recording_id'], 'additionalProperties': False}})
NAMES = {tool['name'] for tool in TOOLS}


async def execute(name, inputs, user_id):
    from jsonschema import validate, ValidationError as SchemaError
    try:
        validate(inputs, next(tool['input_schema'] for tool in TOOLS if tool['name'] == name))
        if name == 'get_engineering_rules':
            import engineering_rules
            return engineering_rules.lookup(inputs['topic'], inputs.get('problem'))
        if name == 'vocal_check':
            import vocal_check
            return vocal_check.run(user_id, inputs['recording_id'], inputs.get('compare_recording_ids'))
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
