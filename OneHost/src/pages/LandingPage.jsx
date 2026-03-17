import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { useSEO } from '../hooks/useSEO';

/* ── Data ──────────────────────────────────────────────────────────── */
const PRODUCTS = [
  {
    id: 'shiftplanner',
    name: 'ShiftPlanner',
    icon: '📅',
    color: 'from-teal-500 to-cyan-600',
    description: 'Elastyczne planowanie grafików pracy — dowolny system zmianowy',
    longDesc: 'Utwórz dowolny grafik zmianowy — standardowe godziny, 2 zmiany, 3 zmiany, 4-brygadowy, 12h, weekendowy lub całkowicie własny układ. Zarządzaj urlopami, przypisuj stanowiska, wyłączaj wybrane dni. Eksport do PDF. Wiele profili dla różnych działów.',
    features: ['Dowolny system zmianowy (nie tylko 3/4-brygadowy)', 'Konfiguracja godzin i nazw zmian', 'Wyłączanie dni (np. niedziele, święta)', 'Zarządzanie urlopami', 'Stanowiska i pary pracowników', 'Drukowanie i eksport PDF'],
    prices: { starter: { monthly: 89, yearly: 854 }, business: { monthly: 249, yearly: 2390 }, enterprise: { monthly: 499, yearly: 4790 } },
  },
  {
    id: 'equipment',
    name: 'Equipment Manager',
    icon: '🔧',
    color: 'from-blue-500 to-indigo-600',
    description: 'Kontrola terminów przeglądów sprzętu i maszyn',
    longDesc: 'Ewidencja sprzętu z terminami przeglądów, kalibracji i inspekcji. Powiadomienia push w przeglądarce gdy zbliża się termin.',
    features: ['Śledzenie terminów przeglądów', 'Powiadomienia push w przeglądarce', 'Kategorie i typy kontroli', 'Parametry narzędzi', 'Eksport / import danych', 'Filtrowanie i sortowanie'],
    prices: { starter: { monthly: 59, yearly: 566 }, business: { monthly: 169, yearly: 1622 }, enterprise: { monthly: 349, yearly: 3350 } },
  },
  {
    id: 'certtrack',
    name: 'CertTrack',
    icon: '📋',
    color: 'from-purple-500 to-pink-600',
    description: 'Ewidencja certyfikatów, uprawnień i szkoleń',
    longDesc: 'Baza certyfikatów i uprawnień pracowników. Automatyczne powiadomienia o zbliżającym się wygaśnięciu. Raporty PDF.',
    features: ['Baza certyfikatów i uprawnień', 'Automatyczne powiadomienia', 'Raporty PDF', 'Import z CSV', 'Kategorie dokumentów', 'Wielu użytkowników'],
    prices: { starter: { monthly: 79, yearly: 758 }, business: { monthly: 199, yearly: 1910 }, enterprise: { monthly: 399, yearly: 3830 } },
  },
];

const PLANS = [
  {
    key: 'starter',
    name: 'Starter',
    maxEmployees: 25,
    maxUsers: 3,
    maxProfiles: 1,
    features: ['Do 25 rekordów na aplikację (pracownicy/sprzęt)', 'Do 3 przypisań użytkowników na profil', '1 profil na aplikację', 'Email wsparcie', '7 dni free trial'],
    popular: false,
    trial: true,
  },
  {
    key: 'business',
    name: 'Business',
    maxEmployees: 100,
    maxUsers: 10,
    maxProfiles: 3,
    features: ['Do 100 rekordów na aplikację (pracownicy/sprzęt)', 'Do 10 przypisań użytkowników na profil', '3 profile na aplikację', 'Priorytetowe wsparcie'],
    popular: true,
    trial: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    maxEmployees: 500,
    maxUsers: 0,
    maxProfiles: 10,
    features: ['Do 500 rekordów na aplikację (pracownicy/sprzęt)', 'Bez limitu przypisań użytkowników na profil', '10 profili na aplikację', 'Dedykowane wsparcie', 'Własne integracje'],
    popular: false,
    trial: false,
  },
];

