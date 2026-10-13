"""New-song planning gates. Legacy conversations remain readable and unchanged."""

from datetime import datetime, timezone

from fastapi import HTTPException

import references
import remix_projects


def new_project():
    return {'title': 'New song', 'starting_point': None, 'live_set': None,
            'created_at': datetime.now(timezone.utc).isoformat()}


def reference_note(reference_id, user_id, project=None):
    if not reference_id:
        return ''
    _, item = references.owned(reference_id, user_id)
    if item['status'] != 'ready':
        return '\nThe selected reference is still processing or failed. Do not claim to have heard it. Ask the user to check Reference review.'
    if (project or {}).get('remix'):
        return remix_projects.planning_note(project)
    return references.reference_context(reference_id, user_id)


def planning_reason(project, reference_id, user_id):
    if not project:
        return ''
    if project.get('remix'):
        remix_projects.ensure_reference(project, reference_id)
        return remix_projects.planning_note(project)
    if not project.get('starting_point'):
        return 'Ask whether the user wants to upload a reference track for listening or start from their own idea.'
    if project['starting_point'] == 'reference':
        if not reference_id:
            return 'Ask the user to upload or choose a reference in Reference review. Do not claim to have heard audio.'
        directory, item = references.owned(reference_id, user_id)
        data = references.public(directory, item)
        if data['status'] != 'ready':
            return 'The reference is not ready. Check Reference review before continuing.'
    return ''


def _placed_tracks_present(reference_id, user_id, live):
    if not reference_id:
        return None
    try:
        directory, _ = references.owned(reference_id, user_id)
    except HTTPException:
        return None  # The reference was deleted.
    placed = references.placement(directory)
    if not placed:
        return None
    tracks = placed.get('tracks') or []
    present = bool(tracks) and set(tracks) <= set(live.get('tracks') or [])
    return placed, present


def stems_placed(reference_id, user_id):
    return bool(_placed_tracks_present(reference_id, user_id, {}))


def link_reference_set(project, reference_id, user_id, live):
    """A song started from a reference links to the Ableton set its stems were sent into.

    Matches on the set's name or on the reference stem tracks still being there (the set may have been saved under a new name).
    """
    if not project or project.get('live_set') or live.get('status') not in {'observed', 'verified'} or not live.get('title'):
        return False
    found = _placed_tracks_present(reference_id, user_id, live)
    if not found:
        return False
    placed, present = found
    if placed.get('title') != live['title'] and not present:
        return False
    project['live_set'] = {'title': live['title'], 'choice': 'reference_stems',
                           'confirmed_at': datetime.now(timezone.utc).isoformat()}
    return True


def saved_under_new_name(project, reference_id, user_id, live):
    """An untitled set that was saved keeps its reference stem tracks; follow the new name instead of refusing."""
    stored = (project or {}).get('live_set') or {}
    if not stored.get('title', '').casefold().startswith('untitled') or not live.get('title'):
        return False
    found = _placed_tracks_present(reference_id, user_id, live)
    if not found or not found[1]:
        return False
    stored['title'] = live['title']
    return True
