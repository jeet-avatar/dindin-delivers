// src/components/UsbExportWizard.tsx
// Phase 21-05: 3-step USB export wizard.
//   detect  → GET  /api/usb/status (connected / path / name)
//   confirm → user sees mount path + track count, clicks Export
//   running → POST /api/usb/export  (stage → validate → atomic move)
//   done    → shows exported_count, bytes_written, filesystem + validation status
//   error   → surfaces backend error
//
// Payload schema matches ExportRequest in apps/mixmind/sidecar/pioneer_usb.py:
//   {usb_mount_path, tracks: [{content_id, source, title?, artist?, album?}]}
import { useEffect, useState } from 'react';
import { sidecarUrl } from '../hooks/useSidecar';
import { Track } from '../types/track';

interface UsbStatus {
  connected: boolean;
  name?: string;
  path?: string;
  total_gb?: number;
}

interface ExportTrackInput {
  content_id: string;
  source: string;
  title?: string;
  artist?: string;
  album?: string;
}

interface ExportResult {
  status: string;
  exported_count: number;
  bytes_written: number;
  validation_status: string;
  validation_messages: string[];
  filesystem: { status: string; message: string };
}

type WizardStep = 'detect' | 'confirm' | 'running' | 'done' | 'error';

interface Props {
  tracks: Track[];
  onClose: () => void;
}

