const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

// ── Token helpers (localStorage + cookie sync) ────────────────────────────

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Fallback to checking the js-accessible cookie if it exists contextually,
  // but the real auth token is now HttpOnly and tracked silently by the browser.
  // We return a dummy value if user object exists to satisfy `isAuthenticated` UI checks.
  return getUser() ? "cookie-driven" : null;
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
  // Token is now set on the backend via HttpOnly Cookie. 
  // We only persist the non-sensitive metadata for UI usage.
  localStorage.setItem('auth_user', JSON.stringify(user));
}

export async function logout(): Promise<void> {
  localStorage.removeItem('auth_user');
  
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });
  } catch (e) {
    console.error("Logout request failed", e);
  }
  
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

  if (token && token !== "cookie-driven") {
    headers['Authorization'] = `Bearer ${token}`; // Fallback for backwards compatibility if needed locally
  }

  const csrfToken = getCookie('XSRF-TOKEN');
  if (csrfToken && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, { 
      ...options, 
      headers,
      credentials: 'include' 
  });

  if (res.status === 401 && !endpoint.includes('/auth/')) {
    logout();
  }

  return res;
}

export async function verify2fa(email: string, code: string, preAuthToken: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/auth/verify-2fa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, code, preAuthToken }),
  });

  if (res.ok) {
    const data = await res.json();
    saveAuth(data.token, {
      id: data.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: data.roles,
    });
    return true;
  }
  return false;
}
