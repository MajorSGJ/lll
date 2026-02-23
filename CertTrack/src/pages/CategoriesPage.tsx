import { useEffect, useState } from 'react'
import { api } from '../api'
import type { Category } from '../types'
import { Plus, Pencil, Trash2, X, FolderOpen } from 'lucide-react'

const emptyForm = { name: '', description: '', alert_days_before: 30, color: '#3b82f6' }

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)

  const load = () => {
    setError(null)
    api.getCategories()
      .then(setCategories)
      .catch(e => setError(e instanceof Error ? e.message : 'Błąd ładowania kategorii'))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  function startEdit(cat: Category) {
    setEditId(cat.id)
    setForm({ name: cat.name, description: cat.description, alert_days_before: cat.alert_days_before, color: cat.color })
    setShowForm(true)
  }

  function startAdd() {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (editId) {
        await api.updateCategory(editId, form)
      } else {
        await api.createCategory(form)
      }
      setShowForm(false)
      setEditId(null)
      setForm(emptyForm)
      load()
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!confirm(`Usunąć kategorię "${cat.name}"? Usunie też wszystkie powiązane uprawnienia.`)) return
    await api.deleteCategory(cat.id)
    load()
  }

  if (loading) return <div className="text-slate-400 p-8">Ładowanie...</div>
  if (error) return <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">Błąd: {error}</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kategorie uprawnień</h1>
          <p className="text-sm text-slate-500">Typy certyfikatów i uprawnień śledzonych w systemie</p>
        </div>
        <button onClick={startAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors">
          <Plus className="w-4 h-4" /> Dodaj kategorię
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => (
          <div key={cat.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + '20' }}>
                  <FolderOpen className="w-5 h-5" style={{ color: cat.color }} />
                </div>
                <div>
                  <div className="font-semibold text-slate-800">{cat.name}</div>
                  {cat.description && <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">{cat.description}</div>}
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Alert: <span className="font-medium text-slate-700">{cat.alert_days_before} dni</span> przed wygaśnięciem
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startEdit(cat)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(cat)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-12">
            Brak kategorii — dodaj pierwszą
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowForm(false); setEditId(null) }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">{editId ? 'Edytuj kategorię' : 'Nowa kategoria'}</h2>
              <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nazwa *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="np. Uprawnienia spawalnicze"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Opis</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  placeholder="Krótki opis kategorii..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Alert (dni przed wygaśnięciem)</label>
                  <input type="number" min={1} max={365} value={form.alert_days_before}
                    onChange={e => setForm(f => ({ ...f, alert_days_before: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kolor</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="w-10 h-10 rounded border border-slate-200 cursor-pointer" />
                    <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setEditId(null) }}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  Anuluj
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {saving ? 'Zapisywanie...' : editId ? 'Zapisz zmiany' : 'Dodaj kategorię'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
