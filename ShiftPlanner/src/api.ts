export type ApiOk<T extends object = object> = { ok: true } & T;
export type ApiFail = { ok: false; error: string };
export type ApiResponse<T extends object = object> = ApiOk<T> | ApiFail;

function getApiBaseUrl() {
  const configured = (import.meta.env.VITE_API_BASE || '').trim();
  if (configured) return configured;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://127.0.0.1:58/api';
  }
  return '/api';
}

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // Check for OneHost token in localStorage
  const token = localStorage.getItem('oh_token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Profile ID
  const profileId = localStorage.getItem('sp_profile') || 'default';
  headers['X-Profile-Id'] = profileId;
  return headers;
}

export async function api<T extends object = object>(
  entity: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<ApiResponse<T>> {
  const profileId = localStorage.getItem('sp_profile') || 'default';
  const res = await fetch(getApiBaseUrl(), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ entity, action, profileId, ...payload }),
  });

  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

// ── Profile management API ──────────────────────────────
export type Profile = { id: string; name: string };

export async function fetchProfiles(): Promise<{ profiles: Profile[]; maxProfiles: number }> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/profiles`, { headers });
  const data = await res.json();
  return { profiles: data.profiles || [], maxProfiles: data.maxProfiles || 1 };
}

export async function createProfile(name: string): Promise<Profile | null> {
  const headers = getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/profiles`, {
    method: 'POST', headers, body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Failed');
  return data.profile;
}

export async function renameProfile(profileId: string, name: string): Promise<void> {
  const headers = getAuthHeaders();
  await fetch(`${getApiBaseUrl()}/profiles/${profileId}`, {
    method: 'PUT', headers, body: JSON.stringify({ name }),
  });
}

export async function deleteProfile(profileId: string): Promise<void> {
  const headers = getAuthHeaders();
  await fetch(`${getApiBaseUrl()}/profiles/${profileId}`, {
    method: 'DELETE', headers,
  });
}

export function getCurrentProfileId(): string {
  return localStorage.getItem('sp_profile') || 'default';
}

export function setCurrentProfileId(id: string): void {
  localStorage.setItem('sp_profile', id);
}
