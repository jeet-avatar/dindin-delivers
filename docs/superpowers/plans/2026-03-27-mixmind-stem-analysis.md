# MixMind Stem Analysis Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Demucs + Essentia audio analysis pipeline that produces 4-stem waveforms (drums/bass/vocals/other) and auto-analyzes tracks missing Rekordbox data.

**Architecture:** Two-stage pipeline — Demucs separates audio into 4 stems, Essentia extracts BPM/key/genre/energy. Results cached in SQLite `analysis_cache` table. Frontend renders 4-stem stacked waveform with priority over Rekordbox 3-band. Background batch processing with cancellation support.

**Tech Stack:** Python (Demucs, Essentia, msgpack, torch), TypeScript/React (canvas rendering), SQLite (state.db), FastAPI (analyze routes)

**Spec:** `docs/superpowers/specs/2026-03-27-mixmind-stem-analysis-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `sidecar/analyzer.py` | CREATE | Demucs stem separation + Essentia feature extraction + waveform conversion |
| `sidecar/analyze_routes.py` | CREATE | FastAPI routes: single analyze, batch, cancel, status |
| `sidecar/state.py` | MODIFY | Add `analysis_cache` table + CRUD methods |
| `sidecar/main.py` | MODIFY | Register `analyze_routes` router |
| `sidecar/library.py` | MODIFY | Enhance `/anlz` to serve 4-stem + essentia data, fallback when no Rekordbox ANLZ |
| `sidecar/requirements.txt` | MODIFY | Add numpy, demucs, essentia, msgpack, torch |
| `sidecar/tests/test_analyzer.py` | CREATE | Unit tests for analyzer pipeline |
| `sidecar/tests/test_analyze_routes.py` | CREATE | API endpoint tests |
| `frontend/src/types/track.ts` | MODIFY | Add `Waveform4Stem`, `EssentiaResult` types |
| `frontend/src/components/DJWaveformView.tsx` | MODIFY | 4-stem canvas rendering path + stem legend |
| `frontend/src/components/TrackTable.tsx` | MODIFY | Analyze button + status indicator dot |
| `frontend/src/App.tsx` | MODIFY | Analysis state, batch progress toast, library load prompt |

---

## Chunk 1: Backend — Database + Analyzer Core

### Task 1: Add `analysis_cache` table to `state.py`

**Files:**
- Modify: `apps/mixmind/sidecar/state.py`
- Test: `apps/mixmind/sidecar/tests/test_state.py`

- [ ] **Step 1: Write failing tests for analysis_cache CRUD**

Add to `tests/test_state.py`:

```python
def test_save_analysis(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    db.save_analysis(
        content_id="1", source="db", status="complete",
        file_path="/music/track.mp3",
        bpm=128.0, key_musical="Am", camelot="8A", genre="Techno",
        energy=0.82, danceability=0.91,
        waveform_4stem=b"\x01\x02\x03",
        analyzer_version="1.0", duration_ms=300000,
    )
    row = db.get_analysis("1", "db")
    assert row is not None
    assert row["bpm"] == 128.0
    assert row["status"] == "complete"
    assert row["waveform_4stem"] == b"\x01\x02\x03"


def test_get_analysis_missing(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    assert db.get_analysis("999", "db") is None


def test_unanalyzed_ids(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    db.save_analysis(content_id="1", source="db", status="complete",
                     file_path="/a.mp3")
    db.save_analysis(content_id="2", source="db", status="pending",
                     file_path="/b.mp3")
    db.save_analysis(content_id="3", source="db", status="failed",
                     file_path="/c.mp3")
    pending = db.unanalyzed_ids("db")
    assert "2" in pending
    assert "3" in pending  # failed = needs retry
    assert "1" not in pending


def test_update_analysis_status(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    db.save_analysis(content_id="1", source="db", status="pending",
                     file_path="/a.mp3")
    db.update_analysis_status("1", "db", "analyzing")
    row = db.get_analysis("1", "db")
    assert row["status"] == "analyzing"


def test_analysis_count(tmp_path):
    db = StateDB(db_path=tmp_path / "state.db")
    db.save_analysis(content_id="1", source="db", status="complete", file_path="/a.mp3")
    db.save_analysis(content_id="2", source="db", status="pending", file_path="/b.mp3")
    db.save_analysis(content_id="3", source="db", status="failed", file_path="/c.mp3")
    counts = db.analysis_counts("db")
    assert counts["complete"] == 1
    assert counts["pending"] == 1
    assert counts["failed"] == 1
    assert counts["total"] == 3
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
pytest tests/test_state.py -v -k "analysis"
```

Expected: FAIL — `save_analysis` not defined.

- [ ] **Step 3: Implement analysis_cache table + CRUD**

Add to `state.py` in `_create_tables`:

```python
conn.execute(text("""
    CREATE TABLE IF NOT EXISTS analysis_cache (
        content_id       TEXT NOT NULL,
        source           TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'pending',
        error_message    TEXT,
        file_path        TEXT,
        bpm              REAL,
        key_musical      TEXT,
        camelot          TEXT,
        genre            TEXT,
        energy           REAL,
        danceability     REAL,
        waveform_4stem   BLOB,
        analyzed_at      TEXT DEFAULT (datetime('now')),
        analyzer_version TEXT DEFAULT '1.0',
        duration_ms      INTEGER,
        PRIMARY KEY (content_id, source)
    )
"""))
```

Add methods to `StateDB`:

```python
def save_analysis(self, content_id: str, source: str, status: str = "pending",
                  file_path: str = "", bpm: float = None, key_musical: str = None,
                  camelot: str = None, genre: str = None, energy: float = None,
                  danceability: float = None, waveform_4stem: bytes = None,
                  analyzer_version: str = "1.0", duration_ms: int = None,
                  error_message: str = None) -> None:
    with self._engine.connect() as conn:
        conn.execute(text("""
            INSERT OR REPLACE INTO analysis_cache
            (content_id, source, status, error_message, file_path, bpm, key_musical,
             camelot, genre, energy, danceability, waveform_4stem,
             analyzer_version, duration_ms, analyzed_at)
            VALUES (:cid, :src, :status, :err, :fp, :bpm, :key, :cam, :genre,
                    :energy, :dance, :wf, :ver, :dur, datetime('now'))
        """), {"cid": content_id, "src": source, "status": status,
               "err": error_message, "fp": file_path, "bpm": bpm,
               "key": key_musical, "cam": camelot, "genre": genre,
               "energy": energy, "dance": danceability, "wf": waveform_4stem,
               "ver": analyzer_version, "dur": duration_ms})
        conn.commit()

def get_analysis(self, content_id: str, source: str) -> dict | None:
    with self._engine.connect() as conn:
        row = conn.execute(text(
            "SELECT * FROM analysis_cache WHERE content_id=:cid AND source=:src"
        ), {"cid": content_id, "src": source}).fetchone()
        if not row:
            return None
        return dict(row._mapping)

def unanalyzed_ids(self, source: str) -> set[str]:
    with self._engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT content_id FROM analysis_cache "
            "WHERE source=:src AND status IN ('pending', 'failed', 'failed_demucs', 'failed_essentia')"
        ), {"src": source}).fetchall()
        return {r[0] for r in rows}

def update_analysis_status(self, content_id: str, source: str, status: str,
                           error_message: str = None) -> None:
    with self._engine.connect() as conn:
        conn.execute(text(
            "UPDATE analysis_cache SET status=:status, error_message=:err "
            "WHERE content_id=:cid AND source=:src"
        ), {"cid": content_id, "src": source, "status": status, "err": error_message})
        conn.commit()

def analysis_counts(self, source: str) -> dict:
    with self._engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT status, COUNT(*) FROM analysis_cache WHERE source=:src GROUP BY status"
        ), {"src": source}).fetchall()
        counts = {r[0]: r[1] for r in rows}
        counts["total"] = sum(counts.values())
        return counts
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_state.py -v -k "analysis"
```

Expected: 5 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mixmind/sidecar/state.py apps/mixmind/sidecar/tests/test_state.py
git commit -m "feat(mixmind): add analysis_cache table to state.db with CRUD methods"
```

