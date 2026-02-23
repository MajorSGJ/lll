import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:56/api';

const APP_URLS = {
  shiftplanner: import.meta.env.VITE_SHIFTPLANNER_URL || 'https://shiftplanner.onehost.site',
  equipment: import.meta.env.VITE_EQUIPMENT_URL || 'https://em.onehost.site',
  certtrack: import.meta.env.VITE_CERTTRACK_URL || 'https://certtrack.onehost.site',
};

const APPS = [
  { id: 'shiftplanner', name: 'ShiftPlanner', icon: '📅', desc: 'Grafiki pracy i zmiany', url: APP_URLS.shiftplanner, color: 'from-teal-500 to-cyan-600' },
  { id: 'equipment', name: 'Equipment Manager', icon: '🔧', desc: 'Przeglądy sprzętu', url: APP_URLS.equipment, color: 'from-blue-500 to-indigo-600' },
  { id: 'certtrack', name: 'CertTrack', icon: '📋', desc: 'Certyfikaty pracowników', url: APP_URLS.certtrack, color: 'from-purple-500 to-pink-600' },
];

export default function DashboardPage() {
  const { user, subscription, token, logout, refresh } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: '', name: '', role: 'viewer' });
  const [inviteErr, setInviteErr] = useState('');
  const [inviteOk, setInviteOk] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', product: 'shiftplanner' });
  const [profileMsg, setProfileMsg] = useState('');
  const [launchingAppId, setLaunchingAppId] = useState('');

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const toArray = (value) => (Array.isArray(value) ? value : []);

  const launchApp = async (app) => {
    const launchToken = token || localStorage.getItem('oh_token') || '';
    if (!launchToken) {
      setProfileMsg('Brak tokenu sesji. Odśwież stronę i zaloguj się ponownie.');
      return;
    }

    setLaunchingAppId(app.id);
    const launchUrl = `${app.url}?oh_token=${encodeURIComponent(launchToken)}`;

    try {
      await Promise.race([
        fetch(app.url, { method: 'GET', mode: 'no-cors' }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]);
      window.open(launchUrl, '_blank', 'noopener,noreferrer');
    } catch {
      setProfileMsg(`Nie można otworzyć ${app.name}. Sprawdź, czy frontend działa pod adresem ${app.url}.`);
    } finally {
      setLaunchingAppId('');
    }
  };

  useEffect(() => {
    fetch(`${API}/users`, { headers }).then(r => r.json()).then(d => setUsers(toArray(d))).catch(() => {});
    fetch(`${API}/announcements`, { headers }).then(r => r.json()).then(d => setAnnouncements(toArray(d))).catch(() => {});
    fetch(`${API}/profiles`, { headers })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          if (data?.error === 'payment_method_required') {
            setProfileMsg('Dostęp do profili zablokowany: wymagane dodanie metody płatności albo wyjątek w panelu admina.');
          }
          return [];
        }
        return toArray(data);
      })
      .then(setProfiles)
      .catch(() => setProfiles([]));
  }, []);

  const dismissAnnouncement = async (id, action = 'dismissed') => {
    await fetch(`${API}/announcements/${id}/dismiss`, { method: 'POST', headers, body: JSON.stringify({ action }) });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const resendVerification = async () => {
    await fetch(`${API}/auth/resend-verification`, { method: 'POST', headers });
    alert('Email weryfikacyjny wysłany!');
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteErr(''); setInviteOk('');
    try {
      const r = await fetch(`${API}/users`, { method: 'POST', headers, body: JSON.stringify(inviteForm) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setInviteOk('Użytkownik dodany!');
      setInviteForm({ email: '', name: '', role: 'viewer' });
      const ur = await fetch(`${API}/users`, { headers });
      setUsers(await ur.json());
      setTimeout(() => setInviteOk(''), 3000);
    } catch (err) { setInviteErr(err.message); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Usunąć tego użytkownika?')) return;
    await fetch(`${API}/users/${id}`, { method: 'DELETE', headers });
    setUsers(users.filter(u => u.id !== id));
  };

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    setProfileMsg('');
    try {
      const r = await fetch(`${API}/profiles`, { method: 'POST', headers, body: JSON.stringify(newProfile) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || data.message || 'Nie udało się utworzyć profilu');
      setNewProfile({ name: '', product: 'shiftplanner' });
      setShowNewProfile(false);
      const pr = await fetch(`${API}/profiles`, { headers });
      setProfiles(toArray(await pr.json()));
    } catch (err) {
      const msg = String(err?.message || 'Nieznany błąd');
      if (msg.includes('limit') || msg.includes('Limit')) {
        setProfileMsg(`Limit profili dla tej aplikacji został osiągnięty. ${msg}`);
      } else {
        setProfileMsg(msg);
      }
    }
  };

  const handleDeleteProfile = async (id) => {
    if (!confirm('Usunąć ten profil?')) return;
    await fetch(`${API}/profiles/${id}`, { method: 'DELETE', headers });
    setProfiles(profiles.filter(p => p.id !== id));
  };

  const handleAssignUser = async (profileId, userId) => {
    await fetch(`${API}/profiles/${profileId}/users`, { method: 'POST', headers, body: JSON.stringify({ userId }) });
    const pr = await fetch(`${API}/profiles`, { headers });
    setProfiles(toArray(await pr.json()));
  };

  const handleUnassignUser = async (profileId, userId) => {
    await fetch(`${API}/profiles/${profileId}/users/${userId}`, { method: 'DELETE', headers });
    const pr = await fetch(`${API}/profiles`, { headers });
    setProfiles(toArray(await pr.json()));
  };

  const sub = subscription || {};
  const daysLeft = sub.daysLeft;
  const isTrialing = sub.status === 'trialing';
  const isActive = sub.status === 'active';
  const isCancelPending = sub.status === 'cancel_pending';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">OH</div>
              <span className="text-lg font-bold text-slate-800">OneHost</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500">{user?.company_name}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/billing" className="text-sm text-slate-600 hover:text-primary transition-colors">Subskrypcja</Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{user?.name || user?.email}</span>
              <button onClick={logout} className="text-sm text-red-500 hover:text-red-700 font-medium cursor-pointer">Wyloguj</button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Email verification banner */}
        {user && !user.emailVerified && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <div>
                <p className="font-semibold text-amber-800">Potwierdź swój adres email</p>
                <p className="text-sm text-amber-600">Sprawdź skrzynkę ({user.email}) i kliknij link weryfikacyjny.</p>
              </div>
            </div>
            <button onClick={resendVerification} className="bg-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-300 cursor-pointer whitespace-nowrap">
              Wyślij ponownie
            </button>
          </div>
        )}

        {/* Announcements */}
        {announcements.map(a => (
          <div key={a.id} className={`rounded-xl border p-4 mb-4 ${
            a.type === 'warning' ? 'bg-amber-50 border-amber-200' :
            a.type === 'danger' ? 'bg-red-50 border-red-200' :
            a.type === 'success' ? 'bg-green-50 border-green-200' :
            'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={`font-semibold mb-1 ${
                  a.type === 'warning' ? 'text-amber-800' :
                  a.type === 'danger' ? 'text-red-800' :
                  a.type === 'success' ? 'text-green-800' :
                  'text-blue-800'
                }`}>{a.title}</p>
                <p className={`text-sm ${
                  a.type === 'warning' ? 'text-amber-700' :
                  a.type === 'danger' ? 'text-red-700' :
                  a.type === 'success' ? 'text-green-700' :
                  'text-blue-700'
                }`}>{a.message}</p>
              </div>
              <div className="flex gap-2 ml-4 flex-shrink-0">
                {a.requiresAction && a.actionType === 'price_change' ? (
                  <>
                    <button onClick={() => dismissAnnouncement(a.id, 'accepted')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700 cursor-pointer">Akceptuję</button>
                    <Link to="/billing" className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-700">Anuluj subskrypcję</Link>
                  </>
                ) : a.requiresAction && a.actionType === 'subscription_cancel' ? (
                  <>
                    <button onClick={() => dismissAnnouncement(a.id, 'accepted')} className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary-dark cursor-pointer">OK</button>
                    <Link to="/billing" className="border border-slate-300 text-slate-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-slate-100">Zarządzaj</Link>
                  </>
                ) : (
                  <button onClick={() => dismissAnnouncement(a.id)} className="text-slate-400 hover:text-slate-600 cursor-pointer text-lg leading-none">&times;</button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Cancel pending banner */}
        {isCancelPending && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚫</span>
              <div>
                <p className="font-semibold text-red-800">Subskrypcja zostanie anulowana</p>
                <p className="text-sm text-red-600">Dostęp będzie aktywny do końca bieżącego okresu rozliczeniowego.</p>
              </div>
            </div>
            <Link to="/billing" className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-200 whitespace-nowrap">
              Reaktywuj
            </Link>
          </div>
        )}

        {/* Subscription status */}
        {isTrialing && daysLeft !== null && (
          <div className={`rounded-xl border p-4 mb-8 flex items-center justify-between ${daysLeft <= 2 ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{daysLeft <= 2 ? '⚠️' : '🎉'}</span>
              <div>
                <p className={`font-semibold ${daysLeft <= 2 ? 'text-red-700' : 'text-teal-700'}`}>
                  {daysLeft <= 0 ? 'Trial wygasł!' : `Trial: ${daysLeft} dni pozostało`}
                </p>
                <p className="text-sm text-slate-500">
                  {daysLeft <= 0 ? 'Wybierz plan, aby kontynuować korzystanie.' : 'Pełny dostęp do wszystkich funkcji.'}
                </p>
              </div>
            </div>
            <Link to="/billing" className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
              {daysLeft <= 0 ? 'Wybierz plan' : 'Zobacz plany'}
            </Link>
          </div>
        )}

        {/* Apps grid */}
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Twoje aplikacje</h2>
        <p className="text-slate-500 mb-6">Kliknij, aby otworzyć aplikację w nowej karcie</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => launchApp(app)}
              disabled={launchingAppId === app.id}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 group disabled:opacity-70"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${app.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                {app.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{app.name}</h3>
              <p className="text-sm text-slate-500 mb-4">{app.desc}</p>
              <span className="text-sm font-medium text-primary group-hover:underline">{launchingAppId === app.id ? 'Uruchamianie...' : 'Otwórz →'}</span>
            </button>
          ))}
        </div>

        {/* Profiles / databases management */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Bazy danych / profile</h3>
              <p className="text-sm text-slate-500">Zarządzaj bazami danych i przypisuj użytkowników</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowNewProfile(!showNewProfile)}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
              >
                + Nowy profil
              </button>
            )}
          </div>

          {showNewProfile && (
            <form onSubmit={handleCreateProfile} className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              {profileMsg && <div className="text-sm text-red-600 font-medium">{profileMsg}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newProfile.name}
                  onChange={(e) => setNewProfile(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nazwa profilu (np. Dział produkcji)"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
                <select
                  value={newProfile.product}
                  onChange={(e) => setNewProfile(p => ({ ...p, product: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="shiftplanner">📅 ShiftPlanner</option>
                  <option value="equipment">🔧 Equipment Manager</option>
                  <option value="certtrack">📋 CertTrack</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer">Utwórz</button>
                <button type="button" onClick={() => setShowNewProfile(false)} className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 cursor-pointer">Anuluj</button>
              </div>
            </form>
          )}

          {profiles.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg mb-1">Brak profili</p>
              <p className="text-sm">Utwórz pierwszy profil, aby organizować dane firmy.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {profiles.map(p => (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{p.product === 'shiftplanner' ? '📅' : p.product === 'equipment' ? '🔧' : '📋'}</span>
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.product === 'shiftplanner' ? 'ShiftPlanner' : p.product === 'equipment' ? 'Equipment Manager' : 'CertTrack'}</p>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <button onClick={() => handleDeleteProfile(p.id)} className="text-red-400 hover:text-red-600 text-sm cursor-pointer">Usuń</button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Przypisani użytkownicy:</p>
                    <div className="flex flex-wrap gap-2">
                      {(p.users || []).map(u => (
                        <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
                          {u.name || u.email}
                          {user?.role === 'admin' && (
                            <button onClick={() => handleUnassignUser(p.id, u.id)} className="text-teal-400 hover:text-red-500 cursor-pointer">&times;</button>
                          )}
                        </span>
                      ))}
                      {user?.role === 'admin' && (
                        <select
                          className="px-2 py-1 border border-dashed border-slate-300 rounded-full text-xs text-slate-400 cursor-pointer hover:border-primary outline-none"
                          value=""
                          onChange={(e) => { if (e.target.value) handleAssignUser(p.id, parseInt(e.target.value)); e.target.value = ''; }}
                        >
                          <option value="">+ Przypisz...</option>
                          {users.filter(u => !(p.users || []).some(pu => pu.id === u.id)).map(u => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-slate-400 mt-4 space-y-0.5">
            <p className="font-medium text-slate-500 mb-1">Profili na aplikację (limit: {sub.maxProfiles || sub.planDetails?.maxProfiles || 1}):</p>
            <p>📅 ShiftPlanner: {profiles.filter(p => p.product === 'shiftplanner').length} / {sub.maxProfiles || sub.planDetails?.maxProfiles || 1}</p>
            <p>🔧 Equipment Manager: {profiles.filter(p => p.product === 'equipment').length} / {sub.maxProfiles || sub.planDetails?.maxProfiles || 1}</p>
            <p>📋 CertTrack: {profiles.filter(p => p.product === 'certtrack').length} / {sub.maxProfiles || sub.planDetails?.maxProfiles || 1}</p>
          </div>
        </div>

        {/* Users management */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Użytkownicy firmy</h3>
              <p className="text-sm text-slate-500">Zarządzaj dostępem do platformy</p>
            </div>
            {user?.role === 'admin' && (
              <button
                onClick={() => setShowInvite(!showInvite)}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
              >
                + Dodaj użytkownika
              </button>
            )}
          </div>

          {showInvite && (
            <form onSubmit={handleInvite} className="bg-slate-50 rounded-xl p-4 mb-6 space-y-3">
              {inviteErr && <div className="text-sm text-red-600 font-medium">{inviteErr}</div>}
              {inviteOk && <div className="text-sm text-green-600 font-medium">{inviteOk}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                  required
                />
                <input
                  type="text"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Imię i nazwisko"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                />
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(p => ({ ...p, role: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="viewer">Podgląd</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark cursor-pointer">Dodaj</button>
                <button type="button" onClick={() => setShowInvite(false)} className="text-slate-500 px-4 py-2 rounded-lg text-sm hover:bg-slate-100 cursor-pointer">Anuluj</button>
              </div>
            </form>
          )}

          <div className="divide-y divide-slate-100">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{u.name || u.email}</p>
                  <p className="text-xs text-slate-400">{u.email} {u.email_verified ? '✅' : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                    u.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{u.role}</span>
                  {u.id !== user?.id && user?.role === 'admin' && (
                    <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:text-red-600 cursor-pointer text-sm">Usuń</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Informacje o koncie</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Plan</p>
              <p className="text-lg font-bold text-slate-800">{sub.planDetails?.name || sub.plan || 'Trial'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <p className={`text-lg font-bold ${isActive ? 'text-green-600' : isTrialing ? 'text-teal-600' : isCancelPending ? 'text-amber-600' : 'text-red-600'}`}>
                {isActive ? 'Aktywny' : isTrialing ? 'Trial' : isCancelPending ? 'Anulowany' : 'Nieaktywny'}
              </p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Limit przypisań/profil</p>
              <p className="text-lg font-bold text-slate-800">{(sub.planDetails?.maxUsers ?? 3) > 0 ? `${sub.planDetails?.maxUsers} / profil` : 'Bez limitu'}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-xs text-slate-400 mb-1">Profile</p>
              <p className="text-lg font-bold text-slate-800">{profiles.length} / {sub.maxProfiles || sub.planDetails?.maxProfiles || 1}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
