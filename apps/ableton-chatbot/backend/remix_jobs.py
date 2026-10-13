"""Owner-scoped automatic remix previews with durable status and explicit review."""

import asyncio
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import signal
import sys
import uuid
import zipfile

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field, StrictBool

import billing
import arrangement_plan
from beatmind_auth import create_stem_download_token, verify_stem_download_token
from file_lock import Busy, Lease
import reference_imports
import reference_timing
import references
import remix_projects
import remix_render
import remix_assets
import stems

TASKS = set()
IMPORT_UNAVAILABLE = 'Ableton import is not enabled in this release. Your approved preview and aligned stems remain available.'
SAMPLED_IMPORT_UNAVAILABLE = 'Automatic import of new sampled-instrument layers requires a newer Bridge integration. Download the approved aligned stems for now.'


def import_enabled():
    return os.getenv('BEATMIND_AUTOMATIC_REMIX_IMPORT_ENABLED') == '1'


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    request_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    title: str = Field(min_length=1, max_length=70)
    session_id: str | None = Field(default=None, pattern=r'^remix_[a-f0-9]{32}$')
    draft_id: str | None = Field(default=None, pattern=r'^[a-f0-9]{32}$')
    recipe: remix_render.Recipe
    source_use: references.SourceUse


class ReviewRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    mix_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    accepted: StrictBool
    heard: StrictBool


class PlacementRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    set_id: str = Field(pattern=r'^[a-f0-9]{32}$')
    mix_sha256: str = Field(pattern=r'^[a-f0-9]{64}$')
    retry: StrictBool = False


