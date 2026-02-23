export type Category = {
  id: number;
  name: string;
  description: string;
  alert_days_before: number;
  color: string;
  created_at: string;
};

export type Employee = {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  hire_date: string;
  active: number;
  notes: string;
  created_at: string;
};

export type Certificate = {
  id: number;
  employee_id: number;
  category_id: number;
  cert_number: string;
  issued_date: string;
  expiry_date: string;
  issuer: string;
  notes: string;
  file_name: string;
  created_at: string;
  // joined fields
  first_name?: string;
  last_name?: string;
  emp_position?: string;
  department?: string;
  category_name?: string;
  category_color?: string;
  alert_days_before?: number;
};

export type DashboardData = {
  totalEmployees: number;
  totalCerts: number;
  expired: number;
  expiring7: number;
  expiring30: number;
  expiring60: number;
  valid: number;
  urgentList: Array<{
    id: number;
    expiry_date: string;
    cert_number: string;
    first_name: string;
    last_name: string;
    emp_position: string;
    category_name: string;
    category_color: string;
  }>;
  byCategory: Array<{
    name: string;
    color: string;
    total: number;
    expired: number;
    expiring_soon: number;
  }>;
};

export type CertStatus = 'expired' | 'critical' | 'warning' | 'ok';

export function getCertStatus(expiryDate: string): CertStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'critical';
  if (diffDays <= 30) return 'warning';
  return 'ok';
}

export function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDatePL(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
