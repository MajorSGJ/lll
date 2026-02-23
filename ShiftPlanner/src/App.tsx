import { useState, useEffect, lazy, Suspense } from 'react'
import './App.css'
import { StoreProvider, useStore } from './store'
import type { AppView } from './types'
import { PrintModal } from './ui/PrintModal'
import { ToastProvider } from './ui/Toast'
import { ConfirmProvider } from './ui/Confirm'
import { QuickAddModal } from './ui/QuickAddModal'
import { formatDatePL } from './date'
import { fetchProfiles, getCurrentProfileId, setCurrentProfileId, type Profile } from './api'

const CalendarView = lazy(() => import('./views/CalendarView').then(m => ({ default: m.CalendarView })))
const EmployeesView = lazy(() => import('./views/EmployeesView').then(m => ({ default: m.EmployeesView })))
const EmployeePairsView = lazy(() => import('./views/EmployeePairsView').then(m => ({ default: m.EmployeePairsView })))
const PositionsView = lazy(() => import('./views/PositionsView').then(m => ({ default: m.PositionsView })))
const SettingsView = lazy(() => import('./views/SettingsView').then(m => ({ default: m.SettingsView })))
const VacationsView = lazy(() => import('./views/VacationsView').then(m => ({ default: m.VacationsView })))
const WeekPlannerView = lazy(() => import('./views/WeekPlannerView').then(m => ({ default: m.WeekPlannerView })))
const EmailView = lazy(() => import('./views/EmailView').then(m => ({ default: m.EmailView })))

const NAV_ITEMS: { id: AppView; icon: string; label: string }[] = [
  { id: 'calendar', icon: '📅', label: 'Kalendarz' },
  { id: 'employees', icon: '👷', label: 'Pracownicy' },
  { id: 'employeePairs', icon: '🤝', label: 'Pary pracowników' },
  { id: 'positions', icon: '🏷️', label: 'Stanowiska' },
  { id: 'vacations', icon: '🏖️', label: 'Urlopy' },
  { id: 'weekPlanner', icon: '🧩', label: 'Planowanie tygodnia' },
  { id: 'email', icon: '📧', label: 'Email' },
  { id: 'settings', icon: '⚙️', label: 'Opcje' },
]

const VIEW_TITLES: Record<AppView, string> = {
  calendar: 'Kalendarz',
  employees: 'Pracownicy',
  employeePairs: 'Pary pracowników',
  positions: 'Stanowiska',
  vacations: 'Urlopy',
  weekPlanner: 'Planowanie tygodnia',
  email: 'Email',
  settings: 'Opcje',
}

function NavItem({ id, icon, label }: { id: AppView; icon: string; label: string }) {
  const { view, setView } = useStore()
  const active = view === id
  return (
    <button type="button" className={active ? 'navItem active' : 'navItem'} onClick={() => setView(id)}>
      <span className="navIcon">{icon}</span>
      <span>{label}</span>
    </button>
  )
}

type ThemeType = 'dark' | 'light'

