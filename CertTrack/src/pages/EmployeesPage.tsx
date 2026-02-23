import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Employee } from '../types'
import { Plus, Search, UserCheck, UserX, ChevronRight, X } from 'lucide-react'

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', position: '', department: '', email: '', phone: '', hire_date: '' })
  const [saving, setSaving] = useState(false)

  const load = () => {
    api.getEmployees().then(setEmployees).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const filtered = useMemo(() => employees.filter(e => {
    const q = search.toLowerCase()
    return `${e.first_name} ${e.last_name} ${e.position} ${e.department}`.toLowerCase().includes(q)
  }), [employees, search])

  const activeCount = useMemo(() => employees.filter(e => e.active).length, [employees])

  async function handleAdd(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.first_name.trim() || !form.last_name.trim()) return
    setSaving(true)
    try {
      await api.createEmployee(form)
      setForm({ first_name: '', last_name: '', position: '', department: '', email: '', phone: '', hire_date: '' })
      setShowAdd(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(emp: Employee) {
    await api.updateEmployee(emp.id, { ...emp, active: emp.active ? 0 : 1 })
    load()
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Usunąć pracownika ${emp.first_name} ${emp.last_name}? Usunie też wszystkie jego uprawnienia.`)) return
    await api.deleteEmployee(emp.id)
    load()
  }

  if (loading) return <div className="text-slate-400 p-8">Ładowanie...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pracownicy</h1>
          <p className="text-sm text-slate-500">{activeCount} aktywnych z {employees.length} łącznie</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" /> Dodaj pracownika
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Szukaj po imieniu, nazwisku, stanowisku, dziale..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Pracownik</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Stanowisko</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Dział</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(emp => (
                <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                      <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold">
                        {emp.first_name[0]}{emp.last_name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 group-hover:text-brand-600 transition-colors">
                          {emp.first_name} {emp.last_name}
                        </div>
                        {emp.phone && <div className="text-xs text-slate-400">{emp.phone}</div>}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{emp.position || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{emp.department || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{emp.email || '—'}</td>
                  <td className="px-4 py-3">
                    {emp.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <UserCheck className="w-3 h-3" /> Aktywny
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        <UserX className="w-3 h-3" /> Nieaktywny
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleActive(emp)}
                        className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                        {emp.active ? 'Dezaktywuj' : 'Aktywuj'}
                      </button>
                      <button onClick={() => handleDelete(emp)}
                        className="px-2 py-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors">
                        Usuń
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    {search ? 'Brak wyników wyszukiwania' : 'Brak pracowników — dodaj pierwszego'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Nowy pracownik</h2>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Imię *</label>
                  <input required value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nazwisko *</label>
                  <input required value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Stanowisko</label>
                  <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    placeholder="np. Spawacz, Operator CNC"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dział</label>
                  <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                    placeholder="np. Hala 1, Spawalnia"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Data zatrudnienia</label>
                <input type="date" value={form.hire_date} onChange={e => setForm(f => ({ ...f, hire_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Zapisywanie...' : 'Dodaj pracownika'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
