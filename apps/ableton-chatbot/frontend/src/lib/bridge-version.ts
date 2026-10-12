export function bridgeVersionMessage(installed?: string | null, latest?: string | null): string {
  if (!installed) return "Connected. Waiting for the Bridge to report its installed version.";
  if (!latest) return `Running Bridge ${installed}. Checking the latest release...`;
  if (installed === latest) return `Bridge ${installed} · Latest version confirmed`;
  const parse = (version: string) => /^\d+\.\d+\.\d+$/.test(version) ? version.split(".").map(Number) : null;
  const current = parse(installed), target = parse(latest);
  if (current && target) {
    for (let index = 0; index < 3; index++) {
      if (current[index] < target[index]) return `Running Bridge ${installed} · Update to ${latest} is still needed. Open Bridge and choose Install update.`;
      if (current[index] > target[index]) return `Running Bridge ${installed} · Newer than published release ${latest}`;
    }
  }
  return `Running Bridge ${installed} · Latest published release: ${latest}`;
}
