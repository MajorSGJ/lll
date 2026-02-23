export function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: string) {
  const [y, m, d] = iso.split('-').map((x) => parseInt(x, 10));
  return new Date(y, (m || 1) - 1, d || 1);
}

export function monthStartISO(dateISO: string) {
  const d = parseISODate(dateISO);
  d.setDate(1);
  return toISODate(d);
}

export function addDays(iso: string, delta: number) {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function fmtPLDate(iso: string) {
  try {
    const d = parseISODate(iso);
    return d.toLocaleDateString('pl-PL', { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return iso;
  }
}

export function formatDatePL(d: Date) {
  return d.toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

export function sameISO(a: string, b: string) {
  return String(a) === String(b);
}

export function uniq(arr: string[]) {
  return Array.from(new Set(arr.map(String)));
}

// Polish fixed holidays: MM-DD -> name
const HOLIDAYS_FIXED: Record<string, string> = {
  "01-01": "Nowy Rok",
  "01-06": "Trzech Króli",
  "05-01": "Święto Pracy",
  "05-03": "Święto Konstytucji 3 Maja",
  "08-15": "Wniebowzięcie NMP",
  "11-01": "Wszystkich Świętych",
  "11-11": "Święto Niepodległości",
  "12-25": "Boże Narodzenie",
  "12-26": "Boże Narodzenie (2)"
};

const _easterCache = new Map<number, Date>();
function computeEaster(year: number): Date {
  const cached = _easterCache.get(year);
  if (cached) return cached;
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const result = new Date(year, month - 1, day);
  _easterCache.set(year, result);
  return result;
}

const _holidayCache = new Map<string, string[]>();
export function getHolidayNames(dateISO: string): string[] {
  const cached = _holidayCache.get(dateISO);
  if (cached) return cached;

  const out: string[] = [];
  const mmdd = dateISO.slice(5);
  if (HOLIDAYS_FIXED[mmdd]) out.push(HOLIDAYS_FIXED[mmdd]);
  
  const y = parseInt(dateISO.slice(0, 4), 10);
  const easter = computeEaster(y);
  const easterISO = toISODate(easter);
  
  const easterMon = new Date(easter);
  easterMon.setDate(easterMon.getDate() + 1);
  const easterMonISO = toISODate(easterMon);
  
  const corpus = new Date(easter);
  corpus.setDate(corpus.getDate() + 60);
  const corpusISO = toISODate(corpus);
  
  if (dateISO === easterISO) out.push("Wielkanoc");
  if (dateISO === easterMonISO) out.push("Poniedziałek Wielkanocny");
  if (dateISO === corpusISO) out.push("Boże Ciało");
  
  _holidayCache.set(dateISO, out);
  return out;
}

export function isHoliday(dateISO: string): boolean {
  return getHolidayNames(dateISO).length > 0;
}

export function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
