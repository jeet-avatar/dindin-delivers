/**
 * TC-FE-AUTH-01..TC-FE-AUTH-08 — authService tests
 * Tests: checkEmail, login token storage, register, forgotPassword, resetPassword, logout, currentUser
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkEmail, login, register, forgotPassword, resetPassword, logout, currentUser } from '../services/authService';
import { getAccessToken, setAccessToken } from '../services/api';
import { storage } from '../lib/storage';

// Mock storage so tests don't touch localStorage
vi.mock('../lib/storage', () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
  },
}));

// Mock env so we're always in real (non-mock) mode
vi.mock('../lib/env', () => ({
  isMockMode: () => false,
  apiUrl: () => '',
}));

afterEach(() => {
  vi.restoreAllMocks();
  setAccessToken(null);
});

describe('TC-FE-AUTH-01: checkEmail', () => {
  it('returns true when backend says success:true', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);
    expect(await checkEmail('known@test.com')).toBe(true);
  });

  it('returns false when backend says success:false', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: false }),
    } as Response);
    expect(await checkEmail('unknown@test.com')).toBe(false);
  });

  it('throws on network failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    } as Response);
    await expect(checkEmail('x@y.com')).rejects.toThrow('Failed to check email');
  });
});

describe('TC-FE-AUTH-02: login — token stored in memory only', () => {
  it('stores access_token in memory, never localStorage', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'jwt-abc',
        refresh_token: 'ref-xyz',
        token_type: 'bearer',
        first_name: 'Jane',
        last_name: 'Doe',
        email: 'jane@test.com',
        user_type: 'Administrator',
      }),
    } as Response);

    const result = await login({ username: 'jane@test.com', password: 'Pass@1234' });
    expect(getAccessToken()).toBe('jwt-abc');
    expect(result.user.first_name).toBe('Jane');
    expect(result.user.email).toBe('jane@test.com');
    // Verify localStorage was NOT used directly for the token
    expect(localStorage.getItem('access_token')).toBeNull();
  });

  it('throws on bad credentials', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    } as Response);
    await expect(login({ username: 'x@y.com', password: 'wrong' })).rejects.toThrow('Login failed');
  });
});

describe('TC-FE-AUTH-03: register', () => {
  it('returns response on success', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Verification email sent' }),
    } as Response);

    const result = await register({
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@test.com',
      password: 'Pass@1234',
      organization: 'Acme',
    });
    expect(result.message).toContain('Verification');
  });

  it('throws with server message on 409', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Email already registered' }),
    } as Response);
    await expect(
      register({ first_name: 'J', last_name: 'D', email: 'dup@test.com', password: 'P@ss1', organization: 'X' })
    ).rejects.toThrow('Email already registered');
  });
});

describe('TC-FE-AUTH-04: forgotPassword', () => {
  it('returns token from backend', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'reset-tok-123' }),
    } as Response);
    const tok = await forgotPassword('user@test.com');
    expect(tok).toBe('reset-tok-123');
  });

  it('throws on failure', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false, json: async () => ({})
    } as Response);
    await expect(forgotPassword('x@y.com')).rejects.toThrow('Failed to send reset link');
  });
});

describe('TC-FE-AUTH-05: resetPassword', () => {
  it('returns success on valid token', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Password updated' }),
    } as Response);
    const res = await resetPassword('valid-tok', 'NewPass@1');
    expect(res.message).toBe('Password updated');
  });

  it('throws on invalid/expired token', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false, json: async () => ({})
    } as Response);
    await expect(resetPassword('bad-tok', 'x')).rejects.toThrow('Failed to reset password');
  });
});

describe('TC-FE-AUTH-06: logout clears token', () => {
  it('clears access token from memory on logout', async () => {
    setAccessToken('some-token');
    expect(getAccessToken()).toBe('some-token');
    await logout();
    expect(getAccessToken()).toBeNull();
  });
});

describe('TC-FE-AUTH-07: currentUser', () => {
  it('calls storage.get for auth_user', () => {
    vi.mocked(storage.get).mockReturnValueOnce({ name: 'Jane Doe' });
    const u = currentUser();
    expect(u?.name).toBe('Jane Doe');
  });
});
