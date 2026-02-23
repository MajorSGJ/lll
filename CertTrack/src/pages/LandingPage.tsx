import {
  Shield, CheckCircle, Clock, Users, FileText, Upload, Download,
  BarChart3, Bell, Lock, Zap, Crown, Building2, ArrowRight,
  Award, FolderOpen, Globe, Smartphone, Sparkles,
  Mail, FileSpreadsheet, AlertTriangle, Check, Star
} from 'lucide-react'
import { useState } from 'react'

type PlanData = { key: string; name: string; maxEmployees: number; maxUsers: number; pricePLN: number; pricePLNYearly?: number }

const ONEHOST_STORE_URL = import.meta.env.VITE_ONEHOST_STORE_URL || 'http://localhost:5199'
const ONEHOST_LOGIN_URL = import.meta.env.VITE_ONEHOST_LOGIN_URL || 'http://localhost:5100/login'
const ONEHOST_REGISTER_URL = import.meta.env.VITE_ONEHOST_REGISTER_URL || 'http://localhost:5100/register'

const DEFAULT_PLANS: PlanData[] = [
  { key: 'starter', name: 'Starter', maxEmployees: 25, maxUsers: 3, pricePLN: 99, pricePLNYearly: 990 },
  { key: 'business', name: 'Business', maxEmployees: 100, maxUsers: 10, pricePLN: 249, pricePLNYearly: 2490 },
  { key: 'enterprise', name: 'Enterprise', maxEmployees: 500, maxUsers: 50, pricePLN: 499, pricePLNYearly: 4990 },
]

