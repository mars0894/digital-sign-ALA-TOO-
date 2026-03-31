const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

// ── Token helpers (localStorage + cookie sync) ────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

export function saveAuth(token: string, user: AuthUser): void {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('auth_user', JSON.stringify(user));
  // Sync to cookie for middleware (no httpOnly so JS can write it)
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24}; SameSite=Strict`;
}

export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  document.cookie = 'auth_token=; path=/; max-age=0';
  window.location.href = '/login';
}

// ── Authenticated fetch ───────────────────────────────────────────────────

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (res.status === 401) {
    logout();
  }

  return res;
}
