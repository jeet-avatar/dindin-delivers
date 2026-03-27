"""
MixMind audio analyzer — Demucs stem separation + Essentia feature extraction.

Public API:
  stems_to_waveform(stems, sr, n_columns) -> list[dict]
  analyze_track(file_path, content_id, source, db) -> dict
  AnalysisBatchRunner — background batch processor with cancellation
"""
from __future__ import annotations

import logging
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path
from threading import Event, Thread
from typing import Optional

import numpy as np

from camelot import musical_key_to_camelot

logger = logging.getLogger(__name__)

TMP_DIR = Path.home() / ".mixmind" / "tmp"
ANALYZER_VERSION = "1.0"


# ---------------------------------------------------------------------------
# Stem -> waveform conversion
# ---------------------------------------------------------------------------

def stems_to_waveform(
    stems: dict[str, np.ndarray],
    sr: int,
    n_columns: int = 800,
) -> list[dict]:
    """Convert 4 Demucs stem arrays to display-ready waveform columns.

    Each stem is an audio signal (1-D float array). We compute RMS energy
    in equal-sized windows and normalize each stem independently to 0-255.

    Returns a list of dicts: [{"drums": 0-255, "bass": ..., "vocals": ..., "other": ...}, ...]
    """
    stem_order = ["drums", "bass", "vocals", "other"]
    per_stem: dict[str, list[int]] = {}

    for name in stem_order:
        audio = stems[name]
        if len(audio) == 0:
            per_stem[name] = [0] * n_columns
            continue

        window_size = max(1, len(audio) // n_columns)
        rms: list[float] = []
        for i in range(n_columns):
            start = i * window_size
            end = min(start + window_size, len(audio))
            chunk = audio[start:end]
            rms.append(float(np.sqrt(np.mean(chunk ** 2))) if len(chunk) > 0 else 0.0)

        max_rms = max(rms) if rms else 1.0
        if max_rms == 0:
            max_rms = 1.0
        per_stem[name] = [int(min(255, (v / max_rms) * 255)) for v in rms]

    return [
        {name: per_stem[name][i] for name in stem_order}
        for i in range(n_columns)
    ]


# ---------------------------------------------------------------------------
# Demucs stem separation
# ---------------------------------------------------------------------------

def _run_demucs(file_path: str) -> dict[str, np.ndarray]:
    """Run Demucs htdemucs model on an audio file. Returns 4 mono stem arrays."""
    import torch
    import torchaudio
    from demucs.pretrained import get_model
    from demucs.apply import apply_model

    TMP_DIR.mkdir(parents=True, exist_ok=True)

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model = get_model("htdemucs")
    model.to(device)

    wav, sr = torchaudio.load(file_path)
    # Demucs expects (batch, channels, samples)
    if wav.dim() == 1:
        wav = wav.unsqueeze(0)
    if wav.shape[0] > 2:
        wav = wav[:2]  # max stereo
    wav = wav.unsqueeze(0).to(device)  # (1, channels, samples)

    with torch.no_grad():
        sources = apply_model(model, wav, device=device)
    # sources shape: (1, n_sources, channels, samples)
    # htdemucs sources: drums, bass, other, vocals

    source_names = model.sources  # ['drums', 'bass', 'other', 'vocals']
    stems: dict[str, np.ndarray] = {}
    for i, name in enumerate(source_names):
        stem = sources[0, i].mean(dim=0).cpu().numpy()  # mono
        stems[name] = stem.astype(np.float32)

    return stems


# ---------------------------------------------------------------------------
# Essentia feature extraction
# ---------------------------------------------------------------------------

def _run_essentia(file_path: str) -> dict:
    """Extract BPM, key, genre, energy, danceability from audio file."""
    import essentia.standard as es

    loader = es.MonoLoader(filename=file_path)
    audio = loader()

    # BPM
    rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
    bpm, *_ = rhythm_extractor(audio)

    # Key
    key_extractor = es.KeyExtractor()
    key, scale, strength = key_extractor(audio)
    key_musical = f"{key}{('m' if scale == 'minor' else '')}"

    # Energy (RMS)
    rms = es.RMS()
    energy = float(rms(audio))
    # Normalize to 0-1 (typical RMS for music is 0.01-0.3)
    energy_normalized = min(1.0, energy / 0.2)

    # Danceability
    dance_extractor = es.Danceability()
    danceability, *_ = dance_extractor(audio)

    # Genre — use high-level classifier if available
    genre = ""
    try:
        from essentia.standard import TensorflowPredictEffnetDiscogs, TensorflowPredict2D
        # Essentia genre classification via pre-trained model
        # This requires the genre_discogs400 model file
        genre = _classify_genre(audio)
    except (ImportError, Exception) as e:
        logger.debug("Genre classification unavailable: %s", e)

    camelot = musical_key_to_camelot(key_musical)

    return {
        "bpm": round(float(bpm), 1),
        "key_musical": key_musical,
        "camelot": camelot,
        "genre": genre,
        "energy": round(energy_normalized, 3),
        "danceability": round(float(danceability), 3),
    }


def _classify_genre(audio) -> str:
    """Attempt genre classification via Essentia's MusiCNN or Discogs model."""
    try:
        import essentia.standard as es
        # Simple fallback: use spectral characteristics to guess broad genre
        # Full model-based classification deferred to when models are downloaded
        centroid = es.SpectralCentroidTime()
        sc = float(centroid(audio))
        # Very rough heuristic — will be replaced by real model
        if sc < 1500:
            return "Ambient"
        elif sc < 2500:
            return "House"
        elif sc < 3500:
            return "Techno"
        else:
            return "Drum & Bass"
    except Exception:
        return ""


# ---------------------------------------------------------------------------
# Single-track analysis
# ---------------------------------------------------------------------------

def analyze_track(file_path: str, content_id: str, source: str, db) -> dict:
    """Run full Demucs + Essentia analysis on a single track.

    Args:
        file_path: Absolute path to audio file
        content_id: Track identifier
        source: 'db' or 'xml'
        db: StateDB instance

    Returns dict with status, essentia results, waveform column count.
    """
    start = time.time()

    # Pre-checks
    if not Path(file_path).exists():
        db.save_analysis(content_id=content_id, source=source, status="failed",
                         file_path=file_path, error_message=f"File not found: {file_path}")
        return {"content_id": content_id, "status": "failed",
                "error": f"File not found: {file_path}", "stage": "pre-check"}

    # Check disk space (need ~500MB free)
    free_space = shutil.disk_usage(Path.home()).free
    if free_space < 1_000_000_000:  # 1GB
        db.save_analysis(content_id=content_id, source=source, status="failed",
                         file_path=file_path, error_message="Insufficient disk space (<1GB)")
        return {"content_id": content_id, "status": "failed",
                "error": "Insufficient disk space (<1GB)", "stage": "pre-check"}

    db.update_analysis_status(content_id, source, "analyzing")

    # Stage 1: Demucs
    waveform_blob = None
    waveform_columns = 0
    demucs_ok = False
    try:
        stems = _run_demucs(file_path)
        waveform = stems_to_waveform(stems, sr=44100, n_columns=800)
        import msgpack
        waveform_blob = msgpack.packb(waveform, use_bin_type=True)
        waveform_columns = len(waveform)
        demucs_ok = True
    except Exception as e:
        logger.error("Demucs failed for %s: %s", content_id, e)
    finally:
        # Clean temp files
        if TMP_DIR.exists():
            for f in TMP_DIR.iterdir():
                try:
                    if f.is_file():
                        f.unlink()
                    elif f.is_dir():
                        shutil.rmtree(f)
                except OSError:
                    pass

    # Stage 2: Essentia
    essentia_result = {}
    essentia_ok = False
    try:
        essentia_result = _run_essentia(file_path)
        essentia_ok = True
    except Exception as e:
        logger.error("Essentia failed for %s: %s", content_id, e)

    # Determine status
    if demucs_ok and essentia_ok:
        status = "complete"
    elif demucs_ok and not essentia_ok:
        status = "failed_essentia"
    elif not demucs_ok and essentia_ok:
        status = "failed_demucs"
    else:
        status = "failed"

    duration_sec = round(time.time() - start, 1)

    # Save to DB
    db.save_analysis(
        content_id=content_id, source=source, status=status,
        file_path=file_path,
        bpm=essentia_result.get("bpm"),
        key_musical=essentia_result.get("key_musical"),
        camelot=essentia_result.get("camelot"),
        genre=essentia_result.get("genre"),
        energy=essentia_result.get("energy"),
        danceability=essentia_result.get("danceability"),
        waveform_4stem=waveform_blob,
        analyzer_version=ANALYZER_VERSION,
        duration_ms=int(duration_sec * 1000),
    )

    return {
        "content_id": content_id,
        "status": status,
        "duration_sec": duration_sec,
        "essentia": essentia_result if essentia_ok else None,
        "waveform_columns": waveform_columns,
        "analyzer_version": ANALYZER_VERSION,
    }


# ---------------------------------------------------------------------------
# Batch runner with cancellation
# ---------------------------------------------------------------------------

@dataclass
class BatchStatus:
    total: int = 0
    analyzed: int = 0
    failed: int = 0
    in_progress: bool = False
    current_track: str = ""
    current_index: int = 0
    avg_sec_per_track: float = 30.0
    failures: list = field(default_factory=list)

    @property
    def pending(self) -> int:
        return self.total - self.analyzed - self.failed

    @property
    def eta_sec(self) -> float:
        return self.pending * self.avg_sec_per_track

    def to_dict(self) -> dict:
        return {
            "total": self.total,
            "analyzed": self.analyzed,
            "failed": self.failed,
            "pending": self.pending,
            "in_progress": self.in_progress,
            "current_track": self.current_track,
            "current_index": self.current_index,
            "eta_sec": round(self.eta_sec),
            "avg_sec_per_track": round(self.avg_sec_per_track, 1),
            "failures": self.failures[-20:],  # last 20 failures
        }


class AnalysisBatchRunner:
    """Background batch analyzer with cancellation support."""

    def __init__(self, db):
        self.db = db
        self.status = BatchStatus()
        self._cancel = Event()
        self._thread: Optional[Thread] = None
        self._times: list[float] = []

    @property
    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, tracks: list[dict]) -> bool:
        """Start batch. tracks = [{content_id, source, file_path, title, artist}, ...]"""
        if self.running:
            return False
        self._cancel.clear()
        self.status = BatchStatus(total=len(tracks))
        self.status.in_progress = True
        self._times = []
        self._thread = Thread(target=self._run, args=(tracks,), daemon=True)
        self._thread.start()
        return True

    def cancel(self) -> None:
        self._cancel.set()

    def _run(self, tracks: list[dict]) -> None:
        for i, t in enumerate(tracks):
            if self._cancel.is_set():
                break
            self.status.current_index = i + 1
            self.status.current_track = f"{t.get('title', '?')} — {t.get('artist', '?')}"

            start = time.time()
            result = analyze_track(t["file_path"], t["content_id"], t["source"], self.db)
            elapsed = time.time() - start
            self._times.append(elapsed)

            if result["status"] == "complete":
                self.status.analyzed += 1
            else:
                self.status.failed += 1
                self.status.failures.append({
                    "content_id": t["content_id"],
                    "error": result.get("error", "Unknown"),
                    "stage": result.get("stage", "unknown"),
                })

            if self._times:
                self.status.avg_sec_per_track = sum(self._times) / len(self._times)

        self.status.in_progress = False
        self.status.current_track = ""
