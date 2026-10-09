export type ListeningExcerpt = {
  id?: string; created_at?: string; notes: string; model: string;
  start_seconds: number; end_seconds: number; layer: string; intent: string; validation?: string;
  evidence?: { start_rms_dbfs: number; end_rms_dbfs: number; delta_db: number };
};
export type ListeningData = {
  coverage?: { coverage_percent: number; full_coverage: boolean };
  excerpts: ListeningExcerpt[];
  job?: { status: string; completed: number; total: number; intent?: string; started_at?: string;
    error?: string; failures: { start: number; end: number; error: string }[] } | null;
};
export type ListeningRequestReceipt = { intent: string; sentAt: number; whole: boolean; previousJobStartedAt?: string; previousExcerptIds?: string[] };

export function latestListening(saved?: ListeningData, accepted?: ListeningData): ListeningData | undefined {
  if (!accepted?.job) return saved || accepted;
  if (!saved?.job) return accepted;
  const savedTime = Date.parse(saved.job.started_at || "");
  const acceptedTime = Date.parse(accepted.job.started_at || "");
  if (savedTime > acceptedTime) return saved;
  if (saved.job.started_at !== accepted.job.started_at) return accepted;
  if (saved.job.completed < accepted.job.completed) return accepted;
  if (accepted.job.status !== "running" && saved.job.status === "running") return accepted;
  return saved;
}

export function requestWasSaved(data: ListeningData | undefined, request: ListeningRequestReceipt): boolean {
  const after = request.sentAt - 5000;
  return request.whole
    ? data?.job?.intent === request.intent && data.job.started_at !== request.previousJobStartedAt && Date.parse(data.job.started_at || "") >= after
    : Boolean(data?.excerpts.some(e => e.intent === request.intent && !request.previousExcerptIds?.includes(e.id || "") && Date.parse(e.created_at || "") >= after));
}

export function listeningFinished(data?: ListeningData): boolean {
  return Boolean(data?.coverage?.full_coverage && (!data.job || data.job.status === "complete"));
}

export function excerptRangeError(start: number, duration: number, total: number): string {
  return !Number.isFinite(start) || !Number.isFinite(duration) || start < 0 || duration < 5 || duration > 30 || start + duration > total + 0.001
    ? "Choose 5 to 30 seconds within the reference track." : "";
}

export function listeningCoverage(data: ListeningData | undefined, duration: number, intent?: string) {
  const intervals = (data?.excerpts || [])
    .filter(e => e.validation === "checks_passed" && e.layer === "mix" && e.intent === intent &&
      Number.isFinite(e.start_seconds) && Number.isFinite(e.end_seconds))
    .map(e => [Math.max(0, e.start_seconds), Math.min(duration, e.end_seconds)])
    .filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  let end = 0, covered = 0;
  const gaps: [number, number][] = [];
  for (const [start, stop] of intervals) {
    if (start - end > 0.05) gaps.push([end, start]);
    covered += Math.max(0, stop - Math.max(start, end));
    end = Math.max(end, stop);
  }
  if (duration - end > 0.05) gaps.push([end, duration]);
  return { covered, percent: duration > 0 ? Math.min(100, Math.round(covered / duration * 1000) / 10) : 0, gaps };
}
