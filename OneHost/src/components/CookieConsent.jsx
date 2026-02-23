import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('oh_cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('oh_cookie_consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 sm:p-6" role="alert" aria-label="Cookie consent">
      <div className="max-w-3xl mx-auto bg-slate-900 text-slate-300 rounded-2xl shadow-2xl border border-slate-700 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex-1 text-sm leading-relaxed">
          <p>
            Ta strona wykorzystuje <strong className="text-white">localStorage</strong> przeglądarki do przechowywania tokenu uwierzytelniającego oraz Twoich preferencji.
            Nie stosujemy cookies śledzących ani reklamowych.
            Korzystając ze strony, akceptujesz nasz{' '}
            <Link to="/terms" className="text-teal-400 underline hover:text-teal-300">Regulamin</Link>{' '}
            oraz{' '}
            <Link to="/privacy" className="text-teal-400 underline hover:text-teal-300">Politykę Prywatności</Link>.
          </p>
        </div>
        <button
          onClick={accept}
          className="shrink-0 bg-teal-500 hover:bg-teal-400 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors text-sm cursor-pointer"
        >
          Rozumiem
        </button>
      </div>
    </div>
  );
}
