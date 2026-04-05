const BASE = '';  // same origin

async function req<T>(method: string, path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }));
    throw Object.assign(new Error(err.error || 'request_failed'), { status: res.status, body: err });
  }
  return res.json();
}

export const api = {
  registerHost: (name: string, email: string) =>
    req('POST', '/api/host/register', { name, email }),

  exchangeMagic: (token: string) =>
    req<{ token: string }>('POST', '/api/auth/magic', { token }),

  getHost: (slug: string) =>
    req<{ id: string; name: string; timezone: string; slot_minutes: number; default_title: string; calendar_connected: boolean }>('GET', `/api/host/${slug}`),

  getSlots: (slug: string, from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return req<{ slots: string[]; warning?: string }>('GET', `/api/host/${slug}/slots?${params}`);
  },

  getHostMe: (token: string) =>
    req<{ id: string; name: string; email: string; booking_slug: string; timezone: string; slot_minutes: number }>('GET', '/api/host/me', undefined, token),

  updateProfile: (data: object, token: string) =>
    req('PUT', '/api/host/me', data, token),

  setAvailability: (rules: { day_of_week: number; start_time: string; end_time: string }[], token: string) =>
    req('POST', '/api/host/me/availability', { rules }, token),

  bookSlot: (slug: string, data: { scheduled_at: string; guest_name: string; guest_email: string; guest_notes?: string }) =>
    req<{ id: string; room_code: string; join_url: string; title: string; scheduled_at: string }>('POST', `/api/book/${slug}`, data),

  getMeetingByNonce: (nonce: string) =>
    req<{ id: string; title: string; scheduled_at: string; duration_min: number; host_name: string }>('GET', `/api/meeting/by-nonce/${nonce}`),

  cancelMeeting: (nonce: string) =>
    req('POST', '/api/meeting/cancel', { nonce }),
};
