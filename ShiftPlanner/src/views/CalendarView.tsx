import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { useStore } from '../store'
import { fmtPLDate, getHolidayNames, getWeekNumber, isHoliday, monthStartISO, parseISODate, toISODate } from '../date'
import { api } from '../api'
import { effectiveShiftsForDate, employeeHasPosition, getAssignmentFromMap, getEmployeeIdsFromAssignment, isEmployeeAllowedOnShift } from '../assignments'
import { Modal } from '../ui/Modal'
import { useConfirm } from '../ui/Confirm'

function daysInMonth(monthISO: string) {
  const d = parseISODate(monthISO)
  const y = d.getFullYear()
  const m = d.getMonth()
  return new Date(y, m + 1, 0).getDate()
}

function dowIndex(dateISO: string, firstDayOfWeek: 'monday' | 'sunday') {
  const d = parseISODate(dateISO)
  const dow = d.getDay() // 0 Sun
  if (firstDayOfWeek === 'sunday') return dow
  return dow === 0 ? 6 : dow - 1
}

export function CalendarView() {
  const { schedule, data, reload, undoCount, redoCount, pushUndoSnapshot, discardLastUndoSnapshot, undoLastChange, redoLastChange, setSelection, setVisibleMonth, indexed } = useStore()
  const selectedSet = useMemo(() => new Set(schedule.selectedDates.map(String)), [schedule.selectedDates])
  const confirm = useConfirm()

  const firstDayOfWeek: 'monday' | 'sunday' = data?.settings?.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday'
  const showWeekends = data?.settings?.showWeekends !== false
  const showHolidays = data?.settings?.showHolidays !== false
  const showWeekNumbers = data?.settings?.showWeekNumbers === true
  const autoDayFocus = data?.settings?.autoDayFocus === true
  const disabledDays: number[] = Array.isArray(data?.settings?.disabledDays) ? (data.settings.disabledDays as number[]) : []
  const warnDoubleShift = data?.settings?.warnDoubleShift !== false
  const warnUnderstaffed = data?.settings?.warnUnderstaffed !== false

  const [calendarHidden, setCalendarHidden] = useState(false)

  // Bulk assign state
  const [bulkShiftId, setBulkShiftId] = useState('')
  const [bulkPositionId, setBulkPositionId] = useState('')
  const [bulkEmployeeIds, setBulkEmployeeIds] = useState<string[]>([])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkEmpFilterMode, setBulkEmpFilterMode] = useState<'linked' | 'all'>('linked')

  // Collapsible section for multi-day selection
  const [showSingleDayTable, setShowSingleDayTable] = useState(false)

  // Copy/paste day clipboard
  const [clipboardDate, setClipboardDate] = useState<string | null>(null)

  // Employee filter mode: 'linked' = only employees with matching position, 'all' = all employees
  const [empFilterMode, setEmpFilterMode] = useState<'linked' | 'all'>('linked')

  const [dragging, setDragging] = useState(false)
  const dragModeRef = useRef<'add' | 'remove' | null>(null)
  const [dragMoved, setDragMoved] = useState(false)
  const [suppressClick, setSuppressClick] = useState(false)
  const lastIsoRef = useRef<string | null>(null)
  const selectionRef = useRef<string[]>(schedule.selectedDates.map(String))
  const selectedDateRef = useRef<string>(schedule.selectedDate)
  const dragStartTime = useRef<number>(0)
  const prevUserSelectRef = useRef<string>('')

  useEffect(() => {
    if (!autoDayFocus) {
      setCalendarHidden(false)
      return
    }
    if (schedule.selectedDates.length > 1) {
      setCalendarHidden(false)
      return
    }
    setCalendarHidden(true)
  }, [autoDayFocus, schedule.selectedDate, schedule.selectedDates.length])

  useEffect(() => {
    selectionRef.current = schedule.selectedDates.map(String)
  }, [schedule.selectedDates])

  useEffect(() => {
    selectedDateRef.current = schedule.selectedDate
  }, [schedule.selectedDate])

  const monthISO = schedule.visibleMonth
  const monthDays = daysInMonth(monthISO)
  const firstDow = dowIndex(monthISO, firstDayOfWeek)
  const todayISO = useMemo(() => toISODate(new Date()), [])

  const cells = useMemo(() => {
    const arr: Array<{ iso: string | null; day: number | null }> = []
    for (let i = 0; i < firstDow; i++) arr.push({ iso: null, day: null })
    for (let day = 1; day <= monthDays; day++) {
      const d = parseISODate(monthISO)
      d.setDate(day)
      const iso = toISODate(d)
      arr.push({ iso, day })
    }
    while (arr.length % 7 !== 0) arr.push({ iso: null, day: null })
    return arr
  }, [monthISO, monthDays, firstDow])

  // Pre-compute per-cell metadata once when data/month changes
  const cellMeta = useMemo(() => {
    const map = new Map<string, {
      dow: number; isWeekend: boolean; isSunday: boolean; isToday: boolean;
      holiday: boolean; holidayNames: string[]; shiftCount: number;
      assignCount: number; vacCount: number; weekNum: number | null;
      hideThisDay: boolean; classes: string; title: string;
    }>()
    const weekNumCol = firstDayOfWeek === 'monday' ? 0 : 1
    const vacs = data?.vacations || []
    for (let idx = 0; idx < cells.length; idx++) {
      const c = cells[idx]
      if (!c.iso) continue
      const dayDate = parseISODate(c.iso)
      const dow = dayDate.getDay()
      const isWeekend = dow === 0 || dow === 6
      const isSunday = dow === 0
      const isToday = c.iso === todayISO
      const holiday = isHoliday(c.iso)
      const holidayNames = holiday ? getHolidayNames(c.iso) : []
      const dayShifts = effectiveShiftsForDate(data?.settings, c.iso)
      const dayAssignments = indexed.assignmentsByDate.get(c.iso) || []
      const assignCount = dayAssignments.reduce((sum, a) => sum + getEmployeeIdsFromAssignment(a).length, 0)
      const vacCount = vacs.filter(v => v.start <= c.iso! && c.iso! <= v.end).length
      const hideThisDay = (!showWeekends && isWeekend) || (!showHolidays && holiday && !isWeekend)
      const isDayDisabled = disabledDays.includes(dow)
      const cls: string[] = ['day']
      if (isToday) cls.push('today')
      if (isWeekend) cls.push('weekend')
      if (isSunday) cls.push('sunday')
      if (holiday && showHolidays) cls.push('holiday')
      if (!isWeekend && !holiday) cls.push('weekday')
      if (hideThisDay) cls.push('muted')
      if (isDayDisabled) cls.push('disabled-day')
      const showWeekNum = showWeekNumbers && (idx % 7 === weekNumCol)
      const weekNum = showWeekNum ? getWeekNumber(dayDate) : null
      const title = c.iso + (holidayNames.length ? ` - ${holidayNames.join(', ')}` : '')
      map.set(c.iso, {
        dow, isWeekend, isSunday, isToday, holiday, holidayNames,
        shiftCount: dayShifts.length, assignCount, vacCount, weekNum,
        hideThisDay, classes: cls.join(' '), title,
      })
    }
    return map
  }, [cells, data?.settings, data?.vacations, indexed.assignmentsByDate, showWeekends, showHolidays, showWeekNumbers, firstDayOfWeek, todayISO, disabledDays])

  function applyDragOn(iso: string) {
    const mode = dragModeRef.current
    if (!mode) return
    if (lastIsoRef.current === iso) return
    if (lastIsoRef.current && lastIsoRef.current !== iso) setDragMoved(true)
    lastIsoRef.current = iso
    const prev = selectionRef.current.length ? selectionRef.current : schedule.selectedDates
    const set = new Set(prev.map(String))
    if (mode === 'remove') {
      if (!set.has(iso)) return
      if (set.size <= 1) return
      set.delete(iso)
    } else {
      set.add(iso)
    }
    const next = Array.from(set).sort()
    selectionRef.current = next
    let primary = iso
    if (mode === 'remove' && String(selectedDateRef.current) === iso && !next.includes(iso)) {
      primary = next[next.length - 1] || iso
    }
    setSelection(next, primary)
    selectedDateRef.current = primary
  }

  function onMouseDownCell(e: ReactMouseEvent, iso: string) {
    e.preventDefault()
    const mode = e.button === 2 ? 'remove' : 'add'
    setDragging(true)
    dragModeRef.current = mode
    setDragMoved(false)
    setSuppressClick(false)
    dragStartTime.current = Date.now()
    selectionRef.current = schedule.selectedDates.slice()
    selectedDateRef.current = schedule.selectedDate
    lastIsoRef.current = null
    prevUserSelectRef.current = document.body.style.userSelect
    document.body.style.userSelect = 'none'
    applyDragOn(iso)
  }

  function onClickCell(e: ReactMouseEvent, iso: string) {
    // If we were dragging and moved, suppress this click
    if (suppressClick) {
      setSuppressClick(false)
      return
    }
    
    // Handle Shift+click for range selection
    if (e.shiftKey && schedule.selectedDates.length > 0) {
      const last = schedule.selectedDates[schedule.selectedDates.length - 1]
      const from = parseISODate(last)
      const to = parseISODate(iso)
      const minD = from <= to ? from : to
      const maxD = from <= to ? to : from
      const range: string[] = []
      for (let x = new Date(minD); x <= maxD; x.setDate(x.getDate() + 1)) {
        range.push(toISODate(x))
      }
      setSelection(range, iso)
      return
    }
    
    // Handle Ctrl+click for toggle selection
    if (e.ctrlKey || e.metaKey) {
      const idx = schedule.selectedDates.indexOf(iso)
      if (idx >= 0) {
        const newDates = schedule.selectedDates.filter((_, i) => i !== idx)
        if (newDates.length === 0) {
          setSelection([iso], iso)
        } else {
          setSelection(newDates, newDates[newDates.length - 1])
        }
      } else {
        setSelection([...schedule.selectedDates, iso].sort(), iso)
      }
      return
    }
    
    // Regular single click - select only this day
    setSelection([iso], iso)
  }

  useEffect(() => {
    const onUp = () => {
      if (!dragging) return
      if (dragMoved || (Date.now() - dragStartTime.current) > 180) setSuppressClick(true)
      setDragging(false)
      dragModeRef.current = null
      setDragMoved(false)
      lastIsoRef.current = null
      if (prevUserSelectRef.current !== '') {
        document.body.style.userSelect = prevUserSelectRef.current
        prevUserSelectRef.current = ''
      }
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [dragging, dragMoved])

  useEffect(() => {
    const onMenu = (e: MouseEvent) => {
      if (dragging) e.preventDefault()
    }
    window.addEventListener('contextmenu', onMenu)
    return () => window.removeEventListener('contextmenu', onMenu)
  }, [dragging])

  function prevMonth() {
    const d = parseISODate(monthISO)
    d.setMonth(d.getMonth() - 1)
    d.setDate(1)
    setVisibleMonth(monthStartISO(toISODate(d)))
  }
  function nextMonth() {
    const d = parseISODate(monthISO)
    d.setMonth(d.getMonth() + 1)
    d.setDate(1)
    setVisibleMonth(monthStartISO(toISODate(d)))
  }

  const header = useMemo(() => {
    const d = parseISODate(monthISO)
    return d.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
  }, [monthISO])

  const selectedDate = schedule.selectedDate
  const positions = data?.positions || []
  const employees = data?.employees || []
  const shifts = effectiveShiftsForDate(data?.settings, selectedDate)

  const sortedPositions = useMemo(() =>
    positions.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl')),
    [positions]
  )

  const shiftsPerEmployee = useMemo(() => {
    const map = new Map<string, number>()
    const dayAssigns = indexed.assignmentsByDate.get(selectedDate) || []
    for (const a of dayAssigns) {
      for (const empId of getEmployeeIdsFromAssignment(a)) {
        const k = String(empId)
        map.set(k, (map.get(k) || 0) + 1)
      }
    }
    return map
  }, [indexed.assignmentsByDate, selectedDate])

  const selectedDates = schedule.selectedDates

  // Union of all shifts across all selected dates — used in bulk assign modal
  const allSelectedShifts = useMemo(() => {
    const seen = new Set<string>()
    const result: Array<{ id: string; name: string; start: string; end: string }> = []
    for (const dateISO of selectedDates) {
      const dayShifts = effectiveShiftsForDate(data?.settings, dateISO)
      for (const s of dayShifts) {
        const key = String(s.id)
        if (!seen.has(key)) {
          seen.add(key)
          result.push(s)
        }
      }
    }
    return result
  }, [selectedDates, data?.settings])

  async function clearAssignmentsFor(dateISO: string, filter?: { shiftId?: string; positionId?: string }) {
    const day = indexed.assignmentsByDate.get(dateISO) || []
    const filtered = day.filter((a) => {
      if (filter?.shiftId && String(a.shiftId) !== String(filter.shiftId)) return false
      if (filter?.positionId && String(a.positionId) !== String(filter.positionId)) return false
      return true
    })
    const seen = new Set<string>()
    const pairs = filtered
      .map((a) => ({ shiftId: String(a.shiftId), positionId: String(a.positionId) }))
      .filter((x) => {
        const k = `${x.shiftId}::${x.positionId}`
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })

    await Promise.all(
      pairs.map((p) =>
        api('assignments', 'set', {
          date: dateISO,
          shiftId: p.shiftId,
          positionId: p.positionId,
          employeeIds: [],
          allowDoubleShift: true,
        }),
      ),
    )
  }

  async function withUndo<T>(fn: () => Promise<T>) {
    pushUndoSnapshot()
    try {
      return await fn()
    } catch (e) {
      discardLastUndoSnapshot()
      throw e
    }
  }

  async function restoreDefaultsForDay(dateISO: string) {
    const ok = await confirm({
      title: 'Przywróć ustawienia fabryczne',
      message: 'Przywrócić ustawienia fabryczne dla tego dnia? (usuwa wyjątki godzin i całą obsadę)',
      confirmText: 'Przywróć',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return
    await withUndo(async () => {
      const res = await api('settings', 'clearDayOverride', { date: dateISO })
      if (!res.ok) throw new Error(res.error || 'clearDayOverride_failed')
      await clearAssignmentsFor(dateISO)
      await reload()
    })
  }

  async function bulkClearSelectedDays() {
    const ok = await confirm({
      title: 'Usuń obsadę',
      message: `Usunąć obsadę z ${selectedDates.length} zaznaczonych dni?`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return
    await withUndo(async () => {
      // Collect all shift+position pairs to clear across all selected days
      const operations: Array<{ date: string; shiftId: string; positionId: string; employeeIds: string[] }> = []
      for (const d of selectedDates) {
        const dayAssigns = indexed.assignmentsByDate.get(d) || []
        const seen = new Set<string>()
        for (const a of dayAssigns) {
          const key = `${String(a.shiftId)}::${String(a.positionId)}`
          if (seen.has(key)) continue
          seen.add(key)
          operations.push({ date: d, shiftId: String(a.shiftId), positionId: String(a.positionId), employeeIds: [] })
        }
      }
      if (operations.length) {
        const res = await api('assignments', 'bulkSet', { operations })
        if (!res.ok) throw new Error(res.error || 'bulk_clear_failed')
      }
      await reload()
    })
  }

  async function bulkRestoreDefaultsSelectedDays() {
    const ok = await confirm({
      title: 'Przywróć ustawienia fabryczne',
      message: `Przywrócić ustawienia fabryczne dla ${selectedDates.length} zaznaczonych dni? (usuwa wyjątki godzin i całą obsadę)`,
      confirmText: 'Przywróć',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return
    await withUndo(async () => {
      // Clear day overrides in parallel
      await Promise.all(selectedDates.map(d => api('settings', 'clearDayOverride', { date: d })))
      // Collect all assignment clears and do in one bulkSet
      const operations: Array<{ date: string; shiftId: string; positionId: string; employeeIds: string[] }> = []
      for (const d of selectedDates) {
        const dayAssigns = indexed.assignmentsByDate.get(d) || []
        const seen = new Set<string>()
        for (const a of dayAssigns) {
          const key = `${String(a.shiftId)}::${String(a.positionId)}`
          if (seen.has(key)) continue
          seen.add(key)
          operations.push({ date: d, shiftId: String(a.shiftId), positionId: String(a.positionId), employeeIds: [] })
        }
      }
      if (operations.length) {
        const res = await api('assignments', 'bulkSet', { operations })
        if (!res.ok) throw new Error(res.error || 'bulk_clear_failed')
      }
      await reload()
    })
  }

  const [activeShiftId, setActiveShiftId] = useState<string | null>(null)
  
  // Auto-select first shift when shifts change
  const currentShiftId = activeShiftId && shifts.some(s => s.id === activeShiftId) ? activeShiftId : (shifts[0]?.id || null)

  // Pre-compute shiftRoster once per (selectedDate, currentShiftId) — shared across all positions
  const shiftRoster = useMemo(() => {
    const set = new Set<string>()
    if (!currentShiftId) return set
    const dayAssigns = indexed.assignmentsByDate.get(selectedDate) || []
    for (const x of dayAssigns) {
      if (String(x.shiftId) === String(currentShiftId)) {
        for (const id of getEmployeeIdsFromAssignment(x)) set.add(String(id))
      }
    }
    return set
  }, [indexed.assignmentsByDate, selectedDate, currentShiftId])

  const [ovOpen, setOvOpen] = useState(false)
  const [ovSaving, setOvSaving] = useState(false)
  const [ovErr, setOvErr] = useState<string | null>(null)
  const [ovShifts, setOvShifts] = useState<Array<{ id: string; name: string; start: string; end: string; enabled: boolean }>>([])
  const [ovIsOverride, setOvIsOverride] = useState(false)

  function openOverrides() {
    setOvErr(null)
    // Get base shifts from settings
    const baseShifts = data?.settings?.shifts || []
    // Get current effective shifts for the selected date
    const effectiveList = effectiveShiftsForDate(data?.settings, selectedDate)
    const effectiveIdSet = new Set(effectiveList.map((s) => String(s.id)))
    // Check if there's an existing override
    const ovRaw = data?.settings?.dayOverrides?.[selectedDate]
    const isOverride = Array.isArray(ovRaw)
    setOvIsOverride(isOverride)
    const ovById = new Map((Array.isArray(ovRaw) ? ovRaw : []).map((s) => [String(s.id), s]))
    
    // Build model: show all base shifts with enabled toggle based on effective or override
    // For Saturday (or other special days), use effective shift hours instead of base
    const effectiveById = new Map(effectiveList.map((s) => [String(s.id), s]))
    const list = baseShifts.map((s) => {
      const id = String(s.id)
      const fromOv = ovById.get(id)
      const enabled = isOverride ? ovById.has(id) : effectiveIdSet.has(id)
      const src = fromOv || effectiveById.get(id) || s
      return { id, enabled, name: String(src.name), start: String(src.start), end: String(src.end) }
    })
    setOvShifts(list)
    setOvOpen(true)
  }

  async function saveOverrides() {
    setOvErr(null)
    setOvSaving(true)
    try {
      // Only save shifts that are enabled
      const cleaned = ovShifts
        .filter((s) => s.enabled)
        .map((s) => ({
          id: String(s.id || '').trim(),
          name: String(s.name || '').trim(),
          start: String(s.start || '').trim(),
          end: String(s.end || '').trim(),
        }))
        .filter((s) => s.id && s.name && s.start && s.end)

      const res = await api('settings', 'setDayOverride', { date: selectedDate, shifts: cleaned })
      if (!res.ok) {
        setOvErr(res.error || 'save_failed')
        return
      }
      setOvOpen(false)
      await reload()
    } catch (e) {
      setOvErr(String(e))
    } finally {
      setOvSaving(false)
    }
  }

  async function clearOverrides() {
    const ok = await confirm({
      title: 'Usuń wyjątek',
      message: 'Usunąć wyjątek zmian dla tego dnia i wrócić do ustawień domyślnych?',
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    })
    if (!ok) return
    setOvErr(null)
    setOvSaving(true)
    try {
      const res = await api('settings', 'clearDayOverride', { date: selectedDate })
      if (!res.ok) {
        setOvErr(res.error || 'clear_failed')
        return
      }
      setOvOpen(false)
      await reload()
    } catch (e) {
      setOvErr(String(e))
    } finally {
      setOvSaving(false)
    }
  }

  return (
    <div className="panel scheduleGrid" style={calendarHidden ? { gridTemplateColumns: '1fr' } : undefined}>
      {!calendarHidden && (
      <div className="card calendarCard" style={{ userSelect: 'none' }}>
        <div className="calHeader">
          <div>
            <div className="cardTitle">Kalendarz zmian</div>
            <div className="sub">{header}</div>
          </div>
          <div className="row">
            <button className="btn" type="button" onClick={prevMonth}>←</button>
            <button className="btn" type="button" onClick={() => {
              const today = new Date()
              setVisibleMonth(monthStartISO(toISODate(today)))
              setSelection([toISODate(today)], toISODate(today))
            }}>Dziś</button>
            <button className="btn" type="button" onClick={nextMonth}>→</button>
          </div>
        </div>
        <div className="calGrid" style={{ marginTop: 12, marginBottom: 8 }}>
          {(firstDayOfWeek === 'monday' ? ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'] : ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']).map((d) => (
            <div key={d} className="dow">{d}</div>
          ))}

          {cells.map((c, idx) => {
            if (!c.iso) return <div key={idx} />
            const m = cellMeta.get(c.iso)
            if (!m) return <div key={idx} />
            const on = selectedSet.has(c.iso)
            const className = on ? m.classes + ' selected' : m.classes
            
            return (
              <div
                key={c.iso}
                className={className}
                style={m.hideThisDay ? { opacity: 0.4 } : undefined}
                onMouseDown={(e) => onMouseDownCell(e, c.iso!)}
                onMouseEnter={() => {
                  if (dragging) applyDragOn(c.iso!)
                }}
                onClick={(e) => onClickCell(e, c.iso!)}
                onContextMenu={(e) => e.preventDefault()}
                title={m.title}
              >
                <div className="dayNum">
                  {m.weekNum != null && <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 4 }}>W{m.weekNum}</span>}
                  {c.day}
                </div>
                <div className="dayMeta">
                  <span className={m.shiftCount === 0 ? 'chip off' : 'chip'}>
                    {m.shiftCount === 0 ? 'Brak' : `Zmian: ${m.shiftCount}`}
                  </span>
                  <span className="chip">Obsady: {m.assignCount}</span>
                  {m.vacCount > 0 && <span className="chip warn">Urlopy: {m.vacCount}</span>}
                  {m.holiday && showHolidays && <span className="chip chip-holiday" title={m.holidayNames.join(', ')}>Święto</span>}
                </div>
              </div>
            )
          })}
        </div>

        <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
          LPM przeciąganie: dodaje dni. PPM przeciąganie: usuwa dni.
        </div>
      </div>
      )}

      <div className="card dayCard">
        <div className="dayPanelHeader">
          <div>
            <div className="cardTitle">Dzień: {fmtPLDate(selectedDate)}</div>
            <div className="sub">{currentShiftId ? 'Obsada stanowisk dla wybranej zmiany' : 'Brak aktywnych zmian w tym dniu.'}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {autoDayFocus && (
              <button
                className="btn"
                type="button"
                onClick={() => setCalendarHidden(v => !v)}
                disabled={schedule.selectedDates.length > 1}
                style={schedule.selectedDates.length > 1 ? { opacity: 0.5 } : undefined}
              >
                {calendarHidden ? '🗓️ Kalendarz' : '📄 Tylko dzień'}
              </button>
            )}
            <button className="btn" type="button" onClick={() => void undoLastChange()} disabled={undoCount === 0} style={undoCount === 0 ? { opacity: 0.5 } : undefined}>
              ↩️ Cofnij ({undoCount})
            </button>
            <button className="btn" type="button" onClick={() => void redoLastChange()} disabled={redoCount === 0} style={redoCount === 0 ? { opacity: 0.5 } : undefined}>
              ↪️ Ponów ({redoCount})
            </button>
            <button className="btn" type="button" onClick={openOverrides}>🛠️ Zmiany tego dnia</button>
            <button className="btn" type="button" onClick={() => setClipboardDate(selectedDate)} title="Kopiuj obsadę tego dnia">
              📋 Kopiuj dzień
            </button>
            {clipboardDate && selectedDates.length <= 1 && (
              <button className="btn primary" type="button" onClick={async () => {
                if (!clipboardDate || clipboardDate === selectedDate) return
                const ok = await confirm({
                  title: 'Wklej obsadę',
                  message: `Wkleić obsadę z ${fmtPLDate(clipboardDate)} do ${fmtPLDate(selectedDate)}? Istniejąca obsada zostanie nadpisana.`,
                  confirmText: 'Wklej',
                  cancelText: 'Anuluj',
                })
                if (!ok) return
                await withUndo(async () => {
                  const res = await api('assignments', 'copyDay', { sourceDate: clipboardDate, targetDates: [selectedDate] })
                  if (!res.ok) throw new Error(res.error || 'paste_failed')
                  await reload()
                })
              }} title={`Wklej obsadę z ${fmtPLDate(clipboardDate)}`}>
                📌 Wklej z {fmtPLDate(clipboardDate)}
              </button>
            )}
            <button className="btn" type="button" onClick={() => void restoreDefaultsForDay(selectedDate)}>Przywróć ustawienia fabryczne</button>
          </div>
        </div>

        {selectedDates.length > 1 && (
          <div className="card bulkSelectionCard" style={{ marginTop: 12, padding: 14 }}>
            <div className="bulkSelectionHeader">
              <div className="bulkSelectionTitle">
                <span className="badge primary" style={{ fontSize: 14, padding: '4px 10px' }}>{selectedDates.length}</span>
                <span style={{ marginLeft: 8, fontWeight: 700 }}>zaznaczonych dni</span>
                <span className="sub" style={{ marginLeft: 8 }}>{selectedDates[0]} – {selectedDates[selectedDates.length - 1]}</span>
              </div>
            </div>

            {/* Inline bulk assign */}
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div className="field">
                <div className="label">Zmiana</div>
                <select className="select" value={bulkShiftId || allSelectedShifts[0]?.id || ''} onChange={(e) => setBulkShiftId(e.target.value)}>
                  {allSelectedShifts.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.start}–{s.end}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div className="label">Stanowisko</div>
                <select className="select" value={bulkPositionId || positions[0]?.id || ''} onChange={(e) => setBulkPositionId(e.target.value)}>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div className="label">Lista pracowników</div>
                <select className="select" value={bulkEmpFilterMode} onChange={(e) => setBulkEmpFilterMode(e.target.value as 'linked' | 'all')}>
                  <option value="linked">Tylko powiązani ze stanowiskiem</option>
                  <option value="all">Wszyscy pracownicy</option>
                </select>
              </div>
            </div>

            {/* Current assignment summary */}
            {(() => {
              const bulkPosId = bulkPositionId || positions[0]?.id || ''
              const bulkSid = bulkShiftId || allSelectedShifts[0]?.id || ''
              const pos = positions.find(p => String(p.id) === bulkPosId)
              // Gather current assignments for this shift+position across selected days
              const currentAssignments: Array<{ date: string; empIds: string[] }> = []
              for (const d of selectedDates) {
                const a = getAssignmentFromMap(indexed.assignmentsByDate, d, bulkSid, bulkPosId)
                const ids = getEmployeeIdsFromAssignment(a)
                currentAssignments.push({ date: d, empIds: ids })
              }
              const daysWithAssign = currentAssignments.filter(x => x.empIds.length > 0)
              const daysWithout = currentAssignments.filter(x => x.empIds.length === 0)
              // Unique employees currently assigned
              const allAssignedIds = new Set<string>()
              for (const ca of currentAssignments) for (const id of ca.empIds) allAssignedIds.add(id)

              return (
                <div style={{ marginTop: 10, padding: 10, background: 'var(--bg2)', borderRadius: 6, fontSize: 13 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Aktualna obsada: {pos?.name || ''} ({allSelectedShifts.find(s => s.id === bulkSid)?.name || ''})
                  </div>
                  {daysWithAssign.length > 0 ? (
                    <div style={{ marginBottom: 4 }}>
                      <span className="badge ok" style={{ marginRight: 6 }}>{daysWithAssign.length} dni obsadzonych</span>
                      {Array.from(allAssignedIds).map(id => {
                        const emp = indexed.employeesById.get(id)
                        return <span key={id} className="badge good" style={{ marginRight: 4 }}>{emp ? `${emp.name} ${emp.surname}`.trim() : id}</span>
                      })}
                    </div>
                  ) : null}
                  {daysWithout.length > 0 ? (
                    <span className="badge warn">{daysWithout.length} dni bez obsady</span>
                  ) : null}
                </div>
              )
            })()}

            <div className="field" style={{ marginTop: 10 }}>
              <div className="label">Pracownicy (Ctrl/Shift = wielu)</div>
              <select
                className="select"
                multiple
                size={8}
                value={bulkEmployeeIds}
                onChange={(e) => setBulkEmployeeIds(Array.from(e.target.selectedOptions).map((o) => o.value))}
                disabled={bulkSaving}
              >
                {(() => {
                  const bulkPosId = bulkPositionId || positions[0]?.id || ''
                  const bulkSid = bulkShiftId || allSelectedShifts[0]?.id || ''
                  const hideInactive = data?.settings?.hideInactiveInSelect === true
                  const vacs = data?.vacations || []

                  // Count vacation days per employee in selected range
                  const vacDaysMap = new Map<string, number>()
                  for (const d of selectedDates) {
                    for (const v of vacs) {
                      if (v.start <= d && d <= v.end) {
                        const eid = String(v.employeeId)
                        vacDaysMap.set(eid, (vacDaysMap.get(eid) || 0) + 1)
                      }
                    }
                  }

                  // Current assignments for this shift+position
                  const assignedInBulk = new Set<string>()
                  for (const d of selectedDates) {
                    const a = getAssignmentFromMap(indexed.assignmentsByDate, d, bulkSid, bulkPosId)
                    for (const id of getEmployeeIdsFromAssignment(a)) assignedInBulk.add(id)
                  }

                  // Employees on other shifts in selected days
                  const onOtherShift = new Set<string>()
                  const onThisShift = new Set<string>()
                  for (const d of selectedDates) {
                    const dayAssigns = indexed.assignmentsByDate.get(d) || []
                    for (const a of dayAssigns) {
                      for (const eid of getEmployeeIdsFromAssignment(a)) {
                        if (String(a.shiftId) === bulkSid) onThisShift.add(eid)
                        else onOtherShift.add(eid)
                      }
                    }
                  }

                  return employees
                    .filter(e => {
                      if (hideInactive && e.active === false) return false
                      if (bulkEmpFilterMode === 'all') return true
                      if (!employeeHasPosition(e, bulkPosId)) return false
                      if (!isEmployeeAllowedOnShift(e, bulkSid)) return false
                      return true
                    })
                    .sort((a, b) => {
                      // Sort: assigned first, then vacation last, then alphabetical
                      const aAssigned = assignedInBulk.has(String(a.id))
                      const bAssigned = assignedInBulk.has(String(b.id))
                      if (aAssigned !== bAssigned) return aAssigned ? -1 : 1
                      const aVacAll = (vacDaysMap.get(String(a.id)) || 0) >= selectedDates.length
                      const bVacAll = (vacDaysMap.get(String(b.id)) || 0) >= selectedDates.length
                      if (aVacAll !== bVacAll) return aVacAll ? 1 : -1
                      const aHasPos = employeeHasPosition(a, bulkPosId)
                      const bHasPos = employeeHasPosition(b, bulkPosId)
                      if (aHasPos !== bHasPos) return aHasPos ? -1 : 1
                      return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'pl')
                    })
                    .map(e => {
                      const eid = String(e.id)
                      const vacCount = vacDaysMap.get(eid) || 0
                      const allVac = vacCount >= selectedDates.length
                      const someVac = vacCount > 0 && !allVac
                      const isAssigned = assignedInBulk.has(eid)
                      const notAllowed = !isEmployeeAllowedOnShift(e, bulkSid)
                      const noPos = !employeeHasPosition(e, bulkPosId)

                      let cls = ''
                      if (isAssigned) cls = 'emp-opt-this-shift'
                      else if (onOtherShift.has(eid) && !onThisShift.has(eid)) cls = 'emp-opt-other-shift'

                      const labels: string[] = []
                      if (isAssigned) labels.push('✓ przypisany')
                      if (allVac) labels.push('🚫 URL cały zakres')
                      else if (someVac) labels.push(`⚠️ URL ${vacCount}/${selectedDates.length} dni`)
                      if (notAllowed) labels.push('⚠️ inna zmiana')
                      if (noPos && bulkEmpFilterMode === 'all') labels.push('⚠️ inne stanowisko')

                      return (
                        <option
                          key={e.id}
                          value={e.id}
                          disabled={allVac}
                          className={cls}
                        >
                          {`${e.name} ${e.surname}`.trim()}{labels.length ? ` (${labels.join(', ')})` : ''}
                        </option>
                      )
                    })
                })()}
              </select>
              <div className="sub" style={{ marginTop: 6 }}>Wybór wielu: przytrzymaj Ctrl/Shift. Urlopowicze (cały zakres) są zablokowani. Osoby z urlopem częściowym będą pominięte w dniach urlopu.</div>
            </div>
            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn primary"
                type="button"
                disabled={bulkSaving || !bulkEmployeeIds.length}
                style={!bulkEmployeeIds.length ? { opacity: 0.5 } : undefined}
                onClick={async () => {
                  const shiftIdToUse = bulkShiftId || allSelectedShifts[0]?.id
                  const posIdToUse = bulkPositionId || positions[0]?.id
                  if (!shiftIdToUse || !posIdToUse) return
                  setBulkSaving(true)
                  pushUndoSnapshot()
                  try {
                    const operations: Array<{ date: string; shiftId: string; positionId: string; employeeIds: string[] }> = []
                    for (const dateISO of selectedDates) {
                      const dayShifts = effectiveShiftsForDate(data?.settings, dateISO)
                      if (!dayShifts.some((sh) => String(sh.id) === String(shiftIdToUse))) continue
                      const vacs = data?.vacations || []
                      const toAssign = bulkEmployeeIds.filter(
                        (id) => !vacs.some((v) => String(v.employeeId) === String(id) && v.start <= dateISO && dateISO <= v.end)
                      )
                      operations.push({ date: dateISO, shiftId: shiftIdToUse, positionId: posIdToUse, employeeIds: toAssign })
                    }
                    if (operations.length) {
                      const res = await api('assignments', 'bulkSet', { operations })
                      if (!res.ok) throw new Error(res.error || 'bulk_assign_failed')
                    }
                    await reload()
                    setBulkEmployeeIds([])
                  } catch (e) {
                    console.error(e)
                    discardLastUndoSnapshot()
                  } finally {
                    setBulkSaving(false)
                  }
                }}
              >
                {bulkSaving ? 'Zapisywanie…' : `Zastosuj na ${selectedDates.length} dni`}
              </button>
              {clipboardDate && (
                <button className="btn" type="button" onClick={async () => {
                  if (!clipboardDate) return
                  const targets = selectedDates.filter(d => d !== clipboardDate)
                  if (!targets.length) return
                  const ok = await confirm({
                    title: 'Wklej obsadę',
                    message: `Wkleić obsadę z ${fmtPLDate(clipboardDate)} do ${targets.length} dni?`,
                    confirmText: 'Wklej',
                    cancelText: 'Anuluj',
                  })
                  if (!ok) return
                  await withUndo(async () => {
                    const res = await api('assignments', 'copyDay', { sourceDate: clipboardDate, targetDates: targets })
                    if (!res.ok) throw new Error(res.error || 'paste_failed')
                    await reload()
                  })
                }}>
                  📌 Wklej z {fmtPLDate(clipboardDate)}
                </button>
              )}
              <button className="btn" type="button" onClick={() => void bulkClearSelectedDays()}>Usuń obsadę</button>
              <button className="btn" type="button" onClick={() => void bulkRestoreDefaultsSelectedDays()}>Przywróć domyślne</button>
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                className="btn"
                type="button"
                style={{ background: 'transparent', border: 'none', padding: '6px 0', color: 'var(--muted)' }}
                onClick={() => setShowSingleDayTable((prev) => !prev)}
              >
                {showSingleDayTable ? '▼ Ukryj tabelkę obsady (dzień główny)' : '▶ Pokaż tabelkę obsady (dzień główny)'}
              </button>
            </div>
          </div>
        )}

        {currentShiftId && (selectedDates.length <= 1 || showSingleDayTable) && (
          <>
            <div className="row" style={{ marginTop: 14, gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="field" style={{ flex: 1 }}>
                <div className="label">Lista pracowników</div>
                <select
                  className="select"
                  value={empFilterMode}
                  onChange={(e) => setEmpFilterMode(e.target.value as 'linked' | 'all')}
                >
                  <option value="linked">Tylko powiązani ze stanowiskiem</option>
                  <option value="all">Wszyscy pracownicy</option>
                </select>
              </div>
            </div>

            <div className="shiftTabs" style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {shifts.map((s) => (
                <button
                  key={s.id}
                  className={s.id === currentShiftId ? 'btn primary' : 'btn'}
                  type="button"
                  onClick={() => setActiveShiftId(s.id)}
                >
                  {s.name} <span className="sub" style={{ marginLeft: 6 }}>{s.start}–{s.end}</span>
                </button>
              ))}
            </div>

            <div className="assignList" style={{ marginTop: 14 }}>
              {positions.length ? (
                sortedPositions.map((p) => {
                  const a = getAssignmentFromMap(indexed.assignmentsByDate, selectedDate, currentShiftId, p.id)
                  const empIds = getEmployeeIdsFromAssignment(a)
                  const targetCount = Number(p.targetCount || 0)
                  const understaffed = warnUnderstaffed && targetCount > 0 && empIds.length < targetCount

                  const empBadges = empIds.length
                    ? empIds.map((id) => {
                        const e = indexed.employeesById.get(String(id))
                        return <span key={id} className="badge good" style={{ marginRight: 4 }}>{e ? `${e.name} ${e.surname}`.trim() : id}</span>
                      })
                    : <span className="sub">Brak</span>

                  // Get list of employees for multi-select (respecting settings and filter mode)
                  const hideInactive = data?.settings?.hideInactiveInSelect === true
                  const autoSuggestEnabled = data?.settings?.autoSuggest === true
                  
                  let eligibleForPos = employees
                    .filter(e => {
                      // Always show already assigned employees
                      if (empIds.includes(String(e.id))) return true
                      // Hide inactive if setting enabled
                      if (hideInactive && e.active === false) return false
                      return true
                    })
                    .filter(e => {
                      // Always show already assigned employees
                      if (empIds.includes(String(e.id))) return true
                      // If filter mode is 'all', show all employees
                      if (empFilterMode === 'all') return true
                      // Otherwise, only show employees with matching position
                      return employeeHasPosition(e, p.id)
                    })
                    .filter(e => {
                      // Always show already assigned employees
                      if (empIds.includes(String(e.id))) return true
                      // If filter mode is 'all', show all (no shift filter)
                      if (empFilterMode === 'all') return true
                      // Otherwise, filter by allowed shift
                      return isEmployeeAllowedOnShift(e, currentShiftId)
                    })
                    .slice()
                  
                  // Sort with autoSuggest - prioritize employees with position and allowed shift
                  if (autoSuggestEnabled) {
                    eligibleForPos = eligibleForPos.sort((a, b) => {
                      const aHasPos = employeeHasPosition(a, p.id)
                      const bHasPos = employeeHasPosition(b, p.id)
                      const aAllowed = isEmployeeAllowedOnShift(a, currentShiftId)
                      const bAllowed = isEmployeeAllowedOnShift(b, currentShiftId)
                      const aVacs = indexed.vacationsByEmployee.get(String(a.id)) || []
                      const aVac = aVacs.some(v => v.start <= selectedDate && selectedDate <= v.end)
                      const bVacs = indexed.vacationsByEmployee.get(String(b.id)) || []
                      const bVac = bVacs.some(v => v.start <= selectedDate && selectedDate <= v.end)
                      // Priority: not on vacation > allowed shift > has position > alphabetical
                      if (aVac !== bVac) return aVac ? 1 : -1
                      if (aAllowed !== bAllowed) return aAllowed ? -1 : 1
                      if (aHasPos !== bHasPos) return aHasPos ? -1 : 1
                      return `${a.name} ${a.surname}`.localeCompare(`${b.name} ${b.surname}`, 'pl')
                    })
                  } else {
                    eligibleForPos = eligibleForPos.sort((x, y) => `${x.name} ${x.surname}`.localeCompare(`${y.name} ${y.surname}`, 'pl'))
                  }

                  const handleSelectChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
                    const selected = Array.from(e.target.selectedOptions).map(o => o.value)

                    // Check if any newly added employee is not allowed on this shift
                    const newlyAdded = selected.filter(id => !empIds.includes(id))
                    const notAllowed = newlyAdded.filter(id => {
                      const emp = employees.find(x => String(x.id) === id)
                      return emp && !isEmployeeAllowedOnShift(emp, currentShiftId)
                    })
                    if (notAllowed.length > 0) {
                      const names = notAllowed.map(id => {
                        const emp = employees.find(x => String(x.id) === id)
                        return emp ? `${emp.name} ${emp.surname}`.trim() : id
                      }).join(', ')
                      const ok = await confirm({
                        title: 'Niedozwolona zmiana',
                        message: `${names} — ${notAllowed.length > 1 ? 'ci pracownicy nie mają' : 'ten pracownik nie ma'} przypisanej tej zmiany w ustawieniach. Czy mimo to przypisać?`,
                        confirmText: 'Przypisz mimo to',
                        cancelText: 'Anuluj',
                      })
                      if (!ok) {
                        await reload()
                        return
                      }
                    }

                    await withUndo(async () => {
                      // First try without allowDoubleShift
                      let res = await api('assignments', 'set', { 
                        date: selectedDate, 
                        shiftId: currentShiftId, 
                        positionId: p.id, 
                        employeeIds: selected, 
                        allowDoubleShift: false 
                      })
                      
                      // Handle double_shift_requires_confirm - ask user
                      if (!res.ok && res.error === 'double_shift_requires_confirm') {
                        const ok = !warnDoubleShift || (await confirm({
                          title: 'Podwójna zmiana',
                          message: 'Pracownik ma już przypisaną inną zmianę tego dnia. Czy przypisać mimo to?',
                          confirmText: 'Tak',
                          cancelText: 'Anuluj',
                        }))
                        if (!ok) {
                          await reload()
                          return
                        }
                        res = await api('assignments', 'set', { 
                          date: selectedDate, 
                          shiftId: currentShiftId, 
                          positionId: p.id, 
                          employeeIds: selected, 
                          allowDoubleShift: true 
                        })
                      }
                      
                      // Handle duplicate_employee_in_shift - ask to move
                      if (!res.ok && res.error === 'duplicate_employee_in_shift') {
                        const ok = await confirm({
                          title: 'Duplikat w zmianie',
                          message: 'Pracownik jest już przypisany do innego stanowiska na tej zmianie. Czy przenieść?',
                          confirmText: 'Przenieś',
                          cancelText: 'Anuluj',
                        })
                        if (!ok) {
                          await reload()
                          return
                        }
                        res = await api('assignments', 'set', { 
                          date: selectedDate, 
                          shiftId: currentShiftId, 
                          positionId: p.id, 
                          employeeIds: selected, 
                          allowShiftPositionMove: true 
                        })
                      }
                      
                      if (!res.ok) throw new Error(res.error || 'set_failed')
                      await reload()
                    })
                  }

                  const handleAutoFill = async () => {
                    const eligible = employees
                      .filter(e => e.active !== false)
                      .filter(e => employeeHasPosition(e, p.id))
                      .filter(e => isEmployeeAllowedOnShift(e, currentShiftId))
                      .filter(e => !(data?.vacations || []).some(v => v.employeeId === e.id && v.start <= selectedDate && selectedDate <= v.end))
                      .slice(0, p.targetCount || 1)
                      .map(e => e.id)
                    if (!eligible.length) return
                    await withUndo(async () => {
                      const res = await api('assignments', 'set', { 
                        date: selectedDate, 
                        shiftId: currentShiftId, 
                        positionId: p.id, 
                        employeeIds: eligible, 
                        allowDoubleShift: false 
                      })
                      if (!res.ok) throw new Error(res.error || 'auto_failed')
                      await reload()
                    })
                  }

                  return (
                    <div key={p.id} className="assignCard">
                      <div className="assignHead">
                        <div className="assignLeft">
                          <div className="assignPos">
                            {p.name}
                            {understaffed ? (
                              <span className="badge warn" style={{ marginLeft: 8 }}>
                                Brak: {targetCount - empIds.length}
                              </span>
                            ) : null}
                          </div>
                          <div className="label" style={{ marginTop: 6 }}>Aktualna obsada</div>
                          <div className="assignBadges">{empBadges}</div>
                        </div>
                        <div className="assignBtns">
                          <button className="btn" type="button" onClick={async () => {
                            await withUndo(async () => {
                              const res = await api('assignments', 'set', { date: selectedDate, shiftId: currentShiftId, positionId: p.id, employeeIds: [], allowDoubleShift: true })
                              if (!res.ok) throw new Error(res.error || 'clear_failed')
                              await reload()
                            })
                          }}>Wyczyść</button>
                          <button className="btn" type="button" onClick={handleAutoFill}>Auto</button>
                        </div>
                      </div>
                      <div className="assignBody">
                        <div className="field" style={{ minWidth: 260 }}>
                          <div className="label">Wybierz osoby</div>
                          <select 
                            className="select" 
                            multiple 
                            size={7} 
                            value={empIds}
                            onChange={handleSelectChange}
                          >
                            {eligibleForPos.map(e => {
                              const empVacs = indexed.vacationsByEmployee.get(String(e.id)) || []
                              const isOnVac = empVacs.some(v => v.start <= selectedDate && selectedDate <= v.end)
                              const empKey = String(e.id)
                              const totalShifts = shiftsPerEmployee.get(empKey) || 0
                              let cls = ''
                              if (totalShifts > 0) {
                                if (shiftRoster.has(empKey)) cls = 'emp-opt-this-shift'
                                else cls = 'emp-opt-other-shift'
                              }
                              const notAllowedOnShift = !isEmployeeAllowedOnShift(e, currentShiftId)
                              return (
                                <option 
                                  key={e.id} 
                                  value={e.id} 
                                  disabled={isOnVac}
                                  className={cls}
                                >
                                  {`${e.name} ${e.surname}`.trim()}{isOnVac ? ' (URL)' : ''}{notAllowedOnShift ? ' ⚠️ inna zmiana' : ''}
                                </option>
                              )
                            })}
                          </select>
                          <div className="sub" style={{ marginTop: 6 }}>Wybór wielu: przytrzymaj Ctrl/Shift. Urlopowicze są zablokowani.</div>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="sub" style={{ padding: 18, textAlign: 'center' }}>Brak stanowisk. Dodaj je w zakładce „Stanowiska".</div>
              )}
            </div>
          </>
        )}

        {!currentShiftId && shifts.length === 0 && (
          <div className="sub" style={{ marginTop: 12 }}>Możesz włączyć/wyłączyć zmiany dla tego dnia w „Zmiany tego dnia".</div>
        )}
      </div>

      <Modal open={ovOpen} title={`Zmiany w dniu ${selectedDate}`} onClose={() => (ovSaving ? null : setOvOpen(false))}>
        <div style={{ display: 'grid', gap: 10 }}>
          <div className="card2" style={{ padding: 12 }}>
            <div className="muted" style={{ fontSize: 12 }}>
              Tutaj możesz zmienić godziny/nazwy zmian tylko dla jednego dnia.
            </div>
            <div style={{ marginTop: 8 }}>
              <span className={`badge ${ovIsOverride ? 'warn' : ''}`}>
                {ovIsOverride ? 'Ustawiony wyjątek' : 'Domyślne zmiany'}
              </span>
            </div>
          </div>

          {ovShifts.length ? (
            ovShifts.map((s, idx) => (
              <div key={`${s.id}-${idx}`} className="card2" style={{ padding: 12 }}>
                <div className="row" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="field" style={{ minWidth: 120 }}>
                    <div className="label">Aktywna</div>
                    <select
                      className="select"
                      value={s.enabled ? '1' : '0'}
                      onChange={(e) =>
                        setOvShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, enabled: e.target.value === '1' } : x)))
                      }
                      disabled={ovSaving}
                    >
                      <option value="1">Tak</option>
                      <option value="0">Nie</option>
                    </select>
                  </div>
                  <div className="field" style={{ minWidth: 60 }}>
                    <div className="label">ID (stałe)</div>
                    <input className="input" value={s.id} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className="field" style={{ flex: 1, minWidth: 120 }}>
                    <div className="label">Nazwa</div>
                    <input
                      className="input"
                      value={s.name}
                      onChange={(e) =>
                        setOvShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))
                      }
                      disabled={ovSaving}
                    />
                  </div>
                  <div className="field" style={{ minWidth: 100 }}>
                    <div className="label">Start</div>
                    <input
                      className="input"
                      value={s.start}
                      placeholder="07:00"
                      onChange={(e) =>
                        setOvShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x)))
                      }
                      disabled={ovSaving}
                    />
                  </div>
                  <div className="field" style={{ minWidth: 100 }}>
                    <div className="label">Koniec</div>
                    <input
                      className="input"
                      value={s.end}
                      placeholder="15:00"
                      onChange={(e) =>
                        setOvShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x)))
                      }
                      disabled={ovSaving}
                    />
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                  Wyjątek dla: {selectedDate} (nie zmienia globalnych opcji)
                </div>
              </div>
            ))
          ) : (
            <div className="card2 muted" style={{ padding: 18, textAlign: 'center' }}>
              Brak zmian w ustawieniach. Dodaj zmiany w Opcjach.
            </div>
          )}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn" type="button" onClick={() => void clearOverrides()} disabled={ovSaving}>
              Wyczyść wyjątek
            </button>
            <button className="btn primary" type="button" onClick={() => void saveOverrides()} disabled={ovSaving}>
              {ovSaving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>

          {ovErr ? <div className="errorBox">{ovErr}</div> : null}
        </div>
      </Modal>

    </div>
  )
}
