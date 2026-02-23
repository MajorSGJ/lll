import type { Assignment, Employee, Position, Settings } from './types';
import { effectiveShiftsForDate, getAssignment, getEmployeeIdsFromAssignment } from './assignments';
import { parseISODate, toISODate } from './date';

function escapeHtml(s: unknown) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function fmtPLDate(iso: string) {
  try {
    const d = parseISODate(iso);
    return d.toLocaleDateString('pl-PL', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

function fullName(e: Employee) {
  return `${e.name || ''} ${e.surname || ''}`.trim();
}

function listDays(range: 'week' | 'month', startISO: string) {
  const start = parseISODate(startISO);
  const days: Date[] = [];
  if (range === 'week') {
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
  } else {
    const y = start.getFullYear();
    const m = start.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    for (let d = 1; d <= last; d++) days.push(new Date(y, m, d));
  }
  return days.map(toISODate);
}

export type PrintGrouping = 'days' | 'weeks';

function groupByWeek(days: string[], firstDayOfWeek: 'monday' | 'sunday' = 'monday'): string[][] {
  if (!days.length) return [];
  const weeks: string[][] = [];
  let current: string[] = [];
  let currentWeekStart = '';

  for (const iso of days) {
    const d = parseISODate(iso);
    const dow = d.getDay();
    const diff = firstDayOfWeek === 'sunday' ? -dow : (dow === 0 ? -6 : 1 - dow);
    const ws = new Date(d);
    ws.setDate(d.getDate() + diff);
    const wsISO = toISODate(ws);
    if (wsISO !== currentWeekStart) {
      if (current.length) weeks.push(current);
      current = [];
      currentWeekStart = wsISO;
    }
    current.push(iso);
  }
  if (current.length) weeks.push(current);
  return weeks;
}

function fmtDateRange(days: string[]) {
  if (!days.length) return '';
  const first = parseISODate(days[0]);
  const last = parseISODate(days[days.length - 1]);
  const pad = (n: number) => String(n).padStart(2, '0');
  const fmtD = (d: Date) => `${pad(d.getDate())}.${pad(d.getMonth() + 1)}`;
  if (days.length === 1) {
    return `${fmtD(first)}.${first.getFullYear()}`;
  }
  return `${fmtD(first)} - ${fmtD(last)}.${last.getFullYear()}`;
}

export type PrintMode = 'cards' | 'table' | 'minimal';

export type PrintFullOptions = {
  mode: PrintMode;
  hideEmptyPositions: boolean;
  grouping?: PrintGrouping;
};

export type PrintDayOptions = {
  mode: PrintMode;
  hideEmptyPositions: boolean;
};

function wrapHtml(body: string, mode: PrintMode) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Grafik</title>
<style>
  *{box-sizing:border-box;}
  @page{ margin:${mode === 'minimal' ? '8mm' : '12mm'}; }
  body{font-family:Inter,system-ui,sans-serif;font-size:${mode === 'minimal' ? '8pt' : '10pt'};line-height:${mode === 'minimal' ? '1.18' : '1.35'};color:#111;max-width:210mm;margin:${mode === 'minimal' ? '8px' : '16px'} auto;padding:0 ${mode === 'minimal' ? '6px' : '12px'};}
  h1{font-size:${mode === 'minimal' ? '12pt' : '14pt'};margin:0 0 ${mode === 'minimal' ? '4px' : '6px'} 0;}
  h2{font-size:${mode === 'minimal' ? '10pt' : '12pt'};margin:${mode === 'minimal' ? '10px' : '14px'} 0 6px 0;border-bottom:1px solid #ccc;}
  .meta{color:#555;font-size:${mode === 'minimal' ? '8pt' : '9pt'};margin-bottom:${mode === 'minimal' ? '8px' : '12px'};}
  .day-block{margin-bottom:${mode === 'minimal' ? '10px' : '16px'};page-break-inside:avoid;}
  .week-block{margin-bottom:${mode === 'minimal' ? '10px' : '16px'};page-break-inside:avoid;}
  .shift-block{margin:${mode === 'minimal' ? '4px' : '6px'} 0;padding-left:${mode === 'minimal' ? '6px' : '8px'};}
  .shift-block ul{margin:4px 0 0 0;padding-left:18px;}
  .overtime-line{margin-top:${mode === 'minimal' ? '6px' : '10px'};padding:${mode === 'minimal' ? '4px' : '6px'} 0;border-top:1px dashed #ccc;font-size:${mode === 'minimal' ? '8pt' : '9pt'};color:#555;}
  table.t th, table.t td{border:1px solid #ccc;padding:${mode === 'minimal' ? '2px 4px' : '6px 8px'};text-align:left;vertical-align:top;}
  table.t th{background:#f0f0f0;font-weight:700;}
  tr.sep-day td{ border-top: 3px solid #111 !important; }
  tr.sep-day-end td{ border-bottom: 3px solid #111 !important; }
  tr.sep-shift td{ border-top: 2px solid #999 !important; }
  @media print{ body{margin:0;} .day-block{page-break-inside:avoid;} .week-block{page-break-inside:avoid;} }
</style></head><body>${body}</body></html>`;
}

export function buildPrintFullHtml(params: {
  range: 'week' | 'month';
  startISO: string;
  options: PrintFullOptions;
  settings: Settings;
  positions: Position[];
  employees: Employee[];
  assignments: Assignment[];
}) {
  const { range, startISO, options, settings, positions, employees, assignments } = params;
  const mode: PrintMode = options.mode;
  const hideEmptyPositions = !!options.hideEmptyPositions;
  const grouping = options.grouping || 'days';
  const days = listDays(range, startISO);

  const appName = settings?.appName || 'Planer Zmian';
  const hallName = settings?.hallName ? ` Hala ${settings.hallName}` : '';

  let body = `<h1>${escapeHtml(appName)}${escapeHtml(hallName)}</h1>
  <div class="meta">Grafik: ${range === 'week' ? 'Tydzień' : 'Miesiąc'} od ${escapeHtml(startISO)}. Wydruk: ${new Date().toLocaleString('pl-PL')}</div>`;

  if (grouping === 'weeks') {
    const firstDayOfWeek: 'monday' | 'sunday' = settings?.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday';
    const weeks = groupByWeek(days, firstDayOfWeek);
    const dayNamesPL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];

    weeks.forEach((weekDays) => {
      const rangeLabel = fmtDateRange(weekDays);

      // Build fingerprint per day: shift+pos -> employees
      type DayPlan = { shiftId: string; shiftName: string; shiftStart: string; shiftEnd: string; posName: string; names: string }[];
      const dayPlans = new Map<string, DayPlan>();

      for (const dateISO of weekDays) {
        const shifts = effectiveShiftsForDate(settings, dateISO);
        const plan: DayPlan = [];
        for (const s of shifts) {
          for (const p of positions.slice().sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))) {
            const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
            const ids = getEmployeeIdsFromAssignment(a);
            const names = ids.map(id => {
              const e = employees.find(x => String(x.id) === String(id));
              return e ? fullName(e) : id;
            }).join(', ');
            if (hideEmptyPositions && !names) continue;
            plan.push({ shiftId: String(s.id), shiftName: s.name, shiftStart: s.start, shiftEnd: s.end, posName: p.name, names: names || '—' });
          }
        }
        dayPlans.set(dateISO, plan);
      }

      // Weekend days always get unique fingerprints so they are never grouped with weekdays
      const fingerprints = new Map<string, string>();
      for (const [dateISO, plan] of dayPlans) {
        const dow = parseISODate(dateISO).getDay();
        const baseFp = plan.map(p => `${p.shiftId}|${p.posName}|${p.names}`).join(';;');
        const fp = (dow === 0 || dow === 6) ? `__WEEKEND__${dateISO}__${baseFp}` : baseFp;
        fingerprints.set(dateISO, fp);
      }

      // Group days by identical fingerprint
      const fpGroups = new Map<string, string[]>();
      const fpOrder: string[] = [];
      for (const dateISO of weekDays) {
        const fp = fingerprints.get(dateISO) || '';
        if (!fpGroups.has(fp)) { fpGroups.set(fp, []); fpOrder.push(fp); }
        fpGroups.get(fp)!.push(dateISO);
      }

      // Find main group (most days)
      let mainFp = fpOrder[0] || '';
      let mainCount = 0;
      for (const [fp, gd] of fpGroups) {
        if (gd.length > mainCount) { mainCount = gd.length; mainFp = fp; }
      }

      // Helper to build group label
      const buildGroupLabel = (groupDays: string[], fp: string) => {
        const firstDate = parseISODate(groupDays[0]);
        const dow = firstDate.getDay();
        const isWeekend = dow === 0 || dow === 6;
        const isMain = fp === mainFp && fpGroups.size > 1;
        const isException = fp !== mainFp && fpGroups.size > 1;
        let label: string;
        if (isWeekend) {
          const pad = (n: number) => String(n).padStart(2, '0');
          label = `${pad(firstDate.getDate())}.${pad(firstDate.getMonth() + 1)} (${dayNamesPL[dow]})`;
        } else if (fpGroups.size === 1) {
          label = '';
        } else {
          label = fmtDateRange(groupDays);
        }
        if (isMain) label += ' (plan standardowy)';
        if (isException) label += ' (wyjątek)';
        return { label, isWeekend, isException };
      };

      if (mode === 'table' || mode === 'minimal') {
        const minimal = mode === 'minimal';
        const rows: string[] = [];

        for (const fp of fpOrder) {
          const groupDays = fpGroups.get(fp)!;
          const plan = dayPlans.get(groupDays[0]) || [];
          const { label, isWeekend, isException } = buildGroupLabel(groupDays, fp);
          const labelCell = label || rangeLabel;
          const exStyle = isException ? ' style="background:#fff8e1;font-weight:600"' : '';

          if (!plan.length) {
            rows.push(`<tr${exStyle}><td>${escapeHtml(labelCell)}</td><td colspan="3" style="color:#666">${isWeekend ? 'Wolne' : 'Brak obsady'}</td></tr>`);
          } else {
            let first = true;
            for (const item of plan) {
              const shiftCell = minimal ? `${item.shiftName} ${item.shiftStart}–${item.shiftEnd}` : item.shiftName;
              rows.push(`<tr${exStyle}><td>${first ? escapeHtml(labelCell) : ''}</td><td>${escapeHtml(shiftCell)}</td><td>${escapeHtml(item.posName)}</td><td>${escapeHtml(item.names)}</td></tr>`);
              first = false;
            }
          }
        }

        body += `<div class="week-block"><h2>${escapeHtml(rangeLabel)}</h2>`;
        body += `<table class="t" style="width:100%;border-collapse:collapse;margin-top:6px">
          <thead><tr><th>Dni</th><th>${minimal ? 'Zmiana (godziny)' : 'Zmiana'}</th><th>Stanowisko</th><th>Pracownicy</th></tr></thead>
          <tbody>${rows.join('')}</tbody>
        </table>`;
        body += `<div class="overtime-line">Nadgodziny / uwagi: _________________________________________</div></div>`;
      } else {
        // Cards mode
        body += `<div class="week-block"><h2>${escapeHtml(rangeLabel)}</h2>`;

        for (const fp of fpOrder) {
          const groupDays = fpGroups.get(fp)!;
          const plan = dayPlans.get(groupDays[0]) || [];
          const { label, isWeekend, isException } = buildGroupLabel(groupDays, fp);

          if (label) {
            const labelStyle = isException
              ? 'font-weight:600;margin:8px 0 4px 0;font-size:9pt;color:#e65100;background:#fff8e1;padding:2px 6px;border-radius:3px;display:inline-block'
              : 'font-weight:600;margin:8px 0 4px 0;font-size:9pt;color:#555';
            body += `<div style="${labelStyle}">${escapeHtml(label)}</div>`;
          }

          if (!plan.length) {
            body += `<p style="color:#666;margin:2px 0">${isWeekend ? 'Wolne' : 'Brak zmian / obsady'}</p>`;
          } else {
            // Group by shift
            const byShift = new Map<string, typeof plan>();
            for (const item of plan) {
              const key = item.shiftId;
              if (!byShift.has(key)) byShift.set(key, []);
              byShift.get(key)!.push(item);
            }

            for (const [, items] of byShift) {
              const s = items[0];
              let lis = '';
              for (const item of items) {
                lis += `<li><strong>${escapeHtml(item.posName)}</strong>: ${escapeHtml(item.names)}</li>`;
              }
              body += `<div class="shift-block"><strong>${escapeHtml(s.shiftName)}</strong> ${escapeHtml(s.shiftStart)}–${escapeHtml(s.shiftEnd)}<ul>${lis}</ul></div>`;
            }
          }
        }

        body += `<div class="overtime-line">Nadgodziny / uwagi: _________________________________________</div></div>`;
      }
    });

    return wrapHtml(body, mode);
  }

  if (mode === 'table' || mode === 'minimal') {
    const minimal = mode === 'minimal';
    const rows: string[] = [];

    days.forEach((dateISO) => {
      const shifts = effectiveShiftsForDate(settings, dateISO);
      if (!shifts.length) {
        rows.push(`<tr class="sep-day sep-day-end"><td>${escapeHtml(fmtPLDate(dateISO))}</td><td colspan="3" style="color:#666">Brak zmian</td></tr>`);
        return;
      }

      let dayRowAdded = false;
      let isFirstRowOfDay = true;
      const dayRows: { tr: string }[] = [];

      shifts.forEach((s) => {
        let isFirstRowOfShift = true;
        positions
          .slice()
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
          .forEach((p) => {
            const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
            const ids = getEmployeeIdsFromAssignment(a);
            const names = ids
              .map((id) => {
                const e = employees.find((x) => String(x.id) === String(id));
                return e ? fullName(e) : id;
              })
              .join(', ');

            if (hideEmptyPositions && !names) return;

            const cls = `${isFirstRowOfDay ? 'sep-day' : ''} ${isFirstRowOfShift ? 'sep-shift' : ''}`.trim();

            const dateCell = minimal ? (isFirstRowOfDay ? fmtPLDate(dateISO) : '') : fmtPLDate(dateISO);
            const shiftCell = minimal ? (isFirstRowOfShift ? `${s.name} ${s.start}–${s.end}` : '') : s.name;

            dayRows.push({
              tr: `<tr${cls ? ` class="${cls}"` : ''}><td>${escapeHtml(dateCell)}</td><td>${escapeHtml(shiftCell)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(names || '—')}</td></tr>`,
            });

            dayRowAdded = true;
            isFirstRowOfDay = false;
            isFirstRowOfShift = false;
          });
      });

      if (!dayRowAdded) {
        rows.push(`<tr class="sep-day sep-day-end"><td>${escapeHtml(fmtPLDate(dateISO))}</td><td colspan="3" style="color:#666">Brak obsady</td></tr>`);
        return;
      }

      const lastIdx = dayRows.length - 1;
      dayRows.forEach((r, i) => {
        if (i === lastIdx) {
          if (r.tr.includes('class="')) {
            rows.push(r.tr.replace('class="', 'class="sep-day-end '));
          } else {
            rows.push(r.tr.replace('<tr', '<tr class="sep-day-end"'));
          }
        } else {
          rows.push(r.tr);
        }
      });
    });

    if (!rows.length) rows.push(`<tr><td colspan="4" style="text-align:center;color:#666">Brak danych do wydruku</td></tr>`);

    body += `<table class="t" style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead><tr><th>Data</th><th>${minimal ? 'Zmiana (godziny)' : 'Zmiana'}</th><th>Stanowisko</th><th>Pracownicy</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;

    body += `<div class="overtime-line">Nadgodziny / uwagi: _________________________________________</div>`;
  } else {
    days.forEach((dateISO) => {
      const shifts = effectiveShiftsForDate(settings, dateISO);
      body += `<div class="day-block"><h2>${escapeHtml(fmtPLDate(dateISO))}</h2>`;
      if (!shifts.length) {
        body += `<p class="no-shifts">Brak zmian</p></div>`;
        return;
      }
      let anyShown = false;
      shifts.forEach((s) => {
        let lis = '';
        positions
          .slice()
          .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
          .forEach((p) => {
            const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
            const ids = getEmployeeIdsFromAssignment(a);
            const names = ids
              .map((id) => {
                const e = employees.find((x) => String(x.id) === String(id));
                return e ? fullName(e) : id;
              })
              .join(', ');
            if (hideEmptyPositions && !names) return;
            lis += `<li><strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(names || '—')}</li>`;
          });
        if (hideEmptyPositions && !lis) return;
        anyShown = true;
        body += `<div class="shift-block"><strong>${escapeHtml(s.name)}</strong> ${escapeHtml(s.start)}–${escapeHtml(s.end)}<ul>${lis}</ul></div>`;
      });
      if (hideEmptyPositions && !anyShown) body += `<p class="no-shifts">Brak obsady</p>`;
      body += `<div class="overtime-line">Nadgodziny / uwagi: _________________________________________</div></div>`;
    });
  }

  return wrapHtml(body, mode);
}

export function buildPrintDayHtml(params: {
  dateISO: string;
  options: PrintDayOptions;
  settings: Settings;
  positions: Position[];
  employees: Employee[];
  assignments: Assignment[];
}) {
  const { dateISO, options, settings, positions, employees, assignments } = params;
  const mode: PrintMode = options.mode;
  const hideEmptyPositions = !!options.hideEmptyPositions;

  const appName = settings?.appName || 'Planer Zmian';
  const hallName = settings?.hallName ? ` Hala ${settings.hallName}` : '';

  const shifts = effectiveShiftsForDate(settings, dateISO);

  let body = `<h1>${escapeHtml(appName)}${escapeHtml(hallName)}</h1>
  <div class="meta">Grafik: ${escapeHtml(fmtPLDate(dateISO))} (${escapeHtml(dateISO)}). Wydruk: ${new Date().toLocaleString('pl-PL')}</div>`;

  if (!shifts.length) {
    body += `<p class="no-shifts">Brak zmian</p>`;
  } else if (mode === 'table' || mode === 'minimal') {
    const minimal = mode === 'minimal';
    const rows: string[] = [];
    let isFirstRowOfDay = true;

    shifts.forEach((s) => {
      let isFirstRowOfShift = true;
      positions
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
        .forEach((p) => {
          const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
          const ids = getEmployeeIdsFromAssignment(a);
          const names = ids
            .map((id) => {
              const e = employees.find((x) => String(x.id) === String(id));
              return e ? fullName(e) : id;
            })
            .join(', ');
          if (hideEmptyPositions && !names) return;

          const cls = `${isFirstRowOfDay ? 'sep-day' : ''} ${isFirstRowOfShift ? 'sep-shift' : ''}`.trim();

          const shiftCell = minimal ? (isFirstRowOfShift ? `${s.name} ${s.start}–${s.end}` : '') : s.name;

          rows.push(
            `<tr${cls ? ` class="${cls}"` : ''}><td>${escapeHtml(shiftCell)}</td><td>${escapeHtml(p.name)}</td><td>${escapeHtml(names || '—')}</td></tr>`,
          );

          isFirstRowOfDay = false;
          isFirstRowOfShift = false;
        });
    });

    if (!rows.length) rows.push(`<tr><td colspan="3" style="text-align:center;color:#666">Brak danych do wydruku</td></tr>`);

    body += `<table class="t" style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead><tr><th>${minimal ? 'Zmiana (godziny)' : 'Zmiana'}</th><th>Stanowisko</th><th>Pracownicy</th></tr></thead>
      <tbody>${rows.join('')}</tbody>
    </table>`;
  } else {
    body += `<div class="day-block"><h2>${escapeHtml(fmtPLDate(dateISO))}</h2>`;
    let anyShown = false;
    shifts.forEach((s) => {
      let lis = '';
      positions
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
        .forEach((p) => {
          const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
          const ids = getEmployeeIdsFromAssignment(a);
          const names = ids
            .map((id) => {
              const e = employees.find((x) => String(x.id) === String(id));
              return e ? fullName(e) : id;
            })
            .join(', ');
          if (hideEmptyPositions && !names) return;
          lis += `<li><strong>${escapeHtml(p.name)}</strong>: ${escapeHtml(names || '—')}</li>`;
        });
      if (hideEmptyPositions && !lis) return;
      anyShown = true;
      body += `<div class="shift-block"><strong>${escapeHtml(s.name)}</strong> ${escapeHtml(s.start)}–${escapeHtml(s.end)}<ul>${lis}</ul></div>`;
    });
    if (hideEmptyPositions && !anyShown) body += `<p class="no-shifts">Brak obsady</p>`;
    body += `</div>`;
  }

  body += `<div class="overtime-line">Nadgodziny / uwagi: _________________________________________</div>`;

  return wrapHtml(body, mode);
}

export function buildPrintEmployeeHtml(params: {
  employeeId: string;
  range: 'week' | 'month';
  startISO: string;
  settings: Settings;
  positions: Position[];
  employees: Employee[];
  assignments: Assignment[];
  grouping?: PrintGrouping;
}) {
  const { employeeId, range, startISO, settings, positions, employees, assignments } = params;
  const grouping = params.grouping || 'days';
  const days = listDays(range, startISO);

  const emp = employees.find((e) => String(e.id) === String(employeeId));
  const empName = emp ? fullName(emp) : 'Pracownik';

  const appName = settings?.appName || 'Planer Zmian';
  const hallName = settings?.hallName ? ` Hala ${settings.hallName}` : '';

  let body = `<h1>${escapeHtml(appName)}${escapeHtml(hallName)}</h1>
  <div class="meta">Grafik pracownika: <strong>${escapeHtml(empName)}</strong><br/>
  Zakres: ${range === 'week' ? 'Tydzień' : 'Miesiąc'} od ${escapeHtml(startISO)}. Wydruk: ${new Date().toLocaleString('pl-PL')}</div>`;

  if (grouping === 'weeks') {
    const firstDayOfWeek: 'monday' | 'sunday' = settings?.firstDayOfWeek === 'sunday' ? 'sunday' : 'monday';
    const weeks = groupByWeek(days, firstDayOfWeek);

    weeks.forEach((weekDays) => {
      // Build per-day fingerprint: shiftName + posName for this employee
      type DayEntry = { shiftName: string; shiftStart: string; shiftEnd: string; posName: string };
      const dayEntries = new Map<string, DayEntry[]>();

      for (const dateISO of weekDays) {
        const shifts = effectiveShiftsForDate(settings, dateISO);
        const entries: DayEntry[] = [];
        for (const s of shifts) {
          for (const p of positions) {
            const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
            const ids = getEmployeeIdsFromAssignment(a);
            if (!ids.includes(String(employeeId))) continue;
            entries.push({ shiftName: s.name, shiftStart: s.start, shiftEnd: s.end, posName: p.name });
          }
        }
        dayEntries.set(dateISO, entries);
      }

      // Group days by identical assignment fingerprint
      // Weekend days (Sat/Sun) always get unique fingerprints so they are never grouped with weekdays
      const dayNamesPL = ['niedziela', 'poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota'];
      const fingerprints = new Map<string, string>();
      for (const [dateISO, entries] of dayEntries) {
        const dow = parseISODate(dateISO).getDay();
        const baseFp = entries.map(e => `${e.shiftName}|${e.posName}`).join(';;');
        const fp = (dow === 0 || dow === 6) ? `__WEEKEND__${dateISO}__${baseFp}` : baseFp;
        fingerprints.set(dateISO, fp);
      }

      const fpGroups = new Map<string, string[]>();
      const fpOrder: string[] = [];
      for (const dateISO of weekDays) {
        const fp = fingerprints.get(dateISO) || '';
        if (!fpGroups.has(fp)) { fpGroups.set(fp, []); fpOrder.push(fp); }
        fpGroups.get(fp)!.push(dateISO);
      }

      for (const fp of fpOrder) {
        const groupDays = fpGroups.get(fp)!;
        const entries = dayEntries.get(groupDays[0]) || [];

        const firstDate = parseISODate(groupDays[0]);
        const dow = firstDate.getDay();
        const isWeekend = dow === 0 || dow === 6;
        let rangeLabel: string;
        if (isWeekend) {
          const pad = (n: number) => String(n).padStart(2, '0');
          rangeLabel = `${pad(firstDate.getDate())}.${pad(firstDate.getMonth() + 1)} (${dayNamesPL[dow]})`;
        } else {
          rangeLabel = fmtDateRange(groupDays);
        }

        if (!entries.length) {
          body += `<div style="margin:4px 0;color:#999">${escapeHtml(rangeLabel)} — Wolne</div>`;
        } else {
          const detail = entries.map(e => `${escapeHtml(e.shiftName)} ${escapeHtml(e.shiftStart)}–${escapeHtml(e.shiftEnd)}, ${escapeHtml(e.posName)}`).join(' | ');
          body += `<div style="margin:4px 0"><strong>${escapeHtml(rangeLabel)}</strong> — ${detail}</div>`;
        }
      }
    });
  } else {
    const rows: string[] = [];

    days.forEach((dateISO) => {
      const shifts = effectiveShiftsForDate(settings, dateISO);
      if (!shifts.length) return;

      shifts.forEach((s) => {
        positions.forEach((p) => {
          const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
          const ids = getEmployeeIdsFromAssignment(a);
          if (!ids.includes(String(employeeId))) return;

          rows.push(
            `<tr><td>${escapeHtml(fmtPLDate(dateISO))}</td><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.start)}</td><td>${escapeHtml(s.end)}</td><td>${escapeHtml(p.name)}</td></tr>`
          );
        });
      });
    });

    if (!rows.length) {
      body += `<p style="color:#666;margin-top:20px">Brak przypisań dla tego pracownika w wybranym okresie.</p>`;
    } else {
      body += `<table class="t" style="width:100%;border-collapse:collapse;margin-top:10px">
        <thead><tr><th>Data</th><th>Zmiana</th><th>Od</th><th>Do</th><th>Stanowisko</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>`;
    }
  }

  body += `<div class="overtime-line">Nadgodziny / uwagi: _________________________________________</div>`;

  return wrapHtml(body, 'cards');
}

function csvEscape(val: string) {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes(';')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function buildCsvFull(params: {
  range: 'week' | 'month';
  startISO: string;
  settings: Settings;
  positions: Position[];
  employees: Employee[];
  assignments: Assignment[];
  hideEmptyPositions: boolean;
}) {
  const { range, startISO, settings, positions, employees, assignments, hideEmptyPositions } = params;
  const days = listDays(range, startISO);
  const sep = ';';
  const rows: string[] = [];
  rows.push(['Data', 'Zmiana', 'Godziny', 'Stanowisko', 'Pracownicy'].map(csvEscape).join(sep));

  days.forEach((dateISO) => {
    const shifts = effectiveShiftsForDate(settings, dateISO);
    if (!shifts.length) return;
    shifts.forEach((s) => {
      positions
        .slice()
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
        .forEach((p) => {
          const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
          const ids = getEmployeeIdsFromAssignment(a);
          const names = ids
            .map((id) => {
              const e = employees.find((x) => String(x.id) === String(id));
              return e ? fullName(e) : id;
            })
            .join(', ');
          if (hideEmptyPositions && !names) return;
          rows.push([
            fmtPLDate(dateISO),
            s.name,
            `${s.start}-${s.end}`,
            p.name,
            names || '',
          ].map(csvEscape).join(sep));
        });
    });
  });
  return '\uFEFF' + rows.join('\r\n');
}

export function buildCsvDay(params: {
  dateISO: string;
  settings: Settings;
  positions: Position[];
  employees: Employee[];
  assignments: Assignment[];
  hideEmptyPositions: boolean;
}) {
  const { dateISO, settings, positions, employees, assignments, hideEmptyPositions } = params;
  const sep = ';';
  const rows: string[] = [];
  rows.push(['Zmiana', 'Godziny', 'Stanowisko', 'Pracownicy'].map(csvEscape).join(sep));
  const shifts = effectiveShiftsForDate(settings, dateISO);
  shifts.forEach((s) => {
    positions
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
      .forEach((p) => {
        const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
        const ids = getEmployeeIdsFromAssignment(a);
        const names = ids
          .map((id) => {
            const e = employees.find((x) => String(x.id) === String(id));
            return e ? fullName(e) : id;
          })
          .join(', ');
        if (hideEmptyPositions && !names) return;
        rows.push([
          s.name,
          `${s.start}-${s.end}`,
          p.name,
          names || '',
        ].map(csvEscape).join(sep));
      });
  });
  return '\uFEFF' + rows.join('\r\n');
}

export function buildCsvEmployee(params: {
  employeeId: string;
  range: 'week' | 'month';
  startISO: string;
  settings: Settings;
  positions: Position[];
  employees: Employee[];
  assignments: Assignment[];
}) {
  const { employeeId, range, startISO, settings, positions, employees, assignments } = params;
  const days = listDays(range, startISO);
  const sep = ';';
  const rows: string[] = [];
  const emp = employees.find((e) => String(e.id) === String(employeeId));
  const empName = emp ? fullName(emp) : 'Pracownik';
  rows.push(['Pracownik', 'Data', 'Zmiana', 'Od', 'Do', 'Stanowisko'].map(csvEscape).join(sep));

  days.forEach((dateISO) => {
    const shifts = effectiveShiftsForDate(settings, dateISO);
    shifts.forEach((s) => {
      positions.forEach((p) => {
        const a = getAssignment(assignments, dateISO, String(s.id), String(p.id));
        const ids = getEmployeeIdsFromAssignment(a);
        if (!ids.includes(String(employeeId))) return;
        rows.push([
          empName,
          fmtPLDate(dateISO),
          s.name,
          s.start,
          s.end,
          p.name,
        ].map(csvEscape).join(sep));
      });
    });
  });
  return '\uFEFF' + rows.join('\r\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function openPrintPreview(html: string) {
  const w = window.open('', '_blank');
  if (!w) {
    return false;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}
