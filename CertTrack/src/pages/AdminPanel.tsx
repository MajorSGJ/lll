import { useState, useEffect, useCallback } from 'react'
import {
  Shield, BarChart3, Building2, CreditCard, Mail, Users,
  Plus, Trash2, Pencil, X, Save, Send, Eye, EyeOff, ChevronRight,
  AlertTriangle, CheckCircle, Clock, Activity, Wallet
} from 'lucide-react'

const BASE = '/api'
function adminToken() { return localStorage.getItem('certtrack_admin_token') }

async function adminReq<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = adminToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(BASE + url, { headers, ...opts })
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('certtrack_admin_token')
    window.location.href = '/admin'
    throw new Error('unauthorized')
  }
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `HTTP ${res.status}`) }
  return res.json()
}

// ── Login ────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await fetch(BASE + '/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd logowania')
      localStorage.setItem('certtrack_admin_token', data.token)
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd')
    } finally { setBusy(false) }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-900">CertTrack Admin</div>
            <div className="text-xs text-slate-400">Panel administracyjny</div>
          </div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} autoFocus
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Hasło</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-sm">
            {busy ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a href="/login" className="text-xs text-slate-400 hover:text-slate-600">← Powrót do CertTrack</a>
        </div>
      </div>
    </div>
  )
}

// ── Stats Tab ────────────────────────────────────────────
type Stats = { totalTenants: number; totalUsers: number; totalEmployees: number; totalCerts: number; activeSubs: number; trialingSubs: number; expiredSubs: number; verifiedUsers: number; recentTenants: any[] }

