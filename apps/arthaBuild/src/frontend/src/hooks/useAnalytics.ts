import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const EXCLUDED_PATHS = [
  '/dashboard', '/chat', '/history', '/profile', '/settings',
  '/help', '/guide', '/admin', '/mfa-setup',
  '/oauth/callback', '/accept-invite', '/verify-email',
];

function isExcluded(path: string): boolean {
  return EXCLUDED_PATHS.some(p => path === p || path.startsWith(p + '/'));
}

function getSessionId(): string {
  let id = sessionStorage.getItem('ab_sid');
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('ab_sid', id);
  }
  return id;
}

function getUtmParams() {
  const params = new URLSearchParams(window.location.search);
  const utms: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
    const val = params.get(key);
    if (val) {
      utms[key] = val;
      sessionStorage.setItem(key, val);
    } else {
      const stored = sessionStorage.getItem(key);
      if (stored) utms[key] = stored;
    }
  }
  return utms;
}

function send(payload: object) {
  const url = '/api/analytics/collect';
  const data = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }));
  } else {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: data, keepalive: true }).catch(() => {});
  }
}

export function trackEvent(element: string, eventType: string, value?: string) {
  send({
    type: 'event',
    session_id: getSessionId(),
    page: window.location.pathname,
    event_type: eventType,
    element,
    value,
    ...getUtmParams(),
  });
}

export function useAnalytics() {
  const location = useLocation();
  const scrollRef = useRef(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    if (isExcluded(location.pathname)) return;

    const sessionId = getSessionId();
    const utms = getUtmParams();

    // Pageview
    send({
      type: 'pageview',
      session_id: sessionId,
      page: location.pathname,
      referrer: document.referrer,
      ...utms,
    });

    scrollRef.current = 0;
    startTimeRef.current = Date.now();

    // Scroll depth
    function onScroll() {
      const el = document.documentElement;
      const depth = Math.round((window.scrollY / (el.scrollHeight - el.clientHeight)) * 100);
      if (depth > scrollRef.current) scrollRef.current = depth;
    }
    window.addEventListener('scroll', onScroll, { passive: true });

    // Unload — send final update
    function onUnload() {
      send({
        type: 'update',
        session_id: sessionId,
        page: location.pathname,
        scroll_depth: scrollRef.current,
        time_on_page: Math.round((Date.now() - startTimeRef.current) / 1000),
        ...utms,
      });
    }
    window.addEventListener('pagehide', onUnload);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onUnload);
      // Send update on route change
      send({
        type: 'update',
        session_id: sessionId,
        page: location.pathname,
        scroll_depth: scrollRef.current,
        time_on_page: Math.round((Date.now() - startTimeRef.current) / 1000),
        ...utms,
      });
    };
  }, [location.pathname]);
}
