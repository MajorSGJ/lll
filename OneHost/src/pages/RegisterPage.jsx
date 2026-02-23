import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function RegisterPage() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', password2: '', name: '', company_name: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) { navigate('/dashboard'); return null; }

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.password2) return setError('Hasła się nie zgadzają');
    if (form.password.length < 6) return setError('Hasło musi mieć min. 6 znaków');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name, form.company_name);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Błąd rejestracji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold">OH</div>
            <span className="text-2xl font-bold text-white">OneHost</span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Załóż konto</h1>
          <p className="text-slate-400 mt-2">Trial 7 dni (plan Starter) — bez wymaganej karty</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm font-medium">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nazwa firmy *</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="np. ACME Sp. z o.o."
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Twoje imię i nazwisko</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="Jan Kowalski"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
              placeholder="twoj@email.com"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Hasło *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="Min. 6 znaków"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Powtórz hasło *</label>
              <input
                type="password"
                value={form.password2}
                onChange={(e) => handleChange('password2', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          <div className="text-xs text-slate-400 leading-relaxed">
            Rejestrując się akceptujesz <Link to="/terms" className="text-teal-600 underline">regulamin serwisu</Link>. Darmowy 7-dniowy trial dostępny wyłącznie w planie Starter. Subskrypcję możesz uruchomić lub anulować w panelu rozliczeń.
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-3 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Tworzenie konta...' : 'Rozpocznij darmowy trial'}
          </button>
          <p className="text-center text-sm text-slate-500">
            Masz już konto? <Link to="/login" className="text-primary font-medium hover:underline">Zaloguj się</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
