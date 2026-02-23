import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../App';
import { getApiBaseUrl } from '../apiBase';

const API = getApiBaseUrl();

const BUNDLE_DISCOUNT_DEFAULT_2 = 10;
const BUNDLE_DISCOUNT_DEFAULT_3 = 20;

const PRODUCT_META = [
  { id: 'shiftplanner', icon: '📅', name: 'ShiftPlanner', short: 'SP' },
  { id: 'equipment',    icon: '🔧', name: 'Equipment Manager', short: 'EM' },
  { id: 'certtrack',    icon: '📋', name: 'CertTrack', short: 'CT' },
];

export default function BillingPage() {
  const { user, subscription, token, refresh } = useAuth();
  const [searchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedProducts, setSelectedProducts] = useState(['shiftplanner', 'equipment', 'certtrack']);
  const [loading, setLoading] = useState('');
  const [stripeStatus, setStripeStatus] = useState(null);
  const [message, setMessage] = useState(() => {
    if (searchParams.get('success') === '1') return { type: 'success', text: 'Płatność zakończona pomyślnie! Twoja subskrypcja jest aktywna.' };
    if (searchParams.get('canceled') === '1') return { type: 'info', text: 'Płatność została anulowana.' };
    return null;
  });

  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const bundleDiscountTwo = Number(plans?.[0]?.bundleDiscountTwo ?? BUNDLE_DISCOUNT_DEFAULT_2);
  const bundleDiscountThree = Number(plans?.[0]?.bundleDiscountThree ?? BUNDLE_DISCOUNT_DEFAULT_3);

  const getDiscountPercent = (count) => {
    if (count >= 3) return bundleDiscountThree;
    if (count === 2) return bundleDiscountTwo;
    return 0;
  };

  const getLimitText = (maxEmployees, products) => {
    if (!Array.isArray(products) || products.length !== 1) return `Do ${maxEmployees} rekordów na każdą wybraną aplikację`;
    const product = products[0];
    if (product === 'equipment') return `Do ${maxEmployees} pozycji sprzętu (Equipment Manager)`;
    if (product === 'shiftplanner') return `Do ${maxEmployees} pracowników (ShiftPlanner)`;
    if (product === 'certtrack') return `Do ${maxEmployees} pracowników i certyfikatów (CertTrack)`;
    return `Do ${maxEmployees} rekordów na aplikację`;
  };

  useEffect(() => {
    fetch(`${API}/billing/plans`).then(r => r.json()).then(setPlans).catch(() => {});
    refresh();
  }, []);

  useEffect(() => {
    const ok = searchParams.get('success') === '1';
    const sessionId = searchParams.get('session_id');
    if (!ok || !sessionId || !token) return;

    (async () => {
      try {
        const r = await fetch(`${API}/billing/confirm`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Nie udało się potwierdzić płatności');
        setStripeStatus({ type: 'success', text: 'Stripe: płatność potwierdzona i zsynchronizowana.' });
        setMessage({ type: 'success', text: 'Płatność zakończona pomyślnie! Subskrypcja została zsynchronizowana.' });
        refresh();
      } catch (err) {
        setStripeStatus({ type: 'error', text: `Stripe: błąd potwierdzenia (${err.message}).` });
        setMessage({ type: 'error', text: err.message });
      }
    })();
  }, [token]);

  const sub = subscription || {};
  const isTrialing = sub.status === 'trialing';
  const isActive = sub.status === 'active';
  const isCancelPending = sub.status === 'cancel_pending';
  const discountPercent = getDiscountPercent(selectedProducts.length);

  const handleCancel = async () => {
    if (!confirm('Czy na pewno chcesz anulować subskrypcję? Dostęp będzie aktywny do końca okresu rozliczeniowego.')) return;
    setLoading('cancel');
    try {
      const r = await fetch(`${API}/billing/cancel`, { method: 'POST', headers });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setStripeStatus({ type: 'success', text: 'Stripe: anulowanie na koniec okresu potwierdzone.' });
      setMessage({ type: 'info', text: 'Subskrypcja zostanie anulowana na koniec okresu rozliczeniowego.' });
      refresh();
    } catch (err) {
      setStripeStatus({ type: 'error', text: `Stripe: anulowanie nieudane (${err.message}).` });
      setMessage({ type: 'error', text: err.message });
    } finally { setLoading(''); }
  };

  const handleReactivate = async () => {
    setLoading('reactivate');
    try {
      const r = await fetch(`${API}/billing/reactivate`, { method: 'POST', headers });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setStripeStatus({ type: 'success', text: 'Stripe: reaktywacja potwierdzona.' });
      setMessage({ type: 'success', text: 'Subskrypcja została reaktywowana!' });
      refresh();
    } catch (err) {
      setStripeStatus({ type: 'error', text: `Stripe: reaktywacja nieudana (${err.message}).` });
      setMessage({ type: 'error', text: err.message });
    } finally { setLoading(''); }
  };

  const handleCheckout = async (planKey) => {
    setLoading(planKey);
    try {
      const r = await fetch(`${API}/billing/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: planKey,
          interval: billingCycle,
          products: selectedProducts,
          bundle: selectedProducts.length >= 2,
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 409 && data.portalUrl) {
          window.location.href = data.portalUrl;
          return;
        }
        throw new Error(data.error);
      }
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading('');
    }
  };

  const handlePortal = async () => {
    setLoading('portal');
    try {
      const r = await fetch(`${API}/billing/portal`, { method: 'POST', headers });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setStripeStatus({ type: 'success', text: 'Stripe: połączenie z portalem OK.' });
      if (data.url) window.location.href = data.url;
    } catch (err) {
      setStripeStatus({ type: 'error', text: `Stripe: błąd portalu (${err.message}).` });
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading('');
    }
  };

  const getPrice = (plan) => {
    const cycleBase = billingCycle === 'yearly' ? Number(plan.pricePLNYearly || 0) : Number(plan.pricePLN || 0);
    const gross = cycleBase * selectedProducts.length;
    return Math.round(gross * (1 - discountPercent / 100));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">OH</div>
              <span className="text-lg font-bold text-slate-800">OneHost</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm text-slate-500">Subskrypcja</span>
          </div>
          <Link to="/dashboard" className="text-sm text-slate-600 hover:text-primary">← Powrót</Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {message && (
          <div className={`rounded-xl p-4 mb-6 text-sm font-medium ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Current status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Status subskrypcji</h2>
          {stripeStatus && (
            <div className={`mb-4 rounded-lg px-3 py-2 text-xs font-medium border ${
              stripeStatus.type === 'success'
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {stripeStatus.text}
            </div>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Plan</p>
              <p className="text-lg font-bold text-slate-800">{sub.planDetails?.name || 'Trial'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <p className={`text-lg font-bold ${isActive ? 'text-green-600' : isTrialing ? 'text-teal-600' : 'text-red-600'}`}>
                {isActive ? 'Aktywny' : isTrialing ? 'Trial' : sub.status === 'past_due' ? 'Zaległa płatność' : 'Nieaktywny'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Limit rekordów / aplikację</p>
              <p className="text-lg font-bold text-slate-800">{sub.planDetails?.maxEmployees || 40}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Limit przypisań/profil</p>
              <p className="text-lg font-bold text-slate-800">{(sub.planDetails?.maxUsers ?? 3) > 0 ? sub.planDetails?.maxUsers : 'Bez limitu'}</p>
            </div>
          </div>
          {isTrialing && sub.daysLeft !== null && (
            <div className={`mt-4 rounded-lg p-3 text-sm ${sub.daysLeft <= 2 ? 'bg-red-50 text-red-700' : 'bg-teal-50 text-teal-700'}`}>
              {sub.daysLeft <= 0 ? 'Trial wygasł! Wybierz plan poniżej.' : `Trial: ${sub.daysLeft} dni pozostało.`}
            </div>
          )}
          {isActive && (
            <div className="flex gap-3 mt-4">
              <button
                onClick={handlePortal}
                disabled={loading === 'portal'}
                className="border border-slate-200 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 cursor-pointer disabled:opacity-50"
              >
                {loading === 'portal' ? 'Otwieranie...' : 'Zarządzaj subskrypcją (Stripe)'}
              </button>
              <button
                onClick={handleCancel}
                disabled={!!loading}
                className="border border-red-200 text-red-600 px-5 py-2 rounded-lg text-sm font-medium hover:bg-red-50 cursor-pointer disabled:opacity-50"
              >
                {loading === 'cancel' ? 'Anulowanie...' : 'Anuluj subskrypcję'}
              </button>
            </div>
          )}
          {isCancelPending && (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-700">
                ⚠️ Subskrypcja zostanie anulowana na koniec bieżącego okresu rozliczeniowego. Do tego czasu masz pełny dostęp.
              </div>
              <button
                onClick={handleReactivate}
                disabled={!!loading}
                className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-700 cursor-pointer disabled:opacity-50"
              >
                {loading === 'reactivate' ? 'Reaktywacja...' : '↩ Reaktywuj subskrypcję'}
              </button>
            </div>
          )}
        </div>

        {/* Plans */}
        <h2 className="text-xl font-bold text-slate-800 mb-2">{isActive ? 'Zmień plan' : 'Wybierz plan'}</h2>
        <p className="text-slate-500 mb-6">Płacisz tylko za produkty, które wybrałeś (1, 2 lub 3). Pakiet 2 = -{bundleDiscountTwo}%, pakiet 3 = -{bundleDiscountThree}%</p>

        {/* Billing cycle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="inline-flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${billingCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Miesięcznie</button>
            <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${billingCycle === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>Rocznie <span className="text-teal-600">-20%</span></button>
          </div>
          <div className="flex gap-2">
            {PRODUCT_META.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProducts(prev => prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id])}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${selectedProducts.includes(p.id) ? 'bg-teal-50 border-teal-300 text-teal-700' : 'bg-white border-slate-200 text-slate-400'}`}
              >
                {p.icon} {p.short}
              </button>
            ))}
          </div>
          {selectedProducts.length >= 2 && <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">PAKIET -{discountPercent}%</span>}
        </div>

        {selectedProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Wybierz co najmniej jeden produkt</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const price = getPrice(plan);
              const perMonth = billingCycle === 'yearly' ? Math.round(price / 12) : price;
              const isCurrent = sub.plan === plan.key && isActive;
              return (
                <div key={plan.key} className={`bg-white rounded-2xl border-2 p-6 ${plan.key === 'business' ? 'border-teal-500 shadow-lg' : 'border-slate-200'}`}>
                  {plan.key === 'business' && (
                    <div className="text-center mb-3"><span className="px-3 py-0.5 bg-teal-100 text-teal-700 text-xs font-bold rounded-full">NAJPOPULARNIEJSZY</span></div>
                  )}
                  <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-1">
                    <span className="text-3xl font-extrabold text-slate-800">{perMonth}</span>
                    <span className="text-slate-500 text-sm">PLN/mies.</span>
                  </div>
                  {billingCycle === 'yearly' && <p className="text-xs text-slate-400">{price} PLN/rok</p>}
                  <div className="space-y-1 my-3 pt-2 border-t border-slate-100">
                    {selectedProducts.map((pid) => {
                      const pm = PRODUCT_META.find(p => p.id === pid);
                      const pp = billingCycle === 'yearly' ? Number(plan.pricePLNYearly || 0) : Number(plan.pricePLN || 0);
                      const ppMonth = billingCycle === 'yearly' ? Math.round(pp / 12) : pp;
                      return (
                        <div key={pid} className="flex justify-between text-xs text-slate-400">
                          <span>{pm?.icon} {pm?.name}</span>
                          <span>{ppMonth} PLN</span>
                        </div>
                      );
                    })}
                    {selectedProducts.length >= 2 && (
                      <div className="flex justify-between text-xs text-teal-600 font-semibold border-t border-slate-100 pt-2 mt-2">
                        <span>Rabat pakietowy</span>
                        <span>-{discountPercent}%</span>
                      </div>
                    )}
                  </div>
                  <ul className="space-y-2 my-5">
                    <li className="text-sm text-slate-600">{getLimitText(plan.maxEmployees, selectedProducts)}</li>
                    <li className="text-sm text-slate-600">{plan.maxUsers > 0 ? `Do ${plan.maxUsers} przypisań użytkowników na profil` : 'Bez limitu przypisań użytkowników na profil'}</li>
                    <li className="text-sm text-slate-600">{plan.maxProfiles || 1} {(plan.maxProfiles || 1) === 1 ? 'profil' : 'profili'} na aplikację</li>
                    <li className="text-sm text-slate-600">{selectedProducts.length} {selectedProducts.length === 1 ? 'produkt' : 'produkty'}</li>
                  </ul>
                  {isCurrent ? (
                    <div className="w-full text-center py-2.5 rounded-xl text-sm font-medium bg-green-100 text-green-700">Aktualny plan</div>
                  ) : (
                    <button
                      onClick={() => handleCheckout(plan.key)}
                      disabled={!!loading}
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50 ${
                        plan.key === 'business'
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white hover:from-teal-600 hover:to-cyan-700'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {loading === plan.key ? 'Przekierowanie...' : 'Wybierz plan'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
