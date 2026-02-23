import { useMemo, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import { useAlert } from './Confirm'
import { Modal } from './Modal'
import { useToast } from './Toast'

function fullName(s: string) {
  return String(s || '').trim()
}

export function QuickAddModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, reload, setView } = useStore()
  const alert = useAlert()
  const toast = useToast()

  const positions = data?.positions || []

  const posOptions = useMemo(() => {
    return positions
      .slice()
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'pl'))
  }, [positions])

  const [busy, setBusy] = useState(false)

  const [empName, setEmpName] = useState('')
  const [empSurname, setEmpSurname] = useState('')
  const [empPhone, setEmpPhone] = useState('')
  const [empPos, setEmpPos] = useState('')

  const [posName, setPosName] = useState('')

  async function addEmployee() {
    const name = empName.trim()
    const surname = empSurname.trim()
    const phone = empPhone.trim()
    const positionIds = empPos ? [empPos] : []

    if (!name || !surname) {
      await alert({ title: 'Błąd', message: 'Wymagane: imię i nazwisko.', variant: 'danger' })
      return
    }

    setBusy(true)
    try {
      const res = await api('employees', 'create', { name, surname, phone, positionIds, active: true })
      if (!res.ok) {
        await alert({ title: 'Błąd', message: res.error || 'create_failed', variant: 'danger' })
        return
      }
      toast('Pracownik został dodany.', 'success')
      onClose()
      await reload()
      setView('employees')
    } finally {
      setBusy(false)
    }
  }

  async function addPosition() {
    const name = posName.trim()
    if (!name) {
      await alert({ title: 'Błąd', message: 'Wymagana nazwa stanowiska.', variant: 'danger' })
      return
    }

    setBusy(true)
    try {
      const res = await api('positions', 'create', { name })
      if (!res.ok) {
        await alert({ title: 'Błąd', message: res.error || 'create_failed', variant: 'danger' })
        return
      }
      toast('Stanowisko zostało dodane.', 'success')
      onClose()
      await reload()
      setView('positions')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} title="Szybko dodaj" onClose={() => { if (!busy) onClose() }}>
      <div className="grid2" style={{ gap: 14 }}>
        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Dodaj pracownika</div>
              <div className="sub">Najszybszy sposób na start.</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="label">Imię</div>
              <input className="input" value={empName} onChange={(e) => setEmpName(e.target.value)} disabled={busy} />
            </div>
            <div className="field">
              <div className="label">Nazwisko</div>
              <input className="input" value={empSurname} onChange={(e) => setEmpSurname(e.target.value)} disabled={busy} />
            </div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field">
              <div className="label">Telefon</div>
              <input className="input" value={empPhone} onChange={(e) => setEmpPhone(e.target.value)} disabled={busy} />
            </div>
            <div className="field">
              <div className="label">Domyślne stanowisko</div>
              <select className="select" value={empPos} onChange={(e) => setEmpPos(e.target.value)} disabled={busy}>
                <option value="">— brak —</option>
                {posOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p.name)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn primary" type="button" onClick={() => void addEmployee()} disabled={busy}>
              {busy ? 'Dodawanie…' : 'Dodaj'}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cardHeader">
            <div>
              <div className="cardTitle">Dodaj stanowisko</div>
              <div className="sub">Potem pojawi się w kalendarzu.</div>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <div className="label">Nazwa stanowiska</div>
              <input
                className="input"
                value={posName}
                onChange={(e) => setPosName(e.target.value)}
                placeholder="np. Operator CNC 1"
                disabled={busy}
              />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn primary" type="button" onClick={() => void addPosition()} disabled={busy}>
              {busy ? 'Dodawanie…' : 'Dodaj'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
