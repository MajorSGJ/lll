import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, getNotificationPermission, checkAndNotify, resetNotificationThrottle } from '../notifications';

export default function Settings({ settings, categories, controlTypes, toolTypes, onSave, onSaveCategories, onSaveControlTypes, onSaveToolTypes, onExport, onImport }) {
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());
  const [catList, setCatList] = useState([...categories]);
  const [typeList, setTypeList] = useState([...controlTypes]);
  const [ttList, setTtList] = useState((toolTypes || []).map((t) => ({ ...t, params: [...t.params.map((p) => ({ ...p }))] })));
  const [newCat, setNewCat] = useState('');
  const [newType, setNewType] = useState('');
  const [newTtName, setNewTtName] = useState('');
  const [editCatIdx, setEditCatIdx] = useState(null);
  const [editCatVal, setEditCatVal] = useState('');
  const [editTypeIdx, setEditTypeIdx] = useState(null);
  const [editTypeVal, setEditTypeVal] = useState('');
  const [editTtIdx, setEditTtIdx] = useState(null);
  const [editTtVal, setEditTtVal] = useState('');
  const [catSaved, setCatSaved] = useState(false);
  const [typeSaved, setTypeSaved] = useState(false);
  const [ttSaved, setTtSaved] = useState(false);
  const [newParamKey, setNewParamKey] = useState('');

  const d = form.darkMode || false;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    await onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const cardCls = `rounded-xl border shadow-sm p-6 mb-6 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`;
  const headCls = `text-lg font-semibold mb-1 ${d ? 'text-gray-100' : 'text-gray-800'}`;
  const subCls = `text-sm mb-6 ${d ? 'text-gray-500' : 'text-gray-400'}`;
  const labelCls = `block text-sm font-medium mb-1.5 ${d ? 'text-gray-300' : 'text-gray-700'}`;
  const inputCls = `border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${d ? 'bg-gray-700 border-gray-600 text-gray-100' : 'border-gray-200'}`;
  const smallInputCls = `border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${d ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-500' : 'border-gray-200'}`;
  const spanCls = `text-sm ${d ? 'text-gray-400' : 'text-gray-500'}`;
  const hintCls = `text-xs mt-1 ${d ? 'text-gray-500' : 'text-gray-400'}`;
  const itemBg = d ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-700';
  const cancelBtnCls = d ? 'bg-gray-600 text-gray-200' : 'bg-gray-200 text-gray-600';

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className={`text-2xl font-bold mb-2 ${d ? 'text-gray-100' : 'text-gray-800'}`}>Ustawienia</h2>
      <p className={`mb-8 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Konfiguracja powiadomień, wyglądu, eksport i import danych</p>

      {/* Appearance */}
      <div className={cardCls}>
        <h3 className={headCls}>Wygląd</h3>
        <p className={`text-sm mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Wybierz motyw kolorystyczny aplikacji</p>
        <div className="flex items-center justify-between">
          <div>
            <label className={`block text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>
              Ciemny motyw
            </label>
            <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
              Przełącz między jasnym a ciemnym motywem
            </p>
          </div>
          <button
            type="button"
            onClick={() => { handleChange('darkMode', !form.darkMode); }}
            className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.darkMode ? 'bg-primary' : d ? 'bg-gray-600' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.darkMode ? 'translate-x-6' : ''}`} />
          </button>
        </div>
        <div className="mt-4">
          <button onClick={handleSave} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm cursor-pointer">
            Zastosuj motyw
          </button>
        </div>
      </div>

      {/* Notification settings */}
      <div className={cardCls}>
        <h3 className={headCls}>Powiadomienia</h3>
        <p className={subCls}>Ustaw kiedy i jak często mają pojawiać się przypomnienia</p>

        <div className="space-y-6">
          {/* Global toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className={`block text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>Włącz powiadomienia</label>
              <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Całkowicie włącz lub wyłącz wszystkie powiadomienia w aplikacji</p>
            </div>
            <button type="button" onClick={() => handleChange('notificationsEnabled', !form.notificationsEnabled)} className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.notificationsEnabled !== false ? 'bg-primary' : d ? 'bg-gray-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.notificationsEnabled !== false ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          {form.notificationsEnabled === false && (
            <div className={`rounded-lg p-3 text-sm ${d ? 'bg-red-900/30 text-red-300' : 'bg-red-50 text-red-600'}`}>
              Powiadomienia są wyłączone. Nie będziesz otrzymywać żadnych przypomnień.
            </div>
          )}

          {/* Browser permission status */}
          {form.notificationsEnabled !== false && (
            <div className={`rounded-lg border p-4 ${
              notifPerm === 'granted' ? (d ? 'bg-green-900/20 border-green-800 text-green-300' : 'bg-green-50 border-green-200 text-green-700') :
              notifPerm === 'denied' ? (d ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700') :
              (d ? 'bg-yellow-900/20 border-yellow-800 text-yellow-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700')
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {notifPerm === 'granted' ? '✅ Powiadomienia przeglądarkowe włączone' :
                     notifPerm === 'denied' ? '🚫 Powiadomienia zablokowane w przeglądarce' :
                     notifPerm === 'unsupported' ? '❌ Przeglądarka nie wspiera powiadomień' :
                     '🔔 Wymagana zgoda na powiadomienia przeglądarkowe'}
                  </p>
                  <p className={`text-xs mt-1 ${d ? 'opacity-70' : 'opacity-80'}`}>
                    {notifPerm === 'granted' ? 'Będziesz dostawać powiadomienia push na pulpicie gdy zbliżają się terminy przeglądów.' :
                     notifPerm === 'denied' ? 'Odblokuj powiadomienia w ustawieniach przeglądarki (ikona kłódki obok adresu).' :
                     notifPerm === 'unsupported' ? 'Użyj nowoczesnej przeglądarki (Chrome, Firefox, Edge).' :
                     'Kliknij "Włącz powiadomienia" aby otrzymywać alerty o przeglądach na pulpicie.'}
                  </p>
                </div>
                {notifPerm !== 'granted' && notifPerm !== 'denied' && notifPerm !== 'unsupported' && (
                  <button
                    onClick={async () => {
                      const result = await requestNotificationPermission();
                      setNotifPerm(result);
                    }}
                    className="ml-4 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer whitespace-nowrap"
                  >
                    🔔 Włącz powiadomienia
                  </button>
                )}
                {notifPerm === 'granted' && (
                  <button
                    onClick={() => {
                      resetNotificationThrottle();
                      new Notification('Equipment Manager — Test', {
                        body: 'Powiadomienia działają poprawnie! 🎉',
                        tag: 'em-test',
                      });
                    }}
                    className={`ml-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${d ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  >
                    Testuj
                  </button>
                )}
              </div>
            </div>
          )}

          <div className={form.notificationsEnabled === false ? 'opacity-40 pointer-events-none' : ''}>
          <div>
            <label className={labelCls}>Pierwsze powiadomienie przed końcem terminu</label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="24" value={form.notifyMonthsBefore} onChange={(e) => handleChange('notifyMonthsBefore', parseInt(e.target.value) || 1)} className={`w-24 ${inputCls}`} />
              <span className={spanCls}>miesięcy przed wygaśnięciem</span>
            </div>
            <p className={hintCls}>Powiadomienie pojawi się {form.notifyMonthsBefore * 30} dni przed końcem terminu</p>
          </div>

          <div>
            <label className={labelCls}>Codzienne powiadomienia na ile tygodni przed końcem</label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="12" value={form.dailyNotifyWeeksBefore} onChange={(e) => handleChange('dailyNotifyWeeksBefore', parseInt(e.target.value) || 1)} className={`w-24 ${inputCls}`} />
              <span className={spanCls}>tygodni — codzienne powiadomienia</span>
            </div>
            <p className={hintCls}>Na {form.dailyNotifyWeeksBefore * 7} dni przed końcem będziesz dostawać codzienne przypomnienia</p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className={`block text-sm font-medium ${d ? 'text-gray-300' : 'text-gray-700'}`}>Co godzinę w ostatnim dniu</label>
              <p className={`text-xs mt-0.5 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Gdy zostanie ostatni dzień, powiadomienia będą przychodzić co godzinę</p>
            </div>
            <button type="button" onClick={() => handleChange('hourlyNotifyOnLastDay', !form.hourlyNotifyOnLastDay)} className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${form.hourlyNotifyOnLastDay ? 'bg-primary' : d ? 'bg-gray-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.hourlyNotifyOnLastDay ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div>
            <label className={labelCls}>Częstotliwość sprawdzania terminów</label>
            <div className="flex items-center gap-3">
              <input type="number" min="1" max="1440" value={form.notificationCheckMinutes} onChange={(e) => handleChange('notificationCheckMinutes', parseInt(e.target.value) || 30)} className={`w-24 ${inputCls}`} />
              <span className={spanCls}>minut</span>
            </div>
            <p className={hintCls}>Co ile minut aplikacja sprawdza terminy i wysyła powiadomienia (domyślnie 30 min)</p>
          </div>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button onClick={handleSave} className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors shadow-sm cursor-pointer">Zapisz ustawienia</button>
          {saved && <span className="text-sm text-green-600 font-medium animate-pulse">✓ Zapisano</span>}
        </div>
      </div>

      {/* Categories */}
      <div className={cardCls}>
        <h3 className={headCls}>Kategorie</h3>
        <p className={`text-sm mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Dodawaj, edytuj i usuwaj kategorie elementów</p>
        <div className="space-y-2 mb-4">
          {catList.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {editCatIdx === idx ? (
                <>
                  <input type="text" value={editCatVal} onChange={(e) => setEditCatVal(e.target.value)} className={`flex-1 ${smallInputCls}`} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { if (editCatVal.trim()) { const c = [...catList]; c[idx] = editCatVal.trim(); setCatList(c); } setEditCatIdx(null); } if (e.key === 'Escape') setEditCatIdx(null); }} />
                  <button onClick={() => { if (editCatVal.trim()) { const c = [...catList]; c[idx] = editCatVal.trim(); setCatList(c); } setEditCatIdx(null); }} className="px-2 py-1 bg-primary text-white rounded text-xs font-medium cursor-pointer">OK</button>
                  <button onClick={() => setEditCatIdx(null)} className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${cancelBtnCls}`}>Anuluj</button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm rounded-lg px-3 py-1.5 ${itemBg}`}>{cat}</span>
                  <button onClick={() => { setEditCatIdx(idx); setEditCatVal(cat); }} className={`p-1 cursor-pointer ${d ? 'text-gray-400 hover:text-primary' : 'text-gray-400 hover:text-primary'}`} title="Edytuj">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setCatList(catList.filter((_, i) => i !== idx))} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Usuń">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nowa kategoria..." className={`flex-1 ${smallInputCls}`} onKeyDown={(e) => { if (e.key === 'Enter' && newCat.trim()) { setCatList([...catList, newCat.trim()]); setNewCat(''); }}} />
          <button onClick={() => { if (newCat.trim()) { setCatList([...catList, newCat.trim()]); setNewCat(''); } }} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">Dodaj</button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={async () => { await onSaveCategories(catList); setCatSaved(true); setTimeout(() => setCatSaved(false), 2000); }} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm cursor-pointer">Zapisz kategorie</button>
          {catSaved && <span className="text-sm text-green-600 font-medium animate-pulse">✓ Zapisano</span>}
        </div>
      </div>

      {/* Control Types */}
      <div className={cardCls}>
        <h3 className={headCls}>Typy kontroli</h3>
        <p className={`text-sm mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Dodawaj, edytuj i usuwaj typy kontroli (przegląd, kalibracja, itp.)</p>
        <div className="space-y-2 mb-4">
          {typeList.map((type, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {editTypeIdx === idx ? (
                <>
                  <input type="text" value={editTypeVal} onChange={(e) => setEditTypeVal(e.target.value)} className={`flex-1 ${smallInputCls}`} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') { if (editTypeVal.trim()) { const c = [...typeList]; c[idx] = editTypeVal.trim(); setTypeList(c); } setEditTypeIdx(null); } if (e.key === 'Escape') setEditTypeIdx(null); }} />
                  <button onClick={() => { if (editTypeVal.trim()) { const c = [...typeList]; c[idx] = editTypeVal.trim(); setTypeList(c); } setEditTypeIdx(null); }} className="px-2 py-1 bg-primary text-white rounded text-xs font-medium cursor-pointer">OK</button>
                  <button onClick={() => setEditTypeIdx(null)} className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${cancelBtnCls}`}>Anuluj</button>
                </>
              ) : (
                <>
                  <span className={`flex-1 text-sm rounded-lg px-3 py-1.5 ${itemBg}`}>{type}</span>
                  <button onClick={() => { setEditTypeIdx(idx); setEditTypeVal(type); }} className={`p-1 cursor-pointer ${d ? 'text-gray-400 hover:text-primary' : 'text-gray-400 hover:text-primary'}`} title="Edytuj">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setTypeList(typeList.filter((_, i) => i !== idx))} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Usuń">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Nowy typ kontroli..." className={`flex-1 ${smallInputCls}`} onKeyDown={(e) => { if (e.key === 'Enter' && newType.trim()) { setTypeList([...typeList, newType.trim()]); setNewType(''); }}} />
          <button onClick={() => { if (newType.trim()) { setTypeList([...typeList, newType.trim()]); setNewType(''); } }} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">Dodaj</button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={async () => { await onSaveControlTypes(typeList); setTypeSaved(true); setTimeout(() => setTypeSaved(false), 2000); }} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm cursor-pointer">Zapisz typy kontroli</button>
          {typeSaved && <span className="text-sm text-green-600 font-medium animate-pulse">✓ Zapisano</span>}
        </div>
      </div>

      {/* Tool Types */}
      <div className={cardCls}>
        <h3 className={headCls}>Typy narzędzi</h3>
        <p className={`text-sm mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>Definiuj typy narzędzi z parametrami (np. Wiertło — średnica, Długość)</p>
        <div className="space-y-3 mb-4">
          {ttList.map((tt, idx) => (
            <div key={idx} className={`rounded-lg border p-3 ${d ? 'border-gray-600 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {editTtIdx === idx ? (
                  <>
                    <input type="text" value={editTtVal} onChange={(e) => setEditTtVal(e.target.value)} className={`flex-1 ${smallInputCls}`} autoFocus onKeyDown={(e) => { if (e.key === 'Enter' && editTtVal.trim()) { const c = [...ttList]; c[idx] = { ...c[idx], name: editTtVal.trim() }; setTtList(c); setEditTtIdx(null); } if (e.key === 'Escape') setEditTtIdx(null); }} />
                    <button onClick={() => { if (editTtVal.trim()) { const c = [...ttList]; c[idx] = { ...c[idx], name: editTtVal.trim() }; setTtList(c); } setEditTtIdx(null); }} className="px-2 py-1 bg-primary text-white rounded text-xs font-medium cursor-pointer">OK</button>
                    <button onClick={() => setEditTtIdx(null)} className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${cancelBtnCls}`}>Anuluj</button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm font-semibold ${d ? 'text-gray-200' : 'text-gray-700'}`}>{tt.name}</span>
                    <button onClick={() => { setEditTtIdx(idx); setEditTtVal(tt.name); }} className={`p-1 cursor-pointer ${d ? 'text-gray-400 hover:text-primary' : 'text-gray-400 hover:text-primary'}`} title="Edytuj nazwę">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setTtList(ttList.filter((_, i) => i !== idx))} className="p-1 text-gray-400 hover:text-red-500 cursor-pointer" title="Usuń typ">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </>
                )}
              </div>
              {/* Params list */}
              <div className="ml-2 space-y-1.5">
                {tt.params.map((p, pIdx) => (
                  <div key={pIdx} className="flex items-center gap-2">
                    <span className={`text-xs min-w-[80px] ${d ? 'text-gray-400' : 'text-gray-500'}`}>• {p.key}</span>
                    <span className={`text-xs ${d ? 'text-gray-500' : 'text-gray-400'}`}>=</span>
                    <input
                      type="text"
                      value={p.value}
                      onChange={(e) => {
                        const c = [...ttList];
                        const newParams = [...c[idx].params];
                        newParams[pIdx] = { ...newParams[pIdx], value: e.target.value };
                        c[idx] = { ...c[idx], params: newParams };
                        setTtList(c);
                      }}
                      placeholder="domyślna wartość..."
                      className={`flex-1 text-xs ${smallInputCls}`}
                    />
                    <button onClick={() => { const c = [...ttList]; c[idx] = { ...c[idx], params: c[idx].params.filter((_, i) => i !== pIdx) }; setTtList(c); }} className="p-0.5 text-gray-400 hover:text-red-500 cursor-pointer" title="Usuń parametr">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    placeholder="Nowy parametr..."
                    className={`flex-1 text-xs ${smallInputCls}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.target.value.trim()) {
                        const c = [...ttList];
                        c[idx] = { ...c[idx], params: [...c[idx].params, { key: e.target.value.trim(), value: '' }] };
                        setTtList(c);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      const input = e.target.closest('div').querySelector('input');
                      if (input && input.value.trim()) {
                        const c = [...ttList];
                        c[idx] = { ...c[idx], params: [...c[idx].params, { key: input.value.trim(), value: '' }] };
                        setTtList(c);
                        input.value = '';
                      }
                    }}
                    className="px-2 py-0.5 bg-primary text-white rounded text-xs font-medium cursor-pointer"
                  >+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={newTtName} onChange={(e) => setNewTtName(e.target.value)} placeholder="Nowy typ narzędzia..." className={`flex-1 ${smallInputCls}`} onKeyDown={(e) => { if (e.key === 'Enter' && newTtName.trim()) { setTtList([...ttList, { name: newTtName.trim(), params: [] }]); setNewTtName(''); }}} />
          <button onClick={() => { if (newTtName.trim()) { setTtList([...ttList, { name: newTtName.trim(), params: [] }]); setNewTtName(''); } }} className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors cursor-pointer">Dodaj</button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={async () => { await onSaveToolTypes(ttList); setTtSaved(true); setTimeout(() => setTtSaved(false), 2000); }} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark transition-colors shadow-sm cursor-pointer">Zapisz typy narzędzi</button>
          {ttSaved && <span className="text-sm text-green-600 font-medium animate-pulse">✓ Zapisano</span>}
        </div>
      </div>

      {/* Import / Export */}
      <div className={cardCls}>
        <h3 className={headCls}>Dane</h3>
        <p className={subCls}>Eksportuj lub importuj bazę danych (format JSON)</p>
        <div className="flex gap-3">
          <button onClick={onExport} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
            Eksportuj bazę
          </button>
          <button onClick={onImport} className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${d ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M17 8l-5-5-5 5M12 3v12" /></svg>
            Importuj bazę
          </button>
        </div>
        <p className={hintCls}>⚠️ Import zastąpi wszystkie istniejące dane. Zalecamy najpierw wyeksportować kopię zapasową.</p>
      </div>

      {/* Info */}
      <div className={cardCls}>
        <h3 className={headCls}>Informacje</h3>
        <div className={`text-sm space-y-1 mt-3 ${d ? 'text-gray-400' : 'text-gray-500'}`}>
          <p><strong>Wersja:</strong> 2.0.0</p>
          <p><strong>Aplikacja webowa</strong> — działa w przeglądarce</p>
        </div>
      </div>
    </div>
  );
}