def save(path, value):
    temporary = path.with_name(path.name + '.' + uuid.uuid4().hex + '.tmp')
    try:
        with temporary.open('x') as handle:
            os.chmod(temporary, 0o600)
            json.dump(value, handle, allow_nan=False)
            handle.flush()
            os.fsync(handle.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def job_directory(reference, job_id):
    if not re.fullmatch(r'[a-f0-9]{32}', job_id):
        raise HTTPException(404, 'Remix not found.')
    return reference / 'automatic-remixes' / job_id


def read(directory):
    try:
        data = json.loads((directory / 'job.json').read_text())
    except (OSError, ValueError):
        raise HTTPException(404, 'Remix not found.')
    if data['status'] in {'rendering', 'rendered'}:
        data['status'] = 'rendering'
        try:
            with Lease(directory / '.lock'):
                data.update(status='interrupted', stage='Rendering stopped before confirmation. No Ableton changes were made.')
                save(directory / 'job.json', data)
        except Busy:
            pass
    return data


def public(data):
    return {**{key: value for key, value in data.items() if key not in {'request', 'plan'}},
            'recipe': data['request']['recipe']}


def matches_file(path, expected):
    try:
        return remix_render.digest(path) == expected
    except OSError:
        return False


def preflight(directory, item):
    if item.get('storage') == 'local':
        raise HTTPException(409, 'These stems stay on your Mac. Automatic server previews require a separately uploaded and processed reference; no local audio was uploaded.')
    if item.get('status') != 'ready':
        raise HTTPException(409, 'Wait for stem separation to finish.')
    timing = reference_timing.read(directory)
    if timing['status'] != 'confirmed':
        raise HTTPException(409, 'Confirm the source tempo and section boundaries in the Timing tab first.')
    names = stems.review_stems(references.report_of(directory))
    if not names or len(set(names)) != len(names) or not set(names) <= set(stems.ALL_STEMS):
        raise HTTPException(409, 'The source stem catalog is invalid. Reanalyze before rendering.')
    if any(not (directory / f'{name}.wav').is_file() for name in names):
        raise HTTPException(409, 'Saved stem audio is missing. No remix can be rendered yet.')
    return timing, names


async def run(directory, leases):
    child = None
    try:
        child = await asyncio.create_subprocess_exec(sys.executable, str(Path(__file__).resolve()), str(directory),
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL, start_new_session=True,
            pass_fds=tuple(lease.handle.fileno() for lease in leases),
            env={**os.environ, 'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1'})
        await asyncio.wait_for(child.wait(), timeout=900)
        data = json.loads((directory / 'job.json').read_text())
        if child.returncode or data['status'] != 'rendered':
            if data['status'] in {'rendering', 'rendered'}:
                data.update(status='failed', stage='Rendering failed. Source audio and Ableton are unchanged.')
                save(directory / 'job.json', data)
        else:
            # Publish readiness only after the worker exits; release leases without yielding.
            data.update(status='ready', stage='Preview ready for your review')
            save(directory / 'job.json', data)
    except (Exception, asyncio.CancelledError):
        if child is not None and child.returncode is None:
            try:
                os.killpg(child.pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
            await child.wait()
        data = json.loads((directory / 'job.json').read_text())
        data.update(status='interrupted', stage='Rendering stopped before confirmation. Source audio and Ableton are unchanged.')
        save(directory / 'job.json', data)
    finally:
        for lease in reversed(leases):
            lease.close()


def worker(directory):
    path = directory / 'job.json'
    data = json.loads(path.read_text())

    def progress(stage):
        data.update(stage=stage, updated_at=datetime.now(timezone.utc).isoformat())
        save(path, data)

    try:
        result = remix_render.render(directory.parent.parent, directory, data['plan'], progress)
        with zipfile.ZipFile(directory / 'stems.zip', 'w', compression=zipfile.ZIP_STORED) as archive:
            for name in result['stems']:
                archive.write(directory / f'{name}.wav', f'{name}.wav')
            archive.writestr('remix.json', json.dumps(result, indent=2))
        data.update(status='rendered', stage='Finalizing preview', result=result,
                    review='pending', updated_at=datetime.now(timezone.utc).isoformat())
    except Exception as error:
        data.update(status='failed', stage=str(error) if isinstance(error, ValueError) else
                    'Audio rendering failed. Source audio and Ableton are unchanged.')
    save(path, data)


def router_for(get_user, create_project, bridge_for=lambda user_id, capability: None):
    router = APIRouter(prefix='/api/references/{reference_id}/automatic-remixes')

    @router.get('')
    async def listing(reference_id: str, user=Depends(get_user)):
        directory, item = references.owned(reference_id, user['id'])
        reason, timing, names = None, None, []
        try:
            timing, names = preflight(directory, item)
        except HTTPException as error:
            reason = error.detail
        jobs = [{**public(read(path.parent)), 'placement': reference_imports.status(path.parent)}
                for path in (directory / 'automatic-remixes').glob('*/job.json')]
        return {'available': reason is None, 'reason': reason, 'timing': timing, 'stems': names,
                'ableton_import_available': import_enabled(),
                'jobs': sorted(jobs, key=lambda job: job['created_at'], reverse=True)}

    @router.post('', status_code=202)
    async def start(reference_id: str, req: RenderRequest, user=Depends(get_user)):
        billing.require_reference_access(user)
        directory, item = references.owned(reference_id, user['id'])
        references.require_source_use(req.source_use)
        target = job_directory(directory, req.request_id)
        if (target / 'job.json').exists():
            previous = read(target)
            if RenderRequest.model_validate(previous['request']).model_dump() != req.model_dump():
                raise HTTPException(409, 'This render identifier belongs to different choices. No new render was started.')
            return public(previous)
        leases = []
        handed_off = False
        try:
            leases.append(references.operation_lease())
            leases.append(reference_imports.lease(directory))
            timing, names = preflight(directory, item)
            plan = remix_render.compile_recipe(req.recipe, timing, names, remix_assets.catalog(directory))
            if req.draft_id:
                import remix_chat
                if not req.session_id:
                    raise HTTPException(422, 'A chat revision must remain in its existing song.')
                leases.append(remix_chat.draft_lock(user['id'], req.session_id))
                remix_chat.validate_render(user['id'], req.session_id, reference_id, req.draft_id, req.title, req.recipe)
            if len(list((directory / 'automatic-remixes').glob('*/job.json'))) >= 5:
                raise HTTPException(429, 'This reference has reached its five-render limit. Saved previews remain available.')
            project = await create_project(remix_projects.RemixRequest(
                request_id=req.request_id, reference_id=reference_id, title=req.title,
                style='User-directed stem arrangement', target_bpm=req.recipe.target_bpm,
                layers={name: 'retain' if name in plan['stems'] else 'omit' for name in names},
                source_use=req.source_use), user, req.session_id)
            target.mkdir(parents=True, exist_ok=True, mode=0o700)
            leases.append(Lease(target / '.lock'))
            data = {'id': req.request_id, 'reference_id': reference_id, 'title': req.title,
                    'status': 'rendering', 'stage': 'Starting preview render', 'request': req.model_dump(),
                    'created_at': datetime.now(timezone.utc).isoformat(), 'plan': plan, 'project': project}
            save(target / 'job.json', data)
            if req.draft_id:
                path = remix_chat.path_for(user['id'], req.session_id)
                draft = json.loads(path.read_text())
                save(path, {**draft, 'status': 'rendered', 'render_id': req.request_id})
            task = asyncio.create_task(run(target, leases))
            TASKS.add(task)
            task.add_done_callback(TASKS.discard)
            handed_off = True
            return public(data)
        except Busy:
            raise HTTPException(409, 'Another reference operation is running. No duplicate render was started.')
        except ValueError as error:
            raise HTTPException(422, str(error))
        finally:
            if not handed_off:
                for lease in reversed(leases):
                    lease.close()

    @router.get('/{job_id}')
    async def status(reference_id: str, job_id: str, user=Depends(get_user)):
        directory, _ = references.owned(reference_id, user['id'])
        target = job_directory(directory, job_id)
        return {**public(read(target)), 'placement': reference_imports.status(target)}

    @router.get('/{job_id}/files/{name}')
    async def file(reference_id: str, job_id: str, name: str, user=Depends(get_user)):
        directory, _ = references.owned(reference_id, user['id'])
        target = job_directory(directory, job_id)
        data = read(target)
        if data['status'] != 'ready' or name not in {'mix.wav', 'stems.zip'}:
            raise HTTPException(404, 'Rendered file is not ready.')
        if name == 'stems.zip' and data.get('review') != 'accepted':
            raise HTTPException(409, 'Approve this preview before downloading its aligned stems.')
        return FileResponse(target / name, media_type='audio/wav' if name.endswith('.wav') else 'application/zip',
                            filename=f"BeatMind-remix-{job_id[:8]}-{name}", headers={'Cache-Control': 'private, no-store'})

    @router.post('/{job_id}/review')
    async def review(reference_id: str, job_id: str, req: ReviewRequest, user=Depends(get_user)):
        directory, _ = references.owned(reference_id, user['id'])
        target = job_directory(directory, job_id)
        try:
            with reference_imports.lease(directory), Lease(target / '.lock'):
                data = read(target)
                if (data['status'] != 'ready' or req.mix_sha256 != data['result']['files']['mix']['sha256']
                        or not matches_file(target / 'mix.wav', req.mix_sha256)):
                    raise HTTPException(409, 'The preview changed or is not ready. Load the current recording before reviewing.')
                if req.accepted and not req.heard:
                    raise HTTPException(422, 'Listen to the preview before approving it.')
                data.update(review='accepted' if req.accepted else 'changes_requested',
                            reviewed_at=datetime.now(timezone.utc).isoformat())
                save(target / 'job.json', data)
                return {**public(data), 'placement': reference_imports.status(target)}
        except Busy:
            raise HTTPException(409, 'This preview is busy. Wait for the current operation.')

    def approved(reference_id, job_id, user_id):
        directory, _ = references.owned(reference_id, user_id)
        target = job_directory(directory, job_id)
        data = read(target)
        if data['status'] != 'ready' or data.get('review') != 'accepted':
            raise HTTPException(409, 'Listen to and approve this exact preview before sending it to Ableton.')
        return directory, target, data

    @router.get('/{job_id}/import-target')
    async def import_target(reference_id: str, job_id: str, user=Depends(get_user)):
        _, _, data = approved(reference_id, job_id, user['id'])
        if not import_enabled():
            return {'ready': False, 'reason': IMPORT_UNAVAILABLE}
        if any(name.startswith('part_') for name in data['result']['stems']):
            return {'ready': False, 'reason': SAMPLED_IMPORT_UNAVAILABLE}
        bridge = bridge_for(user['id'], 'remix_preview_import_v1')
        if not bridge:
            return {'ready': False, 'reason': 'Connect a Bridge with approved-remix import support. Your preview is saved; no music was changed.'}
        try:
            return await arrangement_plan.exchange(bridge, {'action': 'remix_target'})
        except (ValueError, TimeoutError):
            return {'ready': False, 'reason': 'Update the Ableton integration and open a new empty Live Set. The remix destination could not be verified.'}

    @router.post('/{job_id}/import', status_code=202)
    async def import_approved(reference_id: str, job_id: str, req: PlacementRequest, user=Depends(get_user)):
        billing.require_reference_access(user)
        directory, target, data = approved(reference_id, job_id, user['id'])
        if not import_enabled():
            raise HTTPException(409, IMPORT_UNAVAILABLE)
        if any(name.startswith('part_') for name in data['result']['stems']):
            raise HTTPException(409, SAMPLED_IMPORT_UNAVAILABLE)
        if req.mix_sha256 != data['result']['files']['mix']['sha256']:
            raise HTTPException(409, 'The approved preview changed. No import was sent.')
        intent = req.model_dump(exclude={'retry'})
        previous = reference_imports.status(target)
        retrying = req.retry and previous['status'] == 'failed'
        if previous['status'] != 'idle' and not retrying:
            if previous.get('intent') != intent:
                raise HTTPException(409, 'This remix already has a placement record for another destination. Inspect it before continuing.')
            return previous
        bridge = bridge_for(user['id'], 'remix_preview_import_v1')
        if not bridge:
            raise HTTPException(409, 'Connect the updated Bridge before importing an approved remix.')
        leases = []
        handed_off = False
        try:
            leases.append(reference_imports.lease(directory))
            leases.append(reference_imports.lease(target))
            # Recheck review under the same lease used for approval changes and source deletion.
            _, _, data = approved(reference_id, job_id, user['id'])
            current = reference_imports.recover(target)
            if current['status'] != 'idle' and not (retrying and current['status'] == 'failed'):
                return current
            state = await arrangement_plan.exchange(bridge, {'action': 'remix_target'})
            if not state.get('ready') or state.get('set_id') != req.set_id:
                raise HTTPException(409, state.get('reason') or 'The Live Set changed. Check the destination again.')
            result = data['result']
            started = reference_imports.save(target, {'status': 'importing', 'operation_id': uuid.uuid4().hex, 'intent': intent})

            async def place():
                try:
                    response = await bridge.local_operation('remix_preview_import', {
                        'job_id': job_id, 'set_id': req.set_id, 'bpm': result['target_bpm'],
                        'numerator': result['numerator'], 'denominator': result['denominator'],
                        'frames': result['frames'], 'sample_rate': result['sample_rate'],
                        'files': {name: result['files'][name] for name in result['stems']},
                        'base_url': f"{os.getenv('SERVER_URL', 'http://localhost:8000')}{'/api/references/' + reference_id + '/automatic-remixes/' + job_id}/stem-download",
                        'token': create_stem_download_token(user['id'], job_id),
                    }, timeout=600)
                    if response.get('status') == 'verified' and response.get('set_id') == req.set_id:
                        final = response
                    elif response.get('changes_started') is False:
                        final = {'status': 'failed', 'summary': response.get('summary', 'Import stopped before changing Ableton.')}
                    else:
                        final = {'status': 'needs_inspection', 'summary': 'Placement was not fully confirmed. Inspect Ableton before another action; no automatic retry was sent.'}
                    reference_imports.save(target, {**started, **final})
                except (Exception, asyncio.CancelledError):
                    reference_imports.save(target, {**started, 'status': 'needs_inspection', 'summary': reference_imports.INSPECT})
                finally:
                    for lease in reversed(leases):
                        lease.close()
            task = asyncio.create_task(place())
            TASKS.add(task)
            task.add_done_callback(TASKS.discard)
            handed_off = True
            return started
        except Busy:
            raise HTTPException(409, 'Another reference operation is active. Wait before importing.')
        except ValueError as error:
            raise HTTPException(409, str(error))
        finally:
            if not handed_off:
                for lease in reversed(leases):
                    lease.close()

    @router.get('/{job_id}/stem-download/{name}')
    async def stem_download(reference_id: str, job_id: str, name: str, token: str = ''):
        user_id = verify_stem_download_token(token, job_id)
        if user_id is None:
            raise HTTPException(401, 'Invalid or expired remix download token.')
        _, target, data = approved(reference_id, job_id, user_id)
        if name not in data['result']['stems']:
            raise HTTPException(404, 'Rendered stem not found.')
        path = target / f'{name}.wav'
        expected = data['result']['files'][name]
        if not await asyncio.to_thread(matches_file, path, expected['sha256']):
            raise HTTPException(409, 'Rendered stem changed. Import stopped.')
        return FileResponse(path, media_type='audio/wav', headers={'Cache-Control': 'private, no-store'})

    return router


if __name__ == '__main__':
    worker(Path(sys.argv[1]))
