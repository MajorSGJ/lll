// ── OneHost Analytics Tracker (CertTrack) ───────────────
const STORAGE_KEY = 'oh_analytics_ct'
const VISITOR_KEY = 'oh_visitor_id'
const SESSION_KEY = 'oh_session_id'
const CONSENT_KEY = 'oh_cookie_consent'

function uid(): string { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function getVisitorId(): string { let id = localStorage.getItem(VISITOR_KEY); if (!id) { id = 'v_' + uid(); localStorage.setItem(VISITOR_KEY, id) } return id }
function getSessionId(): string { let id = sessionStorage.getItem(SESSION_KEY); if (!id) { id = 's_' + uid(); sessionStorage.setItem(SESSION_KEY, id) } return id }
function getDeviceType(): string { const w = window.innerWidth; return w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop' }
function getDevice() { return { ua: navigator.userAgent, screen: `${window.innerWidth}x${window.innerHeight}`, lang: navigator.language, referrer: document.referrer || 'direct' } }

export function hasConsent(): boolean { return localStorage.getItem(CONSENT_KEY) === 'accepted' }
export function setConsent(v: boolean) { localStorage.setItem(CONSENT_KEY, v ? 'accepted' : 'rejected') }
export function getConsentStatus(): 'accepted' | 'rejected' | 'pending' { const v = localStorage.getItem(CONSENT_KEY); return v === 'accepted' ? 'accepted' : v === 'rejected' ? 'rejected' : 'pending' }

function getEvents(): any[] { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] } }
function pushEvent(event: any) {
  if (!hasConsent()) return
  const events = getEvents(); events.push(event)
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-3000))) } catch {}
}

export function trackPageView(page?: string) {
  pushEvent({ id: uid(), type: 'pageview', app: 'certtrack', visitorId: getVisitorId(), sessionId: getSessionId(), timestamp: new Date().toISOString(), page: page || window.location.pathname, data: { title: document.title, deviceType: getDeviceType() }, device: getDevice() })
}
export function trackSectionView(section: string) {
  pushEvent({ id: uid(), type: 'section_view', app: 'certtrack', visitorId: getVisitorId(), sessionId: getSessionId(), timestamp: new Date().toISOString(), page: window.location.pathname, data: { section }, device: getDevice() })
}
export function trackClick(category: string, label: string) {
  pushEvent({ id: uid(), type: 'click', app: 'certtrack', visitorId: getVisitorId(), sessionId: getSessionId(), timestamp: new Date().toISOString(), page: window.location.pathname, data: { category, label }, device: getDevice() })
}
export function trackPlanView(planKey: string) {
  pushEvent({ id: uid(), type: 'plan_view', app: 'certtrack', visitorId: getVisitorId(), sessionId: getSessionId(), timestamp: new Date().toISOString(), page: window.location.pathname, data: { planKey }, device: getDevice() })
}

const _tracked = new Set<string>()
let _observer: IntersectionObserver | null = null
export function observeSections() {
  if (!hasConsent() || _observer) return
  _observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting && e.target.id && !_tracked.has(e.target.id)) { _tracked.add(e.target.id); trackSectionView(e.target.id) } })
  }, { threshold: 0.3 })
  document.querySelectorAll('section[id]').forEach(el => _observer!.observe(el))
}

const _depths = new Set<number>()
export function initScrollTracker() {
  if (!hasConsent()) return
  window.addEventListener('scroll', () => {
    const pct = Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100)
    for (const m of [25, 50, 75, 100]) { if (pct >= m && !_depths.has(m)) { _depths.add(m); pushEvent({ id: uid(), type: 'scroll_depth', app: 'certtrack', visitorId: getVisitorId(), sessionId: getSessionId(), timestamp: new Date().toISOString(), page: window.location.pathname, data: { depth: `${m}%` }, device: getDevice() }) } }
  }, { passive: true })
}
