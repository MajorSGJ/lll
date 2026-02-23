import { useMemo, useState } from 'react'
import { api } from '../api'
import { useStore } from '../store'
import type { Employee, Vacation } from '../types'
import { Modal } from '../ui/Modal'
import { fmtPLDate, parseISODate, toISODate } from '../date'
import { useAlert, useConfirm } from '../ui/Confirm'
import { effectiveShiftsForDate, employeeHasPosition, getEmployeeIdsFromAssignment, isEmployeeAllowedOnShift } from '../assignments'

function fullName(e: Employee) {
  return `${e.name || ''} ${e.surname || ''}`.trim()
}

type CreateModel = {
  employeeId: string
  start: string
  end: string
  type: string
  note: string
}

type EditModel = {
  id: string
  employeeId: string
  start: string
  end: string
  type: string
  note: string
}

export function VacationsView() {
  const { data, reload } = useStore()
  const confirm = useConfirm()
  const alert = useAlert()
  const employees = data?.employees || []
  const vacations = data?.vacations || []

  const [employeeFilter, setEmployeeFilter] = useState<string>('')
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [model, setModel] = useState<CreateModel>({ employeeId: '', start: '', end: '', type: 'urlop', note: '' })

  // Edit state
  const [editOpen, setEditOpen] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editErr, setEditErr] = useState<string | null>(null)
  const [editModel, setEditModel] = useState<EditModel>({ id: '', employeeId: '', start: '', end: '', type: 'urlop', note: '' })

  // Conflict resolution state
  type ConflictEntry = { dateISO: string; shiftId: string; shiftName: string; positionId: string; positionName: string; currentEmpIds: string[] }
  const [conflictOpen, setConflictOpen] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictEntry[]>([])
  const [conflictAction, setConflictAction] = useState<'remove' | 'auto' | 'manual'>('remove')
  const [conflictReplacementId, setConflictReplacementId] = useState('')
  const [conflictSaving, setConflictSaving] = useState(false)
  const [conflictEmpId, setConflictEmpId] = useState('')
  const [conflictEmpName, setConflictEmpName] = useState('')
  const [conflictFilterLinked, setConflictFilterLinked] = useState(true)

  const employeeOptions = useMemo(() => {
    return employees
      .slice()
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'pl'))
  }, [employees])

  const filtered = useMemo(() => {
    const list = vacations.slice()
    list.sort((a, b) => {
      if (a.start !== b.start) return String(a.start).localeCompare(String(b.start))
      return String(a.employeeId).localeCompare(String(b.employeeId))
    })
    if (!employeeFilter) return list
    return list.filter((v) => String(v.employeeId) === String(employeeFilter))
  }, [vacations, employeeFilter])

  function openCreate() {
    setErr(null)
    const defaultEmp = employeeFilter || (employeeOptions[0]?.id || '')
    setModel({ employeeId: defaultEmp, start: '', end: '', type: 'urlop', note: '' })
    setOpen(true)
  }

  function openEdit(v: Vacation) {
    setEditErr(null)
    setEditModel({
      id: v.id,
      employeeId: v.employeeId,
      start: v.start,
      end: v.end,
      type: v.type || 'urlop',
      note: v.note || '',
    })
    setEditOpen(true)
  }

  async function saveEdit() {
    setEditErr(null)
    setEditSaving(true)
    try {
      if (!editModel.employeeId || !editModel.start || !editModel.end) {
        setEditErr('Wymagane: pracownik + start + koniec')
        return
      }
      if (editModel.end < editModel.start) {
        setEditErr('Koniec nie może być przed początkiem')
        return
      }
      const res = await api('vacations', 'update', {
        id: editModel.id,
        employeeId: editModel.employeeId,
        start: editModel.start,
        end: editModel.end,
        type: editModel.type || 'urlop',
        note: editModel.note || '',
      })
      if (!res.ok) {
        setEditErr(res.error || 'update_failed')
        return
      }
      setEditOpen(false)
      await reload()
    } catch (e) {
      setEditErr(String(e))
    } finally {
      setEditSaving(false)
    }
  }

  function findConflicts(employeeId: string, start: string, end: string): ConflictEntry[] {
    const assignments = data?.assignments || []
    const positions = data?.positions || []
    const settings = data?.settings
    const result: ConflictEntry[] = []
    // Iterate each day in the vacation range
    const startD = parseISODate(start)
    const endD = parseISODate(end)
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const dateISO = toISODate(d)
      const dayShifts = effectiveShiftsForDate(settings, dateISO)
      for (const a of assignments) {
        if (String(a.date) !== dateISO) continue
        const empIds = getEmployeeIdsFromAssignment(a)
        if (!empIds.includes(String(employeeId))) continue
        const shift = dayShifts.find(s => String(s.id) === String(a.shiftId))
        const pos = positions.find(p => String(p.id) === String(a.positionId))
        result.push({
          dateISO,
          shiftId: String(a.shiftId),
          shiftName: shift ? `${shift.name} ${shift.start}–${shift.end}` : String(a.shiftId),
          positionId: String(a.positionId),
          positionName: pos?.name || String(a.positionId),
          currentEmpIds: empIds,
        })
      }
    }
    return result
  }

  function findBestReplacement(conflict: ConflictEntry, excludeId: string): string | null {
    const allVacations = data?.vacations || []
    const assignments = data?.assignments || []
    const active = employees.filter(e => e.active !== false && String(e.id) !== String(excludeId))
    // Find someone who: has the position, is allowed on the shift, is not on vacation, is not already on this shift
    const dayAssigns = assignments.filter(a => String(a.date) === conflict.dateISO)
    const alreadyOnShift = new Set<string>()
    for (const a of dayAssigns) {
      if (String(a.shiftId) === conflict.shiftId) {
        for (const id of getEmployeeIdsFromAssignment(a)) alreadyOnShift.add(String(id))
      }
    }
    for (const e of active) {
      const eid = String(e.id)
      if (alreadyOnShift.has(eid)) continue
      if (!employeeHasPosition(e, conflict.positionId)) continue
      if (!isEmployeeAllowedOnShift(e, conflict.shiftId)) continue
      const onVac = allVacations.some(v => String(v.employeeId) === eid && v.start <= conflict.dateISO && conflict.dateISO <= v.end)
      if (onVac) continue
      return eid
    }
    return null
  }

  async function save() {
    setErr(null)
    setSaving(true)
    try {
      const employeeId = model.employeeId
      const start = model.start
      const end = model.end
      if (!employeeId || !start || !end) {
        setErr('Wymagane: pracownik + start + koniec')
        return
      }
      if (end < start) {
        setErr('Koniec nie może być przed początkiem')
        return
      }
      // Check for conflicts before saving
      const found = findConflicts(employeeId, start, end)

      const res = await api('vacations', 'create', {
        employeeId,
        start,
        end,
        type: model.type || 'urlop',
        note: model.note || '',
      })
      if (!res.ok) {
        setErr(res.error || 'create_failed')
        return
      }
      setOpen(false)
      await reload()

      // If conflicts found, show conflict resolution modal
      if (found.length > 0) {
        const emp = employees.find(e => String(e.id) === String(employeeId))
        setConflictEmpId(employeeId)
        setConflictEmpName(emp ? fullName(emp) : employeeId)
        setConflicts(found)
        setConflictAction('remove')
        setConflictReplacementId('')
        setConflictOpen(true)
      }
    } catch (e) {
      setErr(String(e))
    } finally {
      setSaving(false)
    }
  }

  async function resolveConflicts() {
    setConflictSaving(true)
    try {
      for (const c of conflicts) {
        const newEmpIds = c.currentEmpIds.filter(id => String(id) !== String(conflictEmpId))

        if (conflictAction === 'remove') {
          // Just remove the employee
          await api('assignments', 'set', {
            date: c.dateISO,
            shiftId: c.shiftId,
            positionId: c.positionId,
            employeeIds: newEmpIds,
            allowDoubleShift: true,
          })
        } else if (conflictAction === 'auto') {
          // Find best replacement
          const replacement = findBestReplacement(c, conflictEmpId)
          const ids = replacement ? [...newEmpIds, replacement] : newEmpIds
          await api('assignments', 'set', {
            date: c.dateISO,
            shiftId: c.shiftId,
            positionId: c.positionId,
            employeeIds: ids,
            allowDoubleShift: true,
          })
        } else if (conflictAction === 'manual' && conflictReplacementId) {
          // Use manually selected replacement
          const ids = [...newEmpIds, conflictReplacementId]
          await api('assignments', 'set', {
            date: c.dateISO,
            shiftId: c.shiftId,
            positionId: c.positionId,
            employeeIds: ids,
            allowDoubleShift: true,
          })
        } else {
          // Manual but no replacement selected — just remove
          await api('assignments', 'set', {
            date: c.dateISO,
            shiftId: c.shiftId,
            positionId: c.positionId,
            employeeIds: newEmpIds,
            allowDoubleShift: true,
          })
        }
      }
      await reload()
      setConflictOpen(false)
    } catch (e) {
      console.error(e)
    } finally {
      setConflictSaving(false)
    }
  }

  async function del(id: string) {
    const ok = await confirm({
      title: 'Usuń urlop',
      message: 'Usunąć urlop?',
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return
    const res = await api('vacations', 'delete', { id })
    if (!res.ok) {
      await alert({ title: 'Błąd', message: res.error || 'delete_failed', variant: 'danger' })
      return
    }
    await reload()
  }

  function employeeLabel(employeeId: string) {
    const e = employees.find((x) => String((x as Employee).id) === String(employeeId)) as Employee | undefined
    return e ? fullName(e) : employeeId
  }

  return (
    <div className="panel">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Urlopy</h2>
          <div className="muted">Dodawanie i usuwanie urlopów.</div>
        </div>
        <button className="btn primary" type="button" onClick={openCreate}>
          Dodaj
        </button>
      </div>

      <div className="card2" style={{ marginTop: 12 }}>
        <div className="row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ minWidth: 260 }}>
            <div className="label">Filtr: pracownik</div>
            <select className="input" value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)}>
              <option value="">Wszyscy</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e)}
                </option>
              ))}
            </select>
          </div>
          <div className="muted" style={{ marginLeft: 'auto' }}>
            {filtered.length} / {vacations.length}
          </div>
        </div>
      </div>

      <div className="card2" style={{ marginTop: 12, overflow: 'auto' }}>
        <table className="table">
          <thead>
            <tr>
              <th>Pracownik</th>
              <th>Zakres</th>
              <th>Typ</th>
              <th>Notatka</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((v: Vacation) => (
                <tr key={v.id}>
                  <td>
                    <div style={{ fontWeight: 800 }}>{employeeLabel(v.employeeId)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{v.employeeId}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{fmtPLDate(v.start)} → {fmtPLDate(v.end)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{v.start} → {v.end}</div>
                  </td>
                  <td>{v.type || 'urlop'}</td>
                  <td>{v.note ? v.note : <span className="muted">—</span>}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn" type="button" onClick={() => openEdit(v)} style={{ marginRight: 6 }}>
                      Edytuj
                    </button>
                    <button className="btn danger" type="button" onClick={() => void del(v.id)}>
                      Usuń
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 18 }}>
                  Brak urlopów
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="Dodaj urlop" onClose={() => (saving ? null : setOpen(false))}>
        <div className="grid2">
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Pracownik</div>
            <select
              className="input"
              value={model.employeeId}
              onChange={(e) => setModel((m) => ({ ...m, employeeId: e.target.value }))}
            >
              <option value="">— wybierz —</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Początek</div>
            <input className="input" type="date" value={model.start} onChange={(e) => setModel((m) => ({ ...m, start: e.target.value }))} />
          </div>
          <div>
            <div className="label">Koniec</div>
            <input className="input" type="date" value={model.end} onChange={(e) => setModel((m) => ({ ...m, end: e.target.value }))} />
          </div>
          <div>
            <div className="label">Typ</div>
            <input className="input" value={model.type} onChange={(e) => setModel((m) => ({ ...m, type: e.target.value }))} placeholder="urlop" />
          </div>
          <div>
            <div className="label">Notatka</div>
            <input className="input" value={model.note} onChange={(e) => setModel((m) => ({ ...m, note: e.target.value }))} placeholder="opcjonalnie" />
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
            <button className="btn primary" type="button" onClick={() => void save()} disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={editOpen} title="Edytuj urlop" onClose={() => (editSaving ? null : setEditOpen(false))}>
        <div className="grid2">
          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Pracownik</div>
            <select
              className="input"
              value={editModel.employeeId}
              onChange={(e) => setEditModel((m) => ({ ...m, employeeId: e.target.value }))}
            >
              <option value="">— wybierz —</option>
              {employeeOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {fullName(e)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="label">Początek</div>
            <input className="input" type="date" value={editModel.start} onChange={(e) => setEditModel((m) => ({ ...m, start: e.target.value }))} />
          </div>
          <div>
            <div className="label">Koniec</div>
            <input className="input" type="date" value={editModel.end} onChange={(e) => setEditModel((m) => ({ ...m, end: e.target.value }))} />
          </div>
          <div>
            <div className="label">Typ</div>
            <input className="input" value={editModel.type} onChange={(e) => setEditModel((m) => ({ ...m, type: e.target.value }))} placeholder="urlop" />
          </div>
          <div>
            <div className="label">Notatka</div>
            <input className="input" value={editModel.note} onChange={(e) => setEditModel((m) => ({ ...m, note: e.target.value }))} placeholder="opcjonalnie" />
          </div>

          {editErr ? (
            <div className="errorBox" style={{ gridColumn: '1 / -1' }}>
              {editErr}
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, gridColumn: '1 / -1' }}>
            <button className="btn" type="button" onClick={() => setEditOpen(false)} disabled={editSaving}>
              Anuluj
            </button>
            <button className="btn primary" type="button" onClick={() => void saveEdit()} disabled={editSaving}>
              {editSaving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={conflictOpen} title="Konflikty z grafikiem" onClose={() => conflictSaving ? null : setConflictOpen(false)}>
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="sub">
            <strong>{conflictEmpName}</strong> ma przypisane zmiany w dniach urlopu ({conflicts.length} {conflicts.length === 1 ? 'przypisanie' : 'przypisań'}):
          </div>
          <div style={{ maxHeight: 200, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: 8 }}>
            {conflicts.map((c, i) => (
              <div key={i} style={{ fontSize: 13, padding: '3px 0', borderBottom: i < conflicts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <strong>{fmtPLDate(c.dateISO)}</strong> — {c.shiftName} — {c.positionName}
              </div>
            ))}
          </div>
          <div className="field">
            <div className="label">Co zrobić z tymi zmianami?</div>
            <select className="select" value={conflictAction} onChange={e => setConflictAction(e.target.value as 'remove' | 'auto' | 'manual')}>
              <option value="remove">Usuń pracownika z tych zmian</option>
              <option value="auto">Automatycznie zastąp innym pracownikiem</option>
              <option value="manual">Wybierz zastępcę z listy</option>
            </select>
          </div>
          {conflictAction === 'manual' && (() => {
            // Collect unique positionIds and shiftIds from conflicts
            const conflictPositionIds = new Set(conflicts.map(c => c.positionId))
            const conflictShiftIds = new Set(conflicts.map(c => c.shiftId))
            const conflictDates = new Set(conflicts.map(c => c.dateISO))
            const allAssignments = data?.assignments || []
            const allVacations = data?.vacations || []

            // Build sets: who is on which shift/position on conflict days
            const onOtherShiftDays = new Map<string, number>()
            const onSameShiftOtherPosDays = new Map<string, number>()
            const onVacDays = new Map<string, number>()

            for (const dateISO of conflictDates) {
              // Vacation check
              for (const v of allVacations) {
                if (v.start <= dateISO && dateISO <= v.end) {
                  const eid = String(v.employeeId)
                  onVacDays.set(eid, (onVacDays.get(eid) || 0) + 1)
                }
              }
              // Assignment check
              for (const a of allAssignments) {
                if (String(a.date) !== dateISO) continue
                const empIds = getEmployeeIdsFromAssignment(a)
                for (const eid of empIds) {
                  if (conflictShiftIds.has(String(a.shiftId))) {
                    // Same shift
                    if (!conflictPositionIds.has(String(a.positionId))) {
                      onSameShiftOtherPosDays.set(eid, (onSameShiftOtherPosDays.get(eid) || 0) + 1)
                    }
                  } else {
                    // Different shift
                    onOtherShiftDays.set(eid, (onOtherShiftDays.get(eid) || 0) + 1)
                  }
                }
              }
            }

            const totalConflictDays = conflictDates.size

            return (
            <div className="field">
              <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                Zastępca
                <label style={{ fontWeight: 400, fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                  <input type="checkbox" checked={conflictFilterLinked} onChange={e => setConflictFilterLinked(e.target.checked)} />
                  Tylko osoby powiązane ze stanowiskiem
                </label>
              </div>
              <select className="select" value={conflictReplacementId} onChange={e => setConflictReplacementId(e.target.value)}>
                <option value="">— wybierz —</option>
                {employees
                  .filter(e => {
                    if (e.active === false) return false
                    if (String(e.id) === String(conflictEmpId)) return false
                    if (conflictFilterLinked) {
                      // Must have at least one of the conflict positions
                      const hasPos = Array.from(conflictPositionIds).some(pid => employeeHasPosition(e, pid))
                      if (!hasPos) return false
                      // Must be allowed on at least one of the conflict shifts
                      const hasShift = Array.from(conflictShiftIds).some(sid => isEmployeeAllowedOnShift(e, sid))
                      if (!hasShift) return false
                    }
                    return true
                  })
                  .sort((a, b) => {
                    const aeid = String(a.id)
                    const beid = String(b.id)
                    // Vacation on all days = last
                    const aVacAll = (onVacDays.get(aeid) || 0) >= totalConflictDays
                    const bVacAll = (onVacDays.get(beid) || 0) >= totalConflictDays
                    if (aVacAll !== bVacAll) return aVacAll ? 1 : -1
                    // Has position = first
                    const aHasPos = Array.from(conflictPositionIds).some(pid => employeeHasPosition(a, pid))
                    const bHasPos = Array.from(conflictPositionIds).some(pid => employeeHasPosition(b, pid))
                    if (aHasPos !== bHasPos) return aHasPos ? -1 : 1
                    return fullName(a).localeCompare(fullName(b), 'pl')
                  })
                  .map(e => {
                    const eid = String(e.id)
                    const labels: string[] = []
                    const vacCount = onVacDays.get(eid) || 0
                    const otherShiftCount = onOtherShiftDays.get(eid) || 0
                    const sameShiftOtherPosCount = onSameShiftOtherPosDays.get(eid) || 0
                    const allVac = vacCount >= totalConflictDays

                    if (allVac) labels.push('🚫 URL cały zakres')
                    else if (vacCount > 0) labels.push(`⚠️ URL ${vacCount}/${totalConflictDays} dni`)
                    if (otherShiftCount > 0) labels.push(`⚠️ inna zmiana ${otherShiftCount} dni`)
                    if (sameShiftOtherPosCount > 0) labels.push(`📌 ta zmiana/inne stan. ${sameShiftOtherPosCount} dni`)

                    const hasPos = Array.from(conflictPositionIds).some(pid => employeeHasPosition(e, pid))
                    const hasShift = Array.from(conflictShiftIds).some(sid => isEmployeeAllowedOnShift(e, sid))
                    if (!hasPos) labels.push('⚠️ inne stanowisko')
                    if (!hasShift) labels.push('⚠️ niedozwolona zmiana')

                    return (
                      <option key={e.id} value={e.id} disabled={allVac}>
                        {fullName(e)}{labels.length ? ` (${labels.join(', ')})` : ''}
                      </option>
                    )
                  })}
              </select>
            </div>
            )
          })()}
          {conflictAction === 'auto' && (
            <div className="sub">
              System automatycznie dobierze najlepszego dostępnego pracownika dla każdej zmiany (wg stanowiska, dozwolonych zmian, braku urlopu).
            </div>
          )}
          <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn" type="button" onClick={() => setConflictOpen(false)} disabled={conflictSaving}>
              Pomiń (zostaw jak jest)
            </button>
            <button className="btn primary" type="button" onClick={() => void resolveConflicts()} disabled={conflictSaving}>
              {conflictSaving ? 'Przetwarzanie…' : 'Zastosuj'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
