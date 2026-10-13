"""Keep complete user briefs available even when historical tool logs are trimmed."""

import json
from model_history import HistoryBudgetError


def brief_context(messages, max_bytes=64000):
    requests = [message['content'] for message in messages
                if message.get('role') == 'user' and isinstance(message.get('content'), str)]
    briefs = []
    for index, text in enumerate(requests):
        # Short corrections matter too: an old long brief must not override a later "no vocals".
        # Lossless pagination, not a guessed musical analysis or separate execution requests.
        pieces = [text[start:start + 2000] for start in range(0, len(text), 2000)]
        briefs.append({'request_number': index + 1, 'pieces': [
            {'piece': part + 1, 'of': len(pieces), 'text': piece}
            for part, piece in enumerate(pieces)]})
    if not briefs:
        return ''
    payload = json.dumps(briefs, ensure_ascii=False)
    if len(payload.encode('utf-8')) > max_bytes:
        raise HistoryBudgetError('The complete song briefs exceed the planning budget. '
                                 'They remain saved; consolidate the song brief before continuing.')
    return ('\n\nSAVED USER SONG BRIEFS (creative intent, not evidence of completed actions):\n'
            + payload + '\nRead every piece of each brief before planning or acting. Pieces are one '
            'request, not separate commands. Later user corrections in the conversation override older '
            'choices. Keep the entire song in view: genre, tempo, meter, key, instruments, sound sources, '
            'section order and bar positions, transitions, effects, automation and exclusions. Do not '
            'invent unspecified requirements or claim analysis of audio that was not heard. Summarize '
            'the whole-song plan in manageable stages; distinguish requested settings from assumptions '
            'and verified results. Save the structured production plan with sections where specified. '
            'Only execute the next appropriate part, inspect and audition it, then return for review. '
            'Never replay completed work just because its earlier tool details were trimmed. '
            'If essential timing or source details conflict, ask one focused question before writing.\n')
