import type { Assignment, Employee, Position, Settings, Shift } from './types';
import { isHoliday, parseISODate } from './date';

// Cache for effectiveShiftsForDate — cleared when settings ref changes
let _effCache: Map<string, Shift[]> | null = null;
let _effSettingsRef: Settings | null | undefined = undefined;

export function effectiveShiftsForDate(settings: Settings | null | undefined, dateISO: string): Shift[] {
  // Invalidate cache if settings object changed
  if (settings !== _effSettingsRef) {
    _effCache = new Map();
    _effSettingsRef = settings;
  }
  const cached = _effCache!.get(dateISO);
  if (cached) return cached;

  const shifts = Array.isArray(settings?.shifts) ? settings!.shifts! : [];
  const overrides = settings?.dayOverrides && typeof settings.dayOverrides === 'object' ? settings.dayOverrides : undefined;
  const o = overrides?.[dateISO];
  
  let result: Shift[];
  // Day override takes priority - allows enabling shifts on holidays/sundays
  if (Array.isArray(o)) {
    result = o;
  } else if (isHoliday(dateISO)) {
    result = [];
  } else {
    const date = parseISODate(dateISO);
    const dow = date.getDay();
    if (dow === 0) {
      // Sunday: check sundayWorking setting (defaults to false for backward compat)
      if (settings?.sundayWorking === true) {
        result = shifts;
      } else {
        result = [];
      }
    } else if (dow === 6) {
      if (Array.isArray(settings?.saturdayShifts) && settings!.saturdayShifts!.length > 0) {
        result = settings!.saturdayShifts!;
      } else if (shifts.length > 0) {
        result = [{ ...shifts[0], start: '05:00', end: '13:00' }];
      } else {
        result = [];
      }
    } else {
      result = shifts;
    }
  }
  _effCache!.set(dateISO, result);
  return result;
}

export function getAssignment(assignments: Assignment[], dateISO: string, shiftId: string, positionId: string): Assignment | undefined {
  return assignments.find(
    (a) => String(a.date) === String(dateISO) && String(a.shiftId) === String(shiftId) && String(a.positionId) === String(positionId),
  );
}

// O(1) lookup using pre-built indexed map from store
export function getAssignmentFromMap(assignmentsByDate: Map<string, Assignment[]>, dateISO: string, shiftId: string, positionId: string): Assignment | undefined {
  const dayAssigns = assignmentsByDate.get(dateISO);
  if (!dayAssigns) return undefined;
  return dayAssigns.find(
    (a) => String(a.shiftId) === String(shiftId) && String(a.positionId) === String(positionId),
  );
}

export function getEmployeeIdsFromAssignment(a: Assignment | undefined): string[] {
  if (!a) return [];
  if (Array.isArray(a.employeeIds)) return a.employeeIds.map(String).filter(Boolean);
  if (a.employeeId) return [String(a.employeeId)];
  return [];
}

// Cached Sets per employee to avoid repeated .map(String).includes() — O(1) instead of O(n)
const _posSetCache = new WeakMap<Employee, Set<string>>();
const _shiftSetCache = new WeakMap<Employee, Set<string>>();

export function employeeHasPosition(e: Employee, positionId: string) {
  if (!Array.isArray(e.positionIds)) return false;
  let s = _posSetCache.get(e);
  if (!s) {
    s = new Set(e.positionIds.map(String));
    _posSetCache.set(e, s);
  }
  return s.has(String(positionId));
}

export function isEmployeeAllowedOnShift(e: Employee, shiftId: string) {
  if (!Array.isArray(e.allowedShiftIds) || e.allowedShiftIds.length === 0) return true;
  let s = _shiftSetCache.get(e);
  if (!s) {
    s = new Set(e.allowedShiftIds.map(String));
    _shiftSetCache.set(e, s);
  }
  return s.has(String(shiftId));
}

export function sortEmployees(list: Employee[]) {
  return list.slice().sort((a, b) => `${a.surname || ''} ${a.name || ''}`.localeCompare(`${b.surname || ''} ${b.name || ''}`, 'pl'));
}

export function positionName(positions: Position[], positionId: string) {
  return positions.find((p) => String(p.id) === String(positionId))?.name || positionId;
}
