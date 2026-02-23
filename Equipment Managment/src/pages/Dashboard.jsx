import React, { useState, useMemo, useCallback } from 'react';
import { calcDaysLeft, getExpiryDate, formatDate, getStatusInfo, todayISO } from '../utils/dates';

export default function Dashboard({ items, onUpdateDate, darkMode }) {
  const [renewDateMap, setRenewDateMap] = useState({});

  const enriched = useMemo(() => {
    return items
      .map((item) => {
        const daysLeft = calcDaysLeft(item.last_date, item.interval_days);
        const expiryDate = getExpiryDate(item.last_date, item.interval_days);
        const status = getStatusInfo(daysLeft);
        return { ...item, daysLeft, expiryDate, status };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [items]);

  const { expired, expiringSoon, upcoming, ok } = useMemo(() => {
    const exp = [], soon = [], up = [], fine = [];
    for (const i of enriched) {
      if (i.daysLeft <= 0) exp.push(i);
      else if (i.daysLeft <= 30) soon.push(i);
      else if (i.daysLeft <= 90) up.push(i);
      else fine.push(i);
    }
    return { expired: exp, expiringSoon: soon, upcoming: up, ok: fine };
  }, [enriched]);

  const handleRenew = useCallback(async (id) => {
    const date = renewDateMap[id] || todayISO();
    await onUpdateDate(id, date);
    setRenewDateMap((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }, [renewDateMap, onUpdateDate]);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>Powiadomienia</h2>
      <p className={`mb-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Przegląd statusów i alertów wszystkich urządzeń i sprzętu</p>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Razem" value={enriched.length} darkMode={darkMode} color={darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} textColor="text-gray-400" />
        <StatCard label="Przeterminowane" value={expired.length} darkMode={darkMode} color={darkMode ? 'bg-red-900/30 border-red-800' : 'bg-red-50 border-red-200'} textColor="text-red-400" />
        <StatCard label="Wkrótce wygasają" value={expiringSoon.length} darkMode={darkMode} color={darkMode ? 'bg-yellow-900/30 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} textColor="text-yellow-400" />
        <StatCard label="W porządku" value={ok.length + upcoming.length} darkMode={darkMode} color={darkMode ? 'bg-green-900/30 border-green-800' : 'bg-green-50 border-green-200'} textColor="text-green-400" />
      </div>

      {/* Expired section */}
      {expired.length > 0 && (
        <Section title="⚠️ Przeterminowane — wymaga uwagi" darkMode={darkMode} color={darkMode ? 'border-red-500 bg-red-900/20' : 'border-red-400 bg-red-50/50'}>
          {expired.map((item) => (
            <ExpiredCard
              key={item.id}
              item={item}
              darkMode={darkMode}
              renewDate={renewDateMap[item.id] || todayISO()}
              onDateChange={(date) => setRenewDateMap((p) => ({ ...p, [item.id]: date }))}
              onRenew={() => handleRenew(item.id)}
            />
          ))}
        </Section>
      )}

      {/* Expiring soon */}
      {expiringSoon.length > 0 && (
        <Section title="🟡 Wkrótce wygasają (≤ 30 dni)" darkMode={darkMode} color={darkMode ? 'border-yellow-500 bg-yellow-900/20' : 'border-yellow-400 bg-yellow-50/50'}>
          <div className="grid gap-3">
            {expiringSoon.map((item) => (
              <ItemRow key={item.id} item={item} darkMode={darkMode} />
            ))}
          </div>
        </Section>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Section title="🔵 Nadchodzące (≤ 90 dni)" darkMode={darkMode} color={darkMode ? 'border-blue-500 bg-blue-900/20' : 'border-blue-300 bg-blue-50/30'}>
          <div className="grid gap-3">
            {upcoming.map((item) => (
              <ItemRow key={item.id} item={item} darkMode={darkMode} />
            ))}
          </div>
        </Section>
      )}

      {/* OK */}
      {ok.length > 0 && (
        <Section title="✅ Aktualne" darkMode={darkMode} color={darkMode ? 'border-green-500 bg-green-900/20' : 'border-green-300 bg-green-50/30'}>
          <div className="grid gap-3">
            {ok.map((item) => (
              <ItemRow key={item.id} item={item} darkMode={darkMode} />
            ))}
          </div>
        </Section>
      )}

      {enriched.length === 0 && (
        <div className={`text-center py-20 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-5xl mb-4">📋</p>
          <p className="text-lg font-medium">Brak elementów</p>
          <p className="text-sm mt-1">Dodaj urządzenia w zakładce „Baza danych"</p>
        </div>
      )}
    </div>
  );
}

const StatCard = React.memo(function StatCard({ label, value, color, textColor, darkMode }) {
  return (
    <div className={`rounded-xl border p-5 ${color}`}>
      <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
      <p className={`text-3xl font-bold mt-1 ${textColor}`}>{value}</p>
    </div>
  );
});

const Section = React.memo(function Section({ title, color, children, darkMode }) {
  return (
    <div className={`rounded-xl border-l-4 p-5 mb-6 ${color}`}>
      <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{title}</h3>
      {children}
    </div>
  );
});

const ItemRow = React.memo(function ItemRow({ item, darkMode }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 shadow-sm ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-3">
        <span className={`w-2.5 h-2.5 rounded-full ${item.status.dot}`}></span>
        <div>
          <span className={`font-medium ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{item.name}</span>
          <span className={`ml-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.category}</span>
          {item.interval_label && (
            <span className={`ml-2 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>• {item.interval_label}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Wygasa: {formatDate(item.expiryDate)}</span>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.status.color}`}>
          {item.daysLeft > 0 ? `${item.daysLeft} dni` : `${Math.abs(item.daysLeft)} dni temu`}
        </span>
      </div>
    </div>
  );
});

const ExpiredCard = React.memo(function ExpiredCard({ item, renewDate, onDateChange, onRenew, darkMode }) {
  return (
    <div className={`rounded-lg border p-4 mb-3 shadow-sm ${darkMode ? 'bg-gray-800 border-red-800' : 'bg-white border-red-200'}`}>
      <div className="flex items-start justify-between">
        <div>
          <h4 className={`font-semibold text-base ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}>{item.name}</h4>
          <p className={`text-sm mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {item.category} {item.interval_label && `• ${item.interval_label}`}
          </p>
          {item.description && (
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{item.description}</p>
          )}
          <p className="text-sm text-red-600 font-medium mt-2">
            Przeterminowane od {Math.abs(item.daysLeft)} dni (wygasło {formatDate(item.expiryDate)})
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <input
            type="date"
            value={renewDate}
            onChange={(e) => onDateChange(e.target.value)}
            className={`border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-300'}`}
          />
          <button
            onClick={onRenew}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer"
          >
            Odnów
          </button>
        </div>
      </div>
    </div>
  );
});
