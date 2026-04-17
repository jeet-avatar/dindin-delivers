/**
 * TC-API-01..TC-API-05 — API service layer tests
 * Tests: token storage, auth headers, 401 handling, 503 handling, error parsing
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setAccessToken, getAccessToken, sendChatMessage } from '../services/api';

describe('TC-API-01: Token storage', () => {
  it('starts null', () => {
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('stores and retrieves token', () => {
    setAccessToken('test-jwt-token');
    expect(getAccessToken()).toBe('test-jwt-token');
  });

  it('can be cleared', () => {
    setAccessToken('some-token');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

describe('TC-API-02: sendChatMessage — success', () => {
  beforeEach(() => setAccessToken('valid-token'));
  afterEach(() => vi.restoreAllMocks());

  it('returns ChatResponse on 200', async () => {
    const mockResp = {
      response: 'Hello from AI',
      intent: 'general_chat',
      session_id: 'sess-123',
    };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResp,
    } as Response);

    const result = await sendChatMessage('hi', 'sess-123');
    expect(result.response).toBe('Hello from AI');
    expect(result.intent).toBe('general_chat');
    expect(result.session_id).toBe('sess-123');
  });

  it('sends Authorization header when token present', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ response: 'ok', intent: 'x', session_id: 's' }),
    } as Response);

    await sendChatMessage('test');
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    const headers = call[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer valid-token');
  });
});

describe('TC-API-03: sendChatMessage — 401 session expiry', () => {
  afterEach(() => vi.restoreAllMocks());

  it('clears token and dispatches auth:logout on 401', async () => {
    setAccessToken('expired-token');
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({}),
    } as Response);

    await expect(sendChatMessage('hi')).rejects.toThrow('Session expired');
    expect(getAccessToken()).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth:logout' })
    );
  });
});

describe('TC-API-04: sendChatMessage — 503 AI loading', () => {
  afterEach(() => vi.restoreAllMocks());

  it('throws informative error on 503', async () => {
    setAccessToken('token');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({}),
    } as Response);

    await expect(sendChatMessage('hi')).rejects.toThrow('AI model is still loading');
  });
});

describe('TC-API-05: sendChatMessage — generic API error', () => {
  afterEach(() => vi.restoreAllMocks());

  it('uses detail field from error JSON', async () => {
    setAccessToken('token');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'Internal server error' }),
    } as Response);

    await expect(sendChatMessage('hi')).rejects.toThrow('Internal server error');
  });

  it('falls back to "Request failed" when no detail', async () => {
    setAccessToken('token');
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    await expect(sendChatMessage('hi')).rejects.toThrow('Request failed');
  });
});
