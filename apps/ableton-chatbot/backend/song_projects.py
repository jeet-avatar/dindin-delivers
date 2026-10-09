"""New-song planning gates. Legacy conversations remain readable and unchanged."""

from datetime import datetime, timezone

import references


def new_project():
    return {'title': 'New song', 'starting_point': None, 'live_set': None,
            'created_at': datetime.now(timezone.utc).isoformat()}


def reference_note(reference_id, user_id):
    if not reference_id:
        return ''
    _, item = references.owned(reference_id, user_id)
    if item['status'] != 'ready':
        return '\nThe selected reference is still processing or failed. Do not claim to have heard it. Ask the user to check Reference review.'
    return references.reference_context(reference_id, user_id)


def planning_reason(project, reference_id, user_id):
    if not project:
        return ''
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