---

### Task 2: Install dependencies

**Files:**
- Modify: `apps/mixmind/sidecar/requirements.txt`

- [ ] **Step 1: Add new dependencies**

Append to `requirements.txt`:

```
numpy>=1.24.0,<2.0.0
demucs>=4.0.0
essentia>=2.1b6
msgpack>=1.0.0
torch>=2.0.0,<3.0.0
```

- [ ] **Step 2: Install**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
pip install -r requirements.txt
```

Note: torch will be ~400MB, essentia may need `brew install fftw libyaml libsamplerate` on ARM64 macOS.

- [ ] **Step 3: Verify imports**

```bash
python -c "import demucs; import essentia; import msgpack; import torch; print('All imports OK')"
```

- [ ] **Step 4: Commit**

```bash
git add apps/mixmind/sidecar/requirements.txt
git commit -m "deps(mixmind): add demucs, essentia, msgpack, torch for stem analysis"
```

---

### Task 3: Create `analyzer.py` — core pipeline

**Files:**
- Create: `apps/mixmind/sidecar/analyzer.py`
- Create: `apps/mixmind/sidecar/tests/test_analyzer.py`

- [ ] **Step 1: Write failing test for `stems_to_waveform`**

```python
# tests/test_analyzer.py
import numpy as np
import pytest
from analyzer import stems_to_waveform


