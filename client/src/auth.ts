// Client-side auth helpers. Replaces Firebase Auth with the server-side
// session API (Google OAuth). On localhost the server reports authDisabled
// and returns a "Local Dev" user, so no login screen is shown.

export interface AuthUser {
  id: string;
  provider: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** 'admin' (one person) or 'member'. Decided by the server on every request. */
  role?: 'admin' | 'member';
}

export interface MeResponse {
  user: AuthUser;
  authDisabled: boolean;
}

// Returns the current user, or null when login is required and not signed in.
export async function fetchCurrentUser(): Promise<MeResponse | null> {
  const res = await fetch('/api/me', { credentials: 'include' });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Auth check failed (${res.status})`);
  return res.json();
}

export function loginWithGoogle(): void {
  window.location.href = '/auth/google';
}

export function logout(): void {
  window.location.href = '/auth/logout';
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

/** Ask for a one-time sign-in code by email. */
export const requestOtp = (email: string): Promise<{ ok: boolean; minutes: number }> => postJson('/auth/otp/request', { email });
/** Sign in with the emailed code. */
export const verifyOtp = (email: string, code: string): Promise<{ ok: boolean }> => postJson('/auth/otp/verify', { email, code });
