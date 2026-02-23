import React, { useState } from 'react';
import { calcDaysLeft, getExpiryDate, formatDate, getStatusInfo } from '../utils/dates';

export default function ItemCardPage({ item, toolTypes, darkMode, onUpdate, onBack }) {
  const d = darkMode;

  const daysLeft = calcDaysLeft(item.last_date, item.interval_days);
  const expiryDate = getExpiryDate(item.last_date, item.interval_days);
  const status = getStatusInfo(daysLeft);

  const ttDef = (toolTypes || []).find((t) => t.name === item.tool_type);
  const allParamKeys = ttDef ? ttDef.params.map((p) => p.key) : Object.keys(item.tool_params || {});
  const getDefault = (key) => {
    if (!ttDef) return '';
    const p = ttDef.params.find((pp) => pp.key === key);
    return p?.value || '';
  };

  const [editParams, setEditParams] = useState(() => {
    const map = {};
    allParamKeys.forEach((key) => {
      const itemVal = (item.tool_params || {})[key];
      const defVal = getDefault(key);
      map[key] = itemVal !== undefined && itemVal !== '' ? itemVal : defVal;
    });
    return map;
  });
  const [paramSaved, setParamSaved] = useState(false);

  const handleParamSave = async () => {
    await onUpdate({ ...item, tool_params: { ...editParams } });
    setParamSaved(true);
    setTimeout(() => setParamSaved(false), 2000);
  };

  const hasChanges = allParamKeys.some((key) => {
    const saved = (item.tool_params || {})[key] || getDefault(key);
    return (editParams[key] || '') !== (saved || '');
  });

  const inputCls = `border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${d ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'border-gray-200'}`;
  const thCls = `text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider ${d ? 'text-gray-400 bg-gray-800/80' : 'text-gray-500 bg-gray-50'}`;
  const tdCls = `px-4 py-3 text-sm ${d ? 'text-gray-200' : 'text-gray-700'}`;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className={`flex items-center gap-2 mb-6 text-sm font-medium cursor-pointer transition-colors ${d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Powrót do bazy danych
      </button>

      {/* Header info */}
      <div className={`rounded-xl border shadow-sm p-6 mb-6 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-800'}`}>{item.name}</h2>
            {item.nr_narzedzia && (
              <p className={`text-sm font-mono mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Nr: {item.nr_narzedzia}</p>
            )}
            {item.description && (
              <p className={`text-sm mt-2 ${d ? 'text-gray-400' : 'text-gray-500'}`}>{item.description}</p>
            )}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${status.color}`}>
            {daysLeft > 0 ? `${daysLeft} dni` : daysLeft === 0 ? 'Dziś' : `${Math.abs(daysLeft)} dni temu`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">
          <InfoCell label="Kategoria" value={item.category} d={d} />
          <InfoCell label="Przypisany do" value={item.assigned_to || '—'} d={d} />
          <InfoCell label="Typ kontroli" value={item.interval_label || '—'} d={d} />
          <InfoCell label="Okres" value={`${item.interval_days} dni`} d={d} />
          <InfoCell label="Ostatnia data" value={formatDate(item.last_date)} d={d} />
          <InfoCell label="Wygasa" value={formatDate(expiryDate)} d={d} />
        </div>
      </div>

      {/* Tool type + params table */}
      {item.tool_type ? (
        <div className={`rounded-xl border shadow-sm overflow-hidden ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div className={`px-6 py-4 border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <h3 className={`text-lg font-semibold ${d ? 'text-gray-100' : 'text-gray-800'}`}>{item.tool_type}</h3>
            <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Parametry typu narzędzia</p>
          </div>

          {allParamKeys.length > 0 ? (
            <>
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
                    <th className={thCls}>Parametr</th>
                    <th className={thCls}>Wartość</th>
                    <th className={`${thCls} w-10`}></th>
                  </tr>
                </thead>
                <tbody>
                  {allParamKeys.map((key) => {
                    const defVal = getDefault(key);
                    const curVal = editParams[key] || '';
                    const isOverridden = defVal && curVal && curVal !== defVal;
                    return (
                      <tr key={key} className={`border-b ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-50 hover:bg-gray-50'}`}>
                        <td className={tdCls}>
                          <span className="font-medium">{key}</span>
                          {defVal && (
                            <span className={`ml-2 text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>(domyślnie: {defVal})</span>
                          )}
                        </td>
                        <td className={tdCls}>
                          <input
                            type="text"
                            value={curVal}
                            onChange={(e) => setEditParams((prev) => ({ ...prev, [key]: e.target.value }))}
                            placeholder={defVal ? `domyślnie: ${defVal}` : 'wartość...'}
                            className={`w-full ${inputCls} ${isOverridden ? 'ring-1 ring-yellow-400' : ''}`}
                          />
                        </td>
                        <td className="px-2 py-3">
                          {isOverridden && (
                            <button
                              type="button"
                              onClick={() => setEditParams((prev) => ({ ...prev, [key]: defVal }))}
                              className="text-sm text-yellow-500 hover:text-yellow-400 cursor-pointer"
                              title="Przywróć domyślną"
                            >↩</button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className={`px-6 py-4 flex items-center gap-3 ${d ? 'border-t border-gray-700' : 'border-t border-gray-100'}`}>
                <button
                  onClick={handleParamSave}
                  disabled={!hasChanges}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${hasChanges ? 'bg-primary text-white hover:bg-primary-dark' : d ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                >
                  Zapisz parametry
                </button>
                {paramSaved && <span className="text-sm text-green-500 font-medium animate-pulse">✓ Zapisano</span>}
                {hasChanges && <span className={`text-xs ${d ? 'text-yellow-400' : 'text-yellow-600'}`}>• wyjątek dla tego elementu</span>}
              </div>
            </>
          ) : (
            <div className={`px-6 py-8 text-center ${d ? 'text-gray-500' : 'text-gray-400'}`}>
              <p className="text-sm">Ten typ narzędzia nie ma zdefiniowanych parametrów</p>
            </div>
          )}
        </div>
      ) : (
        <div className={`rounded-xl border shadow-sm p-8 text-center ${d ? 'bg-gray-800 border-gray-700 text-gray-500' : 'bg-white border-gray-100 text-gray-400'}`}>
          <p className="text-lg mb-1">Brak typu narzędzia</p>
          <p className="text-sm">Przypisz typ narzędzia w edycji elementu, aby zobaczyć parametry</p>
        </div>
      )}
    </div>
  );
}

function InfoCell({ label, value, d }) {
  return (
    <div>
      <p className={`text-xs font-medium ${d ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-sm font-medium mt-0.5 ${d ? 'text-gray-200' : 'text-gray-700'}`}>{value}</p>
    </div>
  );
}
