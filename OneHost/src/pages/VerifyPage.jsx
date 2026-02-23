import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:56/api';

export default function VerifyPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading');
  const token = params.get('token');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    fetch(`${API}/auth/verify-email?token=${token}`)
      .then(r => r.json())
      .then(d => setStatus(d.error ? 'error' : 'success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md text-center shadow-sm">
        {status === 'loading' && (
          <>
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-slate-600">Weryfikacja adresu email...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Email zweryfikowany!</h2>
            <p className="text-slate-500 mb-6">Twój adres email został pomyślnie potwierdzony.</p>
            <Link to="/dashboard" className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors">
              Przejdź do panelu
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Błąd weryfikacji</h2>
            <p className="text-slate-500 mb-6">Link weryfikacyjny jest nieprawidłowy lub wygasł.</p>
            <Link to="/dashboard" className="bg-primary text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-dark transition-colors">
              Powrót do panelu
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
