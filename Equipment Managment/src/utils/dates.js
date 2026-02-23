export function calcDaysLeft(lastDate, intervalDays) {
  const last = new Date(lastDate);
  const expiry = new Date(last);
  expiry.setDate(expiry.getDate() + intervalDays);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
}

export function getExpiryDate(lastDate, intervalDays) {
  const last = new Date(lastDate);
  const expiry = new Date(last);
  expiry.setDate(expiry.getDate() + intervalDays);
  return expiry;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function getStatusInfo(daysLeft) {
  if (daysLeft <= 0)
    return { label: 'Przeterminowane', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-500', priority: 0 };
  if (daysLeft <= 7)
    return { label: 'Krytyczne', color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500', priority: 1 };
  if (daysLeft <= 30)
    return { label: 'Wkrótce', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-500', priority: 2 };
  if (daysLeft <= 90)
    return { label: 'W porządku', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500', priority: 3 };
  return { label: 'OK', color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-500', priority: 4 };
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
