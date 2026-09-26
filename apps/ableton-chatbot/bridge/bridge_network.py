"""Verified TLS shared by the packaged GUI and WebSocket connection."""

import ssl
from urllib.error import HTTPError, URLError

import certifi


def tls_context():
    return ssl.create_default_context(cafile=certifi.where())


def connection_error(error, stage='login'):
    if isinstance(error, HTTPError):
        if error.code == 401:
            return 'Email or password incorrect' if stage == 'login' else 'Sign-in expired. Connect again.'
        if error.code == 403:
            return 'Account access denied. Check BeatMind account.'
        if error.code == 429:
            return 'Too many attempts. Wait before retrying.'
        if error.code >= 500:
            return 'Server temporarily unavailable. Try again.'
        return 'Sign-in request rejected. Check account details.'
    reason = error.reason if isinstance(error, URLError) else error
    if isinstance(reason, ssl.SSLCertVerificationError):
        return 'Secure connection failed. Update BeatMind Bridge.'
    if isinstance(reason, (TimeoutError, OSError)):
        return 'Cannot reach server. Check internet or VPN.'
    return 'Unexpected server response. Please try again.'


async def network_check():
    import asyncio
    import json
    from urllib.request import Request, urlopen
    import websockets
    from websockets.exceptions import InvalidHandshake

    def health():
        request = Request('https://api.beatmind.io/api/health', headers={'User-Agent': 'BeatMind-Bridge/1.0'})
        with urlopen(request, timeout=15, context=tls_context()) as response:
            return response.status == 200 and json.load(response).get('status') == 'ok'

    healthy = await asyncio.to_thread(health)
    # No token: an HTTP auth rejection after TLS proves secure socket reachability,
    # not an authenticated bridge connection or communication with Ableton.
    try:
        async with websockets.connect('wss://api.beatmind.io/ws/bridge', ssl=tls_context(), open_timeout=15):
            raise RuntimeError('Unexpected unauthenticated bridge access')
    except InvalidHandshake as error:
        response = getattr(error, 'response', None)
        status = getattr(response, 'status_code', None) or getattr(error, 'status_code', None)
        if status not in (401, 403):
            raise RuntimeError('Unexpected WebSocket handshake status') from None
    return {'https_health': healthy, 'wss_tls': True, 'unauthenticated_rejected': True}
