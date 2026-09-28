export type UpdateNotice = { web: boolean; bridge: string | null };

function versionParts(version: string): number[] {
  return (version.match(/\d+/g) || []).slice(0, 3).map(Number);
}

export function newerVersion(latest: string, current: string): boolean {
  const a = versionParts(latest), b = versionParts(current);
  for (let i = 0; i < 3; i++) {
    const difference = (a[i] || 0) - (b[i] || 0);
    if (difference) return difference > 0;
  }
  return false;
}

// The page never reloads itself: an open song keeps playing until the user clicks Reload.
export function updateNotice(built: string | undefined, release: unknown, bridgeVersion: string | null, latest: unknown): UpdateNotice {
  const deployed = release && typeof release === "object" && "frontend_commit" in release ? String(release.frontend_commit) : "";
  const newest = latest && typeof latest === "object" && "version" in latest ? String(latest.version) : "";
  return {
    web: Boolean(built && deployed && built !== deployed),
    bridge: bridgeVersion && newest && newerVersion(newest, bridgeVersion) ? newest : null,
  };
}
