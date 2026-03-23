"""AI chat endpoint — calls Claude Haiku, returns reply + parsed playlist."""
import os
from pathlib import Path

import anthropic
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ai import build_system_prompt, parse_playlist_response
from rekordbox import Track, load_library_xml, try_load_library_db

router = APIRouter(prefix="/api/ai")

XML_PATH = Path.home() / "Library" / "Music" / "rekordbox" / "rekordbox.xml"

# Initialise client — None if key not set (offline mode)
_api_key = os.getenv("ANTHROPIC_API_KEY", "")
anthropic_client = anthropic.Anthropic(api_key=_api_key) if _api_key else None

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 2048


def load_library() -> list[Track]:
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    return tracks or []


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat(req: ChatRequest):
    if anthropic_client is None:
        raise HTTPException(status_code=503, detail="AI features offline — ANTHROPIC_API_KEY not set")

    tracks = load_library()
    system = build_system_prompt(tracks)

    response = anthropic_client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        system=system,
        messages=[{"role": "user", "content": req.message}],
    )

    reply_text = response.content[0].text
    playlist = parse_playlist_response(reply_text)

    return {
        "reply": reply_text if not playlist else f"Built a playlist with {len(playlist)} tracks.",
        "playlist": playlist,
        "raw": reply_text,
    }
