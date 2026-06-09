// Client-side auth helpers. Replaces Firebase Auth with the server-side
// session API (Google OAuth). On localhost the server reports authDisabled
// and returns a "Local Dev" user, so no login screen is shown.

export interface AuthUser {
  id: string;
  provider: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
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
