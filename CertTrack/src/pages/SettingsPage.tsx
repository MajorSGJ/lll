import { useEffect, useState, useCallback } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Settings, Mail, Plus, Trash2, Bell, BellOff, Save, CheckCircle, X } from 'lucide-react'

type NotifEmail = { id: number; email: string; label: string; active: number }

export function SettingsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [emails, setEmails] = useState<NotifEmail[]>([])
  const [alertDays, setAlertDays] = useState('7,30,60')
  const [alertEnabled, setAlertEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const token = localStorage.getItem('oh_token')
      const res = await fetch('/api/settings/notifications', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setEmails(data.emails || [])
      setAlertDays(data.alert_days || '7,30,60')
      setAlertEnabled(data.alert_enabled !== false)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addEmail(ev: React.FormEvent) {
    ev.preventDefault()
    if (!newEmail) return
    try {
      const token = localStorage.getItem('oh_token')
      const res = await fetch('/api/settings/notifications/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ email: newEmail, label: newLabel }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setNewEmail(''); setNewLabel(''); setShowAdd(false)
      load()
    } catch (e) { alert(e instanceof Error ? e.message : 'Błąd') }
  }

  async function toggleEmail(id: number, active: boolean) {
    const token = localStorage.getItem('oh_token')
    await fetch(`/api/settings/notifications/emails/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ active }),
    })
    load()
  }

  async function deleteEmail(id: number) {
    if (!confirm('Usunąć ten email z powiadomień?')) return
    const token = localStorage.getItem('oh_token')
    await fetch(`/api/settings/notifications/emails/${id}`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    load()
  }

  async function saveSettings() {
    setSaving(true); setMsg('')
    try {
      const token = localStorage.getItem('oh_token')
      await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ alert_days: alertDays, alert_enabled: alertEnabled }),
      })
      setMsg('Zapisano!')
      setTimeout(() => setMsg(''), 3000)
    } catch { setMsg('Błąd zapisu') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="text-slate-400 p-8">Ładowanie...</div>

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600" /> Ustawienia
        </h1>
        <p className="text-sm text-slate-500 mt-1">Konfiguracja powiadomień i alertów</p>
      </div>

      {/* Alert toggle + days */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-brand-600" /> Alerty wygasania uprawnień
        </h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-700">Automatyczne powiadomienia email</div>
              <div className="text-xs text-slate-500">Wysyłaj raporty o wygasających uprawnieniach co 24h</div>
            </div>
            {isAdmin ? (
              <button onClick={() => { setAlertEnabled(!alertEnabled) }}
                className={`relative w-11 h-6 rounded-full transition-colors ${alertEnabled ? 'bg-brand-600' : 'bg-slate-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${alertEnabled ? 'left-[22px]' : 'left-0.5'}`} />
              </button>
            ) : (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${alertEnabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {alertEnabled ? 'Włączone' : 'Wyłączone'}
              </span>
            )}
          </div>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Dni przed wygaśnięciem (oddzielone przecinkami)</label>
              <input value={alertDays} onChange={e => setAlertDays(e.target.value)}
                placeholder="7,30,60"
                className="w-full max-w-xs px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <div className="text-xs text-slate-400 mt-1">Np. "7,30,60" — alerty 7, 30 i 60 dni przed wygaśnięciem</div>
            </div>
          )}

          {isAdmin && (
            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveSettings} disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" /> {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
              </button>
              {msg && <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {msg}</span>}
            </div>
          )}
        </div>
      </div>

      {/* Notification emails */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-brand-600" /> Adresy email do powiadomień ({emails.length})
          </h2>
          {isAdmin && (
            <button onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors">
              <Plus className="w-4 h-4" /> Dodaj email
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500 mb-4">
          Powiadomienia o wygasających uprawnieniach będą wysyłane na poniższe adresy.
          Jeśli lista jest pusta, alerty trafią do adminów konta.
        </p>

        {emails.length > 0 ? (
          <div className="space-y-2">
            {emails.map(em => (
              <div key={em.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${em.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${em.active ? 'bg-brand-100 text-brand-600' : 'bg-slate-200 text-slate-400'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-800">{em.email}</div>
                    {em.label && <div className="text-xs text-slate-400">{em.label}</div>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleEmail(em.id, !em.active)}
                      className={`p-1.5 rounded-lg transition-colors ${em.active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                      title={em.active ? 'Wyłącz' : 'Włącz'}>
                      {em.active ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteEmail(em.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400 py-6 text-center border border-dashed border-slate-200 rounded-lg">
            Brak skonfigurowanych adresów — alerty będą wysyłane do adminów konta
          </div>
        )}
      </div>

      {/* Add email modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Dodaj email do powiadomień</h3>
              <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={addEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Adres email *</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)}
                  placeholder="np. bhp@firma.pl"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Etykieta (opcjonalnie)</label>
                <input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                  placeholder="np. Dział BHP, Kierownik produkcji"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Anuluj</button>
                <button type="submit" className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">Dodaj</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
