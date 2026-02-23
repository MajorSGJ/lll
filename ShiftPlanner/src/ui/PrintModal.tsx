import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { Modal } from './Modal';
import { buildPrintDayHtml, buildPrintEmployeeHtml, buildPrintFullHtml, openPrintPreview, buildCsvFull, buildCsvDay, buildCsvEmployee, downloadCsv } from '../print';
import type { PrintMode, PrintGrouping } from '../print';
import { monthStartISO } from '../date';
import { useAlert } from './Confirm';

function fullName(e: { name?: string; surname?: string }) {
  return `${e.name || ''} ${e.surname || ''}`.trim();
}

function getWeekStart(todayISO: string, firstDayOfWeek: 'monday' | 'sunday') {
  const d = new Date(todayISO + 'T00:00:00');
  const dow = d.getDay();
  const diff = firstDayOfWeek === 'sunday' ? -dow : (dow === 0 ? -6 : 1 - dow);
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function PrintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, schedule } = useStore();
  const alert = useAlert();
  const settings = data?.settings;
  const firstDayOfWeek: 'monday' | 'sunday' = settings?.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday';

  const defaultMode = (settings?.defaultPrintMode === 'table' || settings?.defaultPrintMode === 'minimal')
    ? settings.defaultPrintMode
    : 'cards';

  const [range, setRange] = useState<'week' | 'month'>('week');
  const [startISO, setStartISO] = useState<string>(() => getWeekStart(schedule.selectedDate, 'monday'));
  const [modeFull, setModeFull] = useState<PrintMode>(defaultMode as PrintMode);
  const [hideEmptyFull, setHideEmptyFull] = useState(false);
  const [groupingFull, setGroupingFull] = useState<PrintGrouping>('days');

  const [dayISO, setDayISO] = useState(schedule.selectedDate);
  const [modeDay, setModeDay] = useState<PrintMode>(defaultMode as PrintMode);
  const [hideEmptyDay, setHideEmptyDay] = useState(false);

  // Employee print state
  const [empId, setEmpId] = useState<string>('');
  const [empRange, setEmpRange] = useState<'week' | 'month'>('week');
  const [empStartISO, setEmpStartISO] = useState<string>(() => getWeekStart(schedule.selectedDate, 'monday'));
  const [groupingEmp, setGroupingEmp] = useState<PrintGrouping>('days');

  const employees = useMemo(() => {
    return (data?.employees || [])
      .filter((e) => e.active !== false)
      .sort((a, b) => fullName(a).localeCompare(fullName(b), 'pl'));
  }, [data?.employees]);

  const can = !!data;

  const monthISO = useMemo(() => monthStartISO(dayISO), [dayISO]);

  useEffect(() => {
    if (!open) return;
    const dm: PrintMode = (defaultMode === 'table' || defaultMode === 'minimal') ? (defaultMode as PrintMode) : 'cards';
    setModeFull(dm);
    setModeDay(dm);
    setDayISO(schedule.selectedDate);
    setStartISO(range === 'month' ? monthStartISO(schedule.selectedDate) : getWeekStart(schedule.selectedDate, firstDayOfWeek));
  }, [open, defaultMode, schedule.selectedDate, range, firstDayOfWeek]);

  useEffect(() => {
    if (!open) return;
    setStartISO(range === 'month' ? monthStartISO(dayISO) : getWeekStart(dayISO, firstDayOfWeek));
  }, [range, open, dayISO, firstDayOfWeek]);

  return (
    <Modal open={open} title="Drukuj" onClose={onClose}>
      {!can ? (
        <div className="muted">Brak danych.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          <div className="card2">
            <div className="label">Drukuj cały grafik</div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <div>
                <div className="label">Zakres</div>
                <select className="input" value={range} onChange={(e) => setRange(e.target.value as any)}>
                  <option value="week">Tydzień</option>
                  <option value="month">Miesiąc</option>
                </select>
              </div>
              <div>
                <div className="label">Początek</div>
                <input className="input" type="date" value={startISO} onChange={(e) => setStartISO(e.target.value)} />
              </div>
              <div>
                <div className="label">Tryb</div>
                <select className="input" value={modeFull} onChange={(e) => setModeFull(e.target.value as any)}>
                  <option value="cards">Lista</option>
                  <option value="table">Tabela</option>
                  <option value="minimal">Minimalistyczne</option>
                </select>
              </div>
              <div>
                <div className="label">Grupowanie</div>
                <select className="input" value={groupingFull} onChange={(e) => setGroupingFull(e.target.value as PrintGrouping)}>
                  <option value="days">Dniami</option>
                  <option value="weeks">Tygodniami</option>
                </select>
              </div>
              <label className="row" style={{ alignItems: 'center', gap: 10, paddingTop: 18 }}>
                <input type="checkbox" checked={hideEmptyFull} onChange={(e) => setHideEmptyFull(e.target.checked)} />
                <div>
                  <div className="label">Nie pokazuj pustych stanowisk</div>
                  <div className="muted">Jeśli na stanowisku nikt nie jest przypisany, nie drukuj wiersza</div>
                </div>
              </label>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const csv = buildCsvFull({
                    range,
                    startISO,
                    settings: data!.settings,
                    positions: data!.positions,
                    employees: data!.employees,
                    assignments: data!.assignments,
                    hideEmptyPositions: hideEmptyFull,
                  });
                  downloadCsv(csv, `grafik_${startISO}.csv`);
                }}
              >
                📊 Eksport Excel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  const html = buildPrintFullHtml({
                    range,
                    startISO,
                    options: { mode: modeFull, hideEmptyPositions: hideEmptyFull, grouping: groupingFull },
                    settings: data!.settings,
                    positions: data!.positions,
                    employees: data!.employees,
                    assignments: data!.assignments,
                  });
                  const ok = openPrintPreview(html);
                  if (!ok) void alert({ title: 'Druk', message: 'Nie udało się otworzyć podglądu druku. Sprawdź blokadę wyskakujących okien.', variant: 'danger' });
                }}
              >
                Otwórz podgląd druku
              </button>
            </div>
          </div>

          <div className="card2">
            <div className="label">Drukuj grafik pracownika</div>
            <div className="sub" style={{ marginBottom: 10 }}>Zakres: tydzień lub miesiąc. Zawiera dni, zmiany i stanowiska.</div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <div>
                <div className="label">Pracownik</div>
                <select className="input" value={empId} onChange={(e) => setEmpId(e.target.value)}>
                  <option value="">— wybierz —</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{fullName(e)}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="label">Zakres</div>
                <select className="input" value={empRange} onChange={(e) => setEmpRange(e.target.value as any)}>
                  <option value="week">Tydzień</option>
                  <option value="month">Miesiąc</option>
                </select>
              </div>
              <div>
                <div className="label">Początek (poniedziałek lub 1. dzień miesiąca)</div>
                <input className="input" type="date" value={empStartISO} onChange={(e) => setEmpStartISO(e.target.value)} />
              </div>
              <div>
                <div className="label">Grupowanie</div>
                <select className="input" value={groupingEmp} onChange={(e) => setGroupingEmp(e.target.value as PrintGrouping)}>
                  <option value="days">Dniami</option>
                  <option value="weeks">Tygodniami</option>
                </select>
              </div>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
              <button
                className="btn"
                type="button"
                disabled={!empId}
                onClick={() => {
                  if (!empId) return;
                  const csv = buildCsvEmployee({
                    employeeId: empId,
                    range: empRange,
                    startISO: empStartISO,
                    settings: data!.settings,
                    positions: data!.positions,
                    employees: data!.employees,
                    assignments: data!.assignments,
                  });
                  const emp = data!.employees.find(e => String(e.id) === empId);
                  const empLabel = emp ? `${emp.name}_${emp.surname}` : empId;
                  downloadCsv(csv, `grafik_${empLabel}_${empStartISO}.csv`);
                }}
              >
                📊 Eksport Excel
              </button>
              <button
                className="btn primary"
                type="button"
                disabled={!empId}
                onClick={() => {
                  if (!empId) return;
                  const html = buildPrintEmployeeHtml({
                    employeeId: empId,
                    range: empRange,
                    startISO: empStartISO,
                    settings: data!.settings,
                    positions: data!.positions,
                    employees: data!.employees,
                    assignments: data!.assignments,
                    grouping: groupingEmp,
                  });
                  const ok = openPrintPreview(html);
                  if (!ok) void alert({ title: 'Druk', message: 'Nie udało się otworzyć podglądu druku. Sprawdź blokadę wyskakujących okien.', variant: 'danger' });
                }}
              >
                Otwórz podgląd druku
              </button>
            </div>
          </div>

          <div className="card2">
            <div className="label">Drukuj jeden dzień</div>
            <div className="grid2" style={{ marginTop: 10 }}>
              <div>
                <div className="label">Dzień</div>
                <input className="input" type="date" value={dayISO} onChange={(e) => setDayISO(e.target.value)} />
                <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Miesiąc: {monthISO}</div>
              </div>
              <div>
                <div className="label">Tryb</div>
                <select className="input" value={modeDay} onChange={(e) => setModeDay(e.target.value as any)}>
                  <option value="cards">Lista</option>
                  <option value="table">Tabela</option>
                  <option value="minimal">Minimalistyczne</option>
                </select>
              </div>
              <label className="row" style={{ alignItems: 'center', gap: 10, paddingTop: 18 }}>
                <input type="checkbox" checked={hideEmptyDay} onChange={(e) => setHideEmptyDay(e.target.checked)} />
                <div>
                  <div className="label">Nie pokazuj pustych stanowisk</div>
                  <div className="muted">Jeśli na stanowisku nikt nie jest przypisany, nie drukuj wiersza</div>
                </div>
              </label>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 10, gap: 8 }}>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  const csv = buildCsvDay({
                    dateISO: dayISO,
                    settings: data!.settings,
                    positions: data!.positions,
                    employees: data!.employees,
                    assignments: data!.assignments,
                    hideEmptyPositions: hideEmptyDay,
                  });
                  downloadCsv(csv, `grafik_${dayISO}.csv`);
                }}
              >
                📊 Eksport Excel
              </button>
              <button
                className="btn primary"
                type="button"
                onClick={() => {
                  const html = buildPrintDayHtml({
                    dateISO: dayISO,
                    options: { mode: modeDay, hideEmptyPositions: hideEmptyDay },
                    settings: data!.settings,
                    positions: data!.positions,
                    employees: data!.employees,
                    assignments: data!.assignments,
                  });
                  const ok = openPrintPreview(html);
                  if (!ok) void alert({ title: 'Druk', message: 'Nie udało się otworzyć podglądu druku. Sprawdź blokadę wyskakujących okien.', variant: 'danger' });
                }}
              >
                Otwórz podgląd druku
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
