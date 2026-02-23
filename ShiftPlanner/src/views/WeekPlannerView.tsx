import { useState, useEffect } from 'react'
import { useStore } from '../store'
import { toISODate, parseISODate, addDays, getWeekNumber } from '../date'
import { planDays, weekKeyFromISO } from '../planning'
import { api } from '../api'
import { effectiveShiftsForDate, getAssignment, getAssignmentFromMap, getEmployeeIdsFromAssignment } from '../assignments'
import { useConfirm } from '../ui/Confirm'

function getWeekStartOfWeek(d: Date, firstDayOfWeek: 'monday' | 'sunday'): Date {
  const day = d.getDay()
  const diff = firstDayOfWeek === 'sunday' ? -day : (day === 0 ? -6 : 1 - day)
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  return start
}

export function WeekPlannerView() {
  const { data, reload, pushUndoSnapshot, discardLastUndoSnapshot, indexed } = useStore()
  const confirm = useConfirm()
  const settings = data?.settings
  const firstDayOfWeek: 'monday' | 'sunday' = settings?.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday'
  const shifts = settings?.shifts || []
  const positions = data?.positions || []
  const employees = data?.employees || []
  const vacations = data?.vacations || []
  const assignments = data?.assignments || []
  const weekTemplates = data?.weekTemplates || []

  const [weekStart, setWeekStart] = useState(() => toISODate(getWeekStartOfWeek(new Date(), 'monday')))
  const [selectedShiftIds, setSelectedShiftIds] = useState<string[]>(() => shifts.map(s => String(s.id)))
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [onlyEmpty, setOnlyEmpty] = useState(true)
  const [skipSaturdays, setSkipSaturdays] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState('')
  const [resultData, setResultData] = useState<{
    created: number;
    daysCount: number;
    issues: { date: string; shift: string; position: string; assigned: number; target: number }[];
    metrics: { avg: string; min: number; max: number; stdDev: string };
    topLoaded: [string, number][];
  } | null>(null)
  const [simPreview, setSimPreview] = useState<{ date: string; shiftId: string; positionId: string; employeeIds: string[]; employeeNames: string[] }[]>([])
  const [showSimPreview, setShowSimPreview] = useState(false)
  const [simGroupByWeek, setSimGroupByWeek] = useState(false)


  useEffect(() => {
    const base = parseISODate(weekStart)
    if (Number.isNaN(base.getTime())) return
    const next = toISODate(getWeekStartOfWeek(base, firstDayOfWeek))
    if (next !== weekStart) setWeekStart(next)
  }, [firstDayOfWeek])

  useEffect(() => {
    if (shifts.length && !selectedShiftIds.length) {
      setSelectedShiftIds(shifts.map(s => String(s.id)))
    }
  }, [shifts, selectedShiftIds.length])

  const toggleShift = (id: string) => {
    setSelectedShiftIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const runPlan = async (kind: 'week' | 'month', simulateOnly = false) => {
    const base = parseISODate(weekStart)
    if (Number.isNaN(base.getTime())) {
      setResult('Podaj poprawną datę poniedziałku.')
      return
    }

    setBusy(true)
    setResult('Planowanie...')
    setResultData(null)
    setShowSimPreview(false)
    setSimPreview([])

    if (!simulateOnly) {
      pushUndoSnapshot()
    }

    try {
      const days: string[] = []
      if (kind === 'week') {
        for (let i = 0; i < 7; i++) {
          days.push(addDays(weekStart, i))
        }
      } else {
        const y = base.getFullYear()
        const m = base.getMonth()
        const daysInMonth = new Date(y, m + 1, 0).getDate()
        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          days.push(toISODate(new Date(y, m, dayNum)))
        }
      }

      const simulatedAssignments: { date: string; shiftId: string; positionId: string; employeeIds: string[]; employeeNames: string[] }[] = []

      const applyChange = async (change: { date: string; shiftId: string; positionId: string; employeeIds: string[] }) => {
        if (simulateOnly) {
          const names = change.employeeIds.map(id => {
            const e = indexed.employeesById.get(String(id))
            return e ? `${e.name || ''} ${e.surname || ''}`.trim() : id
          })
          simulatedAssignments.push({ ...change, employeeNames: names })
        } else {
          await api('assignments', 'set', { ...change, allowDoubleShift: false })
        }
      }

      const { created } = await planDays({
        days,
        positions,
        employees,
        vacations,
        assignments,
        settings: settings || {} as any,
        selectedShiftIds,
        skipSaturdays,
        apply: applyChange,
      })

      if (simulateOnly) {
        if (!simulatedAssignments.length) {
          setResult('Symulacja: brak nowych przydziałów do wygenerowania.')
        } else {
          setSimPreview(simulatedAssignments)
          setShowSimPreview(true)
          setResult(`🔍 Symulacja ${kind === 'month' ? 'miesiąca' : 'tygodnia'}: ${created} przydziałów. Dane NIE zostały zapisane. Sprawdź podgląd poniżej.`)
        }
        setBusy(false)
        return
      }

      await reload()
      if (created === 0) {
        discardLastUndoSnapshot()
      }

      // Build structured report
      const reportIssues: { date: string; shift: string; position: string; assigned: number; target: number }[] = []
      const empLoadMap = new Map<string, number>()
      
      // Recalculate from fresh data
      const freshRes = await api<{ items: typeof assignments }>('assignments', 'list', {})
      const freshAssignments = freshRes.ok ? (freshRes.items || []) : assignments
      
      for (const dateISO of days) {
        const effShifts = effectiveShiftsForDate(settings, dateISO)
        for (const s of effShifts) {
          for (const p of positions) {
            const target = Number(p.targetCount || 1)
            const a = getAssignment(freshAssignments, dateISO, String(s.id), String(p.id))
            const assignedIds = getEmployeeIdsFromAssignment(a)
            if (assignedIds.length < target) {
              reportIssues.push({ date: dateISO, shift: s.name, position: p.name, assigned: assignedIds.length, target })
            }
            for (const eid of assignedIds) {
              const emp = indexed.employeesById.get(String(eid))
              const name = emp ? `${emp.name} ${emp.surname}`.trim() : eid
              empLoadMap.set(name, (empLoadMap.get(name) || 0) + 1)
            }
          }
        }
      }
      
      const loads = Array.from(empLoadMap.values())
      const avgLoad = loads.length ? (loads.reduce((a, b) => a + b, 0) / loads.length).toFixed(1) : '0'
      const minLoad = loads.length ? Math.min(...loads) : 0
      const maxLoad = loads.length ? Math.max(...loads) : 0
      const stdDev = loads.length > 1 ? Math.sqrt(loads.reduce((sum, v) => sum + Math.pow(v - Number(avgLoad), 2), 0) / loads.length).toFixed(2) : '0'
      
      const topLoaded = Array.from(empLoadMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
      
      setResultData({
        created,
        daysCount: days.length,
        issues: reportIssues,
        metrics: { avg: avgLoad, min: minLoad, max: maxLoad, stdDev },
        topLoaded,
      })
      setResult(`Utworzono ${created} ${created === 1 ? 'przypisanie' : 'przypisań'} w ${days.length} dniach.`)
    } catch (e) {
      console.error('[runPlan] error:', e)
      if (!simulateOnly) {
        discardLastUndoSnapshot()
      }
      setResult(`Błąd podczas planowania: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  const applyTemplate = async () => {
    if (!selectedTemplate) {
      setResult('Wybierz szablon z listy.')
      return
    }
    const tpl = weekTemplates.find(t => String(t.id) === selectedTemplate)
    if (!tpl || !Array.isArray(tpl.items) || !tpl.items.length) {
      setResult('Wybrany szablon nie zawiera wpisów.')
      return
    }

    const base = parseISODate(weekStart)
    if (Number.isNaN(base.getTime())) {
      setResult('Podaj poprawną datę poniedziałku.')
      return
    }

    setBusy(true)
    setResult('Stosowanie szablonu...')
    pushUndoSnapshot()

    try {
      let touched = 0
      for (const it of tpl.items as { dow: number; shiftId: string; positionId: string; employeeIds: string[] }[]) {
        const dow = Number(it.dow)
        if (!(dow >= 0 && dow <= 6)) continue
        const dateISO = addDays(weekStart, dow)

        if (onlyEmpty) {
          const existing = getAssignmentFromMap(indexed.assignmentsByDate, dateISO, String(it.shiftId), String(it.positionId))
          const existingIds = existing?.employeeIds?.length ? existing.employeeIds : (existing?.employeeId ? [existing.employeeId] : [])
          if (existingIds.length) continue
        }

        await api('assignments', 'set', {
          date: dateISO,
          shiftId: String(it.shiftId),
          positionId: String(it.positionId),
          employeeIds: (it.employeeIds || []).map(String),
          allowDoubleShift: false,
        })
        touched++
      }

      await reload()
      if (touched === 0) {
        discardLastUndoSnapshot()
      }
      setResult(`Szablon zastosowany. Zmodyfikowano ${touched} ${touched === 1 ? 'pole' : 'pól'}.`)
    } catch (e) {
      console.error(e)
      discardLastUndoSnapshot()
      setResult('Błąd podczas stosowania szablonu.')
    } finally {
      setBusy(false)
    }
  }

  const saveAsTemplate = async () => {
    const name = prompt('Nazwa nowego szablonu:')
    if (!name?.trim()) return

    const base = parseISODate(weekStart)
    if (Number.isNaN(base.getTime())) {
      setResult('Podaj poprawną datę poniedziałku.')
      return
    }

    setBusy(true)
    try {
      const items: { dow: number; shiftId: string; positionId: string; employeeIds: string[] }[] = []
      for (let dow = 0; dow < 7; dow++) {
        const dateISO = addDays(weekStart, dow)
        for (const shift of shifts) {
          for (const pos of positions) {
            const a = getAssignmentFromMap(indexed.assignmentsByDate, dateISO, String(shift.id), String(pos.id))
            const ids = a?.employeeIds?.length ? a.employeeIds : (a?.employeeId ? [a.employeeId] : [])
            if (!ids.length) continue
            items.push({ dow, shiftId: String(shift.id), positionId: String(pos.id), employeeIds: ids.map(String) })
          }
        }
      }

      if (!items.length) {
        setResult('Brak obsad do zapisania w szablonie.')
        setBusy(false)
        return
      }

      await api('weekTemplates', 'create', { name: name.trim(), items })
      await reload()
      setResult('Szablon został zapisany.')
    } catch (e) {
      console.error(e)
      setResult('Błąd podczas zapisywania szablonu.')
    } finally {
      setBusy(false)
    }
  }

  const deleteTemplate = async () => {
    if (!selectedTemplate) {
      setResult('Wybierz szablon do usunięcia.')
      return
    }
    const ok = await confirm({
      title: 'Usuń szablon',
      message: 'Czy na pewno usunąć ten szablon?',
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return

    setBusy(true)
    try {
      await api('weekTemplates', 'delete', { id: selectedTemplate })
      setSelectedTemplate('')
      await reload()
      setResult('Szablon został usunięty.')
    } catch (e) {
      console.error(e)
      setResult('Błąd podczas usuwania szablonu.')
    } finally {
      setBusy(false)
    }
  }

  const renameTemplate = async () => {
    if (!selectedTemplate) {
      setResult('Wybierz szablon do zmiany nazwy.')
      return
    }
    const tpl = weekTemplates.find(t => String(t.id) === selectedTemplate)
    const newName = prompt('Nowa nazwa szablonu:', tpl?.name || '')
    if (!newName?.trim()) return

    setBusy(true)
    try {
      await api('weekTemplates', 'update', { id: selectedTemplate, name: newName.trim() })
      await reload()
      setResult('Nazwa szablonu została zmieniona.')
    } catch (e) {
      console.error(e)
      setResult('Błąd podczas zmiany nazwy.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel">
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Planowanie całego tygodnia</div>
            <div className="sub">
              Kreator automatycznie zaproponuje obsadę zmian na wybrany tydzień lub miesiąc.
              Nie nadpisuje ręcznie wpisanych obsad – wypełnia tylko puste miejsca.
            </div>
          </div>
        </div>

        <div className="row" style={{ marginTop: 16, gap: 16 }}>
          <div className="field">
            <div className="label">Szablon tygodnia</div>
            <select
              className="select"
              value={selectedTemplate}
              onChange={e => setSelectedTemplate(e.target.value)}
              disabled={busy}
            >
              <option value="">— wybierz —</option>
              {weekTemplates
                .slice()
                .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
                .map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
            <div className="sub">Szablon to zestaw obsad dla dni tygodnia.</div>
          </div>

          <div className="field">
            <div className="label">Opcje zastosowania</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input
                type="checkbox"
                checked={onlyEmpty}
                onChange={e => setOnlyEmpty(e.target.checked)}
                disabled={busy}
              />
              <span className="sub">wypełniaj tylko puste miejsca</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <input
                type="checkbox"
                checked={skipSaturdays}
                onChange={e => setSkipSaturdays(e.target.checked)}
                disabled={busy}
              />
              <span className="sub">nie uwzględniaj soboty</span>
            </label>
          </div>
        </div>

        <div className="row" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
          <button className="btn" type="button" onClick={applyTemplate} disabled={busy || !selectedTemplate}>
            Zastosuj szablon
          </button>
          <button className="btn" type="button" onClick={saveAsTemplate} disabled={busy}>
            Zapisz jako nowy szablon
          </button>
          <button className="btn" type="button" onClick={renameTemplate} disabled={busy || !selectedTemplate}>
            Zmień nazwę
          </button>
          <button className="btn" type="button" onClick={deleteTemplate} disabled={busy || !selectedTemplate}>
            Usuń szablon
          </button>
        </div>

        <div className="row" style={{ marginTop: 16, gap: 16 }}>
          <div className="field">
            <div className="label">Początek tygodnia ({firstDayOfWeek === 'sunday' ? 'niedziela' : 'poniedziałek'})</div>
            <input
              className="input"
              type="date"
              value={weekStart}
              onChange={e => setWeekStart(e.target.value)}
              disabled={busy}
            />
          </div>

          <div className="field">
            <div className="label">Które zmiany uwzględniać</div>
            <div className="chips" style={{ marginTop: 8 }}>
              {shifts.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={selectedShiftIds.includes(String(s.id)) ? 'chip on' : 'chip'}
                  onClick={() => toggleShift(String(s.id))}
                  disabled={busy}
                >
                  {s.name} {s.start}–{s.end}
                </button>
              ))}
            </div>
            <div className="sub">Domyślnie wszystkie.</div>
          </div>
        </div>

        <div className="field" style={{ marginTop: 16 }}>
          <div className="label">Zasady:</div>
          <div className="sub">
            • używa docelowej ilości osób ustawionej przy każdym stanowisku<br />
            • wybiera tylko aktywnych pracowników z odpowiednim stanowiskiem, bez urlopów<br />
            • unika podwójnych zmian tego samego dnia<br />
            • nie nadpisuje już wpisanych ręcznie obsad
          </div>
        </div>

        <div className="row" style={{ marginTop: 16, justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
          <button className="btn" type="button" onClick={() => runPlan('week', true)} disabled={busy} style={{ borderStyle: 'dashed', minWidth: 140 }}>
            🔍 Symuluj tydzień
          </button>
          <button className="btn" type="button" onClick={() => runPlan('month', true)} disabled={busy} style={{ borderStyle: 'dashed', minWidth: 150 }}>
            🔍 Symuluj miesiąc
          </button>
          <button className="btn" type="button" onClick={() => runPlan('week')} disabled={busy} style={{ minWidth: 160, opacity: busy ? 0.6 : 1 }}>
            Ułóż losowo tydzień
          </button>
          <button className="btn primary" type="button" onClick={() => runPlan('month')} disabled={busy} style={{ minWidth: 170, opacity: busy ? 0.6 : 1 }}>
            Ułóż losowo miesiąc
          </button>
        </div>

        {result && !resultData && (
          <div className="sub" style={{ marginTop: 12, fontWeight: 600 }}>
            {result}
          </div>
        )}

        {resultData && (
          <div className="card" style={{ marginTop: 16, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>✅</span>
              <strong style={{ fontSize: 15 }}>Zapisano {resultData.created} przydziałów</strong>
              <span className="sub">w {resultData.daysCount} dniach.</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
              Metryki: średnia <strong>{resultData.metrics.avg}</strong> zmian/os, min <strong>{resultData.metrics.min}</strong>, max <strong>{resultData.metrics.max}</strong>, odch.std. <strong>{resultData.metrics.stdDev}</strong>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Ręczne wpisy nie zostały zmienione.</div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📊 Raport pokrycia</div>
              {resultData.issues.length > 0 ? (
                <>
                  <div style={{ color: 'var(--warn)', fontWeight: 600, marginBottom: 6 }}>
                    ⚠ Braki obsady ({resultData.issues.length}):
                  </div>
                  <div style={{ maxHeight: 220, overflowY: 'auto', paddingLeft: 4 }}>
                    <ul style={{ margin: 0, padding: '0 0 0 18px', listStyle: 'disc', fontSize: 13, lineHeight: 1.7 }}>
                      {resultData.issues.slice(0, 40).map((iss, idx) => (
                        <li key={idx}>
                          <strong>{iss.date}</strong> - {iss.shift} - {iss.position}: brak {iss.target - iss.assigned} os. (jest {iss.assigned}/{iss.target})
                        </li>
                      ))}
                      {resultData.issues.length > 40 && (
                        <li style={{ color: 'var(--text2)' }}>…i {resultData.issues.length - 40} więcej</li>
                      )}
                    </ul>
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--good)', fontWeight: 600 }}>✅ Pełne pokrycie — brak braków obsady.</div>
              )}
            </div>

            {resultData.topLoaded.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>👥 Najbardziej obciążeni:</div>
                <ul style={{ margin: 0, padding: '0 0 0 18px', listStyle: 'disc', fontSize: 13, lineHeight: 1.7 }}>
                  {resultData.topLoaded.map(([name, count]) => (
                    <li key={name}><strong>{name}</strong>: {count} zmian</li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button className="btn" type="button" onClick={() => { setResultData(null); setResult('') }} style={{ fontSize: 12 }}>
                Zamknij raport
              </button>
            </div>
          </div>
        )}

        {showSimPreview && simPreview.length > 0 && (() => {
          // Group by date for better readability
          const byDate = new Map<string, typeof simPreview>()
          for (const item of simPreview) {
            if (!byDate.has(item.date)) byDate.set(item.date, [])
            byDate.get(item.date)!.push(item)
          }
          const sortedDates = Array.from(byDate.keys()).sort()

          // Group by week
          const byWeek = new Map<string, string[]>()
          for (const date of sortedDates) {
            const wk = weekKeyFromISO(date)
            if (!byWeek.has(wk)) byWeek.set(wk, [])
            byWeek.get(wk)!.push(date)
          }
          const sortedWeeks = Array.from(byWeek.keys()).sort()
          
          // Calculate employee load
          const empLoad = new Map<string, number>()
          for (const item of simPreview) {
            for (const name of item.employeeNames) {
              empLoad.set(name, (empLoad.get(name) || 0) + 1)
            }
          }
          const topLoaded = Array.from(empLoad.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
          
          // Calculate metrics
          const loads = Array.from(empLoad.values())
          const avgLoad = loads.length ? (loads.reduce((a, b) => a + b, 0) / loads.length).toFixed(1) : '0'
          const minLoad = loads.length ? Math.min(...loads) : 0
          const maxLoad = loads.length ? Math.max(...loads) : 0

          const renderDateBlock = (date: string) => {
            const items = (byDate.get(date) || []).slice().sort((a, b) => {
              const aIdx = shifts.findIndex(s => String(s.id) === a.shiftId)
              const bIdx = shifts.findIndex(s => String(s.id) === b.shiftId)
              return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
            })
            return (
              <div key={date} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{date}</div>
                <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                  {items.map((item, idx) => {
                    const shift = shifts.find(s => String(s.id) === item.shiftId)
                    const pos = positions.find(p => String(p.id) === item.positionId)
                    return (
                      <li key={idx} style={{ marginBottom: 2 }}>
                        <span className="sub">{shift?.name || item.shiftId}</span>
                        {' - '}
                        <span>{pos?.name || item.positionId}</span>
                        {': '}
                        <strong>{item.employeeNames.join(', ')}</strong>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          }
          
          return (
            <div className="card" style={{ marginTop: 16, background: 'var(--bg2)', border: '2px dashed var(--primary)' }}>
              <div style={{ padding: '12px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ color: 'var(--good)', fontSize: 18 }}>✅</span>
                  <strong>Zapisano {simPreview.length} przydziałów</strong>
                  <span className="sub">w {sortedDates.length} dniach tygodnia.</span>
                </div>
                <div className="sub">
                  Metryki: średnia {avgLoad} zmian/os, min {minLoad}, max {maxLoad}
                </div>
                <div className="sub" style={{ marginTop: 4 }}>Ręczne wpisy nie zostały zmienione.</div>
              </div>
              
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontWeight: 700 }}>📊 Raport pokrycia</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={simGroupByWeek} onChange={e => setSimGroupByWeek(e.target.checked)} />
                    <span>Grupuj tygodniami</span>
                  </label>
                </div>
                <div style={{ maxHeight: 300, overflowY: 'auto', fontSize: 13 }}>
                  {simGroupByWeek ? (
                    sortedWeeks.map(wk => {
                      const weekDates = byWeek.get(wk) || []
                      const wkDate = parseISODate(wk)
                      const weekNum = getWeekNumber(wkDate)

                      // Build a STRUCTURAL fingerprint: shift+position+headcount (not names)
                      const dayFingerprints = new Map<string, string>()
                      for (const date of weekDates) {
                        const items = (byDate.get(date) || []).slice().sort((a, b) => {
                          const aIdx = shifts.findIndex(s => String(s.id) === a.shiftId)
                          const bIdx = shifts.findIndex(s => String(s.id) === b.shiftId)
                          if (aIdx !== bIdx) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
                          return a.positionId.localeCompare(b.positionId)
                        })
                        const fp = items.map(it => `${it.shiftId}|${it.positionId}|${it.employeeNames.length}`).join(';;')
                        dayFingerprints.set(date, fp)
                      }

                      // Group dates by identical structure
                      const groups = new Map<string, string[]>()
                      const groupOrder: string[] = []
                      for (const date of weekDates) {
                        const fp = dayFingerprints.get(date)!
                        if (!groups.has(fp)) {
                          groups.set(fp, [])
                          groupOrder.push(fp)
                        }
                        groups.get(fp)!.push(date)
                      }

                      // Find the main group (most days)
                      let mainFp = groupOrder[0] || ''
                      let mainCount = 0
                      for (const [fp, dates] of groups) {
                        if (dates.length > mainCount) { mainCount = dates.length; mainFp = fp }
                      }

                      const monthNames = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']

                      const fmtDayList = (dates: string[]) => {
                        return dates.map(d => {
                          const dt = parseISODate(d)
                          return `${dt.getDate()}`
                        }).join(', ') + (() => {
                          const dt = parseISODate(dates[0])
                          return ` ${monthNames[dt.getMonth()]} ${dt.getFullYear()}`
                        })()
                      }

                      return (
                        <div key={wk} style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text1)', borderBottom: '1px solid var(--border)', paddingBottom: 4, marginBottom: 6 }}>
                            Tydzień {weekNum} ({wk})
                          </div>
                          {groupOrder.map(fp => {
                            const dates = groups.get(fp)!
                            const isMain = fp === mainFp && groups.size > 1
                            const isException = fp !== mainFp && groups.size > 1
                            // Use first day as representative for the group
                            const repDate = dates[0]
                            const repItems = (byDate.get(repDate) || []).slice().sort((a, b) => {
                              const aIdx = shifts.findIndex(s => String(s.id) === a.shiftId)
                              const bIdx = shifts.findIndex(s => String(s.id) === b.shiftId)
                              if (aIdx !== bIdx) return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx)
                              return a.positionId.localeCompare(b.positionId)
                            })
                            return (
                              <div key={fp} style={{ marginBottom: 10, ...(isException ? { background: 'var(--warn-bg, #fff8e1)', borderRadius: 4, padding: '6px 8px', border: '1px solid var(--warn, #ffc107)' } : {}) }}>
                                <div style={{ fontWeight: 600, color: isException ? 'var(--warn, #e65100)' : 'var(--primary)', marginBottom: 4 }}>
                                  {fmtDayList(dates)}
                                  {isMain ? ' (plan standardowy)' : ''}
                                  {isException ? ' (wyjątek)' : ''}
                                </div>
                                <ul style={{ margin: '2px 0 0 16px', padding: 0, listStyle: 'disc' }}>
                                  {repItems.map((item, idx) => {
                                    const shift = shifts.find(s => String(s.id) === item.shiftId)
                                    const pos = positions.find(p => String(p.id) === item.positionId)
                                    return (
                                      <li key={idx} style={{ marginBottom: 1 }}>
                                        <span className="sub">{shift?.name || item.shiftId}</span>
                                        {' - '}
                                        <span>{pos?.name || item.positionId}</span>
                                        {': '}
                                        <strong>{item.employeeNames.join(', ')}</strong>
                                      </li>
                                    )
                                  })}
                                </ul>
                              </div>
                            )
                          })}
                        </div>
                      )
                    })
                  ) : (
                    sortedDates.map(date => renderDateBlock(date))
                  )}
                </div>
              </div>
              
              {topLoaded.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>👥 Najbardziej obciążeni:</div>
                  <ul style={{ margin: '0 0 0 16px', padding: 0, listStyle: 'disc', fontSize: 13 }}>
                    {topLoaded.map(([name, count]) => (
                      <li key={name}><strong>{name}</strong>: {count} zmian</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button className="btn" type="button" onClick={() => {
                  setShowSimPreview(false)
                  setSimPreview([])
                  setResult('Symulacja anulowana.')
                }}>
                  Anuluj
                </button>
                <button className="btn primary" type="button" onClick={async () => {
                  setBusy(true)
                  try {
                    pushUndoSnapshot()
                    for (const item of simPreview) {
                      await api('assignments', 'set', {
                        date: item.date,
                        shiftId: item.shiftId,
                        positionId: item.positionId,
                        employeeIds: item.employeeIds,
                        allowDoubleShift: false
                      })
                    }
                    await reload()
                    setShowSimPreview(false)
                    setResult(`✅ Zastosowano ${simPreview.length} przydziałów z symulacji.`)
                    setSimPreview([])
                  } catch (e) {
                    console.error(e)
                    setResult('Błąd podczas zapisywania symulacji.')
                    discardLastUndoSnapshot()
                  } finally {
                    setBusy(false)
                  }
                }} disabled={busy}>
                  ✅ Zastosuj rozkład
                </button>
              </div>
            </div>
          )
        })()}
      </div>

    </div>
  )
}