function StatsTab() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => { adminReq<Stats>('/admin/stats').then(setStats).catch(() => {}) }, [])
  if (!stats) return <div className="text-slate-400 p-8">Ładowanie...</div>

  const cards = [
    { label: 'Firmy', value: stats.totalTenants, icon: Building2, color: 'bg-blue-500' },
    { label: 'Użytkownicy', value: stats.totalUsers, icon: Users, color: 'bg-purple-500' },
    { label: 'Pracownicy', value: stats.totalEmployees, icon: Activity, color: 'bg-green-500' },
    { label: 'Certyfikaty', value: stats.totalCerts, icon: CheckCircle, color: 'bg-cyan-500' },
    { label: 'Aktywne sub.', value: stats.activeSubs, icon: CreditCard, color: 'bg-emerald-500' },
    { label: 'Trial', value: stats.trialingSubs, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Wygasłe', value: stats.expiredSubs, icon: AlertTriangle, color: 'bg-red-500' },
    { label: 'Zweryfikowani', value: stats.verifiedUsers, icon: Mail, color: 'bg-indigo-500' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${c.color} flex items-center justify-center`}>
                <c.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs text-slate-500">{c.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-900">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Ostatnie rejestracje</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-slate-50 border-b">
              <th className="text-left px-3 py-2 font-semibold">Firma</th>
              <th className="text-left px-3 py-2 font-semibold">Plan</th>
              <th className="text-left px-3 py-2 font-semibold">Status</th>
              <th className="text-left px-3 py-2 font-semibold">Użytk.</th>
              <th className="text-left px-3 py-2 font-semibold">Prac.</th>
              <th className="text-left px-3 py-2 font-semibold">Data</th>
            </tr></thead>
            <tbody>
              {stats.recentTenants.map((t: any) => (
                <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{t.company_name}</td>
                  <td className="px-3 py-2">{t.plan}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.subscription_status === 'active' ? 'bg-green-100 text-green-700' : t.subscription_status === 'trialing' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {t.subscription_status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{t.user_count}</td>
                  <td className="px-3 py-2">{t.emp_count}</td>
                  <td className="px-3 py-2 text-slate-400">{t.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Tenants Tab ──────────────────────────────────────────
function TenantsTab() {
  const [tenants, setTenants] = useState<any[]>([])
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ plan: '', subscription_status: '', trial_ends_at: '' })
  const load = useCallback(() => { adminReq<any[]>('/admin/tenants').then(setTenants).catch(() => {}) }, [])
  useEffect(load, [load])

  async function saveTenant() {
    if (!editId) return
    await adminReq(`/admin/tenants/${editId}`, { method: 'PUT', body: JSON.stringify(editForm) })
    setEditId(null)
    load()
  }

  async function deleteTenant(id: number, name: string) {
    if (!confirm(`USUNĄĆ firmę "${name}" i wszystkie jej dane? Tej operacji nie można cofnąć!`)) return
    await adminReq(`/admin/tenants/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-slate-900">Firmy ({tenants.length})</h2>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-slate-50 border-b">
            <th className="text-left px-3 py-2.5 font-semibold">ID</th>
            <th className="text-left px-3 py-2.5 font-semibold">Firma</th>
            <th className="text-left px-3 py-2.5 font-semibold">Plan</th>
            <th className="text-left px-3 py-2.5 font-semibold">Status</th>
            <th className="text-left px-3 py-2.5 font-semibold">Trial do</th>
            <th className="text-left px-3 py-2.5 font-semibold">Użytk.</th>
            <th className="text-left px-3 py-2.5 font-semibold">Prac.</th>
            <th className="text-left px-3 py-2.5 font-semibold">Cert.</th>
            <th className="text-right px-3 py-2.5 font-semibold">Akcje</th>
          </tr></thead>
          <tbody>
            {tenants.map(t => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-3 py-2 text-slate-400">{t.id}</td>
                <td className="px-3 py-2 font-medium">{t.company_name}</td>
                <td className="px-3 py-2">{editId === t.id ? <input value={editForm.plan} onChange={e => setEditForm(f => ({ ...f, plan: e.target.value }))} className="w-20 px-1 py-0.5 border rounded text-xs" /> : t.plan}</td>
                <td className="px-3 py-2">{editId === t.id ? <select value={editForm.subscription_status} onChange={e => setEditForm(f => ({ ...f, subscription_status: e.target.value }))} className="px-1 py-0.5 border rounded text-xs">
                  <option value="trialing">trialing</option><option value="active">active</option><option value="canceled">canceled</option><option value="past_due">past_due</option>
                </select> : <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.subscription_status === 'active' ? 'bg-green-100 text-green-700' : t.subscription_status === 'trialing' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{t.subscription_status}</span>}</td>
                <td className="px-3 py-2">{editId === t.id ? <input type="date" value={editForm.trial_ends_at} onChange={e => setEditForm(f => ({ ...f, trial_ends_at: e.target.value }))} className="px-1 py-0.5 border rounded text-xs" /> : t.trial_ends_at}</td>
                <td className="px-3 py-2">{t.user_count}</td>
                <td className="px-3 py-2">{t.emp_count}</td>
                <td className="px-3 py-2">{t.cert_count}</td>
                <td className="px-3 py-2 text-right">
                  {editId === t.id ? (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={saveTenant} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditId(t.id); setEditForm({ plan: t.plan, subscription_status: t.subscription_status, trial_ends_at: t.trial_ends_at }) }} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteTenant(t.id, t.company_name)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Plans Tab ────────────────────────────────────────────
function PlansTab() {
  const [plans, setPlans] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ key: '', name: '', max_employees: 25, max_users: 3, price_pln: 99, sort_order: 0 })
  const [editKey, setEditKey] = useState<string | null>(null)
  const load = useCallback(() => { adminReq<any[]>('/admin/plans').then(setPlans).catch(() => {}) }, [])
  useEffect(load, [load])

  async function handleSave() {
    try {
      if (editKey) {
        await adminReq(`/admin/plans/${editKey}`, { method: 'PUT', body: JSON.stringify(form) })
      } else {
        await adminReq('/admin/plans', { method: 'POST', body: JSON.stringify(form) })
      }
      setShowAdd(false); setEditKey(null)
      setForm({ key: '', name: '', max_employees: 25, max_users: 3, price_pln: 99, sort_order: 0 })
      load()
    } catch (e) { alert(e instanceof Error ? e.message : 'Błąd') }
  }

  async function deletePlan(key: string) {
    if (!confirm(`Usunąć plan "${key}"?`)) return
    await adminReq(`/admin/plans/${key}`, { method: 'DELETE' })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-900">Plany ({plans.length})</h2>
        <div className="flex gap-2">
          <button onClick={async () => {
            if (!confirm('Zsynchronizować wszystkie plany ze Stripe? Wymaga skonfigurowanego klucza API.')) return;
            try {
              const r = await adminReq<any>('/admin/plans/sync-stripe', { method: 'POST' });
              alert(`Zsynchronizowano! ${r.results?.filter((x:any)=>x.ok).length}/${r.results?.length} planów.`);
              load();
            } catch (e) { alert(e instanceof Error ? e.message : 'Błąd'); }
          }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 text-white text-sm font-medium rounded-lg hover:bg-slate-800">
            <Activity className="w-4 h-4" /> Sync Stripe
          </button>
          <button onClick={() => { setShowAdd(true); setEditKey(null); setForm({ key: '', name: '', max_employees: 25, max_users: 3, price_pln: 99, sort_order: 0 }) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
            <Plus className="w-4 h-4" /> Dodaj plan
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.key} className={`bg-white rounded-xl border-2 p-5 ${p.active ? 'border-slate-200' : 'border-red-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono text-slate-400">{p.key}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${p.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{p.active ? 'AKTYWNY' : 'WYŁĄCZONY'}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
            <div className="text-2xl font-bold text-slate-900 mt-1">{p.price_pln} <span className="text-sm text-slate-400">zł/mies.</span></div>
            <div className="mt-3 space-y-1 text-xs text-slate-600">
              <div>Pracownicy: <strong>{p.max_employees}</strong></div>
              <div>Konta: <strong>{p.max_users}</strong></div>
              <div>Stripe: {p.stripe_price_id ? <span className="text-green-600 font-medium">Zsynchronizowany</span> : <span className="text-amber-600 font-medium">Brak — zapisz plan ponownie</span>}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex gap-1">
              <button onClick={() => { setEditKey(p.key); setForm({ key: p.key, name: p.name, max_employees: p.max_employees, max_users: p.max_users, price_pln: p.price_pln, sort_order: p.sort_order }); setShowAdd(true) }}
                className="flex-1 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1"><Pencil className="w-3 h-3" /> Edytuj</button>
              <button onClick={() => deletePlan(p.key)}
                className="py-1.5 px-3 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{editKey ? 'Edytuj plan' : 'Nowy plan'}</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              {!editKey && <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Klucz (np. premium)</label>
                <input value={form.key} onChange={e => setForm(f => ({ ...f, key: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>}
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Nazwa</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Max pracowników</label>
                  <input type="number" value={form.max_employees} onChange={e => setForm(f => ({ ...f, max_employees: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Max kont</label>
                  <input type="number" value={form.max_users} onChange={e => setForm(f => ({ ...f, max_users: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Cena (PLN/mies.)</label>
                  <input type="number" value={form.price_pln} onChange={e => setForm(f => ({ ...f, price_pln: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Kolejność</label>
                  <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Anuluj</button>
                <button onClick={handleSave} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Zapisz</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SMTP Tab ─────────────────────────────────────────────
function SmtpTab() {
  const [form, setForm] = useState({ host: '', port: 587, user: '', pass: '', from: '', secure: false })
  const [showPass, setShowPass] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminReq<any>('/admin/settings/smtp').then(d => {
      setForm({ host: d.host || '', port: d.port || 587, user: d.user || '', pass: d.pass || '', from: d.from || '', secure: d.secure || false })
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true); setMsg('')
    try {
      await adminReq('/admin/settings/smtp', { method: 'PUT', body: JSON.stringify(form) })
      setMsg('Zapisano!')
    } catch (e) { setMsg('Błąd: ' + (e instanceof Error ? e.message : '')) }
    finally { setSaving(false) }
  }

  async function handleTest() {
    if (!testEmail) return
    setMsg('')
    try {
      const r = await adminReq<{ ok: boolean; message: string }>('/admin/settings/smtp/test', { method: 'POST', body: JSON.stringify({ to: testEmail }) })
      setMsg(r.message)
    } catch (e) { setMsg('Błąd: ' + (e instanceof Error ? e.message : '')) }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-xl font-bold text-slate-900">Konfiguracja SMTP</h2>
      <p className="text-sm text-slate-500">Ustawienia serwera email do wysyłki wiadomości weryfikacyjnych i powiadomień.</p>
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Host SMTP</label>
            <input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))} placeholder="smtp.gmail.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Port</label>
            <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Użytkownik</label>
            <input value={form.user} onChange={e => setForm(f => ({ ...f, user: e.target.value }))} placeholder="user@domain.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Hasło</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} value={form.pass} onChange={e => setForm(f => ({ ...f, pass: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm pr-8" />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-2 top-2.5 text-slate-400">{showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
            </div>
          </div>
        </div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Adres nadawcy (From)</label>
          <input value={form.from} onChange={e => setForm(f => ({ ...f, from: e.target.value }))} placeholder="noreply@onehost.site" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={form.secure} onChange={e => setForm(f => ({ ...f, secure: e.target.checked }))} className="rounded" />
          SSL/TLS (port 465)
        </label>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
            <Save className="w-4 h-4 inline mr-1" /> {saving ? 'Zapisywanie...' : 'Zapisz'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Test wysyłki</h3>
        <div className="flex gap-2">
          <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@email.com" className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          <button onClick={handleTest} className="px-4 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-900">
            <Send className="w-4 h-4 inline mr-1" /> Wyślij test
          </button>
        </div>
      </div>
      {msg && <div className={`p-3 rounded-lg text-sm ${msg.startsWith('Błąd') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{msg}</div>}
    </div>
  )
}

// ── Admins Tab ───────────────────────────────────────────
function AdminsTab() {
  const [admins, setAdmins] = useState<any[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', name: '' })
  const [error, setError] = useState('')
  const load = useCallback(() => { adminReq<any[]>('/admin/admins').then(setAdmins).catch(() => {}) }, [])
  useEffect(load, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError('')
    try {
      await adminReq('/admin/admins', { method: 'POST', body: JSON.stringify(form) })
      setShowAdd(false); setForm({ email: '', password: '', name: '' }); load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Błąd') }
  }

  async function handleDelete(id: number) {
    if (!confirm('Usunąć tego admina?')) return
    try { await adminReq(`/admin/admins/${id}`, { method: 'DELETE' }); load() }
    catch (e) { alert(e instanceof Error ? e.message : 'Błąd') }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Super-admini ({admins.length})</h2>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
          <Plus className="w-4 h-4" /> Dodaj admina
        </button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 border-b">
            <th className="text-left px-4 py-2.5 font-semibold">Email</th>
            <th className="text-left px-4 py-2.5 font-semibold">Nazwa</th>
            <th className="text-left px-4 py-2.5 font-semibold">Data</th>
            <th className="text-right px-4 py-2.5 font-semibold">Akcje</th>
          </tr></thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{a.email}</td>
                <td className="px-4 py-2.5 text-slate-500">{a.name || '—'}</td>
                <td className="px-4 py-2.5 text-xs text-slate-400">{a.created_at?.slice(0, 10)}</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => handleDelete(a.id)} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Nowy super-admin</h3>
            {error && <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>}
            <form onSubmit={handleAdd} className="space-y-3">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Nazwa</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Hasło (min. 8 znaków)</label>
                <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" /></div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Anuluj</button>
                <button type="submit" className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">Dodaj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Payment Tab ──────────────────────────────────────────
function PaymentTab() {
  const [form, setForm] = useState({ stripe_secret_key: '', currency_name: 'PLN', internal_currency_name: 'PLN', stripe_payment_methods: 'card' })
  const [showKey, setShowKey] = useState(false)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    adminReq<any>('/admin/settings/payment').then(d => {
      setForm({ stripe_secret_key: d.stripe_secret_key || '', currency_name: d.currency_name || 'PLN', internal_currency_name: d.internal_currency_name || 'PLN', stripe_payment_methods: d.stripe_payment_methods || 'card' })
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true); setMsg('')
    try {
      await adminReq('/admin/settings/payment', { method: 'PUT', body: JSON.stringify(form) })
      setMsg('Zapisano!')
    } catch (e) { setMsg('Błąd: ' + (e instanceof Error ? e.message : '')) }
    finally { setSaving(false) }
  }

  const settings = [
    { key: 'internal_currency_name', label: 'Nazwa wirtualnej waluty (np. monety, kredyty, tokeny). Widoczna w saldach, cenach i emailach.', field: 'internal_currency_name' },
    { key: 'currency_name', label: 'Kod waluty rzeczywistej (USD, EUR, GBP, PLN). Wyświetlany przy zakupie i na paragonach. Dopasuj do Stripe.', field: 'currency_name' },
    { key: 'stripe_secret_key', label: 'Sekretny klucz API Stripe (zaczyna się od sk_). Wymagany do płatności. Zachowaj poufność.', field: 'stripe_secret_key', secret: true },
    { key: 'stripe_payment_methods', label: 'Metody płatności oddzielone przecinkami (np. card,bank_transfer,klarna). Opcje widoczne przy zakupie.', field: 'stripe_payment_methods' },
  ]

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-bold text-slate-900">Payment Ustawienia</h2>
      <p className="text-sm text-slate-500">Konfiguracja płatności Stripe i waluty.</p>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Nazwa ustawienia</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Wartość ustawienia</th>
            </tr>
          </thead>
          <tbody>
            {settings.map(s => (
              <tr key={s.key} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="text-sm text-slate-700">{s.label}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">({s.field})</div>
                </td>
                <td className="px-4 py-3">
                  {s.secret ? (
                    <div className="relative">
                      <input
                        type={showKey ? 'text' : 'password'}
                        value={(form as any)[s.field]}
                        onChange={e => setForm(f => ({ ...f, [s.field]: e.target.value }))}
                        placeholder="sk_live_..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono pr-8"
                      />
                      <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-2 top-2.5 text-slate-400">
                        {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <input
                      value={(form as any)[s.field]}
                      onChange={e => setForm(f => ({ ...f, [s.field]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50">
          <Save className="w-4 h-4 inline mr-1" /> {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
        {msg && <span className={`text-sm ${msg.startsWith('Błąd') ? 'text-red-600' : 'text-green-600'}`}>{msg}</span>}
      </div>
    </div>
  )
}

// ── Main Admin Panel ─────────────────────────────────────
type Tab = 'stats' | 'tenants' | 'plans' | 'payment' | 'smtp' | 'admins'

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'stats', label: 'Dashboard', icon: BarChart3 },
  { key: 'tenants', label: 'Firmy', icon: Building2 },
  { key: 'plans', label: 'Plany', icon: CreditCard },
  { key: 'payment', label: 'Płatności', icon: Wallet },
  { key: 'smtp', label: 'SMTP / Email', icon: Mail },
  { key: 'admins', label: 'Administratorzy', icon: Users },
]

export function AdminPanel() {
  const [authed, setAuthed] = useState(!!adminToken())
  const [tab, setTab] = useState<Tab>('stats')

  // Verify token on mount
  useEffect(() => {
    if (!adminToken()) return
    adminReq('/admin/me').catch(() => { localStorage.removeItem('certtrack_admin_token'); setAuthed(false) })
  }, [])

  if (!authed) return <AdminLogin onLogin={() => setAuthed(true)} />

  return (
    <div className="flex h-screen bg-slate-100">
      <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-slate-700">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">CertTrack</div>
            <div className="text-[10px] text-slate-400">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${tab === t.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {tab === 'stats' && <StatsTab />}
        {tab === 'tenants' && <TenantsTab />}
        {tab === 'plans' && <PlansTab />}
        {tab === 'payment' && <PaymentTab />}
        {tab === 'smtp' && <SmtpTab />}
        {tab === 'admins' && <AdminsTab />}
      </main>
    </div>
  )
}
