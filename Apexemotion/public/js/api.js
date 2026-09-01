export const API_BASE = 'https://apexemotion.onrender.com';

export async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('ksm_access_token');
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  const contentType = res.headers.get('content-type') || '';

  if (!res.ok) {
    let errorBody = null;
    if (contentType.includes('application/json')) {
      errorBody = await res.json();
    } else {
      errorBody = await res.text();
    }
    throw new Error(typeof errorBody === 'string' ? errorBody : errorBody?.detail || `Request failed: ${res.status}`);
  }

  return contentType.includes('application/json') ? res.json() : res.text();
}
