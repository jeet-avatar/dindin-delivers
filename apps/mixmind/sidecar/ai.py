"""
AI playlist generation via Claude Haiku.
Streaming via SSE — see /api/ai/generate endpoint in ai_routes.py.
"""
from __future__ import annotations

import json
import re
from typing import Generator

from rekordbox import Track

MAX_TRACKS_IN_CONTEXT = 1500

SYSTEM_PROMPT_TEMPLATE = """You are MixMind, an expert DJ assistant. You have deep knowledge of music theory, DJ mixing, Camelot Wheel key compatibility, and energy flow in DJ sets.

The DJ's library (CSV format: title|artist|bpm|camelot|rating|duration_sec):

{library_csv}

{context_note}

When asked to build a playlist or set:
- Prefer tracks with compatible Camelot keys (same number, or ±1, or same letter)
- Respect requested BPM range and energy arc
- Prioritise higher-rated tracks
- Return a JSON array ONLY (no prose, no markdown), format:
  [
    {{"title": "Track Name", "artist": "Artist", "reason": "Why this track fits here"}},
    ...
  ]

For other questions, answer in plain text."""


def serialise_library_for_claude(tracks: list[Track]) -> str:
    """Serialise tracks to compact CSV for Claude context window."""
    # Sort by rating descending, take top MAX_TRACKS_IN_CONTEXT
    sorted_tracks = sorted(tracks, key=lambda t: t.rating, reverse=True)
    capped = sorted_tracks[:MAX_TRACKS_IN_CONTEXT]

    lines = ["title|artist|bpm|camelot|rating|duration_sec"]
    for t in capped:
        lines.append(f"{t.title}|{t.artist}|{t.bpm:.1f}|{t.camelot}|{t.rating}|{t.duration_sec}")
    return "\n".join(lines)


def build_system_prompt(tracks: list[Track]) -> str:
    """Build Claude system prompt with serialised library context."""
    csv = serialise_library_for_claude(tracks)
    context_note = (
        f"(Showing top {MAX_TRACKS_IN_CONTEXT} tracks by rating — "
        f"full library has {len(tracks)} tracks)"
        if len(tracks) > MAX_TRACKS_IN_CONTEXT
        else ""
    )
    return SYSTEM_PROMPT_TEMPLATE.format(library_csv=csv, context_note=context_note)


def parse_playlist_response(text: str) -> list[dict]:
    """Extract JSON playlist array from Claude's response.
    Handles both raw JSON and JSON wrapped in markdown code blocks."""
    # Try to extract from ```json ... ``` block
    code_block = re.search(r"```(?:json)?\s*(\[.*?\])\s*```", text, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    # Try to parse the entire response as JSON
    try:
        result = json.loads(text.strip())
        if isinstance(result, list):
            return result
    except json.JSONDecodeError:
        pass

    # Try to find a JSON array anywhere in the response
    array_match = re.search(r"\[.*\]", text, re.DOTALL)
    if array_match:
        try:
            result = json.loads(array_match.group(0))
            if isinstance(result, list):
                return result
        except json.JSONDecodeError:
            pass

    return []
