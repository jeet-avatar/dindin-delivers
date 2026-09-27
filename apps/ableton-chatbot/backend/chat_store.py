"""Owner-scoped durable chat checkpoints and action journals, never audio bytes."""

from datetime import datetime, timezone
import copy
import json
import os
from pathlib import Path
import re
import tempfile
import uuid

from fastapi import HTTPException
from file_lock import Lease, Busy
from model_history import as_dict

ROOT = Path(os.getenv('BEATMIND_CHATS_DIR', str(Path(tempfile.gettempdir()) / 'beatmind-chats')))


def directory(user_id, session_id):
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,80}', session_id):
        raise HTTPException(422, 'Invalid conversation ID.')
    return ROOT / str(int(user_id)) / session_id


def load(user_id, session_id):
    path = directory(user_id, session_id) / 'state.json'
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        if data['user_id'] != user_id or data['session_id'] != session_id:
            raise ValueError('Owner mismatch')
        return data
    except (ValueError, KeyError):
        raise HTTPException(409, 'Conversation recovery failed. Saved files are unchanged; do not repeat music commands.')


def save(session, status, error=None):
    path = directory(session.user_id, session.session_id)
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    data = {'user_id': session.user_id, 'session_id': session.session_id,
            'updated_at': datetime.now(timezone.utc).isoformat(), 'status': status,
            'reference_id': getattr(session, 'reference_id', None), 'messages': session.messages,
            'project': getattr(session, 'project', None),
            'actions': getattr(session, 'actions', []),
            'ui_messages': getattr(session, 'ui_messages', []), 'error': error}
    encoded = json.dumps(data, default=as_dict, allow_nan=False)
    temporary = path / (uuid.uuid4().hex + '.tmp')
    try:
        temporary.write_text(encoded)
        temporary.replace(path / 'state.json')
    finally:
        temporary.unlink(missing_ok=True)


def journal(session, event):
    path = directory(session.user_id, session.session_id)
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    data = {'at': datetime.now(timezone.utc).isoformat(), **event}
    with (path / 'events.jsonl').open('a') as target:
        target.write(json.dumps(data, default=as_dict, allow_nan=False) + '\n')
        target.flush()
        os.fsync(target.fileno())


def recover_messages(saved):
    messages = copy.deepcopy(saved['messages'])
    if saved.get('status') not in {'running', 'interrupted'}:
        return messages
    # A crash may leave a tool call without a result. Close it as unverified;
    # recovery never replays a write or reports it as completed.
    if messages and messages[-1]['role'] == 'assistant' and isinstance(messages[-1]['content'], list):
        calls = [block for block in messages[-1]['content'] if block.get('type') == 'tool_use']
        if calls:
            messages.append({'role': 'user', 'content': [{'type': 'tool_result', 'tool_use_id': call['id'],
                'is_error': True, 'content': 'Interrupted before durable confirmation. Inspect current state before any retry.'} for call in calls]})
    messages.append({'role': 'assistant', 'content': 'The previous request was interrupted. Saved actions may have run; inspect the current Live Set and action log before continuing. Do not recreate existing parts.'})
    return messages


def visible_messages(saved):
    visible = copy.deepcopy(saved.get('ui_messages') or [
        {'role': m['role'], 'content': m['content']} for m in saved['messages']
        if isinstance(m.get('content'), str)])
    actions = copy.deepcopy(saved.get('actions', []))
    if saved['status'] in {'running', 'interrupted'}:
        for action in actions:
            if not action.get('result'):
                action['result'] = {'status': 'unverified', 'summary': 'No durable completion. Inspect before retrying.'}
        warning = {'role': 'assistant', 'content': 'This saved request has no confirmed completion. Inspect the action log before retrying.',
                   'requestStatus': 'interrupted', 'toolCalls': actions}
        if visible and visible[-1].get('pending'):
            visible[-1].update(warning, pending=False)
        else:
            visible.append(warning)
    elif not saved.get('ui_messages') and visible and visible[-1]['role'] == 'assistant':
        visible[-1]['toolCalls'] = actions
    return visible


def acquire(user_id, session_id):
    try:
        return Lease(directory(user_id, session_id) / '.lock')
    except Busy:
        raise HTTPException(409, 'This conversation is running on another worker. Wait before sending another request.')


def listing(user_id):
    items = []
    for path in (ROOT / str(int(user_id))).glob('*/state.json'):
        data = load(user_id, path.parent.name)
        title = next((m['content'][:70] for m in data['messages'] if m['role'] == 'user' and isinstance(m['content'], str)), 'Chat')
        title = (data.get('project') or {}).get('title') or title
        items.append({'id': data['session_id'], 'title': title, 'updated_at': data['updated_at'], 'status': data['status']})
    return sorted(items, key=lambda item: item['updated_at'], reverse=True)[:100]
