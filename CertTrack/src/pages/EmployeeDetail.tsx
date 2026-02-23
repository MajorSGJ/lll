import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import type { Employee, Certificate, Category } from '../types'
import { getCertStatus, daysUntilExpiry, formatDatePL } from '../types'
import { ArrowLeft, Plus, Award, Pencil, Trash2, X, Save, FileDown, Paperclip, FileText, Download } from 'lucide-react'

function StatusBadge({ status, days }: { status: string; days: number }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    expired: { cls: 'status-expired', label: `Wygasło ${Math.abs(days)} dni temu` },
    critical: { cls: 'status-critical', label: `Wygasa za ${days} dni!` },
    warning: { cls: 'status-warning', label: `Wygasa za ${days} dni` },
    ok: { cls: 'status-ok', label: `Ważne (${days} dni)` },
  }
  const c = cfg[status] || cfg.ok
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.cls}`}>
      {c.label}
    </span>
  )
}

const emptyForm = { category_id: 0, cert_number: '', issued_date: '', expiry_date: '', issuer: '', notes: '' }

export function EmployeeDetail() {
  const { id } = useParams<{ id: string }>()
  const empId = Number(id)

  const [emp, setEmp] = useState<Employee | null>(null)
  const [certs, setCerts] = useState<Certificate[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [empForm, setEmpForm] = useState<Partial<Employee>>({})
  const [showAddCert, setShowAddCert] = useState(false)
  const [certForm, setCertForm] = useState(emptyForm)
  const [editCertId, setEditCertId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    try {
      const [e, c, cats] = await Promise.all([
        api.getEmployee(empId),
        api.getEmployeeCertificates(empId),
        api.getCategories(),
      ])
      setEmp(e)
      setCerts(c)
      setCategories(cats)
      setEmpForm(e)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [empId])

  async function saveEmployee(ev: React.FormEvent) {
    ev.preventDefault()
    if (!emp) return
    setSaving(true)
    try {
      await api.updateEmployee(emp.id, empForm as Employee)
      setEditing(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function addCert(ev: React.FormEvent) {
    ev.preventDefault()
    if (!certForm.category_id || !certForm.issued_date || !certForm.expiry_date) return
    setSaving(true)
    try {
      if (editCertId) {
        await api.updateCertificate(editCertId, { ...certForm, employee_id: empId })
      } else {
        await api.createCertificate({ ...certForm, employee_id: empId })
      }
      setCertForm(emptyForm)
      setShowAddCert(false)
      setEditCertId(null)
      load()
    } finally {
      setSaving(false)
    }
  }

  function startEditCert(cert: Certificate) {
    setEditCertId(cert.id)
    setCertForm({
      category_id: cert.category_id,
      cert_number: cert.cert_number,
      issued_date: cert.issued_date,
      expiry_date: cert.expiry_date,
      issuer: cert.issuer,
      notes: cert.notes,
    })
    setShowAddCert(true)
  }

  async function deleteCert(cert: Certificate) {
    if (!confirm(`Usunąć uprawnienie "${cert.category_name}"?`)) return
    await api.deleteCertificate(cert.id)
    load()
  }

  if (loading) return <div className="text-slate-400 p-8">Ładowanie...</div>
  if (!emp) return <div className="text-red-500 p-8">Nie znaleziono pracownika</div>

  return (
    <div className="space-y-6">
      <Link to="/employees" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Powrót do listy
      </Link>

      {/* Employee info card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xl font-bold">
              {emp.first_name[0]}{emp.last_name[0]}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{emp.first_name} {emp.last_name}</h1>
              <div className="text-sm text-slate-500">{emp.position || 'Brak stanowiska'} · {emp.department || 'Brak działu'}</div>
              {emp.email && <div className="text-xs text-slate-400 mt-0.5">{emp.email}</div>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => api.downloadEmployeePdf(empId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <FileDown className="w-3.5 h-3.5" /> Eksport PDF
            </button>
            <button onClick={() => setEditing(!editing)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Pencil className="w-3.5 h-3.5" /> {editing ? 'Anuluj edycję' : 'Edytuj dane'}
            </button>
          </div>
        </div>

        {editing && (
          <form onSubmit={saveEmployee} className="mt-4 pt-4 border-t border-slate-100 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Imię</label>
                <input value={empForm.first_name || ''} onChange={e => setEmpForm(f => ({ ...f, first_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nazwisko</label>
                <input value={empForm.last_name || ''} onChange={e => setEmpForm(f => ({ ...f, last_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stanowisko</label>
                <input value={empForm.position || ''} onChange={e => setEmpForm(f => ({ ...f, position: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dział</label>
                <input value={empForm.department || ''} onChange={e => setEmpForm(f => ({ ...f, department: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={empForm.email || ''} onChange={e => setEmpForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                <input value={empForm.phone || ''} onChange={e => setEmpForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notatki</label>
              <textarea value={empForm.notes || ''} onChange={e => setEmpForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" /> {saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Certificates */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-600" /> Uprawnienia i certyfikaty ({certs.length})
          </h2>
          <button onClick={() => { setEditCertId(null); setCertForm(emptyForm); setShowAddCert(true) }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
            <Plus className="w-4 h-4" /> Dodaj uprawnienie
          </button>
        </div>

        {certs.length > 0 ? (
          <div className="space-y-2">
            {certs.map(cert => {
              const days = daysUntilExpiry(cert.expiry_date)
              const status = getCertStatus(cert.expiry_date)
              return (
                <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cert.category_color }} />
                    <div>
                      <div className="text-sm font-medium text-slate-800">{cert.category_name}</div>
                      <div className="text-xs text-slate-500">
                        {cert.cert_number && <span>Nr: {cert.cert_number} · </span>}
                        Wydano: {formatDatePL(cert.issued_date)} · Wygasa: {formatDatePL(cert.expiry_date)}
                        {cert.issuer && <span> · {cert.issuer}</span>}
                      </div>
                      {cert.notes && <div className="text-xs text-slate-400 mt-0.5">{cert.notes}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={status} days={days} />
                    {cert.file_name ? (
                      <a href={api.getFileUrl(cert.file_name)} target="_blank" rel="noreferrer"
                        className="p-1 text-green-500 hover:text-green-700 transition-colors" title="Pobierz skan">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <label className="p-1 text-slate-400 hover:text-brand-600 transition-colors cursor-pointer" title="Dodaj skan">
                        <Paperclip className="w-3.5 h-3.5" />
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={async (e) => { const f = e.target.files?.[0]; if (f) { await api.uploadCertFile(cert.id, f); load(); } }} />
                      </label>
                    )}
                    <button onClick={() => startEditCert(cert)} className="p-1 text-slate-400 hover:text-brand-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteCert(cert)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-sm text-slate-400 py-6 text-center">
            Brak uprawnień — dodaj pierwsze uprawnienie powyżej
          </div>
        )}
      </div>

      {/* Add/Edit cert modal */}
      {showAddCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowAddCert(false); setEditCertId(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editCertId ? 'Edytuj uprawnienie' : 'Nowe uprawnienie'}</h2>
              <button onClick={() => { setShowAddCert(false); setEditCertId(null) }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={addCert} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kategoria *</label>
                <select required value={certForm.category_id || ''} onChange={e => setCertForm(f => ({ ...f, category_id: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">— wybierz kategorię —</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Numer certyfikatu</label>
                <input value={certForm.cert_number} onChange={e => setCertForm(f => ({ ...f, cert_number: e.target.value }))}
                  placeholder="np. EN-ISO-9606-1/2024/001"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data wydania *</label>
                  <input type="date" required value={certForm.issued_date} onChange={e => setCertForm(f => ({ ...f, issued_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data ważności *</label>
                  <input type="date" required value={certForm.expiry_date} onChange={e => setCertForm(f => ({ ...f, expiry_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Wystawca</label>
                <input value={certForm.issuer} onChange={e => setCertForm(f => ({ ...f, issuer: e.target.value }))}
                  placeholder="np. UDT, TÜV, DNV-GL"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notatki</label>
                <textarea value={certForm.notes} onChange={e => setCertForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowAddCert(false); setEditCertId(null) }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Zapisywanie...' : editCertId ? 'Zapisz zmiany' : 'Dodaj uprawnienie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
