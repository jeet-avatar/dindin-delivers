import asyncio
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import AsyncMock, patch
import httpx

from fastapi import HTTPException
from pydantic import ValidationError
import reference_listening
import reference_templates
import references
import test_references


BRIEF = {'title': 'My minimal track', 'style': 'Deep minimal', 'mood': 'Warm and restrained',
         'borrow': 'The space and bass texture', 'avoid': 'No vocals', 'bpm': 124,
         'source_constraint': 'Peak Bites',
         'parts': [{'role': 'Kick', 'sound': 'Short warm low body', 'effects': []}, {'role': 'Bass', 'sound': 'Sparse rounded bass', 'effects': []}],
         'sections': [{'name': 'Opening', 'bars': 8, 'direction': 'Sparse percussion'},
                      {'name': 'Main groove', 'bars': 16, 'direction': 'Add bass'}]}


class TemplateModelTests(unittest.TestCase):
    def test_bars_respect_time_signature_and_preferences(self):
        result = reference_templates.build(reference_templates.CreativeBrief(**{**BRIEF, 'numerator': 7, 'denominator': 8, 'bpm': 120}))
        self.assertEqual(result['duration_seconds'], 42)
        self.assertEqual(result['sections'][1]['start_bar'], 9)
        self.assertEqual(result['brief']['avoid'], 'No vocals')
        self.assertEqual(result['brief']['source_constraint'], 'Peak Bites')
        self.assertEqual(result['execution_status'], 'not_started')

    def test_duplicate_roles_and_excessive_bars_rejected(self):
        with self.assertRaises(ValidationError):
            reference_templates.CreativeBrief(**{**BRIEF, 'parts': BRIEF['parts'][:1] * 2})
        with self.assertRaises(ValidationError):
            reference_templates.CreativeBrief(**{**BRIEF, 'sections': [{'name': 'X', 'bars': 128, 'direction': 'Y'}] * 5})

    def test_coverage_does_not_double_count_or_include_stems(self):
        entries = [{'start_seconds': 0, 'end_seconds': 7, 'layer': 'mix', 'validation': 'checks_passed'},
                   {'start_seconds': 5, 'end_seconds': 9, 'layer': 'mix', 'validation': 'checks_passed'},
                   {'start_seconds': 0, 'end_seconds': 10, 'layer': 'bass', 'validation': 'checks_passed'},
                   {'start_seconds': 0, 'end_seconds': 10, 'layer': 'mix', 'validation': 'legacy_unchecked'}]
        result = reference_listening.coverage({'excerpts': entries}, 10)
        self.assertEqual(result['covered_seconds'], 9)
        self.assertFalse(result['full_coverage'])


