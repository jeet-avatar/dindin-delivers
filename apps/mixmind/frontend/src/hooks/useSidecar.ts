// src/hooks/useSidecar.ts

// Port is sent from Electron main via IPC, or use default for browser dev
const DEFAULT_PORT = 8765;

let _port: number = DEFAULT_PORT;

// Listen for port from Electron IPC
if (typeof window !== 'undefined' && (window as any).mixmind?.onSidecarPort) {
  (window as any).mixmind.onSidecarPort((port: number) => { _port = port; });
}

export function sidecarUrl(path: string): string {
  return `http://127.0.0.1:${_port}${path}`;
}

export async function sidecarGet<T>(path: string): Promise<T> {
  const res = await fetch(sidecarUrl(path));
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function sidecarPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(sidecarUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function sidecarDelete(path: string): Promise<void> {
  const res = await fetch(sidecarUrl(path), { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`);
}
