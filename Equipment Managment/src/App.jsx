import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Sidebar from './components/Sidebar';
import { requestNotificationPermission, startNotificationEngine, stopNotificationEngine, resetNotificationThrottle, getNotificationPermission } from './notifications';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ItemsList = lazy(() => import('./pages/ItemsList'));
const Settings = lazy(() => import('./pages/Settings'));
const ItemCardPage = lazy(() => import('./pages/ItemCardPage'));

// ── localStorage helpers ───────────────────────────────────────────
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function lsSet(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  notifyMonthsBefore: 2,
  dailyNotifyWeeksBefore: 2,
  hourlyNotifyOnLastDay: true,
  notificationCheckMinutes: 30,
  darkMode: false,
};
const DEFAULT_CATEGORIES = ['Narzędzia', 'Maszyny', 'Gaśnice', 'Pojazdy', 'Urządzenia elektryczne', 'Urządzenia pomiarowe', 'Inne'];
const DEFAULT_CONTROL_TYPES = ['Przegląd', 'Kalibracja', 'Wymiana', 'Kontrola', 'Certyfikacja', 'Serwis', 'Inspekcja', 'Inne'];
const DEFAULT_TOOL_TYPES = [
  { name: 'Wiertło', params: [{ key: 'Średnica', value: '' }, { key: 'Długość', value: '' }] },
  { name: 'Frez', params: [{ key: 'Średnica', value: '' }, { key: 'Liczba ostrzy', value: '' }] },
  { name: 'Klucz', params: [{ key: 'Rozmiar', value: '' }] },
  { name: 'Suwmiarka', params: [{ key: 'Zakres', value: '' }, { key: 'Dokładność', value: '' }] },
];

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:60/api';
const ONEHOST_URL = import.meta.env.VITE_ONEHOST_URL || 'https://sklep.onehost.site';

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseErrorResponse(res) {
  let payload = null;
  try { payload = await res.json(); } catch {}
  const message = payload?.message || payload?.error || `HTTP ${res.status}`;
  throw new ApiError(message, res.status, payload?.error);
}