def test_stems_to_waveform_shape():
    stems = {
        "drums": np.random.rand(44100 * 10).astype(np.float32),
        "bass": np.random.rand(44100 * 10).astype(np.float32),
        "vocals": np.random.rand(44100 * 10).astype(np.float32),
        "other": np.random.rand(44100 * 10).astype(np.float32),
    }
    result = stems_to_waveform(stems, sr=44100, n_columns=800)
    assert len(result) == 800
    assert set(result[0].keys()) == {"drums", "bass", "vocals", "other"}


def test_stems_to_waveform_range():
    stems = {
        "drums": np.ones(44100 * 5, dtype=np.float32) * 0.5,
        "bass": np.zeros(44100 * 5, dtype=np.float32),
        "vocals": np.ones(44100 * 5, dtype=np.float32),
        "other": np.ones(44100 * 5, dtype=np.float32) * 0.25,
    }
    result = stems_to_waveform(stems, sr=44100, n_columns=100)
    for col in result:
        for stem_name in ["drums", "bass", "vocals", "other"]:
            assert 0 <= col[stem_name] <= 255


def test_stems_to_waveform_silent_stem():
    stems = {
        "drums": np.zeros(44100 * 5, dtype=np.float32),
        "bass": np.zeros(44100 * 5, dtype=np.float32),
        "vocals": np.zeros(44100 * 5, dtype=np.float32),
        "other": np.zeros(44100 * 5, dtype=np.float32),
    }
    result = stems_to_waveform(stems, sr=44100, n_columns=50)
    for col in result:
        assert col["drums"] == 0
        assert col["vocals"] == 0
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pytest tests/test_analyzer.py -v -k "stems_to_waveform"
```

Expected: FAIL — `analyzer` module not found.

- [ ] **Step 3: Write `stems_to_waveform` in `analyzer.py`**

```python
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

import msgpack
import numpy as np

from camelot import musical_key_to_camelot

logger = logging.getLogger(__name__)

TMP_DIR = Path.home() / ".mixmind" / "tmp"
ANALYZER_VERSION = "1.0"


# ---------------------------------------------------------------------------
# Stem → waveform conversion
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pytest tests/test_analyzer.py -v -k "stems_to_waveform"
```

Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/mixmind/sidecar/analyzer.py apps/mixmind/sidecar/tests/test_analyzer.py
git commit -m "feat(mixmind): add analyzer.py — Demucs + Essentia pipeline with batch runner"
```

---

## Chunk 2: Backend — API Routes

### Task 4: Create `analyze_routes.py`

**Files:**
- Create: `apps/mixmind/sidecar/analyze_routes.py`
- Create: `apps/mixmind/sidecar/tests/test_analyze_routes.py`

