export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

const getCookie = (name: string) => {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  // Tokens are now managed via HttpOnly cookies by the backend.
  // We don't append Authorization header from localStorage anymore.
  
  const csrfToken = getCookie('XSRF-TOKEN');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;

  if (csrfToken && options.method && !['GET', 'HEAD', 'OPTIONS'].includes(options.method.toUpperCase())) {
    headers['X-XSRF-TOKEN'] = csrfToken;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  return response;
};