function authHeaders(extra = {}) {
  const h = { 'Content-Type': 'application/json', ...extra };
  const token = localStorage.getItem('oh_token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  const profileId = localStorage.getItem('em_profile') || 'default';
  h['X-Profile-Id'] = profileId;
  return h;
}

const api = {
  getItems: async () => {
    try {
      const r = await fetch(`${API_BASE}/items`, { headers: authHeaders() });
      if (!r.ok) await parseErrorResponse(r);
      const data = await r.json();
      return Array.isArray(data) ? data : [];
    }
    catch (err) {
      if (err?.status === 401 || err?.status === 402 || err?.status === 403) throw err;
      return lsGet('em_items', []);
    }
  },
  addItem: async (item) => {
    try {
      const r = await fetch(`${API_BASE}/items`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(item) });
      const data = await r.json();
      return data.id;
    } catch {
      const items = lsGet('em_items', []);
      const id = lsGet('em_nextId', 1);
      items.push({ id, ...item, created_at: new Date().toISOString() });
      lsSet('em_items', items);
      lsSet('em_nextId', id + 1);
      return id;
    }
  },
  updateItem: async (item) => {
    try {
      await fetch(`${API_BASE}/items/${item.id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(item) });
      return true;
    } catch {
      const items = lsGet('em_items', []);
      const idx = items.findIndex(i => i.id === item.id);
      if (idx !== -1) items[idx] = { ...items[idx], ...item };
      lsSet('em_items', items);
      return true;
    }
  },
  deleteItem: async (id) => {
    try {
      await fetch(`${API_BASE}/items/${id}`, { method: 'DELETE', headers: authHeaders() });
      return true;
    } catch {
      const items = lsGet('em_items', []).filter(i => i.id !== id);
      lsSet('em_items', items);
      return true;
    }
  },
  updateItemDate: async (id, newDate) => {
    try {
      await fetch(`${API_BASE}/items/${id}/date`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ date: newDate }) });
      return true;
    } catch {
      const items = lsGet('em_items', []);
      const idx = items.findIndex(i => i.id === id);
      if (idx !== -1) items[idx].last_date = newDate;
      lsSet('em_items', items);
      return true;
    }
  },
  getSettings: async () => {
    try {
      const r = await fetch(`${API_BASE}/settings`, { headers: authHeaders() });
      if (!r.ok) await parseErrorResponse(r);
      return await r.json();
    }
    catch (err) {
      if (err?.status === 401 || err?.status === 402 || err?.status === 403) throw err;
      return lsGet('em_settings', DEFAULT_SETTINGS);
    }
  },
  saveSettings: async (s) => {
    try {
      await fetch(`${API_BASE}/settings`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(s) });
      return true;
    } catch { lsSet('em_settings', s); return true; }
  },
  getCategories: async () => {
    try {
      const r = await fetch(`${API_BASE}/categories`, { headers: authHeaders() });
      if (!r.ok) await parseErrorResponse(r);
      const data = await r.json();
      return Array.isArray(data) ? data : lsGet('em_categories', DEFAULT_CATEGORIES);
    }
    catch (err) {
      if (err?.status === 401 || err?.status === 402 || err?.status === 403) throw err;
      return lsGet('em_categories', DEFAULT_CATEGORIES);
    }
  },
  saveCategories: async (c) => {
    try {
      await fetch(`${API_BASE}/categories`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(c) });
      return true;
    } catch { lsSet('em_categories', c); return true; }
  },
  getControlTypes: async () => {
    try {
      const r = await fetch(`${API_BASE}/control-types`, { headers: authHeaders() });
      if (!r.ok) await parseErrorResponse(r);
      const data = await r.json();
      return Array.isArray(data) ? data : lsGet('em_controlTypes', DEFAULT_CONTROL_TYPES);
    }
    catch (err) {
      if (err?.status === 401 || err?.status === 402 || err?.status === 403) throw err;
      return lsGet('em_controlTypes', DEFAULT_CONTROL_TYPES);
    }
  },
  saveControlTypes: async (t) => {
    try {
      await fetch(`${API_BASE}/control-types`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(t) });
      return true;
    } catch { lsSet('em_controlTypes', t); return true; }
  },
  getToolTypes: async () => {
    try {
      const r = await fetch(`${API_BASE}/tool-types`, { headers: authHeaders() });
      if (!r.ok) await parseErrorResponse(r);
      const data = await r.json();
      return Array.isArray(data) ? data : lsGet('em_toolTypes', DEFAULT_TOOL_TYPES);
    }
    catch (err) {
      if (err?.status === 401 || err?.status === 402 || err?.status === 403) throw err;
      return lsGet('em_toolTypes', DEFAULT_TOOL_TYPES);
    }
  },
  saveToolTypes: async (t) => {
    try {
      await fetch(`${API_BASE}/tool-types`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(t) });
      return true;
    } catch { lsSet('em_toolTypes', t); return true; }
  },
  exportDb: async () => {
    try {
      const r = await fetch(`${API_BASE}/export`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'equipment_backup.json'; a.click();
      URL.revokeObjectURL(url);
      return true;
    } catch {
      const data = {
        items: lsGet('em_items', []),
        settings: lsGet('em_settings', DEFAULT_SETTINGS),
        categories: lsGet('em_categories', DEFAULT_CATEGORIES),
        controlTypes: lsGet('em_controlTypes', DEFAULT_CONTROL_TYPES),
        toolTypes: lsGet('em_toolTypes', DEFAULT_TOOL_TYPES),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'equipment_backup.json'; a.click();
      URL.revokeObjectURL(url);
      return true;
    }
  },
  importDb: async () => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve(false);
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const data = JSON.parse(ev.target.result);
            try {
              await fetch(`${API_BASE}/import`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(data) });
            } catch {
              if (data.items) lsSet('em_items', data.items);
              if (data.settings) lsSet('em_settings', data.settings);
              if (data.categories) lsSet('em_categories', data.categories);
              if (data.controlTypes) lsSet('em_controlTypes', data.controlTypes);
              if (data.toolTypes) lsSet('em_toolTypes', data.toolTypes);
              const maxId = (data.items || []).reduce((m, i) => Math.max(m, i.id || 0), 0);
              lsSet('em_nextId', maxId + 1);
            }
            resolve(true);
          } catch { resolve(false); }
        };
        reader.readAsText(file);
      };
      input.click();
    });
  },
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8 max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Wystąpił błąd</h2>
            <p className="text-gray-500 mb-4 text-sm">{this.state.error?.message || 'Nieznany błąd'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              Odśwież stronę
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Profile Switcher ───────────────────────────────────────────────
function ProfileSwitcher({ onSwitch, darkMode }) {
  const [profiles, setProfiles] = useState([]);
  const [current, setCurrent] = useState(() => localStorage.getItem('em_profile') || 'default');
  const [showMenu, setShowMenu] = useState(false);

  const load = async () => {
    try {
      const r = await fetch(`${API_BASE}/profiles`, { headers: authHeaders() });
      if (!r.ok) throw new Error();
      const data = await r.json();
      const normalized = (data.profiles || []).map((p) => ({ ...p, id: String(p.id) }));
      setProfiles(normalized);
      const stored = localStorage.getItem('em_profile');
      if (stored && normalized.some((p) => p.id === stored)) {
        setCurrent(stored);
      } else if (normalized.length) {
        const firstId = normalized[0].id;
        setCurrent(firstId);
        localStorage.setItem('em_profile', firstId);
      }
    } catch {
      setProfiles([{ id: 'default', name: 'Domyślny' }]);
    }
  };

  useEffect(() => { load(); }, []);

  const currentProfile = profiles.find(p => p.id === current) || profiles[0] || { id: 'default', name: 'Domyślny' };

  const switchTo = (id) => {
    const nextId = String(id);
    setCurrent(nextId);
    localStorage.setItem('em_profile', nextId);
    setShowMenu(false);
    onSwitch();
  };

  if (profiles.length <= 1) return null;

  return (
    <div className="relative mb-2" style={{ padding: '0 12px' }}>
      <button
        type="button"
        onClick={() => setShowMenu(!showMenu)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
          darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <span>📁</span>
        <span className="flex-1 text-left truncate">{currentProfile.name}</span>
        <span className="text-xs">{showMenu ? '▲' : '▼'}</span>
      </button>

      {showMenu && (
        <div className={`absolute left-3 right-3 top-full mt-1 z-50 rounded-lg shadow-lg border ${
          darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
        }`}>
          <div className={`px-3 py-2 text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Profile
          </div>
          {profiles.map(p => (
            <div key={p.id} className={`px-3 py-1.5 flex items-center gap-2 ${
              p.id === current
                ? (darkMode ? 'bg-blue-900/30' : 'bg-blue-50')
                : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
            }`}>
              <button type="button" onClick={() => switchTo(p.id)} className={`flex-1 text-left text-xs cursor-pointer ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                {p.id === current && <span className="mr-1">✓</span>}
                {p.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileGate({ onSelected, onPaymentRequired, darkMode }) {
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profiles, setProfiles] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/profiles`, { headers: authHeaders() })
      .then(async (r) => {
        if (!r.ok) await parseErrorResponse(r);
        return r.json();
      })
      .then((data) => {
        const list = (data?.profiles || []).map((p) => ({ ...p, id: String(p.id) }));
        setProfiles(list);
        const current = localStorage.getItem('em_profile');
        if (current && list.some((p) => p.id === current)) onSelected();
      })
      .catch((err) => {
        if (err?.status === 402 || err?.code === 'payment_method_required') {
          onPaymentRequired(err.message);
          return;
        }
        setProfiles([]);
      })
      .finally(() => setLoadingProfiles(false));
  }, [onSelected, onPaymentRequired]);

  const choose = (id) => {
    localStorage.setItem('em_profile', String(id));
    onSelected();
  };

  if (loadingProfiles) return <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>Ładowanie profili...</div>;

  if (!profiles.length) {
    return (
      <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
        <div className={`p-8 rounded-2xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          Brak przypisanego profilu Equipment. Poproś administratora OneHost o przypisanie.
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center h-screen ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <div className={`p-8 rounded-2xl border w-full max-w-md ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <h2 className="text-xl font-bold mb-2">Wybierz bazę danych</h2>
        <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Widzisz tylko profile przypisane do Twojego konta.</p>
        <div className="space-y-2">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => choose(p.id)} className={`w-full text-left px-4 py-3 rounded-lg border ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [profileReady, setProfileReady] = useState(false);
  const [paymentRequiredMsg, setPaymentRequiredMsg] = useState('');
  const [page, setPage] = useState('items');
  const [cardItemId, setCardItemId] = useState(null);
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [categories, setCategories] = useState([]);
  const [controlTypes, setControlTypes] = useState([]);
  const [toolTypes, setToolTypes] = useState([]);
  const darkMode = settings?.darkMode || false;

  const handleBackToProfile = useCallback(() => {
    localStorage.removeItem('em_profile');
    setProfileReady(false);
  }, []);

  const handleProfileSelected = useCallback(() => {
    setProfileReady(true);
  }, []);

  const handlePaymentRequired = useCallback((message) => {
    setPaymentRequiredMsg(message || 'Aby korzystać z Equipment Manager, dodaj metodę płatności dla okresu próbnego w OneHost.');
  }, []);

  const handleLogoutToOneHost = useCallback(() => {
    localStorage.removeItem('oh_token');
    localStorage.removeItem('em_profile');
    window.location.href = `${ONEHOST_URL}/login`;
  }, []);

  const handleAddPaymentMethod = useCallback(() => {
    const token = localStorage.getItem('oh_token') || '';
    const target = token
      ? `${ONEHOST_URL}/billing?oh_token=${encodeURIComponent(token)}`
      : `${ONEHOST_URL}/billing`;
    window.location.href = target;
  }, []);

  // Sync body class for dark mode
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Refs for notification engine (needs current data without re-creating interval)
  const itemsRef = useRef(items);
  const settingsRef = useRef(settings);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // Start notification engine on mount
  useEffect(() => {
    if (!profileReady || paymentRequiredMsg) return;
    requestNotificationPermission().then((perm) => {
      console.log('[Notifications] Permission:', perm);
    });
    startNotificationEngine(
      () => itemsRef.current,
      () => settingsRef.current
    );
    return () => stopNotificationEngine();
  }, [profileReady, paymentRequiredMsg]);

  const loadItems = useCallback(async () => {
    try {
      const data = await api.getItems();
      setItems(data);
    } catch (err) {
      if (err?.status === 402 || err?.code === 'payment_method_required') handlePaymentRequired(err.message);
      else throw err;
    }
  }, [handlePaymentRequired]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      if (err?.status === 402 || err?.code === 'payment_method_required') handlePaymentRequired(err.message);
      else throw err;
    }
  }, [handlePaymentRequired]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await api.getCategories();
      setCategories(data || []);
    } catch (err) {
      if (err?.status === 402 || err?.code === 'payment_method_required') handlePaymentRequired(err.message);
      else throw err;
    }
  }, [handlePaymentRequired]);

  const loadControlTypes = useCallback(async () => {
    try {
      const data = await api.getControlTypes();
      setControlTypes(data || []);
    } catch (err) {
      if (err?.status === 402 || err?.code === 'payment_method_required') handlePaymentRequired(err.message);
      else throw err;
    }
  }, [handlePaymentRequired]);

  const loadToolTypes = useCallback(async () => {
    try {
      const data = await api.getToolTypes();
      setToolTypes(data || []);
    } catch (err) {
      if (err?.status === 402 || err?.code === 'payment_method_required') handlePaymentRequired(err.message);
      else throw err;
    }
  }, [handlePaymentRequired]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadItems(), loadSettings(), loadCategories(), loadControlTypes(), loadToolTypes()]);
  }, [loadItems, loadSettings, loadCategories, loadControlTypes, loadToolTypes]);

  useEffect(() => {
    if (!profileReady || paymentRequiredMsg) return;
    reloadAll();
  }, [reloadAll, profileReady, paymentRequiredMsg]);

  const handleAddItem = async (item) => {
    await api.addItem(item);
    await loadItems();
  };

  const handleUpdateItem = async (item) => {
    await api.updateItem(item);
    await loadItems();
  };

  const handleDeleteItem = async (id) => {
    await api.deleteItem(id);
    await loadItems();
  };

  const handleUpdateDate = async (id, newDate) => {
    await api.updateItemDate(id, newDate);
    await loadItems();
  };

  const handleSaveSettings = async (s) => {
    await api.saveSettings(s);
    setSettings(s);
  };

  const handleSaveCategories = async (c) => {
    await api.saveCategories(c);
    setCategories(c);
  };

  const handleSaveControlTypes = async (t) => {
    await api.saveControlTypes(t);
    setControlTypes(t);
  };

  const handleSaveToolTypes = async (t) => {
    await api.saveToolTypes(t);
    setToolTypes(t);
  };

  const handleExport = () => api.exportDb();
  const handleImport = async () => {
    const ok = await api.importDb();
    if (ok) {
      await loadItems();
      await loadSettings();
      await loadCategories();
      await loadControlTypes();
      await loadToolTypes();
    }
  };

  if (paymentRequiredMsg) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 text-gray-900 p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold mb-2">Wymagana metoda płatności</h2>
          <p className="text-sm text-gray-600 mb-6">{paymentRequiredMsg}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleAddPaymentMethod}
              className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 cursor-pointer"
            >
              Dodaj metodę płatności
            </button>
            <button
              type="button"
              onClick={handleLogoutToOneHost}
              className="flex-1 border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 cursor-pointer"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!profileReady) {
    return <ProfileGate onSelected={handleProfileSelected} onPaymentRequired={handlePaymentRequired} darkMode={darkMode} />;
  }

  return (
    <ErrorBoundary>
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-surface text-gray-900'}`}>
      <Sidebar
        currentPage={cardItemId ? 'items' : page}
        onNavigate={(p) => { setPage(p); setCardItemId(null); }}
        darkMode={darkMode}
        onBackToProfile={handleBackToProfile}
      >
        <ProfileSwitcher onSwitch={() => void reloadAll()} darkMode={darkMode} />
      </Sidebar>
      <main className={`flex-1 overflow-y-auto ${darkMode ? 'bg-gray-900' : ''}`}>
        <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
          {page === 'dashboard' && (
            <Dashboard items={items} onUpdateDate={handleUpdateDate} darkMode={darkMode} />
          )}
          {page === 'items' && cardItemId === null && (
            <ItemsList
              items={items}
              categories={categories}
              controlTypes={controlTypes}
              toolTypes={toolTypes}
              onAdd={handleAddItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onUpdateDate={handleUpdateDate}
              onViewCard={(id) => setCardItemId(id)}
              darkMode={darkMode}
            />
          )}
          {page === 'items' && cardItemId !== null && items.find((i) => i.id === cardItemId) && (
            <ItemCardPage
              item={items.find((i) => i.id === cardItemId)}
              toolTypes={toolTypes}
              darkMode={darkMode}
              onUpdate={handleUpdateItem}
              onBack={() => setCardItemId(null)}
            />
          )}
          {page === 'settings' && settings && (
            <Settings
              settings={settings}
              categories={categories}
              controlTypes={controlTypes}
              toolTypes={toolTypes}
              onSave={handleSaveSettings}
              onSaveCategories={handleSaveCategories}
              onSaveControlTypes={handleSaveControlTypes}
              onSaveToolTypes={handleSaveToolTypes}
              onExport={handleExport}
              onImport={handleImport}
            />
          )}
        </Suspense>
      </main>
    </div>
    </ErrorBoundary>
  );
}
