// src/components/ImportFolderButton.tsx
// Phase 21-05: Calls Electron native folder picker via window.mixmind.chooseFolder(),
// then POSTs the chosen folder to sidecar /api/library/import. After a successful
// import, kicks off /api/library/analyze so the AnalyzeProgress component can
// surface live progress.
import { useState } from 'react';
import { sidecarUrl } from '../hooks/useSidecar';

interface ImportResponse {
  batch_id: string;
  imported: number;
  skipped_duplicates: number;
  warnings: string[];
  source: string;
}

interface Props {
  onImported: (resp: ImportResponse) => void;
}

export function ImportFolderButton({ onImported }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ImportResponse | null>(null);
  const [fromRekordbox, setFromRekordbox] = useState(false);

  async function handleClick() {
    setBusy(true);
    setError(null);
    try {
      let folder: string | null = null;

      if (!fromRekordbox) {
        const picker = (window as any).mixmind?.chooseFolder;
        if (!picker) {
          throw new Error('Folder picker unavailable (not running in Electron?)');
        }
        folder = await picker();
        if (!folder) {
          // User cancelled
          setBusy(false);
          return;
        }
      }

      const body: Record<string, unknown> = { from_rekordbox: fromRekordbox };
      if (folder) body.folder_path = folder;

      const res = await fetch(sidecarUrl('/api/library/import'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Import failed (${res.status}): ${text}`);
      }
      const data: ImportResponse = await res.json();
      setLastResult(data);
      onImported(data);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px' }}>
      <button
        onClick={handleClick}
        disabled={busy}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 14px',
          background: 'rgba(124,58,237,0.15)',
          color: '#c084fc',
          border: '1px solid rgba(124,58,237,0.25)',
          borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Importing…' : '📁 Import Folder'}
      </button>
      <label
        style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}
      >
        <input
          type="checkbox"
          checked={fromRekordbox}
          onChange={(e) => setFromRekordbox(e.target.checked)}
          disabled={busy}
        />
        Use existing Rekordbox library
      </label>
      {lastResult && !error && (
        <span style={{ fontSize: 12, color: '#86efac' }}>
          ✓ {lastResult.imported} imported
          {lastResult.skipped_duplicates > 0 && ` · ${lastResult.skipped_duplicates} already present`}
          {lastResult.warnings.length > 0 && ` · ${lastResult.warnings.length} warnings`}
        </span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: '#f87171' }}>
          {error}
        </span>
      )}
    </div>
  );
}
