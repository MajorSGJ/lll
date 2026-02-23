import React, { useState } from 'react';
import { todayISO } from '../utils/dates';

const INTERVAL_PRESETS = [
  { label: '1 miesiąc', days: 30 },
  { label: '3 miesiące', days: 90 },
  { label: '6 miesięcy', days: 180 },
  { label: '1 rok', days: 365 },
  { label: '2 lata', days: 730 },
  { label: '3 lata', days: 1095 },
  { label: '5 lat', days: 1825 },
];

export default function ItemForm({ item, categories, controlTypes, toolTypes, darkMode, onSave, onClose }) {
  const d = darkMode;
  const [form, setForm] = useState({
    name: item?.name || '',
    nr_narzedzia: item?.nr_narzedzia || '',
    description: item?.description || '',
    category: item?.category || categories[0],
    assigned_to: item?.assigned_to || '',
    tool_type: item?.tool_type || '',
    tool_params: item?.tool_params || {},
    last_date: item?.last_date || todayISO(),
    interval_days: item?.interval_days || 365,
    interval_label: item?.interval_label || (controlTypes.length > 0 ? controlTypes[0] : ''),
    notifications_enabled: item?.notifications_enabled !== undefined ? !!item.notifications_enabled : true,
  });

  const [customDays, setCustomDays] = useState(
    INTERVAL_PRESETS.some((p) => p.days === form.interval_days) ? '' : String(form.interval_days)
  );

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToolTypeChange = (typeName) => {
    const tt = (toolTypes || []).find((t) => t.name === typeName);
    const params = {};
    if (tt) {
      tt.params.forEach((p) => {
        params[p.key] = form.tool_params?.[p.key] || p.value || '';
      });
    }
    setForm((prev) => ({ ...prev, tool_type: typeName, tool_params: params }));
  };

  const getParamDefault = (key) => {
    const tt = (toolTypes || []).find((t) => t.name === form.tool_type);
    if (!tt) return '';
    const p = tt.params.find((p) => p.key === key);
    return p?.value || '';
  };

  const handleParamChange = (key, value) => {
    setForm((prev) => ({ ...prev, tool_params: { ...prev.tool_params, [key]: value } }));
  };

  const selectedToolType = (toolTypes || []).find((t) => t.name === form.tool_type);

  const handlePreset = (days) => {
    setForm((prev) => ({ ...prev, interval_days: days }));
    setCustomDays('');
  };

  const handleCustomDays = (val) => {
    setCustomDays(val);
    const num = parseInt(val);
    if (!isNaN(num) && num > 0) {
      setForm((prev) => ({ ...prev, interval_days: num }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.last_date || form.interval_days <= 0) return;
    onSave({ ...form, id: item?.id });
  };

  const inputCls = `w-full border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${d ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'border-gray-200'}`;
  const labelCls = `block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`;
  const chipOff = d ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-primary hover:text-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto ${d ? 'bg-gray-800' : 'bg-white'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`px-6 py-5 border-b ${d ? 'border-gray-700' : 'border-gray-100'}`}>
          <h3 className={`text-lg font-bold ${d ? 'text-gray-100' : 'text-gray-800'}`}>
            {item ? 'Edytuj element' : 'Dodaj nowy element'}
          </h3>
          <p className={`text-sm mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
            {item ? 'Zaktualizuj dane elementu' : 'Wprowadź dane nowego urządzenia lub sprzętu'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Nazwa *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="np. Gaśnica hala A, Tokarka CNC-01..."
              className={inputCls}
              required
              autoFocus
            />
          </div>

          {/* Nr narzędzia */}
          <div>
            <label className={labelCls}>Nr narzędzia</label>
            <input
              type="text"
              value={form.nr_narzedzia}
              onChange={(e) => handleChange('nr_narzedzia', e.target.value)}
              placeholder="np. N-001, W-042..."
              className={inputCls}
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Opis</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Opcjonalny opis, numer seryjny, lokalizacja..."
              rows={2}
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Category */}
          <div>
            <label className={labelCls}>Kategoria</label>
            <select
              value={form.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`${inputCls} cursor-pointer`}
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Assigned to */}
          <div>
            <label className={labelCls}>Przypisany do</label>
            <input
              type="text"
              value={form.assigned_to}
              onChange={(e) => handleChange('assigned_to', e.target.value)}
              placeholder="np. Piotr / Hala H7 / Magazyn A..."
              className={inputCls}
            />
          </div>

          {/* Tool type + params */}
          {(toolTypes || []).length > 0 && (
            <div>
              <label className={labelCls}>Typ narzędzia</label>
              <select
                value={form.tool_type}
                onChange={(e) => handleToolTypeChange(e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">-- brak --</option>
                {toolTypes.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
              {selectedToolType && selectedToolType.params.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className={`text-xs font-medium ${d ? 'text-gray-400' : 'text-gray-500'}`}>Parametry:</p>
                  {selectedToolType.params.map((p) => {
                    const defVal = getParamDefault(p.key);
                    const curVal = form.tool_params?.[p.key] || '';
                    const isOverridden = curVal && defVal && curVal !== defVal;
                    return (
                      <div key={p.key} className="flex items-center gap-2">
                        <span className={`text-sm min-w-[100px] ${d ? 'text-gray-400' : 'text-gray-500'}`}>{p.key}:</span>
                        <input
                          type="text"
                          value={curVal}
                          onChange={(e) => handleParamChange(p.key, e.target.value)}
                          placeholder={defVal ? `domyślnie: ${defVal}` : `np. ${p.key.toLowerCase()}...`}
                          className={`flex-1 ${inputCls.replace('w-full ', '')} ${isOverridden ? 'ring-1 ring-yellow-400' : ''}`}
                        />
                        {isOverridden && (
                          <button type="button" onClick={() => handleParamChange(p.key, defVal)} className="text-xs text-yellow-500 hover:text-yellow-400 cursor-pointer whitespace-nowrap" title="Przywróć domyślną">↩</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Control type */}
          <div>
            <label className={labelCls}>Typ kontroli</label>
            <div className="flex flex-wrap gap-2">
              {controlTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleChange('interval_label', type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    form.interval_label === type
                      ? 'bg-primary text-white border-primary'
                      : chipOff
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Last date */}
          <div>
            <label className={labelCls}>
              Data ostatniego {form.interval_label?.toLowerCase() || 'przeglądu'} *
            </label>
            <input
              type="date"
              value={form.last_date}
              onChange={(e) => handleChange('last_date', e.target.value)}
              className={inputCls}
              required
            />
          </div>

          {/* Interval */}
          <div>
            <label className={labelCls}>
              Okres między kontrolami *
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {INTERVAL_PRESETS.map((preset) => (
                <button
                  key={preset.days}
                  type="button"
                  onClick={() => handlePreset(preset.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    form.interval_days === preset.days && !customDays
                      ? 'bg-primary text-white border-primary'
                      : chipOff
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customDays}
                onChange={(e) => handleCustomDays(e.target.value)}
                placeholder="Lub podaj liczbę dni..."
                min="1"
                className={`flex-1 ${inputCls.replace('w-full ', '')}`}
              />
              <span className={`text-sm ${d ? 'text-gray-500' : 'text-gray-400'}`}>dni</span>
            </div>
            <p className={`text-xs mt-1.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
              Aktualnie: {form.interval_days} dni ({Math.round(form.interval_days / 30.44 * 10) / 10} mies.)
            </p>
          </div>

          {/* Notifications toggle */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!form.notifications_enabled}
                onChange={(e) => handleChange('notifications_enabled', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer accent-[var(--color-primary)]"
              />
              <div>
                <span className={`text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>Powiadomienia</span>
                <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Włącz lub wyłącz powiadomienia dla tego elementu</p>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className={`flex items-center justify-end gap-3 pt-3 border-t ${d ? 'border-gray-700' : 'border-gray-100'}`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${d ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm cursor-pointer"
            >
              {item ? 'Zapisz zmiany' : 'Dodaj'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
