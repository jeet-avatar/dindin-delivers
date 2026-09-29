"""Shared loudness and spectral-balance measurement, used by mix_check, sound_comparison and bus_mastering."""

import re
import subprocess

import numpy as np

RATE = 44100


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBTP) of an audio file."""
    report = subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-i", str(path), "-filter_complex",
                             "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True, timeout=60).stderr
    summary = report[report.rfind("Summary:"):]
    integrated = re.search(r"I:\s+(-?[\d.]+|-inf) LUFS", summary)
    peak = re.search(r"Peak:\s+(-?[\d.]+|-inf) dBFS", summary)
    if not integrated or not peak:
        raise ValueError("Loudness could not be measured.")
    value = lambda match: float("-inf") if match.group(1) == "-inf" else float(match.group(1))
    return value(integrated), value(peak)


def stereo_samples(path):
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-nostdin", "-i", str(path), "-ac", "2", "-ar", str(RATE),
                              "-f", "f32le", "pipe:1"], capture_output=True, timeout=60)
    samples = np.frombuffer(decoded.stdout, dtype="<f4").astype(float).reshape(-1, 2)
    if samples.shape[0] < RATE:
        raise ValueError("The recording is too short to analyse.")
    return samples


def band_shares(samples):
    """Percent of spectral energy (20 Hz and up) in each named band."""
    mono = samples.mean(axis=1)
    spectrum = np.abs(np.fft.rfft(mono * np.hanning(mono.size))) ** 2
    frequencies = np.fft.rfftfreq(mono.size, 1 / RATE)
    total = float(spectrum[frequencies >= 20].sum()) or 1.0
    share = lambda low, high: round(100 * float(spectrum[(frequencies >= low) & (frequencies < high)].sum()) / total, 1)
    return {"low": share(20, 120), "mud": share(200, 500), "harsh": share(2000, 5000)}