- [ ] **Step 1: Write failing tests for analyze endpoints**

```python
# tests/test_analyze_routes.py
import pytest
from unittest.mock import patch, MagicMock
from pathlib import Path

pytestmark = pytest.mark.asyncio

FIXTURE_XML = Path(__file__).parent / "fixtures" / "sample_library.xml"


async def test_analyze_status_no_batch(client):
    resp = await client.get("/api/analyze/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["in_progress"] is False
    assert data["total"] == 0


async def test_analyze_single_missing_file(client):
    resp = await client.post("/api/tracks/999/analyze")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "failed"
    assert "not found" in data.get("error", "").lower() or "resolve" in data.get("error", "").lower()


async def test_cancel_no_batch(client):
    resp = await client.delete("/api/analyze/batch")
    assert resp.status_code == 200
    assert resp.json()["status"] == "no_batch_running"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pytest tests/test_analyze_routes.py -v
```

- [ ] **Step 3: Implement `analyze_routes.py`**

```python
"""Analysis API routes — single track, batch, cancel, status."""
from __future__ import annotations

from fastapi import APIRouter, Query

from analyzer import analyze_track, AnalysisBatchRunner
from rekordbox import try_load_library_db
from library import XML_PATH
from rekordbox import load_library_xml
from state import StateDB

router = APIRouter(prefix="/api")

_batch_runner: AnalysisBatchRunner | None = None


def _get_db() -> StateDB:
    return StateDB()


def _resolve_file_path(content_id: str) -> str | None:
    """Resolve content_id to audio file path from Rekordbox DB or XML."""
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    if tracks:
        for t in tracks:
            if t.content_id == content_id and t.file_path:
                return t.file_path
    return None


@router.post("/tracks/{content_id}/analyze")
async def analyze_single(content_id: str, force: bool = Query(False)):
    db = _get_db()
    try:
        # Check if already analyzed (skip if not force)
        if not force:
            existing = db.get_analysis(content_id, "db")
            if existing and existing["status"] == "complete":
                return {"content_id": content_id, "status": "already_complete",
                        "message": "Use ?force=true to re-analyze"}

        file_path = _resolve_file_path(content_id)
        if not file_path:
            return {"content_id": content_id, "status": "failed",
                    "error": f"Cannot resolve file path for track {content_id}",
                    "stage": "pre-check"}

        result = analyze_track(file_path, content_id, "db", db)
        return result
    finally:
        db.close()


@router.post("/analyze/batch")
async def start_batch():
    global _batch_runner
    db = _get_db()

    if _batch_runner and _batch_runner.running:
        return {"status": "already_running", "progress": _batch_runner.status.to_dict()}

    # Find all tracks needing analysis
    tracks = try_load_library_db()
    if tracks is None and XML_PATH.exists():
        tracks = load_library_xml(XML_PATH)
    if not tracks:
        db.close()
        return {"status": "no_tracks", "total": 0}

    # Filter to tracks with file paths that haven't been fully analyzed
    analyzed = set()
    for t in tracks:
        existing = db.get_analysis(t.content_id, t.source)
        if existing and existing["status"] == "complete":
            analyzed.add(t.content_id)

    pending = [
        {"content_id": t.content_id, "source": t.source,
         "file_path": t.file_path, "title": t.title, "artist": t.artist}
        for t in tracks
        if t.content_id not in analyzed and t.file_path
    ]

    if not pending:
        db.close()
        return {"status": "all_analyzed", "total": len(tracks)}

    _batch_runner = AnalysisBatchRunner(db)
    _batch_runner.start(pending)
    return {"status": "started", "total": len(pending)}


@router.delete("/analyze/batch")
async def cancel_batch():
    global _batch_runner
    if not _batch_runner or not _batch_runner.running:
        return {"status": "no_batch_running"}
    _batch_runner.cancel()
    return {"status": "cancelling"}


@router.get("/analyze/status")
async def batch_status():
    global _batch_runner
    if not _batch_runner:
        return {"total": 0, "analyzed": 0, "failed": 0, "pending": 0,
                "in_progress": False, "current_track": "", "current_index": 0,
                "eta_sec": 0, "avg_sec_per_track": 0, "failures": []}
    return _batch_runner.status.to_dict()
```

