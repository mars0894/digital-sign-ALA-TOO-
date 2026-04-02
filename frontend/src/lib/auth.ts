const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

// ── Auth helpers (HttpOnly cookie based) ────────────────────────────

/**
 * Gets the token from cookies (if accessible, though it should be HttpOnly)
 * or checks for existence of auth_token cookie.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(^| )auth_token=([^;]+)/);
  return match ? match[2] : null;
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
  // We check for the cookie name in document.cookie. 
  // Note: If the cookie is HttpOnly, it won't appear in document.cookie.
  // In that case, we might need a separate 'is_logged_in' session cookie (non-HttpOnly)
  // or rely on the backend returning 401.
  return !!getToken() || !!localStorage.getItem('auth_user');
}

export function saveAuth(token: string, user: AuthUser): void {
  // We no longer manually set the token in localStorage.
  // The backend sets the HttpOnly cookie.
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export function logout(): void {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  // Clear cookie by setting expiry to past
  document.cookie = 'auth_token=; path=/; max-age=0; SameSite=Strict';
  window.location.href = '/login';
}

// ── Authenticated fetch ───────────────────────────────────────────────────

export async function authFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // Use credentials: 'include' to send HttpOnly cookies automatically
  const res = await fetch(`${API_BASE}${endpoint}`, { 
    ...options, 
    headers,
    credentials: 'include' 
  });

  if (res.status === 401) {
    logout();
  }

  return res;
}
