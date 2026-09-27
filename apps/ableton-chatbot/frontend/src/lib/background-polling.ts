const COOLDOWN_KEY = "beatmind_polling_cooldown";
let cooldownUntil = 0;

function storedCooldown(): number {
  try { return Number(localStorage.getItem(COOLDOWN_KEY)) || 0; }
  catch { return 0; }
}

export function backgroundPollingAllowed(now = Date.now()): boolean {
  return typeof document !== "undefined" && document.visibilityState === "visible"
    && now >= Math.max(cooldownUntil, storedCooldown());
}

export function observePollingResponse(response: Response, now = Date.now()): void {
  if (response.status !== 429) return;
  const retryAfter = response.headers.get("Retry-After");
  const requested = retryAfter === null ? 60000 : /^\d+(\.\d+)?$/.test(retryAfter)
    ? Number(retryAfter) * 1000 : Date.parse(retryAfter) - now;
  const delay = Number.isFinite(requested) ? Math.max(1000, Math.min(300000, requested)) : 60000;
  cooldownUntil = Math.max(cooldownUntil, storedCooldown(), now + delay);
  // Tabs share the API's IP limit, so a 429 must quiet all background polling.
  try { localStorage.setItem(COOLDOWN_KEY, String(cooldownUntil)); } catch { /* Storage can be disabled. */ }
}
