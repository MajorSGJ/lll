import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Certificate, Category } from '../types'
import { getCertStatus, daysUntilExpiry, formatDatePL } from '../types'
import { Search, Filter, Download, Award } from 'lucide-react'

function StatusBadge({ status, days }: { status: string; days: number }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    expired: { cls: 'status-expired', label: `Wygasło ${Math.abs(days)} dni temu` },
    critical: { cls: 'status-critical', label: `${days} dni!` },
    warning: { cls: 'status-warning', label: `${days} dni` },
    ok: { cls: 'status-ok', label: `${days} dni` },
  }
  const c = cfg[status] || cfg.ok
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}

export function CertificatesPage() {
  const [certs, setCerts] = useState<Certificate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')

  const load = () => {
    Promise.all([api.getCertificates(), api.getCategories()])
      .then(([c, cats]) => { setCerts(c); setCategories(cats) })
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => certs.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || `${c.first_name} ${c.last_name} ${c.category_name} ${c.cert_number} ${c.issuer}`.toLowerCase().includes(q)
    const matchCat = !filterCat || String(c.category_id) === filterCat
    const status = getCertStatus(c.expiry_date)
    const matchStatus = !filterStatus || status === filterStatus
    return matchSearch && matchCat && matchStatus
  }), [certs, search, filterCat, filterStatus])

  function exportCSV() {
    const BOM = '\uFEFF'
    const header = 'Pracownik;Stanowisko;Dział;Kategoria;Nr certyfikatu;Data wydania;Data ważności;Wystawca;Status;Dni do wygaśnięcia\n'
    const rows = filtered.map(c => {
      const days = daysUntilExpiry(c.expiry_date)
      const status = getCertStatus(c.expiry_date)
      const statusLabel = status === 'expired' ? 'WYGASŁO' : status === 'critical' ? 'KRYTYCZNE' : status === 'warning' ? 'OSTRZEŻENIE' : 'OK'
      return `${c.first_name} ${c.last_name};${c.emp_position || ''};${c.department || ''};${c.category_name};${c.cert_number};${c.issued_date};${c.expiry_date};${c.issuer};${statusLabel};${days}`
    }).join('\n')
    const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `certtrack-uprawnienia-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-slate-400 p-8">Ładowanie...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uprawnienia i certyfikaty</h1>
          <p className="text-sm text-slate-500">{filtered.length} z {certs.length} łącznie</p>
        </div>
        <button onClick={exportCSV}
          className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 bg-white text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
          <Download className="w-4 h-4" /> Eksport Excel
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Szukaj..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Wszystkie kategorie</option>
          {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
          <option value="">Wszystkie statusy</option>
          <option value="expired">Wygasłe</option>
          <option value="critical">Krytyczne (&lt;7 dni)</option>
          <option value="warning">Ostrzeżenie (&lt;30 dni)</option>
          <option value="ok">Ważne</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pracownik</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Kategoria</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Nr certyfikatu</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Wydano</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Wygasa</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(cert => {
                const days = daysUntilExpiry(cert.expiry_date)
                const status = getCertStatus(cert.expiry_date)
                return (
                  <tr key={cert.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/employees/${cert.employee_id}`} className="hover:text-brand-600 transition-colors">
                        <div className="font-medium text-slate-800">{cert.first_name} {cert.last_name}</div>
                        <div className="text-xs text-slate-400">{cert.emp_position}</div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cert.category_color }} />
                        <span className="text-slate-700">{cert.category_name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{cert.cert_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDatePL(cert.issued_date)}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDatePL(cert.expiry_date)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} days={days} />
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {search || filterCat || filterStatus ? 'Brak wyników dla wybranych filtrów' : 'Brak uprawnień w systemie'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
