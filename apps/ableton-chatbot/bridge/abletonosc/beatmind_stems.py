"""Place full-length reference stems on new audio tracks, aligned at the start of the Arrangement.

Registered by beatmind_samples.register. Requires Live 12 (Track.create_audio_clip).
"""

from pathlib import Path

MAX_STEMS = 12


def register(handler, app):
    root = (Path.home() / "Music/BeatMind Stems").resolve()

    def capabilities(params):
        import Live  # Only available inside Ableton Live.
        return ("stem_import_v1",) if hasattr(Live.Track.Track, "create_audio_clip") else ("unsupported",)

    def import_stems(params):
        # params: track-name prefix, then (absolute path, label) pairs.
        prefix = str(params[0])[:24]
        pairs = list(zip(params[1::2], params[2::2]))
        if not pairs or len(pairs) > MAX_STEMS or len(params) % 2 == 0:
            return ("error", "Send between 1 and 12 stems")
        files = []
        for path, label in pairs:
            resolved = Path(str(path)).resolve()
            # Commands arrive from the cloud: only BeatMind's own stem WAVs may be referenced.
            if not resolved.is_relative_to(root) or resolved.suffix.lower() != ".wav" or not resolved.is_file():
                return ("error", "Stems must be WAV files inside Music/BeatMind Stems")
            files.append((resolved, str(label)[:32]))
        song = handler.song
        first = len(song.tracks)
        for path, label in files:
            song.create_audio_track(-1)
            track = song.tracks[-1]
            track.name = f"{prefix} {label}".strip()
            track.create_audio_clip(str(path), 0.0)
            for clip in track.arrangement_clips:
                # Unwarped clips keep the reference's own timing, so every stem stays aligned.
                clip.warping = False
        return ("imported", first, len(files))

    handler.osc_server.add_handler("/live/song/beatmind_stem_capabilities", capabilities)
    handler.osc_server.add_handler("/live/song/beatmind_import_stems", import_stems)
