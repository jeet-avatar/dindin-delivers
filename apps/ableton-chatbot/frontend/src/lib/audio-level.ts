export function levelHint(peak: number, rms?: number): { title: string; detail: string; warning: boolean } | null {
  if (!Number.isFinite(peak)) return null;
  if (peak >= -1) return { title: "Very little peak headroom", detail: "Increasing gain may clip the output. Check the track and Main meters before raising it.", warning: true };
  if (peak < -24) return { title: "Quiet preview, not necessarily missing audio", detail: "Check the sample output, track fader and Main level. Short kicks can have a low average level even when their peaks are audible.", warning: true };
  if (rms !== undefined && Number.isFinite(rms) && rms < -40) return { title: "Low average level", detail: "This may be a sparse or short sound. Check the sample and pattern before increasing gain.", warning: true };
  return null;
}
