export function getApiBaseUrl() {
  const configured = (import.meta.env.VITE_API_URL || '').trim();
  if (configured) return configured;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:56/api';
  }
  return '/api';
}