const FAQ_ITEMS = [
  { q: 'Czym jest OneHost?', a: 'OneHost to platforma łącząca trzy narzędzia dla firm: ShiftPlanner (grafiki pracy), Equipment Manager (przeglądy sprzętu) i CertTrack (certyfikaty pracowników). Wszystkie płatności i zarządzanie kontem odbywają się w jednym panelu.' },
  { q: 'Czy mogę wypróbować za darmo?', a: 'Tak — plan Starter oferuje 7-dniowy darmowy okres próbny bez wymaganej karty płatniczej. Po zakończeniu trialu możesz samodzielnie uruchomić płatną subskrypcję.' },
  { q: 'Ile kosztuje OneHost?', a: 'Każdy produkt ma indywidualną cenę zależną od planu. Na planie Starter: ShiftPlanner — 89 PLN/mies., CertTrack — 79 PLN/mies., Equipment Manager — 59 PLN/mies. Możesz kupić 1, 2 lub 3 produkty. Pakiet 3 produktów daje rabat 20%, a płatność roczna dodatkowe ~20% rabatu.' },
  { q: 'Czy dane mojej firmy są bezpieczne?', a: 'Tak. Każda firma ma całkowicie oddzielone dane (architektura multi-tenant). Stosujemy szyfrowane połączenia, uwierzytelnianie JWT i rate limiting.' },
  { q: 'Jak działa system wielu użytkowników?', a: 'Admin firmy może zapraszać kolejnych użytkowników (np. kierowników, managerów) — wszyscy współdzielą dane firmy. Każdy użytkownik ma własne konto i hasło.' },
  { q: 'Czym jest profil danych?', a: 'Profil to oddzielna baza danych w ramach jednej firmy. Limit profili jest na każdą aplikację osobno — np. na planie Starter masz 1 profil dla ShiftPlanner, 1 dla Equipment Manager i 1 dla CertTrack. Dodatkowo każdy plan określa limit przypisań użytkowników do pojedynczego profilu (Enterprise: bez limitu).' },
  { q: 'Jak zacząć?', a: 'Załóż konto, wybierz plan Starter z 7-dniowym trialem. Dane możesz zaimportować z CSV. Cały proces zajmuje kilka minut.' },
];

const BUNDLE_DISCOUNT = 20;