function ProfileSwitcher({ onSwitch }: { onSwitch: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [current, setCurrent] = useState(getCurrentProfileId())
  const [showMenu, setShowMenu] = useState(false)

  const load = async () => {
    try {
      const data = await fetchProfiles()
      setProfiles(data.profiles)
    } catch {
      setProfiles([{ id: 'default', name: 'Domyślny' }])
    }
  }

  useEffect(() => { load() }, [])

  const currentProfile = profiles.find(p => p.id === current) || profiles[0] || { id: 'default', name: 'Domyślny' }

  const switchTo = (id: string) => {
    setCurrent(id)
    setCurrentProfileId(id)
    setShowMenu(false)
    onSwitch()
  }

  if (profiles.length <= 1) return null

  return (
    <div className="profileSwitcher">
      <button
        type="button"
        className="profileBtn"
        onClick={() => setShowMenu(!showMenu)}
      >
        <span className="profileIcon">📁</span>
        <span className="profileName">{currentProfile.name}</span>
        <span className="profileArrow">{showMenu ? '▲' : '▼'}</span>
      </button>

      {showMenu && (
        <div className="profileMenu">
          <div className="profileMenuTitle">Profile</div>
          {profiles.map(p => (
            <div key={p.id} className={`profileMenuItem ${p.id === current ? 'active' : ''}`}>
              <button type="button" className="profileSelect" onClick={() => switchTo(p.id)}>
                {p.id === current && <span className="profileCheck">✓</span>}
                {p.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ProfileGate({ onSelected }: { onSelected: () => void }) {
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    fetchProfiles()
      .then((data) => {
        const list = data?.profiles || []
        setProfiles(list)
        const current = getCurrentProfileId()
        if (current && list.some((p) => p.id === current)) onSelected()
      })
      .catch(() => setProfiles([]))
      .finally(() => setLoadingProfiles(false))
  }, [onSelected])

  const select = (id: string) => {
    setCurrentProfileId(id)
    onSelected()
  }

  if (loadingProfiles) {
    return <div className="panel"><h2>Ładowanie profili…</h2></div>
  }

  if (!profiles.length) {
    return (
      <div className="panel">
        <h2>Brak przypisanego profilu</h2>
        <div className="muted">Poproś administratora OneHost o przypisanie profilu ShiftPlanner.</div>
      </div>
    )
  }

  return (
    <div className="panel">
      <h2>Wybierz bazę danych</h2>
      <div className="muted" style={{ marginBottom: 12 }}>Widzisz tylko profile przypisane do Twojego konta.</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {profiles.map((p) => (
          <button key={p.id} className="btn" type="button" onClick={() => select(p.id)}>
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

function useTheme() {
  const [theme, setTheme] = useState<ThemeType>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as ThemeType) || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const cycle = () => setTheme(t => t === 'dark' ? 'light' : 'dark')
  
  return { theme, cycle }
}

function AppShell({ onBackToProfile }: { onBackToProfile: () => void }) {
  const { view, loading, error, data, reload } = useStore()
  const appName = String(data?.settings?.appName || 'ShiftPlanner')
  const hallName = data?.settings?.hallName ? `Hala ${String(data.settings.hallName)}` : ''
  const [printOpen, setPrintOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const { theme, cycle: toggleTheme } = useTheme()

  const today = new Date()
  const todayStr = formatDatePL(today)

  return (
    <>
      <div className="bg" />
      <div className="app">
        <aside className="sidebar">
          <div className="brand">
            <div className="brandMark">
              <span className="brandEmoji">🗓️</span>
            </div>
            <div>
              <div className="brandName">{appName}</div>
              <div className="brandSub">{hallName || 'Planer zmian'}</div>
            </div>
          </div>

          <ProfileSwitcher onSwitch={() => void reload()} />

          <nav className="nav">
            {NAV_ITEMS.map(item => (
              <NavItem key={item.id} id={item.id} icon={item.icon} label={item.label} />
            ))}
          </nav>

          <div className="sidebarFooter">
            <div className="footerButtons">
              <button className="btn ghost" type="button" onClick={onBackToProfile}>
                🗂️ Zmień profil
              </button>
              <button className="btn ghost" type="button" onClick={toggleTheme}>
                {theme === 'dark' ? '🌙 Ciemny' : '☀️ Jasny'}
              </button>
            </div>

          </div>
        </aside>

        <main className="main">
          <header className="topbar">
            <div className="crumb">{VIEW_TITLES[view]}</div>
            <div className="topbarActions">
              <div className="pill">{todayStr}</div>
              <button className="btn" type="button" onClick={() => setPrintOpen(true)} disabled={loading}>
                🖨️ Drukuj
              </button>
              <button className="btn" type="button" onClick={() => setQuickAddOpen(true)} disabled={loading}>
                ＋ Szybko dodaj
              </button>
              <button className="btn" type="button" onClick={() => void reload()} disabled={loading}>
                {loading ? '⏳' : '🔄'}
              </button>
            </div>
          </header>

          <div className="content">
            {error ? (
              <div className="panel">
                <h2>Błąd</h2>
                <div className="errorBox">{error}</div>
                <button className="btn primary" type="button" onClick={() => void reload()}>
                  Spróbuj ponownie
                </button>
              </div>
            ) : loading && !data ? (
              <div className="panel">
                <h2>Ładowanie…</h2>
                <div className="muted">Pobieranie danych z backendu lokalnego.</div>
              </div>
            ) : (
              <Suspense fallback={<div className="panel"><div className="muted">Ładowanie widoku…</div></div>}>
                {view === 'calendar' ? (
                  <CalendarView />
                ) : view === 'employees' ? (
                  <EmployeesView />
                ) : view === 'employeePairs' ? (
                  <EmployeePairsView />
                ) : view === 'positions' ? (
                  <PositionsView />
                ) : view === 'vacations' ? (
                  <VacationsView />
                ) : view === 'weekPlanner' ? (
                  <WeekPlannerView />
                ) : view === 'email' ? (
                  <EmailView />
                ) : (
                  <SettingsView />
                )}
              </Suspense>
            )}
          </div>
        </main>

        <PrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
        <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />
      </div>
    </>
  )
}

function App() {
  const [ready, setReady] = useState(false)

  const backToProfile = () => {
    localStorage.removeItem('sp_profile')
    setReady(false)
  }

  if (!ready) {
    return <ProfileGate onSelected={() => setReady(true)} />
  }

  return (
    <StoreProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppShell onBackToProfile={backToProfile} />
        </ConfirmProvider>
      </ToastProvider>
    </StoreProvider>
  )
}

export default App