class TemplateRouteTests(unittest.TestCase):
    setUp = test_references.ReferenceTests.setUp
    seed = test_references.ReferenceTests.seed

    def test_whole_listen_requires_ownership_and_consent(self):
        self.seed()
        path = '/api/references/' + self.id + '/listen-whole'
        self.assertEqual(self.client.post(path, json={'consent': True, 'intent': 'Groove'}, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(self.client.post(path, json={'consent': False, 'intent': 'Groove'}, headers={'x-user': '1'}).status_code, 400)

    def test_template_suggestion_requires_consent_and_is_private(self):
        self.seed()
        path = '/api/references/' + self.id + '/template/suggest'
        self.assertEqual(self.client.post(path, json={'consent': True, 'brief': BRIEF}, headers={'x-user': '2'}).status_code, 404)
        self.assertEqual(self.client.post(path, json={'consent': False, 'brief': BRIEF}, headers={'x-user': '1'}).status_code, 400)

    def test_legacy_listening_is_not_silently_trusted(self):
        directory = self.seed()
        references.write_json(directory / 'listening.json', {'notes': '{"analysis start":"0"}', 'start_seconds': 0, 'end_seconds': 10})
        data = reference_listening.read(directory)
        self.assertEqual(data['excerpts'][0]['validation'], 'legacy_unchecked')
        self.assertEqual(reference_listening.context(data)['excerpts'], [])
    def test_template_is_private_revisioned_and_not_execution(self):
        self.seed()
        path = '/api/references/' + self.id + '/template'
        self.assertEqual(self.client.post(path, json=BRIEF, headers={'x-user': '2'}).status_code, 404)
        result = self.client.post(path, json=BRIEF, headers={'x-user': '1'}).json()
        self.assertEqual(result['status'], 'draft')
        self.assertEqual(self.client.post(path + '/approve', json={'revision': 5}, headers={'x-user': '1'}).status_code, 409)
        approved = self.client.post(path + '/approve', json={'revision': 1}, headers={'x-user': '1'}).json()
        self.assertEqual(approved['status'], 'approved')
        self.assertEqual(approved['execution_status'], 'not_started')
        revised = self.client.post(path, json=BRIEF, headers={'x-user': '1'}).json()
        self.assertEqual(revised['revision'], 2)
        self.assertEqual(revised['status'], 'draft')
        self.assertIn('No vocals', references.reference_context(self.id, 1))

    def test_restart_marks_listening_interrupted(self):
        directory = self.seed()
        references.write_json(directory / 'listening.json', {'excerpts': [], 'job': {'status': 'running'}})
        references.recover_interrupted()
        self.assertEqual(reference_listening.read(directory)['job']['status'], 'interrupted')


class WholeListeningTests(unittest.IsolatedAsyncioTestCase):
    async def test_suggestion_uses_text_model_and_cannot_override_explicit_preferences(self):
        response = httpx.Response(200, request=httpx.Request('POST', 'https://api.openai.com'), json={
            'choices': [{'finish_reason': 'stop', 'message': {'content': json.dumps({'parts': BRIEF['parts'], 'sections': BRIEF['sections']})}}]})
        with patch.object(httpx.AsyncClient, 'post', AsyncMock(return_value=response)) as post, \
             patch.dict('os.environ', {'BEATMIND_TEMPLATE_MODEL': 'gpt-4.1'}):
            result = await reference_templates.suggest(reference_templates.CreativeBrief(**BRIEF), {'coverage': {}})
        body = post.call_args.kwargs['json']
        self.assertEqual(body['model'], 'gpt-4.1')
        self.assertTrue(body['response_format']['json_schema']['strict'])
        self.assertEqual(result.bpm, 124)
        self.assertEqual(result.avoid, 'No vocals')
        self.assertEqual(result.source_constraint, 'Peak Bites')

    async def test_incomplete_template_is_rejected(self):
        response = httpx.Response(200, request=httpx.Request('POST', 'https://api.openai.com'), json={
            'choices': [{'finish_reason': 'stop', 'message': {'content': '{"parts":[]}'}}]})
        with patch.object(httpx.AsyncClient, 'post', AsyncMock(return_value=response)):
            with self.assertRaises(HTTPException):
                await reference_templates.suggest(reference_templates.CreativeBrief(**BRIEF), {})

    async def test_partial_failure_preserves_success_and_explicit_resume_skips_it(self):
        with tempfile.TemporaryDirectory() as temp:
            directory = Path(temp)
            references.write_json(directory / 'report.json', {'duration_seconds': 10})
            def setup():
                data = reference_listening.read(directory)
                data['job'] = {'status': 'running', 'completed': 0, 'total': 2, 'failures': []}
                references.write_json(directory / 'listening.json', data)
                references.LISTENING.add('test')
            request = references.WholeListeningRequest(consent=True, intent='Sparse groove')
            result = {'validation': 'checks_passed', 'layer': 'mix', 'start_seconds': 0,
                      'end_seconds': 5, 'intent': request.intent, 'observations': {}}
            setup()
            with patch.object(reference_listening, 'windows', return_value=[(0, 5), (5, 5)]), \
                 patch.object(references.audio_listener, 'listen', AsyncMock(side_effect=[result, HTTPException(422, 'Rejected')])):
                await references.listen_whole(directory, 'test', request)
            data = reference_listening.read(directory)
            self.assertEqual(data['job']['status'], 'needs_review')
            self.assertEqual(len(data['excerpts']), 1)
            self.assertEqual(data['coverage']['coverage_percent'], 50)
            setup()
            with patch.object(reference_listening, 'windows', return_value=[(0, 5), (5, 5)]), \
                 patch.object(references.audio_listener, 'listen', AsyncMock(return_value={**result, 'start_seconds': 5, 'end_seconds': 10})) as listener:
                await references.listen_whole(directory, 'test', request)
                listener.assert_awaited_once()
            data = reference_listening.read(directory)
            self.assertEqual(len(data['excerpts']), 2)
            self.assertTrue(data['coverage']['full_coverage'])
            self.assertEqual(data['job']['status'], 'complete')
            self.assertFalse(references.LISTENING)