export function UsbExportWizard({ tracks, onClose }: Props) {
  const [step, setStep] = useState<WizardStep>('detect');
  const [usb, setUsb] = useState<UsbStatus | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(sidecarUrl('/api/usb/status'));
        if (!res.ok) throw new Error(`/api/usb/status returned ${res.status}`);
        const data = (await res.json()) as UsbStatus;
        if (cancelled) return;
        setUsb(data);
        if (data.connected) {
          setStep('confirm');
        }
      } catch (e: any) {
        if (cancelled) return;
        setErrorMsg(e?.message || String(e));
        setStep('error');
      }
    };
    if (step === 'detect') run();
    return () => {
      cancelled = true;
    };
  }, [step]);

  async function runExport() {
    if (!usb?.path) return;
    setStep('running');
    try {
      const payload = {
        usb_mount_path: usb.path,
        tracks: tracks.map<ExportTrackInput>((t) => ({
          content_id: t.content_id,
          source: t.source,
          title: t.title,
          artist: t.artist,
        })),
      };
      const res = await fetch(sidecarUrl('/api/usb/export'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.detail === 'string' ? data.detail : JSON.stringify(data),
        );
      }
      setResult(data as ExportResult);
      setStep('done');
    } catch (e: any) {
      setErrorMsg(e?.message || String(e));
      setStep('error');
    }
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  };

  const panelStyle: React.CSSProperties = {
    background: '#111',
    border: '1px solid #1e1e1e',
    color: '#e5e7eb',
    padding: 28,
    borderRadius: 12,
    maxWidth: 560,
    width: '90%',
  };

  return (
    <div style={overlayStyle}>
      <div style={panelStyle}>
        <h2 style={{ marginTop: 0, fontSize: 18 }}>Export to Pioneer USB</h2>

        {step === 'detect' && (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            🔍 Looking for a mounted Pioneer-ready USB drive…
            <div style={{ marginTop: 12, fontSize: 11, color: '#6b7280' }}>
              Plug your USB in and wait for macOS to mount it.
            </div>
            {usb && !usb.connected && (
              <div style={{ marginTop: 16, color: '#f87171', fontSize: 12 }}>
                No USB with a PIONEER/ folder found. If this is a fresh drive,
                cancel and format it as exFAT first.
              </div>
            )}
            <div style={{ marginTop: 18 }}>
              <button onClick={onClose} style={cancelBtn}>Cancel</button>
            </div>
          </div>
        )}

        {step === 'confirm' && usb && (
          <div>
            <div style={row}>
              <span style={rowLabel}>USB detected</span>
              <span style={rowValue}>{usb.name || usb.path}</span>
            </div>
            <div style={row}>
              <span style={rowLabel}>Mount path</span>
              <span style={{ ...rowValue, fontFamily: 'monospace', fontSize: 11 }}>{usb.path}</span>
            </div>
            {typeof usb.total_gb === 'number' && (
              <div style={row}>
                <span style={rowLabel}>Capacity</span>
                <span style={rowValue}>{usb.total_gb} GB</span>
              </div>
            )}
            <div style={row}>
              <span style={rowLabel}>Tracks to export</span>
              <span style={rowValue}><strong>{tracks.length}</strong></span>
            </div>
            <div
              style={{
                background: '#3a2a00',
                border: '1px solid #594100',
                padding: 10,
                borderRadius: 6,
                marginTop: 14,
                fontSize: 12,
                lineHeight: 1.5,
              }}
            >
              ⚠️ Export will <strong>wipe</strong> the existing
              <code style={{ background: '#111', padding: '0 4px', margin: '0 4px' }}>
                PIONEER/rekordbox/
              </code>
              and
              <code style={{ background: '#111', padding: '0 4px', margin: '0 4px' }}>
                PIONEER/USBANLZ/
              </code>
              on this drive before writing. Audio files in
              <code style={{ background: '#111', padding: '0 4px', margin: '0 4px' }}>
                Contents/
              </code>
              will be replaced too. Continue?
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={cancelBtn}>Cancel</button>
              <button onClick={runExport} style={primaryBtn}>Wipe & Export</button>
            </div>
          </div>
        )}

        {step === 'running' && (
          <div>
            <div style={{ fontSize: 13 }}>⚙️ Exporting {tracks.length} tracks to USB…</div>
            <div style={{ marginTop: 8, fontSize: 11, color: '#6b7280', lineHeight: 1.6 }}>
              Staging under ~/.mixmind/staging/<br />
              Writing PIONEER/rekordbox/export.pdb &amp; exportExt.pdb<br />
              Writing ANLZ files (.DAT / .EXT / .2EX)<br />
              Extracting &amp; encoding artwork (80x80 &amp; 240x240 JPEG)<br />
              Copying audio into Contents/<br />
              Atomic move to USB
            </div>
            <div
              style={{
                background: '#333',
                height: 4,
                borderRadius: 2,
                marginTop: 16,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: '60%',
                  height: '100%',
                  background: '#4af',
                  animation: 'pulse 1.5s ease infinite',
                }}
              />
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div>
            <div style={{ color: '#4ade80', fontSize: 17, fontWeight: 600 }}>✅ Export complete</div>
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {result.exported_count} tracks ·{' '}
              {(result.bytes_written / 1024 / 1024 / 1024).toFixed(2)} GB written
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: '#9ca3af', lineHeight: 1.7 }}>
              <div>Filesystem: {result.filesystem.status} — {result.filesystem.message}</div>
              <div>Validation: {result.validation_status}</div>
              {result.validation_messages.map((m, i) => (
                <div key={i} style={{ color: '#6b7280' }}>· {m}</div>
              ))}
            </div>
            <div
              style={{
                marginTop: 18,
                fontSize: 12,
                color: '#6b7280',
                lineHeight: 1.6,
              }}
            >
              Eject the USB: macOS Finder → click the eject icon next to the drive.
              Plug it into your CDJ-3000 and select the rekordbox source.
            </div>
            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={primaryBtn}>Close</button>
            </div>
          </div>
        )}

        {step === 'error' && (
          <div>
            <div style={{ color: '#f87171', fontSize: 15, fontWeight: 600 }}>❌ Export failed</div>
            <pre
              style={{
                background: '#000',
                border: '1px solid #1e1e1e',
                color: '#fca5a5',
                padding: 12,
                marginTop: 12,
                fontSize: 11,
                overflow: 'auto',
                maxHeight: 220,
                whiteSpace: 'pre-wrap',
              }}
            >
              {errorMsg}
            </pre>
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={cancelBtn}>Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const row: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  padding: '6px 0',
  borderBottom: '1px solid #1e1e1e',
  fontSize: 13,
};

const rowLabel: React.CSSProperties = { color: '#6b7280' };
const rowValue: React.CSSProperties = { color: '#e5e7eb' };

const primaryBtn: React.CSSProperties = {
  background: '#4af',
  color: '#0b0b0b',
  border: 'none',
  padding: '8px 18px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const cancelBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#9ca3af',
  border: '1px solid #1e1e1e',
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
};
