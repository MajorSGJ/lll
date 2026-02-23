import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import { fmtPLDate } from '../date';
import type { Shift } from '../types';
import { useConfirm } from '../ui/Confirm';

type BackupExportResponse = {
  ok: boolean;
  backup?: unknown;
  error?: string;
};

export function SettingsView() {
  const { data, reload } = useStore();
  const confirm = useConfirm();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const initialShifts = useMemo<Shift[]>(() => {
    const s = data?.settings;
    const shifts = Array.isArray(s?.shifts) ? (s!.shifts as Shift[]) : [];
    if (shifts.length) return shifts;
    return [
      { id: '1', name: 'Zmiana 1', start: '07:00', end: '15:00' },
      { id: '2', name: 'Zmiana 2', start: '15:00', end: '23:00' },
      { id: '3', name: 'Zmiana 3', start: '23:00', end: '07:00' },
    ];
  }, [data?.settings]);

  const [appName, setAppName] = useState('');
  const [hallName, setHallName] = useState('');
  const [autoDayFocus, setAutoDayFocus] = useState(false);
  const [showWeekends, setShowWeekends] = useState(true);
  const [showHolidays, setShowHolidays] = useState(true);
  const [autoSuggest, setAutoSuggest] = useState(false);
  const [hideInactiveInSelect, setHideInactiveInSelect] = useState(false);
  const [showWeekNumbers, setShowWeekNumbers] = useState(false);
  const [showCoverageReport, setShowCoverageReport] = useState(false);
  const [firstDayOfWeek, setFirstDayOfWeek] = useState<'monday' | 'sunday'>('monday');
  const [defaultView, setDefaultView] = useState<'month' | 'week'>('month');
  const [defaultPrintMode, setDefaultPrintMode] = useState<'cards' | 'table' | 'minimal'>('cards');
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [planningMode, setPlanningMode] = useState<'balanced' | 'strict' | 'lenient'>('balanced');
  const [maxNightShiftsPerWeek, setMaxNightShiftsPerWeek] = useState(3);
  const [maxLoadDifference, setMaxLoadDifference] = useState(2);
  const [blockNightToMorning, setBlockNightToMorning] = useState(false);
  const [showSuccessToasts, setShowSuccessToasts] = useState(true);
  const [showInfoToasts, setShowInfoToasts] = useState(true);
  const [warnDoubleShift, setWarnDoubleShift] = useState(true);
  const [warnUnderstaffed, setWarnUnderstaffed] = useState(true);
  const [exportHoursSummary, setExportHoursSummary] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [overridesCollapsed, setOverridesCollapsed] = useState(true);
  const [disabledDays, setDisabledDays] = useState<number[]>([]);
  const [sundayWorking, setSundayWorking] = useState(true);
  const [saturdayShifts, setSaturdayShifts] = useState<Shift[]>([]);

  // SMTP config
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [smtpSecure, setSmtpSecure] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);

  const dayOverrides = data?.settings?.dayOverrides || {};
  const overrideCount = Object.keys(dayOverrides).length;

  useEffect(() => {
    const s = (data?.settings || {}) as Record<string, unknown>;
    setAppName(String(s.appName || 'ShiftPlanner'));
    setHallName(String(s.hallName || ''));
    setAutoDayFocus(s.autoDayFocus === true);
    setShowWeekends(s.showWeekends !== false);
    setShowHolidays(s.showHolidays !== false);
    setAutoSuggest(s.autoSuggest === true);
    setHideInactiveInSelect(s.hideInactiveInSelect === true);
    setShowWeekNumbers(s.showWeekNumbers === true);
    setShowCoverageReport(s.showCoverageReport === true);
    setFirstDayOfWeek(s.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday');
    setDefaultView(s.defaultView === 'week' ? 'week' : 'month');
    const mode = String(s.defaultPrintMode || 'cards');
    setDefaultPrintMode(mode === 'table' || mode === 'minimal' ? (mode as 'table' | 'minimal') : 'cards');
    setShifts(initialShifts);
    const pm = String(s.planningMode || 'balanced');
    setPlanningMode(pm === 'strict' || pm === 'lenient' ? (pm as 'strict' | 'lenient') : 'balanced');
    const mn = Number(s.maxNightShiftsPerWeek);
    setMaxNightShiftsPerWeek(Number.isFinite(mn) && mn > 0 ? Math.max(1, Math.min(7, Math.floor(mn))) : 3);
    const ml = Number(s.maxLoadDifference);
    setMaxLoadDifference(Number.isFinite(ml) && ml > 0 ? Math.max(1, Math.min(10, Math.floor(ml))) : 2);
    setBlockNightToMorning(s.blockNightToMorning === true);
    setShowSuccessToasts(s.showSuccessToasts !== false);
    setShowInfoToasts(s.showInfoToasts !== false);
    setWarnDoubleShift(s.warnDoubleShift !== false);
    setWarnUnderstaffed(s.warnUnderstaffed !== false);
    setExportHoursSummary(s.exportHoursSummary === true);
    setDebugMode(s.debugMode === true);
    setDisabledDays(Array.isArray(s.disabledDays) ? (s.disabledDays as number[]) : []);
    setSundayWorking(s.sundayWorking !== false);
    setSaturdayShifts(Array.isArray(s.saturdayShifts) ? (s.saturdayShifts as Shift[]) : []);
    const smtp = (s.smtp || {}) as Record<string, unknown>;
    setSmtpHost(String(smtp.host || ''));
    setSmtpPort(String(smtp.port || '587'));
    setSmtpUser(String(smtp.user || ''));
    setSmtpPass(String(smtp.pass || ''));
    setSmtpFrom(String(smtp.from || ''));
    setSmtpSecure(smtp.secure === true);
  }, [data?.settings, initialShifts]);

  function nextShiftId(current: Shift[]) {
    const used = new Set(current.map((x) => String(x.id || '')).filter(Boolean));
    for (let i = 1; i <= 99; i++) {
      const id = String(i);
      if (!used.has(id)) return id;
    }
    return String(used.size + 1);
  }

  async function saveSettings() {
    setErr(null);
    setBusy('saveSettings');
    try {
      const cleanedShifts = shifts
        .map((s) => ({
          id: String(s.id || '').trim(),
          name: String(s.name || '').trim(),
          start: String(s.start || '').trim(),
          end: String(s.end || '').trim(),
        }))
        .filter((s) => s.id && s.name && s.start && s.end);

      if (!cleanedShifts.length) {
        setErr('Brak poprawnych zmian. Uzupełnij ID/Nazwa/Godziny.');
        return;
      }

      const next = {
        ...(data?.settings || {}),
        appName: appName.trim(),
        hallName: hallName.trim(),
        autoDayFocus,
        showWeekends,
        showHolidays,
        autoSuggest,
        hideInactiveInSelect,
        showWeekNumbers,
        showCoverageReport,
        firstDayOfWeek,
        defaultView,
        defaultPrintMode,
        planningMode,
        maxNightShiftsPerWeek,
        maxLoadDifference,
        blockNightToMorning,
        showSuccessToasts,
        showInfoToasts,
        warnDoubleShift,
        warnUnderstaffed,
        exportHoursSummary,
        disabledDays,
        sundayWorking,
        saturdayShifts: saturdayShifts.length > 0 ? saturdayShifts : undefined,
        debugMode,
        shifts: cleanedShifts,
        employeePairs: Array.isArray(data?.settings?.employeePairs) ? data.settings.employeePairs : [],
        smtp: {
          host: smtpHost.trim(),
          port: smtpPort.trim(),
          user: smtpUser.trim(),
          pass: smtpPass,
          from: smtpFrom.trim(),
          secure: smtpSecure,
        },
      };

      const res = await api('settings', 'save', { settings: next });
      if (!res.ok) {
        setErr(res.error || 'settings_save_failed');
        return;
      }
      await reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function doReset(type: 'employees' | 'positions' | 'assignments' | 'all') {
    const ok = await confirm({
      title: 'Reset danych',
      message: `Wykonać reset: ${type}?`,
      confirmText: 'Resetuj',
      cancelText: 'Anuluj',
      variant: 'danger',
    });
    if (!ok) return;
    setErr(null);
    setBusy(`reset:${type}`);
    try {
      const res = await api('reset', 'do', { type });
      if (!res.ok) {
        setErr(res.error || 'reset_failed');
        return;
      }
      await reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  function downloadJsonFile(filename: string, payload: unknown) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function doExport() {
    setErr(null);
    setBusy('export');
    try {
      const json = (await api<BackupExportResponse>('backup', 'export')) as BackupExportResponse;
      if (!json.ok) {
        setErr(json.error || 'backup_export_failed');
        return;
      }
      const date = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const stamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}`;
      downloadJsonFile(`backup_${stamp}.json`, json.backup);
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function doImportFromFile(file: File) {
    setErr(null);
    setBusy('import');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const json = await api('backup', 'import', { backup: parsed as never });
      if (!json.ok) {
        setErr(json.error || 'backup_import_failed');
        return;
      }
      await reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="panel">
      <div className="kpi" style={{ marginBottom: 14 }}>
        <div className="kpiItem"><div className="kpiVal">{shifts.length}</div><div className="kpiLab">Zdefiniowane zmiany</div></div>
        <div className="kpiItem"><div className="kpiVal">{overrideCount}</div><div className="kpiLab">Wyjątki dni</div></div>
        <div className="kpiItem"><div className="kpiVal">{data?.positions?.length || 0}</div><div className="kpiLab">Stanowiska</div></div>
        <div className="kpiItem"><div className="kpiVal">{data?.employees?.length || 0}</div><div className="kpiLab">Pracownicy</div></div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Opcje aplikacji</div>
            <div className="sub">Tutaj zmieniasz globalne zmiany (domyślne). Wyjątki ustawisz w kalendarzu w konkretnym dniu.</div>
          </div>
          <button className="btn primary" type="button" onClick={() => void saveSettings()} disabled={busy !== null}>
            {busy === 'saveSettings' ? 'Zapisywanie…' : 'Zapisz'}
          </button>
        </div>

        <div className="row" style={{ marginTop: 12 }}>
          <div className="field">
            <div className="label">Nazwa aplikacji</div>
            <input className="input" value={appName} onChange={(e) => setAppName(e.target.value)} />
          </div>
          <div className="field">
            <div className="label">Nazwa hali</div>
            <input className="input" value={hallName} onChange={(e) => setHallName(e.target.value)} placeholder="np. 7" />
          </div>
          <div className="field">
            <div className="label">Po kliknięciu dnia</div>
            <select className="select" value={autoDayFocus ? '1' : '0'} onChange={(e) => setAutoDayFocus(e.target.value === '1')}>
              <option value="0">Pokaż kalendarz + obsadę</option>
              <option value="1">Pokaż tylko obsadę dnia</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>Dodatkowe opcje</div>
          <div className="sub">Włącz lub wyłącz dodatkowe funkcje aplikacji.</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showWeekends} onChange={(e) => setShowWeekends(e.target.checked)} />
            <div>
              <div className="label">Pokaż weekendy w kalendarzu</div>
              <div className="sub">Wyświetlaj soboty i niedziele jako aktywne dni</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showHolidays} onChange={(e) => setShowHolidays(e.target.checked)} />
            <div>
              <div className="label">Pokaż święta</div>
              <div className="sub">Wyświetlaj dni świąteczne w kalendarzu</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={autoSuggest} onChange={(e) => setAutoSuggest(e.target.checked)} />
            <div>
              <div className="label">Automatyczne sugestie</div>
              <div className="sub">Sugeruj pracowników przy przypisywaniu</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideInactiveInSelect} onChange={(e) => setHideInactiveInSelect(e.target.checked)} />
            <div>
              <div className="label">Ukryj nieaktywnych w listach</div>
              <div className="sub">Nie pokazuj nieaktywnych pracowników w selectach</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showWeekNumbers} onChange={(e) => setShowWeekNumbers(e.target.checked)} />
            <div>
              <div className="label">Pokaż numery tygodni</div>
              <div className="sub">Wyświetlaj numer tygodnia w kalendarzu</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showCoverageReport} onChange={(e) => setShowCoverageReport(e.target.checked)} />
            <div>
              <div className="label">Raport pokrycia</div>
              <div className="sub">Pokaż raport braków i obciążenia po wygenerowaniu planu</div>
            </div>
          </label>

        </div>

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>Widok kalendarza</div>
          <div className="sub">Ustawienia wyglądu kalendarza.</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div className="field">
            <div className="label">Pierwszy dzień tygodnia</div>
            <select className="select" value={firstDayOfWeek} onChange={(e) => setFirstDayOfWeek(e.target.value as 'monday' | 'sunday')}>
              <option value="monday">Poniedziałek</option>
              <option value="sunday">Niedziela</option>
            </select>
          </div>
          <div className="field">
            <div className="label">Domyślny widok</div>
            <select className="select" value={defaultView} onChange={(e) => setDefaultView(e.target.value as 'month' | 'week')}>
              <option value="month">Miesiąc</option>
              <option value="week">Tydzień</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>📅 Dni pracy i wolne dni</div>
          <div className="sub">Konfiguracja dni roboczych, niedziel i indywidualnych zmian w sobotę.</div>
        </div>

        {/* Sunday working toggle */}
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={sundayWorking} onChange={(e) => {
              setSundayWorking(e.target.checked);
              if (!e.target.checked && !disabledDays.includes(0)) {
                setDisabledDays(prev => [...prev, 0]);
              } else if (e.target.checked) {
                setDisabledDays(prev => prev.filter(d => d !== 0));
              }
            }} />
            <div>
              <div className="label">🟢 Niedziela jest dniem pracy</div>
              <div className="sub">Jeśli wyłączone, niedziela będzie automatycznie wyłączona z planowania zmian</div>
            </div>
          </label>
        </div>

        {/* Disabled days */}
        <div style={{ marginTop: 10 }}>
          <div className="label" style={{ marginBottom: 6 }}>Dni wyłączone z planowania</div>
          <div className="sub" style={{ marginBottom: 8 }}>Zaznacz dni tygodnia, w które nie planujecie zmian. Przydatne np. gdy firma nie pracuje w weekendy.</div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {[
            { day: 1, label: 'Poniedziałek' },
            { day: 2, label: 'Wtorek' },
            { day: 3, label: 'Środa' },
            { day: 4, label: 'Czwartek' },
            { day: 5, label: 'Piątek' },
            { day: 6, label: 'Sobota' },
            { day: 0, label: 'Niedziela' },
          ].map(({ day, label }) => (
            <label key={day} className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 140 }}>
              <input
                type="checkbox"
                checked={disabledDays.includes(day)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setDisabledDays(prev => [...prev, day]);
                    if (day === 0) setSundayWorking(false);
                  } else {
                    setDisabledDays(prev => prev.filter(d => d !== day));
                    if (day === 0) setSundayWorking(true);
                  }
                }}
              />
              <div className="label">{label}</div>
            </label>
          ))}
        </div>

        {/* Saturday individual shifts */}
        <div style={{ marginTop: 14 }}>
          <div className="label" style={{ marginBottom: 4 }}>⚙️ Indywidualne zmiany w sobotę</div>
          <div className="sub" style={{ marginBottom: 8 }}>
            Jeśli sobota ma inne godziny zmian niż reszta tygodnia, zdefiniuj je poniżej.
            Gdy lista jest pusta, sobota używa domyślnych zmian.
          </div>
        </div>
        {saturdayShifts.length > 0 ? (
          <div style={{ marginTop: 4 }}>
            {saturdayShifts.map((sh, idx) => (
              <div key={`sat-${sh.id}-${idx}`} className="card" style={{ marginBottom: 8, padding: 10 }}>
                <div className="row">
                  <div className="field">
                    <div className="label">ID</div>
                    <input className="input" value={sh.id} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <div className="field">
                    <div className="label">Nazwa</div>
                    <input className="input" value={sh.name} onChange={(e) => setSaturdayShifts(prev => prev.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))} />
                  </div>
                  <div className="field">
                    <div className="label">Start</div>
                    <input className="input" value={sh.start} onChange={(e) => setSaturdayShifts(prev => prev.map((x, i) => i === idx ? { ...x, start: e.target.value } : x))} />
                  </div>
                  <div className="field">
                    <div className="label">Koniec</div>
                    <input className="input" value={sh.end} onChange={(e) => setSaturdayShifts(prev => prev.map((x, i) => i === idx ? { ...x, end: e.target.value } : x))} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button className="btn danger" type="button" onClick={() => setSaturdayShifts(prev => prev.filter((_, i) => i !== idx))}>Usuń</button>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn" type="button" onClick={() => setSaturdayShifts(prev => [...prev, { id: nextShiftId(prev), name: 'Sobotnia zmiana', start: '06:00', end: '14:00' }])}>
                + Dodaj zmianę sobotną
              </button>
              <button className="btn" type="button" onClick={() => setSaturdayShifts([])}>
                Użyj domyślnych zmian
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn" type="button" onClick={() => setSaturdayShifts([
              { id: '1', name: 'Zmiana sobotnia', start: '06:00', end: '14:00' },
            ])}>
              + Ustaw indywidualne zmiany sobotnie
            </button>
            <button className="btn" type="button" onClick={() => setSaturdayShifts(shifts.map(s => ({ ...s })))}>
              📋 Skopiuj domyślne zmiany
            </button>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>Algorytm planowania</div>
          <div className="sub">Parametry automatycznego planera zmian.</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <div className="field">
            <div className="label">Max nocnych zmian / tydzień</div>
            <input className="input" type="number" min={1} max={7} value={maxNightShiftsPerWeek} onChange={(e) => setMaxNightShiftsPerWeek(Math.max(1, Math.min(7, parseInt(e.target.value || '0', 10) || 3)))} />
            <div className="sub">Limit nocnych zmian na pracownika w tygodniu</div>
          </div>
          <div className="field">
            <div className="label">Max różnica obciążenia</div>
            <input className="input" type="number" min={1} max={10} value={maxLoadDifference} onChange={(e) => setMaxLoadDifference(Math.max(1, Math.min(10, parseInt(e.target.value || '0', 10) || 2)))} />
            <div className="sub">Ile zmian różnicy tolerujemy między pracownikami</div>
          </div>
          <div className="field">
            <div className="label">Tryb planowania</div>
            <select className="select" value={planningMode} onChange={(e) => setPlanningMode(e.target.value as 'balanced' | 'strict' | 'lenient')}>
              <option value="balanced">Zbalansowany</option>
              <option value="strict">Ścisły (twarde limity)</option>
              <option value="lenient">Elastyczny (miękkie limity)</option>
            </select>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={blockNightToMorning} onChange={(e) => setBlockNightToMorning(e.target.checked)} />
            <div>
              <div className="label">Zakaz sekwencji noc → rano</div>
              <div className="sub">Nie przypisuj zmiany porannej po nocnej</div>
            </div>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>Powiadomienia i alerty</div>
          <div className="sub">Włącz lub wyłącz komunikaty i ostrzeżenia.</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showSuccessToasts} onChange={(e) => setShowSuccessToasts(e.target.checked)} />
            <div>
              <div className="label">Potwierdzenia sukcesu</div>
              <div className="sub">Wyświetlaj komunikaty po pomyślnych operacjach</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={showInfoToasts} onChange={(e) => setShowInfoToasts(e.target.checked)} />
            <div>
              <div className="label">Komunikaty informacyjne</div>
              <div className="sub">Wyświetlaj ogólne powiadomienia</div>
            </div>
          </label>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={warnDoubleShift} onChange={(e) => setWarnDoubleShift(e.target.checked)} />
            <div>
              <div className="label">Ostrzeżenie przy podwójnej zmianie</div>
              <div className="sub">Pokaż alert, gdy pracownik ma 2 zmiany jednego dnia</div>
            </div>
          </label>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={warnUnderstaffed} onChange={(e) => setWarnUnderstaffed(e.target.checked)} />
            <div>
              <div className="label">Ostrzeżenie przy niedoborze</div>
              <div className="sub">Pokaż alert, gdy stanowisko ma mniej osób niż docelowa liczba</div>
            </div>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>Eksport</div>
          <div className="sub">Opcje eksportu danych.</div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={exportHoursSummary} onChange={(e) => setExportHoursSummary(e.target.checked)} />
            <div>
              <div className="label">Dołącz podsumowanie godzin</div>
              <div className="sub">Dodaj sumę godzin pracy w eksportach</div>
            </div>
          </label>
          <div className="field" style={{ minWidth: 260 }}>
            <div className="label">Domyślny tryb wydruku</div>
            <select className="select" value={defaultPrintMode} onChange={(e) => setDefaultPrintMode(e.target.value as 'cards' | 'table' | 'minimal')}>
              <option value="cards">Lista</option>
              <option value="table">Tabela</option>
              <option value="minimal">Minimalistyczne</option>
            </select>
            <div className="sub">Domyślna opcja w oknie „Drukuj"</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="cardTitle" style={{ fontSize: 14 }}>Zmiany (domyślne)</div>
          <div className="sub">ID powinno zostać stałe (A/B/C). Godziny możesz dowolnie zmieniać.</div>

          {/* Shift presets */}
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="sub" style={{ alignSelf: 'center', marginRight: 4 }}>Szablony:</span>
            <button className="btn" type="button" onClick={() => setShifts([
              { id: '1', name: 'Zmiana 1', start: '06:00', end: '14:00' },
              { id: '2', name: 'Zmiana 2', start: '14:00', end: '22:00' },
              { id: '3', name: 'Zmiana 3', start: '22:00', end: '06:00' },
            ])}>3 zmiany (8h)</button>
            <button className="btn" type="button" onClick={() => setShifts([
              { id: '1', name: 'Zmiana dzienna', start: '06:00', end: '18:00' },
              { id: '2', name: 'Zmiana nocna', start: '18:00', end: '06:00' },
            ])}>2 zmiany (12h)</button>
            <button className="btn" type="button" onClick={() => setShifts([
              { id: 'A', name: 'Brygada A', start: '06:00', end: '18:00' },
              { id: 'B', name: 'Brygada B', start: '18:00', end: '06:00' },
              { id: 'C', name: 'Brygada C', start: '06:00', end: '18:00' },
              { id: 'D', name: 'Brygada D', start: '18:00', end: '06:00' },
            ])}>4 brygady (12h)</button>
            <button className="btn" type="button" onClick={() => setShifts([
              { id: '1', name: 'Zmiana 1', start: '06:00', end: '14:00' },
              { id: '2', name: 'Zmiana 2', start: '14:00', end: '22:00' },
              { id: '3', name: 'Zmiana 3', start: '22:00', end: '06:00' },
              { id: 'D', name: 'Zmiana dzienna', start: '07:00', end: '19:00' },
            ])}>3+1 (8h + dzień 12h)</button>
            <button className="btn" type="button" onClick={() => setShifts([
              { id: 'R', name: 'Ranna', start: '06:00', end: '14:00' },
              { id: 'P', name: 'Popołudniowa', start: '14:00', end: '22:00' },
              { id: 'N', name: 'Nocna', start: '22:00', end: '06:00' },
              { id: 'W', name: 'Weekendowa (12h)', start: '06:00', end: '18:00' },
            ])}>3 zmiany + weekend</button>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          {shifts.map((sh, idx) => (
            <div key={`${sh.id}-${idx}`} className="card" style={{ marginBottom: 10, padding: 12 }}>
              <div className="row">
                <div className="field">
                  <div className="label">ID</div>
                  <input className="input" value={sh.id} disabled style={{ opacity: 0.6 }} />
                </div>
                <div className="field">
                  <div className="label">Nazwa</div>
                  <input className="input" value={sh.name} onChange={(e) => setShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
                </div>
                <div className="field">
                  <div className="label">Start</div>
                  <input className="input" value={sh.start} onChange={(e) => setShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, start: e.target.value } : x)))} />
                </div>
                <div className="field">
                  <div className="label">Koniec</div>
                  <input className="input" value={sh.end} onChange={(e) => setShifts((prev) => prev.map((x, i) => (i === idx ? { ...x, end: e.target.value } : x)))} />
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button className="btn danger" type="button" onClick={() => setShifts((prev) => prev.filter((_, i) => i !== idx))}>Usuń</button>
                </div>
              </div>
            </div>
          ))}
          <button className="btn" type="button" onClick={() => setShifts((prev) => [...prev, { id: nextShiftId(prev), name: 'Nowa zmiana', start: '06:00', end: '14:00' }])}>
            + Dodaj zmianę
          </button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader" style={{ cursor: 'pointer' }} onClick={() => setOverridesCollapsed(v => !v)}>
          <div>
            <div className="cardTitle">{overridesCollapsed ? '▶' : '▼'} Wyjątki dni ({overrideCount})</div>
            <div className="sub">Kliknij dzień w kalendarzu → „Zmiany tego dnia". Kliknij nagłówek aby {overridesCollapsed ? 'rozwinąć' : 'zwinąć'}.</div>
          </div>
        </div>
        {!overridesCollapsed && (
          <table className="table" style={{ marginTop: 10 }}>
            <thead><tr><th>Dzień</th><th>Zmiany</th><th></th></tr></thead>
            <tbody>
              {overrideCount ? (
                Object.entries(dayOverrides).sort((a, b) => a[0].localeCompare(b[0])).map(([date, ovShifts]) => (
                  <tr key={date}>
                    <td><strong>{date}</strong><div className="sub">{fmtPLDate(date)}</div></td>
                    <td className="sub">{Array.isArray(ovShifts) ? (ovShifts as Shift[]).map(x => `${x.name} ${x.start}–${x.end}`).join(' · ') : '—'}</td>
                    <td>
                      <button className="btn danger" type="button" disabled={busy !== null} onClick={async () => {
                        const ok = await confirm({
                          title: 'Usuń wyjątek',
                          message: `Usunąć wyjątek dnia ${date} (${fmtPLDate(date)})?`,
                          confirmText: 'Usuń',
                          cancelText: 'Anuluj',
                          variant: 'danger',
                        });
                        if (!ok) return;
                        setErr(null);
                        setBusy(`delOverride:${date}`);
                        try {
                          const res = await api('settings', 'clearDayOverride', { date });
                          if (!res.ok) {
                            setErr(res.error || 'clear_override_failed');
                            return;
                          }
                          await reload();
                        } catch (e) {
                          setErr(String(e));
                        } finally {
                          setBusy(null);
                        }
                      }}>
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="sub">Brak wyjątków.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Kopia zapasowa</div>
            <div className="sub">Eksportuj lub przywróć wszystkie dane aplikacji.</div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12, gap: 10 }}>
          <button className="btn" type="button" onClick={doExport} disabled={busy !== null}>
            📥 {busy === 'export' ? 'Eksport…' : 'Eksportuj kopię'}
          </button>
          <button className="btn" type="button" onClick={() => fileRef.current?.click()} disabled={busy !== null}>
            📤 {busy === 'import' ? 'Import…' : 'Importuj kopię'}
          </button>
          <input ref={fileRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) void doImportFromFile(f); }} />
        </div>
        {err ? <div className="errorBox">{err}</div> : null}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">📧 Konfiguracja e-mail (SMTP)</div>
            <div className="sub">Ustaw dane serwera SMTP, aby móc wysyłać grafik mailem.</div>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 2, minWidth: 180 }}>
              <div className="label">Serwer SMTP</div>
              <input className="input" placeholder="np. smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 80 }}>
              <div className="label">Port</div>
              <input className="input" placeholder="587" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
            </div>
            <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 100 }}>
              <input type="checkbox" checked={smtpSecure} onChange={(e) => setSmtpSecure(e.target.checked)} />
              <div className="label">SSL/TLS</div>
            </label>
          </div>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <div className="label">Login (e-mail)</div>
              <input className="input" placeholder="user@example.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
            </div>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <div className="label">Hasło / App Password</div>
              <input className="input" type="password" placeholder="••••••••" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 400 }}>
            <div className="label">Adres nadawcy (From)</div>
            <input className="input" placeholder="planer@firma.pl (opcjonalnie)" value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} />
            <div className="sub">Jeśli puste, użyje loginu jako nadawcy.</div>
          </div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <button className="btn" type="button" disabled={busy !== null || !smtpHost.trim()} onClick={async () => {
              setSmtpTestResult(null);
              setBusy('smtpTest');
              try {
                await saveSettings();
                const res = await api('email', 'test', { to: smtpFrom.trim() || smtpUser.trim() });
                setSmtpTestResult(res.ok ? '✅ Test wysłany pomyślnie!' : `❌ ${(res as { error?: string }).error || 'Błąd'}`);
              } catch (e) {
                setSmtpTestResult(`❌ ${String(e)}`);
              } finally {
                setBusy(null);
              }
            }}>
              {busy === 'smtpTest' ? 'Wysyłanie…' : '📨 Wyślij testowy e-mail'}
            </button>
            {smtpTestResult && <span style={{ fontSize: 13 }}>{smtpTestResult}</span>}
          </div>
          <div className="sub">Dla Gmail: użyj smtp.gmail.com, port 587, i wygeneruj "App Password" w ustawieniach konta Google.</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Zaawansowane</div>
            <div className="sub">Opcje deweloperskie i diagnostyczne.</div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} />
            <div>
              <div className="label">Tryb debugowania</div>
              <div className="sub">Wyświetla szczegółowe logi w konsoli przeglądarki (F12)</div>
            </div>
          </label>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Zarządzanie danymi</div>
            <div className="sub">Ostrożnie! Te operacje są nieodwracalne.</div>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12, gap: 10, flexWrap: 'wrap' }}>
          <button className="btn" type="button" onClick={() => void doReset('employees')} disabled={busy !== null}>🗑️ Reset pracowników</button>
          <button className="btn" type="button" onClick={() => void doReset('positions')} disabled={busy !== null}>🗑️ Reset stanowisk</button>
          <button className="btn" type="button" onClick={() => void doReset('assignments')} disabled={busy !== null}>🗑️ Reset przypisań</button>
          <button className="btn danger" type="button" onClick={() => void doReset('all')} disabled={busy !== null}>🗑️ Resetuj dane</button>
        </div>
      </div>
    </div>
  );
}