export function LandingPage() {
  const [plans] = useState<PlanData[]>(DEFAULT_PLANS)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  const minPricePLN = plans.length > 0
    ? Math.min(...plans.map(p => Number(p.pricePLN) || 0).filter(n => n > 0))
    : 99

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">CertTrack</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[{ href: '#funkcje', label: 'Funkcje' }, { href: '#cennik', label: 'Cennik' }, { href: '#porownanie', label: 'Porównanie' }].map(l => (
              <a key={l.href} href={l.href} className="px-3 py-2 text-sm font-medium text-slate-600 hover:text-brand-600 rounded-lg hover:bg-brand-50/50 transition-all">{l.label}</a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <a href={ONEHOST_STORE_URL} target="_blank" rel="noopener noreferrer"
              className="hidden sm:inline-flex text-sm font-medium text-slate-500 hover:text-brand-600 transition-colors px-3 py-2">
              OneHost Store
            </a>
            <a href={ONEHOST_LOGIN_URL} className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors px-3 py-2">Zaloguj</a>
            <a href={ONEHOST_REGISTER_URL} className="px-5 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 text-white text-sm font-bold rounded-xl hover:shadow-lg hover:shadow-brand-600/25 hover:-translate-y-0.5 transition-all">
              Wypróbuj za darmo
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-[10%] w-96 h-96 bg-brand-500/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 right-[15%] w-80 h-80 bg-blue-500/10 rounded-full blur-[80px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-600/5 rounded-full blur-[120px]" />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-white/90 rounded-full text-xs font-semibold mb-8 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-brand-300" /> Plan Starter — 7 dni za darmo, bez karty kredytowej
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
              Zarządzaj uprawnieniami
              <br />
              <span className="bg-gradient-to-r from-brand-400 via-blue-400 to-brand-300 bg-clip-text text-transparent">pracowników bez stresu</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
              CertTrack to system SaaS do śledzenia certyfikatów, szkoleń BHP, badań lekarskich i uprawnień technicznych.
              Koniec z Excelem — alerty, raporty PDF i pełna kontrola.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={ONEHOST_REGISTER_URL} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-brand-500/30 hover:-translate-y-0.5 transition-all text-base flex items-center justify-center gap-2">
                Rozpocznij 7-dniowy trial <ArrowRight className="w-4 h-4" />
              </a>
              <a href="#funkcje" className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-2xl border border-white/10 hover:bg-white/15 transition-all text-base text-center">
                Zobacz funkcje
              </a>
            </div>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Bez karty kredytowej</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Gotowe w 2 minuty</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> RODO compliant</span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-16 max-w-3xl mx-auto grid grid-cols-3 gap-4">
            {[
              { value: '9+', label: 'Kategorii uprawnień' },
              { value: '24/7', label: 'Dostęp w chmurze' },
              { value: '7 dni', label: 'Trial za darmo' },
            ].map(s => (
              <div key={s.label} className="text-center bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 py-5 px-3">
                <div className="text-2xl sm:text-3xl font-black text-white">{s.value}</div>
                <div className="text-xs sm:text-sm text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem / Solution ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold mb-4">
              <AlertTriangle className="w-3.5 h-3.5" /> Problem
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Dlaczego firmy tracą pieniądze?</h2>
            <p className="mt-4 text-slate-600 max-w-2xl mx-auto text-lg">Kontrole PIP, przestoje produkcji, kary finansowe — to wszystko przez brak systemu.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: AlertTriangle, color: 'from-red-500 to-rose-600', bg: 'bg-red-50', title: 'Kary od PIP', desc: 'Brak aktualnych szkoleń BHP i badań lekarskich to kary do 30 000 zł.', value: '30 000 zł' },
              { icon: Clock, color: 'from-amber-500 to-orange-600', bg: 'bg-amber-50', title: 'Przestoje produkcji', desc: 'Pracownik bez ważnych uprawnień UDT/SEP nie może pracować — linia stoi.', value: '100%' },
              { icon: FileSpreadsheet, color: 'from-blue-500 to-indigo-600', bg: 'bg-blue-50', title: 'Chaos w Excelu', desc: 'Arkusze kalkulacyjne nie wysyłają alertów i łatwo o pomyłkę.', value: '0 alertów' },
            ].map(item => (
              <div key={item.title} className="group bg-white rounded-2xl border border-slate-200/80 p-7 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-2xl font-black text-slate-900 mb-1">{item.value}</div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funkcje" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-600 rounded-full text-xs font-bold mb-4">
              <Zap className="w-3.5 h-3.5" /> Funkcje
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Wszystko w jednym miejscu</h2>
            <p className="mt-4 text-slate-600 max-w-xl mx-auto text-lg">CertTrack zastępuje Excela, przypominki w kalendarzu i papierowe teczki.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Award, title: 'Śledzenie uprawnień', desc: 'Certyfikaty spawalnicze, UDT, SEP, NDT, BHP, badania lekarskie — wszystko w jednym systemie.' },
              { icon: Bell, title: 'Alerty wygasania', desc: 'Automatyczne powiadomienia 7, 30 i 60 dni przed wygaśnięciem uprawnienia.' },
              { icon: FileText, title: 'Eksport PDF', desc: 'Generuj profesjonalne raporty uprawnień pracownika jednym kliknięciem.' },
              { icon: Upload, title: 'Upload skanów', desc: 'Dołącz skany certyfikatów (PDF, JPG, PNG) bezpośrednio do uprawnień.' },
              { icon: Download, title: 'Import CSV', desc: 'Masowe dodawanie pracowników i uprawnień z pliku CSV.' },
              { icon: FolderOpen, title: 'Kategorie uprawnień', desc: '9 predefiniowanych kategorii + możliwość tworzenia własnych z kolorami i alertami.' },
              { icon: Users, title: 'Wielu użytkowników', desc: 'Admin, Manager, Podgląd — kontroluj kto co widzi i edytuje w firmie.' },
              { icon: BarChart3, title: 'Dashboard', desc: 'Przegląd statusu wszystkich uprawnień: wygasłe, krytyczne, ostrzeżenia, ważne.' },
              { icon: Lock, title: 'Bezpieczeństwo', desc: 'Szyfrowanie JWT, izolacja danych między firmami (multi-tenancy), RODO.' },
              { icon: Globe, title: 'SaaS w chmurze', desc: 'Dostęp z dowolnego urządzenia, bez instalacji, automatyczne aktualizacje.' },
              { icon: Mail, title: 'Powiadomienia email', desc: 'Otrzymuj powiadomienia o wygasających uprawnieniach prosto na email.' },
              { icon: Smartphone, title: 'Responsywny design', desc: 'Wygodna praca na komputerze, tablecie i telefonie — bez instalacji aplikacji.' },
            ].map((item, i) => (
              <div key={item.title} className="group relative p-6 rounded-2xl border border-slate-100 hover:border-brand-200/50 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 bg-white">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 flex items-center justify-center mb-4 group-hover:from-brand-500 group-hover:to-brand-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand-500/25 transition-all duration-300">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="cennik" className="py-24 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold mb-4">
              <Star className="w-3.5 h-3.5" /> Cennik
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Prosty i przejrzysty cennik</h2>
            <p className="mt-4 text-slate-600 text-lg">7-dniowy trial za darmo. Bez karty kredytowej. Zrezygnuj kiedy chcesz.</p>
          </div>

          <div className="flex items-center justify-center gap-1 mb-12 bg-slate-100 rounded-xl p-1 max-w-xs mx-auto">
            <button onClick={() => setBilling('monthly')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${billing === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Miesięcznie
            </button>
            <button onClick={() => setBilling('yearly')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer ${billing === 'yearly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              Rocznie <span className="text-emerald-500 ml-1">-10%</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {plans.length === 0 && [0,1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-slate-200 animate-pulse">
                <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
                <div className="h-8 w-28 bg-slate-200 rounded mb-5" />
                <div className="space-y-2.5 mb-7">{[0,1,2,3,4].map(j => <div key={j} className="h-4 bg-slate-100 rounded w-full" />)}</div>
                <div className="h-12 bg-slate-100 rounded-xl" />
              </div>
            ))}
            {plans.map((plan, i) => {
              const icons = [Zap, Crown, Building2]
              const Icon = icons[i] || Zap
              const popular = i === 1
              const yearlyTotal = plan.pricePLNYearly || plan.pricePLN * 10
              const price = billing === 'yearly' ? Math.round(yearlyTotal / 12) : plan.pricePLN
              const savings = plan.pricePLN * 12 - yearlyTotal
              return (
                <div key={plan.key} className={`relative bg-white rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1 ${popular ? 'border-2 border-brand-500 shadow-xl shadow-brand-500/10 ring-4 ring-brand-50' : 'border border-slate-200 hover:shadow-lg hover:border-slate-300'}`}>
                  {popular && <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-500 to-brand-600 text-white text-xs font-bold rounded-full shadow-lg">Najpopularniejszy</div>}
                  {i === 0 && <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1"><Sparkles className="w-3 h-3" /> 7 dni za darmo</div>}
                  {popular && <div className="mb-3" />}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${popular ? 'bg-gradient-to-br from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25' : 'bg-slate-100'}`}>
                      <Icon className={`w-5 h-5 ${popular ? 'text-white' : 'text-slate-600'}`} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  </div>
                  <div className="mb-1">
                    <span className="text-4xl font-black text-slate-900">{price}</span>
                    <span className="text-sm text-slate-500 ml-1">zł / mies.</span>
                  </div>
                  {billing === 'yearly' && (
                    <div className="text-xs text-emerald-600 font-semibold mb-4">{yearlyTotal} zł/rok · oszczędzasz {savings} zł</div>
                  )}
                  {billing === 'monthly' && <div className="mb-4" />}
                  <ul className="space-y-3 mb-7 text-sm text-slate-600">
                    {[
                      `Do ${plan.maxEmployees} pracowników`,
                      `Do ${plan.maxUsers} kont użytkowników`,
                      'Nieograniczone uprawnienia',
                      'Eksport PDF + CSV',
                      'Upload skanów certyfikatów',
                      'Import masowy (CSV)',
                      'Alerty wygasania',
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2.5">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${popular ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span dangerouslySetInnerHTML={{ __html: f.replace(/(\d+)/, '<strong>$1</strong>') }} />
                      </li>
                    ))}
                  </ul>
                  <a href={ONEHOST_REGISTER_URL}
                    className={`block w-full py-3.5 text-center text-sm font-bold rounded-xl transition-all ${popular ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white hover:shadow-lg hover:shadow-brand-500/25 hover:-translate-y-0.5' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {i === 0 ? 'Rozpocznij za darmo →' : 'Wybierz plan'}
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Comparison ── */}
      <section id="porownanie" className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">CertTrack vs konkurencja</h2>
            <p className="mt-4 text-slate-600 max-w-xl mx-auto text-lg">Sprawdź dlaczego CertTrack to najlepszy wybór dla polskich firm.</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-100 bg-slate-50/50">
                  <th className="text-left py-4 px-5 font-semibold text-slate-700 w-1/3">Funkcja</th>
                  <th className="py-4 px-5 font-bold text-brand-700 bg-brand-50/50">CertTrack</th>
                  <th className="py-4 px-5 font-semibold text-slate-500">Remindax</th>
                  <th className="py-4 px-5 font-semibold text-slate-500">Aptien</th>
                  <th className="py-4 px-5 font-semibold text-slate-500">Excel</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Polski interfejs', us: true, r: false, a: false, e: true },
                  { feature: 'Kategorie BHP/UDT/SEP/NDT', us: true, r: false, a: false, e: false },
                  { feature: 'Alerty wygasania (email)', us: true, r: true, a: true, e: false },
                  { feature: 'Dashboard z przeglądem', us: true, r: true, a: true, e: false },
                  { feature: 'Upload skanów certyfikatów', us: true, r: false, a: true, e: false },
                  { feature: 'Eksport PDF raportów', us: true, r: false, a: false, e: false },
                  { feature: 'Import CSV masowy', us: true, r: false, a: true, e: false },
                  { feature: 'Multi-tenancy (izolacja firm)', us: true, r: false, a: true, e: false },
                  { feature: 'Wielu użytkowników z rolami', us: true, r: true, a: true, e: false },
                  { feature: '7-dniowy trial bez karty', us: true, r: true, a: true, e: true },
                  { feature: 'Dedykowane kategorie PL', us: true, r: false, a: false, e: false },
                  { feature: 'Cena od (PLN/mies.)', us: `${minPricePLN} zł`, r: '~80 zł', a: '~150 zł', e: '0 zł' },
                ].map(row => (
                  <tr key={row.feature} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-5 text-slate-700 font-medium">{row.feature}</td>
                    <td className="py-3 px-5 text-center bg-brand-50/30">
                      {typeof row.us === 'boolean' ? (row.us ? <CheckCircle className="w-5 h-5 text-brand-500 mx-auto" /> : <span className="text-slate-300">—</span>) : <span className="font-bold text-brand-700">{row.us}</span>}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {typeof row.r === 'boolean' ? (row.r ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-slate-300">—</span>) : <span className="text-slate-600">{row.r}</span>}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {typeof row.a === 'boolean' ? (row.a ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-slate-300">—</span>) : <span className="text-slate-600">{row.a}</span>}
                    </td>
                    <td className="py-3 px-5 text-center">
                      {typeof row.e === 'boolean' ? (row.e ? <Check className="w-4 h-4 text-emerald-400 mx-auto" /> : <span className="text-slate-300">—</span>) : <span className="text-slate-600">{row.e}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Who is it for ── */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Dla kogo jest CertTrack?</h2>
            <p className="mt-4 text-slate-600 text-lg">Idealne rozwiązanie dla firm, które muszą pilnować terminów uprawnień.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: '🏭', title: 'Firmy produkcyjne', desc: 'Spawalnicze, maszynowe, metalowe — śledź uprawnienia UDT, SEP, spawalnicze.' },
              { icon: '🏗️', title: 'Firmy budowlane', desc: 'Operatorzy maszyn, szkolenia BHP, badania wysokościowe.' },
              { icon: '🚛', title: 'Firmy transportowe', desc: 'Prawa jazdy, ADR, badania lekarskie kierowców.' },
              { icon: '👥', title: 'Działy HR / BHP', desc: 'Centralne zarządzanie terminami szkoleń i badań dla całej firmy.' },
            ].map(item => (
              <div key={item.title} className="group bg-white rounded-2xl border border-slate-200/80 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 rounded-3xl p-12 sm:p-16">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-blue-500/15 rounded-full blur-[60px]" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-5">Zacznij kontrolować uprawnienia już dziś</h2>
              <p className="text-slate-300 mb-10 max-w-lg mx-auto text-lg leading-relaxed">
                Dołącz do firm, które już nie martwią się o przeterminowane certyfikaty.
                7 dni za darmo, bez zobowiązań.
              </p>
              <a href={ONEHOST_REGISTER_URL} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-700 font-bold rounded-2xl hover:shadow-xl hover:shadow-white/10 hover:-translate-y-0.5 transition-all text-base">
                Załóż konto za darmo <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 text-white py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <Shield className="w-4.5 h-4.5 text-white" />
                </div>
                <span className="font-extrabold text-lg">CertTrack</span>
              </div>
              <p className="text-sm text-slate-400 max-w-xs">System do zarządzania uprawnieniami i certyfikatami pracowników.</p>
            </div>
            <div className="flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Produkt</div>
                <div className="space-y-2">
                  <a href="#funkcje" className="block text-sm text-slate-400 hover:text-white transition-colors">Funkcje</a>
                  <a href="#cennik" className="block text-sm text-slate-400 hover:text-white transition-colors">Cennik</a>
                  <a href="#porownanie" className="block text-sm text-slate-400 hover:text-white transition-colors">Porównanie</a>
                </div>
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Konto</div>
                <div className="space-y-2">
                  <a href={ONEHOST_LOGIN_URL} className="block text-sm text-slate-400 hover:text-white transition-colors">Logowanie</a>
                  <a href={ONEHOST_REGISTER_URL} className="block text-sm text-slate-400 hover:text-white transition-colors">Rejestracja</a>
                  <a href={ONEHOST_STORE_URL} target="_blank" rel="noopener noreferrer" className="block text-sm text-slate-400 hover:text-white transition-colors">OneHost Store</a>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} CertTrack. Konrad Wiśniewski.</span>
            <span>Powered by <strong className="text-slate-400">OneHost</strong></span>
          </div>
        </div>
      </footer>
    </div>
  )
}
