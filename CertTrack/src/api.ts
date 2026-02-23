const BASE = '/api';
const ONEHOST_BASE = import.meta.env.VITE_ONEHOST_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:55' : 'https://sklep.onehost.site');

function getToken(): string | null {
  return localStorage.getItem('oh_token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('oh_token', token);
  else localStorage.removeItem('oh_token');
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const profileId = localStorage.getItem('ct_profile') || '0';
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Profile-Id': profileId };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + url, { headers, ...options });

  if (res.status === 401) {
    setToken(null);
    const ohUrl = `${ONEHOST_BASE}/login`;
    window.location.href = ohUrl;
    throw new Error('unauthorized');
  }
  if (res.status === 403) {
    const data = await res.json();
    if (data.error === 'subscription_expired' || data.error === 'no_access') {
      const ohUrl = `${ONEHOST_BASE}/dashboard`;
      window.location.href = ohUrl;
    }
    throw new Error(data.error || data.message || 'forbidden');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export type AuthUser = { id: number; email: string; name: string; role: string; company_name: string };
export type SubscriptionInfo = {
  plan: string; status: string; trialEndsAt: string;
  hasAccess: boolean; trialActive: boolean; subActive: boolean; daysLeft: number | null;
};
export type MeResponse = { user: AuthUser; subscription: SubscriptionInfo };

export const api = {
  // Auth (via OneHost)
  me: () => request<MeResponse>('/auth/me'),

  // Dashboard
  dashboard: () => request<import('./types').DashboardData>('/dashboard'),

  // Categories
  getCategories: () => request<import('./types').Category[]>('/categories'),
  createCategory: (data: Partial<import('./types').Category>) =>
    request<{ id: number }>('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id: number, data: Partial<import('./types').Category>) =>
    request<{ ok: boolean }>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id: number) =>
    request<{ ok: boolean }>(`/categories/${id}`, { method: 'DELETE' }),

  // Employees
  getEmployees: () => request<import('./types').Employee[]>('/employees'),
  getEmployee: (id: number) => request<import('./types').Employee>(`/employees/${id}`),
  createEmployee: (data: Partial<import('./types').Employee>) =>
    request<{ id: number }>('/employees', { method: 'POST', body: JSON.stringify(data) }),
  updateEmployee: (id: number, data: Partial<import('./types').Employee>) =>
    request<{ ok: boolean }>(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEmployee: (id: number) =>
    request<{ ok: boolean }>(`/employees/${id}`, { method: 'DELETE' }),

  // Certificates
  getCertificates: () => request<import('./types').Certificate[]>('/certificates'),
  getEmployeeCertificates: (empId: number) =>
    request<import('./types').Certificate[]>(`/certificates/employee/${empId}`),
  createCertificate: (data: Partial<import('./types').Certificate>) =>
    request<{ id: number }>('/certificates', { method: 'POST', body: JSON.stringify(data) }),
  updateCertificate: (id: number, data: Partial<import('./types').Certificate>) =>
    request<{ ok: boolean }>(`/certificates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCertificate: (id: number) =>
    request<{ ok: boolean }>(`/certificates/${id}`, { method: 'DELETE' }),

  // File upload
  uploadCertFile: async (certId: number, file: File) => {
    const token = localStorage.getItem('oh_token');
    const profileId = localStorage.getItem('ct_profile') || '0';
    const fd = new FormData();
    fd.append('file', file);
    const headers: Record<string, string> = { 'X-Profile-Id': profileId };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/certificates/${certId}/upload`, {
      method: 'POST',
      headers,
      body: fd,
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'Upload failed'); }
    return res.json() as Promise<{ file_name: string }>;
  },
  deleteCertFile: (certId: number) =>
    request<{ ok: boolean }>(`/certificates/${certId}/file`, { method: 'DELETE' }),
  getFileUrl: (filename: string) => {
    const token = localStorage.getItem('oh_token');
    return `${BASE}/files/${filename}${token ? `?token=${token}` : ''}`;
  },

  // PDF export
  downloadEmployeePdf: async (empId: number) => {
    const token = localStorage.getItem('oh_token');
    const profileId = localStorage.getItem('ct_profile') || '0';
    const res = await fetch(`${BASE}/employees/${empId}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}`, 'X-Profile-Id': profileId } : { 'X-Profile-Id': profileId },
    });
    if (!res.ok) throw new Error('PDF generation failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uprawnienia-${empId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },

  // CSV Import
  importEmployees: (rows: Record<string, string>[]) =>
    request<{ imported: number; errors: string[]; total: number }>('/import/employees', { method: 'POST', body: JSON.stringify({ rows }) }),
  importCertificates: (rows: Record<string, string>[]) =>
    request<{ imported: number; errors: string[]; total: number }>('/import/certificates', { method: 'POST', body: JSON.stringify({ rows }) }),

  // Profiles
  getProfiles: () => request<{ id: number; tenant_id: number; name: string; created_at: string }[]>('/profiles'),
};