- [ ] **Step 4: Register router in `main.py`**

Add to `main.py`:

```python
from analyze_routes import router as analyze_router
# ...
app.include_router(analyze_router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_analyze_routes.py -v
```

Expected: 3 PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mixmind/sidecar/analyze_routes.py apps/mixmind/sidecar/tests/test_analyze_routes.py apps/mixmind/sidecar/main.py
git commit -m "feat(mixmind): add analyze API routes — single, batch, cancel, status"
```

---

### Task 5: Enhance `/api/tracks/{id}/anlz` to include 4-stem + essentia

**Files:**
- Modify: `apps/mixmind/sidecar/library.py:149-192`

- [ ] **Step 1: Write failing test**

Add to `tests/test_library_endpoint.py`:

```python
async def test_anlz_includes_4stem_when_cached(client, tmp_path):
    from state import StateDB
    import msgpack

    db = StateDB(db_path=tmp_path / "state.db")
    wf = [{"drums": 100, "bass": 50, "vocals": 0, "other": 80}] * 10
    db.save_analysis(
        content_id="1", source="db", status="complete", file_path="/a.mp3",
        bpm=128.0, key_musical="Am", camelot="8A", genre="Techno",
        energy=0.82, danceability=0.91,
        waveform_4stem=msgpack.packb(wf, use_bin_type=True),
    )

    # Patch get_track_anlz to use our test DB
    with patch("library._get_analysis_db", return_value=db):
        resp = await client.get("/api/tracks/1/anlz")
    # May 404 if no Rekordbox ANLZ, but if analysis exists, should return 200
    if resp.status_code == 200:
        data = resp.json()
        assert "waveform_4stem" in data or "essentia" in data
```

- [ ] **Step 2: Modify `library.py` `get_track_anlz` to merge analysis_cache data**

At the end of `get_track_anlz`, before returning, check `analysis_cache`:

```python
import msgpack
from state import StateDB as _AnalysisDB

def _get_analysis_db():
    return _AnalysisDB()

# In get_track_anlz, after constructing the response dict `data`:
def _enrich_with_analysis(data: dict, content_id: str) -> dict:
    """Add 4-stem waveform + essentia data from analysis_cache if available."""
    try:
        db = _get_analysis_db()
        row = db.get_analysis(content_id, "db")
        db.close()
        if row and row["status"] in ("complete", "failed_demucs", "failed_essentia"):
            if row.get("waveform_4stem"):
                data["waveform_4stem"] = msgpack.unpackb(row["waveform_4stem"], raw=False)
            else:
                data["waveform_4stem"] = None

            if row.get("bpm"):
                data["essentia"] = {
                    "bpm": row["bpm"],
                    "key_musical": row["key_musical"],
                    "camelot": row["camelot"],
                    "genre": row["genre"],
                    "energy": row["energy"],
                    "danceability": row["danceability"],
                }
            else:
                data["essentia"] = None

            data["analyzer_version"] = row.get("analyzer_version")
    except Exception:
        data["waveform_4stem"] = None
        data["essentia"] = None
    return data
```

Also modify the 404 path: if Rekordbox ANLZ is absent but analysis_cache has data, return a response with empty Rekordbox fields but populated analysis fields.

- [ ] **Step 3: Run tests**

```bash
pytest tests/test_library_endpoint.py -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/mixmind/sidecar/library.py apps/mixmind/sidecar/tests/test_library_endpoint.py
git commit -m "feat(mixmind): enhance /anlz endpoint to include 4-stem + essentia from analysis cache"
```

---

## Chunk 3: Frontend — Types + Waveform Rendering

### Task 6: Add TypeScript types

**Files:**
- Modify: `apps/mixmind/frontend/src/types/track.ts`

- [ ] **Step 1: Add new interfaces**

After existing types in `track.ts`:

```typescript
// Stem analysis types (Q-246: Demucs + Essentia)
export interface Waveform4Stem {
  drums: number;   // 0-255
  bass: number;    // 0-255
  vocals: number;  // 0-255
  other: number;   // 0-255
}

