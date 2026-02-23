import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { toISODate, parseISODate } from '../date'
import { api } from '../api'

function getWeekStartOfWeek(d: Date, firstDayOfWeek: 'monday' | 'sunday'): Date {
  const day = d.getDay()
  const diff = firstDayOfWeek === 'sunday' ? -day : (day === 0 ? -6 : 1 - day)
  const start = new Date(d)
  start.setDate(d.getDate() + diff)
  return start
}

export function EmailView() {
  const { data } = useStore()
  const settings = data?.settings
  const firstDayOfWeek: 'monday' | 'sunday' = settings?.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday'
  const employees = data?.employees || []

  const defaultWeekStart = toISODate(getWeekStartOfWeek(new Date(), firstDayOfWeek))

  // Full schedule email
  const [emailTo, setEmailTo] = useState('')
  const [emailRange, setEmailRange] = useState<'week' | 'month'>('week')
  const [emailDateFrom, setEmailDateFrom] = useState(defaultWeekStart)
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<string | null>(null)

  // Per-employee email
  const [empEmailTo, setEmpEmailTo] = useState('')
  const [empEmailRange, setEmpEmailRange] = useState<'week' | 'month'>('week')
  const [empEmailDateFrom, setEmpEmailDateFrom] = useState(defaultWeekStart)
  const [empEmailEmpId, setEmpEmailEmpId] = useState('')
  const [empEmailSending, setEmpEmailSending] = useState(false)
  const [empEmailResult, setEmpEmailResult] = useState<string | null>(null)

  const activeEmployees = useMemo(() =>
    employees.filter(e => e.active !== false).sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`)),
    [employees]
  )

  return (
    <div className="panel" style={{ display: 'grid', gap: 20 }}>
      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">📧 Wyślij grafik mailem</div>
            <div className="sub">Wyślij tabelkę z grafikiem na e-mail (np. na telefon). Skonfiguruj SMTP w Opcjach.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ minWidth: 140 }}>
              <div className="label">Zakres</div>
              <select className="select" value={emailRange} onChange={(e) => {
                const val = e.target.value as 'week' | 'month'
                setEmailRange(val)
                if (val === 'week') {
                  setEmailDateFrom(defaultWeekStart)
                } else {
                  const d = parseISODate(defaultWeekStart)
                  setEmailDateFrom(toISODate(new Date(d.getFullYear(), d.getMonth(), 1)))
                }
              }}>
                <option value="week">Tydzień</option>
                <option value="month">Miesiąc</option>
              </select>
            </div>
            <div className="field" style={{ minWidth: 160 }}>
              <div className="label">Data początkowa</div>
              <input className="input" type="date" value={emailDateFrom} onChange={(e) => setEmailDateFrom(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <div className="label">Adres e-mail odbiorcy</div>
              <input className="input" type="email" placeholder="jan@example.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="btn primary" type="button" disabled={emailSending || !emailTo.trim() || !emailDateFrom} onClick={async () => {
              setEmailSending(true)
              setEmailResult(null)
              try {
                const from = parseISODate(emailDateFrom)
                let to: Date
                if (emailRange === 'week') {
                  to = new Date(from)
                  to.setDate(from.getDate() + 6)
                } else {
                  to = new Date(from.getFullYear(), from.getMonth() + 1, 0)
                }
                const dateFrom = emailDateFrom
                const dateTo = toISODate(to)
                const res = await api('email', 'send', {
                  to: emailTo.trim(),
                  dateFrom,
                  dateTo,
                  subject: `Grafik zmian ${dateFrom} — ${dateTo}`,
                })
                if (res.ok) {
                  setEmailResult('✅ Grafik wysłany pomyślnie!')
                } else {
                  setEmailResult(`❌ ${(res as { error?: string }).error || 'Błąd wysyłania'}`)
                }
              } catch (e) {
                setEmailResult(`❌ ${String(e)}`)
              } finally {
                setEmailSending(false)
              }
            }}>
              {emailSending ? 'Wysyłanie…' : '📨 Wyślij grafik'}
            </button>
            {emailResult && <span style={{ fontSize: 13 }}>{emailResult}</span>}
          </div>
          <div className="sub">Grafik zostanie wysłany jako ładna tabelka HTML — czytelna na telefonie i komputerze.</div>
        </div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">👤 Wyślij grafik pracownika</div>
            <div className="sub">Wyślij indywidualny grafik wybranego pracownika na e-mail.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: 200 }}>
              <div className="label">Pracownik</div>
              <select className="select" value={empEmailEmpId} onChange={(e) => setEmpEmailEmpId(e.target.value)}>
                <option value="">— wybierz —</option>
                {activeEmployees.map(e => (
                  <option key={e.id} value={e.id}>{e.surname} {e.name}</option>
                ))}
              </select>
            </div>
            <div className="field" style={{ minWidth: 130 }}>
              <div className="label">Zakres</div>
              <select className="select" value={empEmailRange} onChange={(e) => {
                const val = e.target.value as 'week' | 'month'
                setEmpEmailRange(val)
                if (val === 'week') {
                  setEmpEmailDateFrom(defaultWeekStart)
                } else {
                  const d = parseISODate(defaultWeekStart)
                  setEmpEmailDateFrom(toISODate(new Date(d.getFullYear(), d.getMonth(), 1)))
                }
              }}>
                <option value="week">Tydzień</option>
                <option value="month">Miesiąc</option>
              </select>
            </div>
            <div className="field" style={{ minWidth: 150 }}>
              <div className="label">Data początkowa</div>
              <input className="input" type="date" value={empEmailDateFrom} onChange={(e) => setEmpEmailDateFrom(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <div className="label">Adres e-mail odbiorcy</div>
              <input className="input" type="email" placeholder="pracownik@example.com" value={empEmailTo} onChange={(e) => setEmpEmailTo(e.target.value)} />
            </div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="btn primary" type="button" disabled={empEmailSending || !empEmailTo.trim() || !empEmailEmpId || !empEmailDateFrom} onClick={async () => {
              setEmpEmailSending(true)
              setEmpEmailResult(null)
              try {
                const from = parseISODate(empEmailDateFrom)
                let to: Date
                if (empEmailRange === 'week') {
                  to = new Date(from)
                  to.setDate(from.getDate() + 6)
                } else {
                  to = new Date(from.getFullYear(), from.getMonth() + 1, 0)
                }
                const dateFrom = empEmailDateFrom
                const dateTo = toISODate(to)
                const res = await api('email', 'sendEmployee', {
                  to: empEmailTo.trim(),
                  employeeId: empEmailEmpId,
                  dateFrom,
                  dateTo,
                })
                if (res.ok) {
                  const emp = activeEmployees.find(e => e.id === empEmailEmpId)
                  const name = emp ? `${emp.name} ${emp.surname}`.trim() : empEmailEmpId
                  setEmpEmailResult(`✅ Grafik ${name} wysłany na ${empEmailTo.trim()}`)
                } else {
                  setEmpEmailResult(`❌ ${(res as { error?: string }).error || 'Błąd wysyłania'}`)
                }
              } catch (e) {
                setEmpEmailResult(`❌ ${String(e)}`)
              } finally {
                setEmpEmailSending(false)
              }
            }}>
              {empEmailSending ? 'Wysyłanie…' : '📨 Wyślij grafik pracownika'}
            </button>
            {empEmailResult && <span style={{ fontSize: 13 }}>{empEmailResult}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
