type ImportIntent = { stems?: string[]; source_use: { rights_confirmed: boolean; intended_use: string } };

export function importOperation(storage: Storage, referenceId: string, intent: ImportIntent): string {
  const key = `beatmind_import_${referenceId}`;
  const fingerprint = JSON.stringify({ stems: intent.stems ? [...intent.stems].sort() : null, source_use: intent.source_use });
  const saved = storage.getItem(key);
  if (saved) {
    try {
      const previous = JSON.parse(saved);
      if (previous.intent === fingerprint && /^[a-f0-9]{32}$/.test(previous.id)) return previous.id;
    } catch { /* A malformed browser receipt must not become a server identifier. */ }
  }
  const id = crypto.randomUUID().replaceAll("-", "");
  // Fail before sending if the browser cannot retain the retry identity.
  storage.setItem(key, JSON.stringify({ id, intent: fingerprint }));
  return id;
}

export function finishImport(storage: Storage, referenceId: string) {
  storage.removeItem(`beatmind_import_${referenceId}`);
}
