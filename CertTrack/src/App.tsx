import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Award, FolderOpen,
  Shield, Menu, X,
  Upload, Settings, Database, Check,
} from 'lucide-react'
import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useAuth } from './auth'
import { api } from './api'
import { CookieConsent } from './components/CookieConsent'

// Lazy-loaded pages (code splitting — each page is a separate chunk)
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then(m => ({ default: m.EmployeesPage })))
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail').then(m => ({ default: m.EmployeeDetail })))
const CertificatesPage = lazy(() => import('./pages/CertificatesPage').then(m => ({ default: m.CertificatesPage })))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const ImportPage = lazy(() => import('./pages/ImportPage').then(m => ({ default: m.ImportPage })))
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

const PageLoader = () => (
  <div className="flex items-center justify-center p-12">
    <div className="text-slate-400 text-sm">Ładowanie...</div>
  </div>
)

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Pracownicy' },
  { to: '/certificates', icon: Award, label: 'Uprawnienia' },
  { to: '/categories', icon: FolderOpen, label: 'Kategorie' },
  { to: '/import', icon: Upload, label: 'Import CSV' },
  { to: '/settings', icon: Settings, label: 'Ustawienia' },
]

type Profile = { id: number; tenant_id: number; name: string; created_at: string };

function ProfileSwitcher({ profiles, onSwitch }: { profiles: Profile[]; onSwitch: () => void }) {
  const [current, setCurrent] = useState(localStorage.getItem('ct_profile') || '');
  const [expanded, setExpanded] = useState(false);

  const select = (id: string) => {
    localStorage.setItem('ct_profile', id);
    setCurrent(id);
    setExpanded(false);
    onSwitch();
  };

  const currentLabel = profiles.find(p => String(p.id) === current)?.name || 'Wybierz profil';

  return (
    <div className="mx-3 mt-3">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-sm transition-colors">
        <Database className="w-4 h-4 text-brand-600 shrink-0" />
        <span className="truncate font-medium text-slate-700">{currentLabel}</span>
        <svg className={`w-3.5 h-3.5 ml-auto text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {expanded && (
        <div className="mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {profiles.map(p => (
            <div key={p.id} className={`flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-slate-50 ${current === String(p.id) ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-600'}`}>
              <button onClick={() => select(String(p.id))} className="flex-1 text-left truncate">{p.name}</button>
              {current === String(p.id) && <Check className="w-3.5 h-3.5 text-brand-600" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileGate({ user, onReady }: { user: { company_name?: string }, onReady: (profiles: Profile[]) => void }) {
  const [loadingProfiles, setLoadingProfiles] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    api.getProfiles()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : []
        setProfiles(list)
        const selected = localStorage.getItem('ct_profile')
        if (selected && list.some((p) => String(p.id) === selected)) onReady(list)
      })
      .finally(() => setLoadingProfiles(false))
  }, [onReady])

  const choose = (id: number) => {
    localStorage.setItem('ct_profile', String(id))
    onReady(profiles)
  }

  if (loadingProfiles) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Ładowanie profili...</div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center">
          <h2 className="text-lg font-bold text-slate-900 mb-2">Brak przypisanego profilu CertTrack</h2>
          <p className="text-sm text-slate-500 mb-4">Poproś administratora OneHost o przypisanie profilu dla Twojego konta.</p>
          <div className="text-xs text-slate-400">{user?.company_name || ''}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Wybierz profil bazy danych</h2>
        <p className="text-sm text-slate-500 mb-5">Widzisz tylko profile przypisane do Twojego konta.</p>
        <div className="space-y-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-colors"
            >
              <div className="font-medium text-slate-800">{p.name}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function AppShell({ onBackToProfile }: { onBackToProfile: () => void }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileKey, setProfileKey] = useState(0)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const { user } = useAuth()

  const handleProfileSwitch = useCallback(() => {
    setProfileKey(k => k + 1)
    api.getProfiles().then((rows) => setProfiles(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [])

  useEffect(() => {
    api.getProfiles().then((rows) => setProfiles(Array.isArray(rows) ? rows : [])).catch(() => {})
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col
        transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-base leading-tight">CertTrack</div>
            <div className="text-[11px] text-slate-400 leading-tight truncate">{user?.company_name}</div>
          </div>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

  <ProfileSwitcher profiles={profiles} onSwitch={handleProfileSwitch} />

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }: { isActive: boolean }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 pb-2">
          <button
            onClick={onBackToProfile}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors w-full"
          >
            <Database className="w-[18px] h-[18px]" />
            Zmień profil
          </button>
        </div>

        <div className="px-5 py-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
          <div className="text-[11px] text-slate-400">CertTrack v0.1.0</div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm font-semibold text-slate-700 truncate">
            {user?.company_name} — Zarządzanie uprawnieniami
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Suspense fallback={<PageLoader />}>
            <Routes key={profileKey}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/:id" element={<EmployeeDetail />} />
              <Route path="/certificates" element={<CertificatesPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/import" element={<ImportPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  )
}

export function App() {
  const { user, loading } = useAuth()
  const [profileReady, setProfileReady] = useState(false)
  const [profileList, setProfileList] = useState<Profile[]>([])

  const handleBackToProfile = useCallback(() => {
    localStorage.removeItem('ct_profile')
    setProfileReady(false)
    setProfileList([])
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Ładowanie...</div>
      </div>
    )
  }

  // If no token / not authenticated, redirect to OneHost login
  if (!user) {
    const base = import.meta.env.VITE_ONEHOST_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:55' : 'https://sklep.onehost.site');
    const ohUrl = `${base}/login`;
    window.location.href = ohUrl;
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Przekierowanie do logowania OneHost...</div>
      </div>
    )
  }

  if (!profileReady) {
    return <ProfileGate user={user} onReady={(profiles) => { setProfileList(profiles); setProfileReady(true) }} />
  }

  const selected = localStorage.getItem('ct_profile')
  if (!selected || !profileList.some((p) => String(p.id) === selected)) {
    return <ProfileGate user={user} onReady={(profiles) => { setProfileList(profiles); setProfileReady(true) }} />
  }

  return (
    <>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/admin/*" element={<AdminPanel />} />
          <Route path="/*" element={<AppShell onBackToProfile={handleBackToProfile} />} />
        </Routes>
      </Suspense>
      <CookieConsent />
    </>
  )
}