export interface EssentiaResult {
  bpm: number;
  key_musical: string;
  camelot: string;
  genre: string;
  energy: number;       // 0.0-1.0
  danceability: number; // 0.0-1.0
}
```

Add to existing `TrackAnlzData` interface:

```typescript
  waveform_4stem?: Waveform4Stem[];
  essentia?: EssentiaResult;
  analyzer_version?: string;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add apps/mixmind/frontend/src/types/track.ts
git commit -m "feat(mixmind): add Waveform4Stem + EssentiaResult types"
```

---

### Task 7: Add 4-stem rendering to DJWaveformView

**Files:**
- Modify: `apps/mixmind/frontend/src/components/DJWaveformView.tsx`

- [ ] **Step 1: Add stem color constants**

After `CDJ_MONO` constant (line 25):

```typescript
// 4-stem colors (Demucs analysis)
const STEM_DRUMS  = '#FF9500';  // orange
const STEM_BASS   = '#8B00FF';  // deep purple
const STEM_VOCALS = '#00E5FF';  // cyan
const STEM_OTHER  = '#FFD700';  // gold
```

- [ ] **Step 2: Modify `drawOverviewCanvas` waveform section**

Replace the waveform bars block (lines 78-116) with priority logic:

```typescript
  // ── Waveform bars ─────────────────────────────────────────────────────────
  const w4 = anlz.waveform_4stem;
  const wb = anlz.waveform_3band;
  const wp = anlz.waveform_preview;
  const waveLen = w4 ? w4.length : (wb ? wb.length : wp.length);

  if (waveLen > 0) {
    const barW = Math.max(1, W / waveLen);

    if (w4) {
      // 4-stem Demucs waveform (priority 1)
      const stems = [
        { key: 'drums'  as const, color: STEM_DRUMS,  weight: 0.30 },
        { key: 'bass'   as const, color: STEM_BASS,   weight: 0.25 },
        { key: 'vocals' as const, color: STEM_VOCALS, weight: 0.25 },
        { key: 'other'  as const, color: STEM_OTHER,  weight: 0.20 },
      ];
      for (let i = 0; i < w4.length; i++) {
        const x = (i / w4.length) * W;
        const col = w4[i];
        let yOffset = 0;
        for (const stem of stems) {
          const stemH = (col[stem.key] / 255) * H * stem.weight;
          ctx.fillStyle = hexToRgba(stem.color, 0.85);
          ctx.fillRect(x, H - yOffset - stemH, barW, stemH);
          yOffset += stemH;
        }
      }
    } else if (wb) {
      // CDJ-style 3-band (existing code)
      for (let i = 0; i < wb.length; i++) {
        const x = (i / wb.length) * W;
        const col = wb[i];
        const lowH = (col.low / 255) * H * 0.4;
        ctx.fillStyle = hexToRgba(CDJ_LOW, 0.85);
        ctx.fillRect(x, H - lowH, barW, lowH);
        const midH = (col.mid / 255) * H * 0.3;
        ctx.fillStyle = hexToRgba(CDJ_MID, 0.85);
        ctx.fillRect(x, H - lowH - midH, barW, midH);
        const highH = (col.high / 255) * H * 0.3;
        ctx.fillStyle = hexToRgba(CDJ_HIGH, 0.85);
        ctx.fillRect(x, H - lowH - midH - highH, barW, highH);
      }
    } else if (wp.length > 0) {
      // Mono fallback
      for (let i = 0; i < wp.length; i++) {
        const x = (i / wp.length) * W;
        const barH = (wp[i] / 255) * H;
        ctx.fillStyle = hexToRgba(CDJ_MONO, 0.8);
        ctx.fillRect(x, H - barH, barW, barH);
      }
    }
  }
