import { useMemo, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import type { Employee, Position } from '../types'
import { Modal } from '../ui/Modal'
import { useAlert, useConfirm } from '../ui/Confirm'

function fullName(e: Employee) {
  return `${e.name || ''} ${e.surname || ''}`.trim()
}

type EditModel = {
  id?: string
  name: string
  targetCount: string
  priorityEmployeeIds: string[]
  targetCounts: Record<string, number> // shiftId -> targetCount
}

export function PositionsView() {
  const { data, reload } = useStore()
  const confirm = useConfirm()
  const alert = useAlert()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [model, setModel] = useState<EditModel>({ name: '', targetCount: '', priorityEmployeeIds: [], targetCounts: {} })

  const positions = data?.positions || []
  const employees = data?.employees || []

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const list = positions.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
    if (!qq) return list
    return list.filter((p) => `${p.name || ''} ${p.id || ''}`.toLowerCase().includes(qq))
  }, [positions, q])

  const eligibleEmployees = useMemo(() => {
    const posId = model.id
    if (!posId) return []
    return employees
      .filter((e) => (e.active !== false) && Array.isArray(e.positionIds) && e.positionIds.map(String).includes(String(posId)))
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'pl'))
  }, [employees, model.id])

  function openCreate() {
    setErr(null)
    setModel({ name: '', targetCount: '', priorityEmployeeIds: [], targetCounts: {} })
    setOpen(true)
  }

  function openEdit(p: Position) {
    setErr(null)
    setModel({
      id: p.id,
      name: p.name || '',
      targetCount: p.targetCount === null || p.targetCount === undefined ? '' : String(p.targetCount),
      priorityEmployeeIds: Array.isArray(p.priorityEmployeeIds) ? p.priorityEmployeeIds.map(String) : [],
      targetCounts: p.targetCounts || {},
    })
    setOpen(true)
  }

  async function save() {
    setErr(null)
    setSaving(true)
    try {
      const name = model.name.trim()
      if (!name) {
        setErr('Wymagana nazwa stanowiska')
        return
      }
      const tcRaw = model.targetCount.trim()
      const targetCount = tcRaw === '' ? null : Math.max(0, parseInt(tcRaw, 10) || 0)

      const payload = {
        name,
        targetCount,
        priorityEmployeeIds: model.priorityEmployeeIds,
        targetCounts: model.targetCounts,
      }

      if (model.id) {
        const res = await api('positions', 'update', { id: model.id, ...payload })
        if (!res.ok) {
          setErr(res.error || 'update_failed')
          return
        }
      } else {
        const res = await api('positions', 'create', payload)
        if (!res.ok) {
          setErr(res.error || 'create_failed')
          return
        }
      }
      setOpen(false)
      await reload()
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function del(id: string) {
    const ok = await confirm({
      title: 'Usuń stanowisko',
      message: 'Usunąć stanowisko?',
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return
    const res = await api('positions', 'delete', { id })
    if (!res.ok) {
      await alert({ title: 'Błąd', message: res.error || 'delete_failed', variant: 'danger' })
      return
    }
    await reload()
  }

  async function resetPrio(id: string) {
    const res = await api('positions', 'update', { id, priorityEmployeeIds: [] })
    if (!res.ok) {
      await alert({ title: 'Błąd', message: res.error || 'reset_failed', variant: 'danger' })
      return
    }
    await reload()
  }

  function chipsForPosition(p: Position) {
    const prioIds = Array.isArray(p.priorityEmployeeIds) ? p.priorityEmployeeIds.map(String).filter(Boolean) : []
    if (!prioIds.length) return <span className="muted">Brak</span>
    return (
      <div className="chips">
        {prioIds.map((id) => {
          const e = employees.find((x) => String((x as Employee).id) === String(id)) as Employee | undefined
          const label = e ? fullName(e) : id
          return (
            <span key={id} className="badge ok">
              {label}
            </span>
          )
        })}
      </div>
    )
  }

  function targetCountsForPosition(p: Position) {
    if (!p.targetCounts || Object.keys(p.targetCounts).length === 0) {
      return <span className="muted">Brak</span>
    }
    
    const shifts = data?.settings?.shifts || []
    return (
      <div style={{ fontSize: 12 }}>
        {Object.entries(p.targetCounts).map(([shiftId, count]) => {
          const shift = shifts.find(s => String(s.id) === shiftId)
          const shiftName = shift ? shift.name : shiftId
          
          return (
            <div key={shiftId} style={{ marginBottom: 2 }}>
              <strong>{shiftName}:</strong> {count} os.
            </div>
          )
        })}
      </div>
    )
  }

  const assignments = data?.assignments || []
  const employeesWithPos = employees.filter(e => Array.isArray(e.positionIds) && e.positionIds.length > 0).length
  const usedPositions = new Set(assignments.map(a => a.positionId)).size
  const totalAssignments = assignments.reduce((sum, a) => sum + (Array.isArray(a.employeeIds) ? a.employeeIds.length : 0), 0)

  return (
    <div className="panel">
      <div className="kpi" style={{ marginBottom: 14 }}>
        <div className="kpiItem"><div className="kpiVal">{positions.length}</div><div className="kpiLab">Stanowiska</div></div>
        <div className="kpiItem"><div className="kpiVal">{employeesWithPos}</div><div className="kpiLab">Prac. ze stanow.</div></div>
        <div className="kpiItem"><div className="kpiVal">{usedPositions}</div><div className="kpiLab">Stanow. użyte w obsadach</div></div>
        <div className="kpiItem"><div className="kpiVal">{totalAssignments}</div><div className="kpiLab">Przydziały (osób)</div></div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Stanowiska</div>
            <div className="sub">Dodane stanowiska pojawiają się w kalendarzu (obsada per dzień/zmiana).</div>
          </div>
          <button className="btn primary" type="button" onClick={openCreate}>
            ＋ Dodaj stanowisko
          </button>
        </div>

        <div className="row" style={{ marginTop: 12, gap: 10, alignItems: 'center' }}>
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj…" style={{ maxWidth: 200 }} />
          <div className="muted" style={{ whiteSpace: 'nowrap' }}>
            {filtered.length} / {positions.length}
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Stanowisko</th>
              <th>Target</th>
              <th>Priorytet</th>
              <th>Target osoby</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((p) => {
                const prioLen = Array.isArray(p.priorityEmployeeIds) ? p.priorityEmployeeIds.length : 0
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{p.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {p.id}
                      </div>
                    </td>
                    <td>
                      {typeof p.targetCount === 'number' && p.targetCount > 0 ? <span className="badge">{p.targetCount} os.</span> : <span className="muted">brak</span>}
                    </td>
                    <td>{chipsForPosition(p)}</td>
                    <td>{targetCountsForPosition(p)}</td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button className="btn" type="button" onClick={() => openEdit(p)}>
                        Edytuj
                      </button>{' '}
                      <button
                        className="btn"
                        type="button"
                        onClick={() => void resetPrio(p.id)}
                        disabled={!prioLen}
                        style={!prioLen ? { opacity: 0.5 } : undefined}
                      >
                        Reset prio
                      </button>{' '}
                      <button className="btn danger" type="button" onClick={() => void del(p.id)}>
                        Usuń
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 18 }}>
                  Brak stanowisk
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={model.id ? 'Edytuj stanowisko' : 'Dodaj stanowisko'} onClose={() => (saving ? null : setOpen(false))}>
        <div className="grid2">
          <div>
            <div className="label">Nazwa</div>
            <input className="input" value={model.name} onChange={(e) => setModel((m) => ({ ...m, name: e.target.value }))} />
          </div>
          <div>
            <div className="label">Target (liczba osób)</div>
            <input
              className="input"
              type="number"
              min={0}
              value={model.targetCount}
              onChange={(e) => setModel((m) => ({ ...m, targetCount: e.target.value }))}
              placeholder="np. 2"
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Priorytetowani pracownicy</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Lista ograniczona do pracowników, którzy mają to stanowisko przypisane.
            </div>
            {model.id ? (
              eligibleEmployees.length ? (
                <div className="chips">
                  {eligibleEmployees.map((e) => {
                    const on = model.priorityEmployeeIds.includes(e.id)
                    return (
                      <button
                        key={e.id}
                        type="button"
                        className={on ? 'chip on' : 'chip'}
                        onClick={() =>
                          setModel((m) => ({
                            ...m,
                            priorityEmployeeIds: on
                              ? m.priorityEmployeeIds.filter((x) => x !== e.id)
                              : [...m.priorityEmployeeIds, e.id],
                          }))
                        }
                      >
                        {fullName(e)}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="muted">Brak pracowników z tym stanowiskiem</div>
              )
            ) : (
              <div className="muted">Najpierw zapisz stanowisko — potem wybierzesz priorytety.</div>
            )}
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Target osób per zmiana</div>
            <div className="muted" style={{ marginBottom: 8 }}>
              Określ ile osób jest potrzebnych na danym stanowisku dla każdej zmiany. Jeśli ustawione, nadpisuje to globalny target.
            </div>
            {model.id ? (
              <div>
                {data?.settings?.shifts?.map(shift => (
                  <div key={shift.id} style={{ marginBottom: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 4 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8 }}>{shift.name} ({shift.start}–{shift.end})</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={model.targetCounts[shift.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value
                          const newTargets = { ...model.targetCounts }
                          if (val === '' || val === '0') {
                            delete newTargets[shift.id]
                          } else {
                            newTargets[shift.id] = Math.max(0, parseInt(val, 10) || 0)
                          }
                          setModel(m => ({ ...m, targetCounts: newTargets }))
                        }}
                        placeholder="np. 2"
                        style={{ width: 80 }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {model.targetCounts[shift.id] ? `${model.targetCounts[shift.id]} osób` : 'brak (użyj globalnego targetu)'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="muted">Najpierw zapisz stanowisko — potem ustawisz target osób per zmiana.</div>
            )}
          </div>

          {err ? (
            <div className="errorBox" style={{ gridColumn: '1 / -1' }}>
              {err}
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, gridColumn: '1 / -1' }}>
            <button className="btn" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Anuluj
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
