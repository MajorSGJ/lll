import { useState, useEffect } from 'react'
import { getConsentStatus, setConsent, trackPageView, observeSections, initScrollTracker } from '../analytics'

export function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [details, setDetails] = useState(false)

  useEffect(() => {
    const status = getConsentStatus()
    if (status === 'pending') setVisible(true)
    else if (status === 'accepted') { trackPageView(); setTimeout(observeSections, 1000); initScrollTracker() }
  }, [])

  const handleAccept = () => { setConsent(true); setVisible(false); trackPageView(); setTimeout(observeSections, 500); initScrollTracker() }
  const handleReject = () => { setConsent(false); setVisible(false) }

  if (!visible) return null

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999, padding: 16 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', background: '#0f172a', border: '1px solid #334155', borderRadius: 16, padding: 20, boxShadow: '0 -4px 30px rgba(0,0,0,.3)', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ fontSize: 24, lineHeight: 1 }}>🍪</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Pliki cookies i analityka</div>
            <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5, margin: 0 }}>
              Używamy cookies do analizy ruchu na stronie i ulepszania usług. Dane są anonimowe.
            </p>
            {details && (
              <div style={{ marginTop: 8, padding: 8, background: 'rgba(255,255,255,.05)', borderRadius: 8, fontSize: 11, color: '#94a3b8' }}>
                <div><strong style={{ color: '#cbd5e1' }}>Analityczne:</strong> Odwiedziny, czas na stronie, przewijanie, sekcje.</div>
                <div><strong style={{ color: '#cbd5e1' }}>Urządzenie:</strong> Typ, rozdzielczość, język, źródło ruchu.</div>
                <div style={{ marginTop: 4, borderTop: '1px solid rgba(255,255,255,.1)', paddingTop: 4 }}>Dane nie są udostępniane podmiotom trzecim.</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <button onClick={handleAccept} style={{ padding: '6px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Akceptuję</button>
              <button onClick={handleReject} style={{ padding: '6px 16px', background: 'rgba(255,255,255,.1)', color: '#cbd5e1', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Odrzuć</button>
              <button onClick={() => setDetails(!details)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>{details ? 'Ukryj' : 'Szczegóły'}</button>
            </div>
          </div>
          <button onClick={handleReject} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
      </div>
    </div>
  )
}
