import { useState } from 'react';
import { api } from '../lib/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Rule { day_of_week: number; start_time: string; end_time: string; }
interface Props { token: string; onSaved: () => void; }

export function AvailabilityEditor({ token, onSaved }: Props) {
  const [rules, setRules] = useState<Rule[]>([{ day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addRule = () => setRules(r => [...r, { day_of_week: 1, start_time: '09:00', end_time: '17:00' }]);
  const removeRule = (i: number) => setRules(r => r.filter((_, idx) => idx !== i));
  const updateRule = (i: number, field: keyof Rule, value: string | number) =>
    setRules(r => r.map((rule, idx) => idx === i ? { ...rule, [field]: value } : rule));

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await api.setAvailability(rules, token);
      onSaved();
    } catch (e: any) {
      setError(e.body?.error === 'overlapping_rules' ? 'Two rules overlap on the same day.' : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {rules.map((rule, i) => (
        <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
          <select
            value={rule.day_of_week}
            onChange={e => updateRule(i, 'day_of_week', Number(e.target.value))}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text)', flex: 1 }}
          >
            {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
          </select>
          <input
            type="time"
            value={rule.start_time}
            onChange={e => updateRule(i, 'start_time', e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text)' }}
          />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input
            type="time"
            value={rule.end_time}
            onChange={e => updateRule(i, 'end_time', e.target.value)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '6px', padding: '6px', color: 'var(--text)' }}
          />
          <button
            onClick={() => removeRule(i)}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
          >×</button>
        </div>
      ))}
      <button
        onClick={addRule}
        style={{ background: 'none', border: '1px dashed var(--border)', borderRadius: '6px', padding: '6px 12px', color: 'var(--text-muted)', cursor: 'pointer', width: '100%', marginBottom: '12px' }}
      >+ Add time slot</button>
      {error && <p style={{ color: '#f5576c', fontSize: '0.82rem' }}>{error}</p>}
      <button className="join-btn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save hours'}</button>
    </div>
  );
}