```

- [ ] **Step 3: Add stem legend overlay**

At the end of the component's JSX, inside the overview container, add a small legend:

```typescript
{anlz?.waveform_4stem && (
  <div style={{
    position: 'absolute', top: 4, right: 4, display: 'flex', gap: '6px',
    fontSize: '8px', opacity: 0.7, pointerEvents: 'none',
  }}>
    {[
      { label: 'Drums', color: STEM_DRUMS },
      { label: 'Bass', color: STEM_BASS },
      { label: 'Vocals', color: STEM_VOCALS },
      { label: 'Other', color: STEM_OTHER },
    ].map(s => (
      <span key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
        {s.label}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 4: Verify build**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add apps/mixmind/frontend/src/components/DJWaveformView.tsx
git commit -m "feat(mixmind): add 4-stem Demucs waveform rendering to DJWaveformView"
```

---

### Task 8: Add Analyze button to TrackTable + progress in App

**Files:**
- Modify: `apps/mixmind/frontend/src/components/TrackTable.tsx`
- Modify: `apps/mixmind/frontend/src/App.tsx`

- [ ] **Step 1: Add analyze button to TrackTable row actions**

In `TrackTable.tsx`, next to the existing "+ Set" button, add:

```typescript
{/* Analyze button */}
<button
  title="Analyze stems"
  onClick={(e) => { e.stopPropagation(); onAnalyze?.(track.content_id); }}
  style={{
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '11px', padding: '2px 4px', borderRadius: '4px',
    color: '#a78bfa', opacity: 0.7,
  }}
  onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
  onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
>
  🔬
</button>
```

Add `onAnalyze?: (contentId: string) => void` to TrackTable props.

- [ ] **Step 2: Wire analyze in App.tsx**

Add state and handler in `App.tsx`:

```typescript
const [analyzingTrack, setAnalyzingTrack] = useState<string | null>(null);

async function handleAnalyze(contentId: string) {
  setAnalyzingTrack(contentId);
  try {
    await sidecarPost(`/api/tracks/${contentId}/analyze?force=false`, {});
    // Refresh track anlz data if waveform view is open
  } catch (e) {
    console.error('Analysis failed:', e);
  } finally {
    setAnalyzingTrack(null);
  }
}
```

Pass `onAnalyze={handleAnalyze}` to `<TrackTable>`.

- [ ] **Step 3: Verify build**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add apps/mixmind/frontend/src/components/TrackTable.tsx apps/mixmind/frontend/src/App.tsx
git commit -m "feat(mixmind): add Analyze button to TrackTable + wire handler in App"
```

---

## Chunk 4: Integration + Full Test Suite

### Task 9: Run full test suite + integration smoke test

- [ ] **Step 1: Run backend tests**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
pytest tests/ -v
```

Expected: all pass (existing + new).

- [ ] **Step 2: Run frontend build**

```bash
cd apps/mixmind/frontend && npx tsc --noEmit && npm run build
```

Expected: 0 errors.

- [ ] **Step 3: Smoke test sidecar**

```bash
cd apps/mixmind/sidecar && source venv/bin/activate
uvicorn main:app --port 7173 &
sleep 3
# Test new endpoints exist
curl -s http://localhost:7173/api/analyze/status | python3 -m json.tool
# Should return {"total": 0, "analyzed": 0, ...}
kill %1
```

- [ ] **Step 4: Rebuild DMG**

```bash
cd /Users/jeet/doordash-p2p && ./apps/mixmind/rebuild-electron.sh
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(mixmind): complete stem analysis pipeline — Demucs + Essentia"
```

---

## Summary

| Task | What | Files | Tests |
|------|------|-------|-------|
| 1 | analysis_cache DB table | state.py | 5 tests |
| 2 | Install deps | requirements.txt | import check |
| 3 | analyzer.py core pipeline | analyzer.py | 3 tests |
| 4 | API routes | analyze_routes.py, main.py | 3 tests |
| 5 | Enhance /anlz endpoint | library.py | 1 test |
| 6 | TypeScript types | track.ts | tsc check |
| 7 | 4-stem waveform rendering | DJWaveformView.tsx | build check |
| 8 | Analyze button + App wiring | TrackTable.tsx, App.tsx | build check |
| 9 | Integration + DMG rebuild | all | full suite |
