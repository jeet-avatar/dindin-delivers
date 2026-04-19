import { useEffect, useState } from 'react';
import { getAccessToken } from '../services/api';

interface LicenseStatus {
  valid: boolean;
  mode?: string;
  hours_remaining?: number;
  plan?: string;
  sales_email?: string;
  scripts_used?: number | null;
  scripts_limit?: number | null;
}

export const LicenseBanner = () => {
  const [status, setStatus] = useState<LicenseStatus | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/license/status', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStatus(data); })
      .catch(() => {});
  }, []);

  if (!status) return null;

  const salesEmail = status.sales_email || 'sales@artha.build';

  // Invalid/expired license banner (existing behaviour — show when invalid)
  if (!status.valid) {
    const isGrace = status.mode === 'grace';
    const bg = isGrace ? '#7c5a00' : '#7a1f1f';
    const msg = isGrace
      ? `License server unreachable — grace period: ${Math.round(status.hours_remaining || 0)}h remaining. Contact ${salesEmail}`
      : `License invalid or expired. Contact ${salesEmail} to activate.`;
    return (
      <div style={{
        background: bg, color: '#fff', padding: '8px 20px',
        textAlign: 'center', fontSize: '0.83rem', fontWeight: 500,
        position: 'sticky', top: 0, zIndex: 1000,
      }}>
        {msg}
      </div>
    );
  }

  // Free-tier usage indicator (show when on dev plan with a script limit)
  const isFreePlan = status.plan === 'dev' && status.scripts_limit !== null && status.scripts_limit !== undefined;
  if (!isFreePlan) return null;

  const used = status.scripts_used ?? 0;
  const limit = status.scripts_limit as number;
  const remaining = limit - used;
  const pct = used / limit;

  let bg = '#1a472a';          // green: 0-3 used (< 80%)
  if (pct >= 1) bg = '#7a1f1f';        // red: maxed out
  else if (pct >= 0.8) bg = '#7c5a00'; // amber: 4/5 used (>= 80%)

  const usageMsg = remaining > 0
    ? `Free plan: ${used} of ${limit} script generations used this month (${remaining} remaining) — upgrade at ${salesEmail}`
    : `Free plan: script generation limit reached (${limit}/${limit}) — contact ${salesEmail} to upgrade`;

  return (
    <div style={{
      background: bg, color: '#fff', padding: '8px 20px',
      textAlign: 'center', fontSize: '0.83rem', fontWeight: 500,
      position: 'sticky', top: 0, zIndex: 1000,
    }}>
      {usageMsg}
    </div>
  );
};
