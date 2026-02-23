import React, { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { getApiBaseUrl } from './apiBase';

const API = getApiBaseUrl();

// ── Auth Context ────────────────────────────────────────
const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('oh_token') || '');

  const headers = () => ({ 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) });

  const fetchMe = async (t) => {
    try {
      const r = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setUser(data.user);
      setSubscription(data.subscription);
    } catch {
      setUser(null);
      setSubscription(null);
      setToken('');
      localStorage.removeItem('oh_token');
    }
  };

  useEffect(() => {
    if (token) fetchMe(token).finally(() => setLoading(false));
    else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setToken(data.token);
    localStorage.setItem('oh_token', data.token);
    setUser(data.user);
    setSubscription(data.subscription);
    return data;
  };

  const register = async (email, password, name, company_name) => {
    const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name, company_name }) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setToken(data.token);
    localStorage.setItem('oh_token', data.token);
    setUser(data.user);
    setSubscription(data.subscription);
    return data;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    setSubscription(null);
    localStorage.removeItem('oh_token');
  };

  const refresh = () => token && fetchMe(token);

  return (
    <AuthCtx.Provider value={{ user, subscription, token, loading, login, register, logout, refresh, headers }}>
      {children}
    </AuthCtx.Provider>
  );
}

// ── Lazy pages ──────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const BillingPage = lazy(() => import('./pages/BillingPage'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const GuidePage = lazy(() => import('./pages/GuidePage'));
const VerifyPage = lazy(() => import('./pages/VerifyPage'));

const Spinner = () => (
  <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
);

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/guide" element={<GuidePage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
            <Route path="/billing" element={<PrivateRoute><BillingPage /></PrivateRoute>} />
            <Route path="/admin/*" element={<AdminPanel />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