const CheckIcon = () => (
  <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function LandingPage() {
  useSEO({
    title: 'OneHost – Grafiki pracy, przeglądy sprzętu i certyfikaty | Platforma dla firm',
    description: 'OneHost to kompleksowa platforma SaaS dla polskich firm: ShiftPlanner (grafiki zmian), Equipment Manager (przeglądy sprzętu), CertTrack (certyfikaty pracowników). 7 dni za darmo!',
    keywords: 'grafiki pracy, planowanie zmian, przeglądy sprzętu, certyfikaty pracowników, zarządzanie firmą, SaaS dla firm, ShiftPlanner, Equipment Manager, CertTrack, OneHost, oprogramowanie dla firm, grafik zmianowy, platforma HR',
    ogUrl: 'https://sklep.onehost.site/'
  });

  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedProducts, setSelectedProducts] = useState(['shiftplanner', 'equipment', 'certtrack']);
  const [openFaq, setOpenFaq] = useState(null);

  const toggleProduct = (id) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const isBundle = selectedProducts.length === 3;

  const getProductsSum = (planKey) => {
    const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
    return selectedProducts.reduce((s, pid) => {
      const prod = PRODUCTS.find(p => p.id === pid);
      return s + (prod?.prices[planKey]?.[cycle] || 0);
    }, 0);
  };

  const getPrice = (plan) => {
    const sum = getProductsSum(plan.key);
    return isBundle ? Math.round(sum * (1 - BUNDLE_DISCOUNT / 100)) : sum;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header>
        <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200" aria-label="Nawigacja główna">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2" title="OneHost – strona główna">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">OH</div>
              <span className="text-xl font-bold text-slate-800">OneHost</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <a href="#produkty" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Produkty</a>
              <a href="#cennik" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Cennik</a>
              <a href="#funkcje" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Funkcje</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">FAQ</a>
              <Link to="/guide" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Poradnik</Link>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Link to="/dashboard" className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors">
                  Panel
                </Link>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Zaloguj się</Link>
                  <Link to="/register" className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm">
                    Wypróbuj za darmo
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden" aria-labelledby="hero-heading">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(20, 184, 166, 0.3) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(99, 102, 241, 0.3) 0%, transparent 50%)' }} />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-sm font-medium mb-8">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" aria-hidden="true" />
                Plan Starter — 7 dni za darmo (bez wymaganej karty)
              </div>
              <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-6">
                Grafiki pracy, przeglądy sprzętu<br />
                i certyfikaty —{' '}
                <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">w jednej platformie</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
                <strong>OneHost</strong> to polska platforma SaaS łącząca <em>ShiftPlanner</em>, <em>Equipment Manager</em> i <em>CertTrack</em>. Zaoszczędź {BUNDLE_DISCOUNT}% kupując pakiet.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="w-full sm:w-auto bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25">
                  Rozpocznij darmowy trial
                </Link>
                <a href="#cennik" className="w-full sm:w-auto border border-slate-600 text-slate-300 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-slate-800 transition-colors">
                  Zobacz cennik
                </a>
              </div>
            </div>

            {/* Product cards preview */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {PRODUCTS.map((product) => (
                <article key={product.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors group">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center text-2xl mb-4`} role="img" aria-label={product.name}>
                    {product.icon}
                  </div>
                  <h2 className="text-lg font-bold text-white mb-2">{product.name}</h2>
                  <p className="text-sm text-slate-400 mb-4">{product.description}</p>
                  <ul className="space-y-2">
                    {product.features.slice(0, 3).map((f, i) => (
                      <li key={i} className="text-sm text-slate-400 flex items-center gap-2">
                        <CheckIcon />
                        {f}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Reference client ───────────────────────────────────────── */}
        <section className="py-10 bg-white border-b border-slate-100" aria-label="Klient referencyjny">
          <div className="max-w-5xl mx-auto px-4 text-center">
            <p className="text-xs text-slate-400 mb-3 tracking-wide uppercase font-medium">Korzystają z naszych narzędzi</p>
            <span className="text-base font-bold text-slate-600 tracking-wide">Expom S.A. — Kurzętnik</span>
            <p className="text-xs text-slate-400 mt-1">ShiftPlanner + Equipment Manager</p>
          </div>
        </section>

        {/* ── Products section ───────────────────────────────────────── */}
        <section id="produkty" className="py-24 bg-white" aria-labelledby="products-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 id="products-heading" className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Trzy narzędzia do zarządzania firmą w jednej platformie</h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">Każde narzędzie rozwiązuje konkretny problem w Twojej firmie. Razem tworzą kompletne rozwiązanie: planowanie grafiku pracy, kontrola przeglądów sprzętu i ewidencja certyfikatów pracowników.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {PRODUCTS.map((product) => (
                <article key={product.id} className="bg-white border border-slate-200 rounded-2xl p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1" itemScope itemType="https://schema.org/SoftwareApplication">
                  <meta itemProp="applicationCategory" content="BusinessApplication" />
                  <meta itemProp="operatingSystem" content="Web" />
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${product.color} flex items-center justify-center text-3xl mb-6`} role="img" aria-label={product.name}>
                    {product.icon}
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-3" itemProp="name">{product.name}</h3>
                  <p className="text-slate-600 mb-2 font-medium" itemProp="description">{product.description}</p>
                  <p className="text-sm text-slate-400 mb-6">{product.longDesc}</p>
                  <ul className="space-y-3">
                    {product.features.map((f, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-center gap-2.5">
                        <CheckIcon />
                        <span itemProp="featureList">{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features section ───────────────────────────────────────── */}
        <section id="funkcje" className="py-24 bg-slate-50" aria-labelledby="features-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Dlaczego OneHost? Kluczowe funkcje platformy</h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto">Narzędzia stworzone z myślą o polskich firmach — w 100% po polsku, z izolacją danych i szybkim wdrożeniem.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { icon: '🏢', title: 'Izolacja danych', desc: 'Każde konto ma w 100% oddzielone dane. Żadne inne konto nie ma dostępu do Twoich informacji.' },
                { icon: '👥', title: 'Wielu użytkowników', desc: 'Zaproś kierowników i pracowników z różnymi rolami. Wszyscy współdzielą dane firmy.' },
                { icon: '📊', title: 'Wiele profili danych', desc: 'Różne oddziały, różne grafiki — każdy kierownik może mieć własny profil danych.' },
                { icon: '🔒', title: 'Bezpieczeństwo', desc: 'Szyfrowane połączenia, JWT auth, rate limiting, zabezpieczone API.' },
                { icon: '🔔', title: 'Powiadomienia push', desc: 'Powiadomienia w przeglądarce o zbliżających się przeglądach i wygasających certyfikatach.' },
                { icon: '📱', title: 'Działa wszędzie', desc: 'Responsywny design — komputer, tablet, telefon. Bez instalacji, działa w przeglądarce.' },
                { icon: '🇵🇱', title: 'W 100% po polsku', desc: 'Cała platforma i wsparcie techniczne w języku polskim.' },
                { icon: '⚡', title: 'Szybki start', desc: 'Załóż konto, wybierz produkty, importuj dane z CSV. Bez konsultantów i wdrożeń.' },
                { icon: '💳', title: 'Free trial na Starter', desc: '7 dni za darmo na planie Starter. Potem sam decydujesz: uruchomić płatną subskrypcję albo zakończyć.' },
              ].map((f, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-4" role="img" aria-label={f.title}>{f.icon}</div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ────────────────────────────────────────────────── */}
        <section id="cennik" className="py-24 bg-white" aria-labelledby="pricing-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Cennik OneHost — przejrzyste plany dla firm</h2>
              <p className="text-lg text-slate-500 mb-2">Każdy produkt ma indywidualną cenę. Możesz kupić 1, 2 lub 3 produkty — pakiet 3 daje rabat {BUNDLE_DISCOUNT}%.</p>
              <p className="text-sm text-slate-400 mb-8">Free trial (7 dni) dostępny tylko w planie Starter. Bez wymaganej karty.</p>

              {/* Billing cycle toggle */}
              <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-8 shadow-sm border border-slate-200" role="radiogroup" aria-label="Cykl rozliczeniowy">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  role="radio"
                  aria-checked={billingCycle === 'monthly'}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${billingCycle === 'monthly' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Miesięcznie
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  role="radio"
                  aria-checked={billingCycle === 'yearly'}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${billingCycle === 'yearly' ? 'bg-teal-50 text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Rocznie <span className="text-teal-600 ml-1">-20%</span>
                </button>
              </div>

              {/* Product selector */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <span className="text-sm text-slate-500 mr-2">Produkty:</span>
                {PRODUCTS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    aria-pressed={selectedProducts.includes(p.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                      selectedProducts.includes(p.id)
                        ? 'bg-teal-50 border-teal-300 text-teal-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span aria-hidden="true">{p.icon}</span>
                    {p.name}
                    {selectedProducts.includes(p.id) && <CheckIcon />}
                  </button>
                ))}
                {isBundle && (
                  <span className="px-3 py-1 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
                    -{BUNDLE_DISCOUNT}% PAKIET
                  </span>
                )}
              </div>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <p className="text-lg">Wybierz co najmniej jeden produkt, aby zobaczyć cennik</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {PLANS.map((plan) => {
                  const price = getPrice(plan);
                  const perMonth = billingCycle === 'yearly' ? Math.round(price / 12) : price;
                  return (
                    <div
                      key={plan.key}
                      className={`relative rounded-2xl border-2 p-8 transition-all hover:shadow-xl ${
                        plan.popular
                          ? 'border-teal-500 bg-white shadow-lg shadow-teal-100 scale-105'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                      itemScope
                      itemType="https://schema.org/Offer"
                    >
                      <meta itemProp="priceCurrency" content="PLN" />
                      <meta itemProp="price" content={String(perMonth)} />
                      {plan.popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-teal-500 to-cyan-600 text-white text-xs font-bold rounded-full">
                          NAJPOPULARNIEJSZY
                        </div>
                      )}
                      <h3 className="text-xl font-bold text-slate-800 mb-2" itemProp="name">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-4xl font-extrabold text-slate-800">{perMonth}</span>
                        <span className="text-slate-500 text-sm">PLN / mies.</span>
                      </div>
                      {billingCycle === 'yearly' && (
                        <p className="text-xs text-slate-400 mb-2">{price} PLN/rok</p>
                      )}
                      {isBundle && (
                        <p className="text-xs text-teal-600 font-medium mb-2">
                          Oszczędzasz {Math.round(getProductsSum(plan.key) * BUNDLE_DISCOUNT / 100)} PLN{billingCycle === 'yearly' ? '/rok' : '/mies.'} z pakietem
                        </p>
                      )}
                      <div className="space-y-1 mb-4 pt-2 border-t border-slate-100">
                        {selectedProducts.map((pid) => {
                          const prod = PRODUCTS.find(p => p.id === pid);
                          const cycle = billingCycle === 'yearly' ? 'yearly' : 'monthly';
                          const pp = prod?.prices[plan.key]?.[cycle] || 0;
                          const ppMonth = billingCycle === 'yearly' ? Math.round(pp / 12) : pp;
                          return (
                            <div key={pid} className="flex justify-between text-xs text-slate-400">
                              <span>{prod?.icon} {prod?.name}</span>
                              <span>{ppMonth} PLN</span>
                            </div>
                          );
                        })}
                      </div>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-center gap-2.5">
                            <CheckIcon />
                            {f}
                          </li>
                        ))}
                      </ul>
                      <Link
                        to="/register"
                        className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                          plan.popular
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700 shadow-md'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {plan.trial ? 'Wypróbuj 7 dni za darmo' : 'Wybierz plan'}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────── */}
        <section id="faq" className="py-24 bg-slate-50" aria-labelledby="faq-heading">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Często zadawane pytania (FAQ)</h2>
              <p className="text-lg text-slate-500">Nie znalazłeś odpowiedzi? Napisz na <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a></p>
            </div>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="flex items-center justify-between w-full px-6 py-4 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                    aria-expanded={openFaq === i}
                    aria-controls={`faq-answer-${i}`}
                  >
                    <span className="text-sm font-semibold text-slate-800 pr-4">{item.q}</span>
                    <svg
                      className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {openFaq === i && (
                    <div id={`faq-answer-${i}`} className="px-6 pb-4">
                      <p className="text-sm text-slate-500 leading-relaxed">{item.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <section className="py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900" aria-labelledby="cta-heading">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 id="cta-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">Gotowy na porządek w firmie?</h2>
            <p className="text-lg text-slate-300 mb-8">Załóż konto i wypróbuj plan Starter przez 7 dni za darmo.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="inline-block bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-10 py-4 rounded-xl text-base font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg shadow-teal-500/25">
                Załóż konto — 7 dni za darmo
              </Link>
              <a href="mailto:Admin@onehost.site" className="inline-block border border-slate-600 text-slate-300 px-8 py-4 rounded-xl text-base font-semibold hover:bg-slate-800 transition-colors">
                Napisz do nas
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800" role="contentinfo">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4" title="OneHost">
                <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">OH</div>
                <span className="text-lg font-bold text-white">OneHost</span>
              </Link>
              <p className="text-sm mb-3">Platforma do zarządzania firmą — grafiki, przeglądy, certyfikaty.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Produkty</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#produkty" className="hover:text-white transition-colors">ShiftPlanner — grafiki pracy</a></li>
                <li><a href="#produkty" className="hover:text-white transition-colors">Equipment Manager — przeglądy sprzętu</a></li>
                <li><a href="#produkty" className="hover:text-white transition-colors">CertTrack — certyfikaty</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Platforma</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#cennik" className="hover:text-white transition-colors">Cennik</a></li>
                <li><a href="#funkcje" className="hover:text-white transition-colors">Funkcje</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><Link to="/guide" className="hover:text-white transition-colors">Poradnik</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Regulamin</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Polityka prywatności</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Logowanie</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Kontakt</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:Admin@onehost.site" className="hover:text-white transition-colors">Admin@onehost.site</a></li>
              </ul>
              <div className="mt-4">
                <h3 className="text-white font-semibold mb-2 text-xs">Hosting</h3>
                <a href="https://start.onehost.site" className="text-teal-400 hover:text-teal-300 text-sm transition-colors" target="_blank" rel="noopener">start.onehost.site</a>
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p>&copy; {new Date().getFullYear()} OneHost. Wszelkie prawa zastrzeżone.</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <Link to="/terms" className="hover:text-slate-300 transition-colors">Regulamin</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:text-slate-300 transition-colors">Prywatność</Link>
              <span>·</span>
              <a href="https://start.onehost.site" className="text-teal-400 hover:text-teal-300 transition-colors" target="_blank" rel="noopener">Hosting: start.onehost.site</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
