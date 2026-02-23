import type { Assignment, Employee, Position, Settings, Shift, Vacation } from './types';
import { effectiveShiftsForDate, getAssignmentFromMap, getEmployeeIdsFromAssignment, employeeHasPosition, isEmployeeAllowedOnShift } from './assignments';
import { parseISODate, toISODate } from './date';

export type PlanningConfig = {
  maxNightShiftsPerWeek: number;
  maxLoadDifference: number;
  blockNightToMorning: boolean;
  planningMode: 'balanced' | 'strict' | 'lenient';
  penaltyOverloadSquare: number;
  penaltyNightOverLimit: number;
  penaltySameShiftConsecutive: number;
  penaltyNotPreferred: number;
  penaltyNightToMorning: number;
  bonusPreferred: number;
  bonusLowLoad: number;
};

export function getPlanningConfig(settings: Settings | null | undefined): PlanningConfig {
  const s = settings || {};
  const mode = (s.planningMode === 'strict' || s.planningMode === 'lenient') ? s.planningMode : 'balanced';
  const strictMod = mode === 'strict' ? 2 : 1;
  const lenientMod = mode === 'lenient' ? 0.5 : 1;
  return {
    maxNightShiftsPerWeek: typeof s.maxNightShiftsPerWeek === 'number' ? s.maxNightShiftsPerWeek : 3,
    maxLoadDifference: typeof s.maxLoadDifference === 'number' ? s.maxLoadDifference : 2,
    blockNightToMorning: s.blockNightToMorning === true,
    planningMode: mode,
    penaltyOverloadSquare: 2 * strictMod * lenientMod,
    penaltyNightOverLimit: 50 * strictMod * lenientMod,
    penaltySameShiftConsecutive: 1,
    penaltyNotPreferred: 3,
    penaltyNightToMorning: 100 * strictMod,
    bonusPreferred: -2,
    bonusLowLoad: -1,
  };
}

export function isNightShift(shift: Shift | undefined | null) {
  if (!shift) return false;
  const startHour = parseInt(String(shift.start || '').split(':')[0], 10) || 0;
  const endHour = parseInt(String(shift.end || '').split(':')[0], 10) || 0;
  return startHour >= 22 || endHour <= 7;
}

export function isMorningShift(shift: Shift | undefined | null) {
  if (!shift) return false;
  const startHour = parseInt(String(shift.start || '').split(':')[0], 10) || 0;
  return startHour >= 5 && startHour <= 8;
}

export function stableHashForScoring(str: string) {
  let h = 2166136261;
  const s = String(str);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function weekKeyFromISO(dateISO: string) {
  const d = parseISODate(dateISO);
  // monday=0 ... sunday=6
  const monBasedDow = (d.getDay() + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - monBasedDow);
  return toISODate(monday);
}

export function isOnVacation(employeeId: string, dateISO: string, vacations: Vacation[]) {
  const id = String(employeeId);
  for (const v of vacations) {
    if (String(v.employeeId) !== id) continue;
    const s = String(v.start);
    const e = String(v.end);
    if (s && e && s <= dateISO && dateISO <= e) return true;
  }
  return false;
}

// Indexed version for O(1) per-employee lookup
export function isOnVacationIndexed(employeeId: string, dateISO: string, vacsByEmp: Map<string, Array<{ start: string; end: string }>>) {
  const vacs = vacsByEmp.get(String(employeeId));
  if (!vacs) return false;
  for (const v of vacs) {
    if (v.start <= dateISO && dateISO <= v.end) return true;
  }
  return false;
}

type ExtLoadRec = {
  total: number;
  night: number;
  lastShiftByDay: Map<string, string>;
  weekNight: Map<string, number>;
};

export function buildExtendedLoadMap(planningDays: string[], allAssignments: Assignment[], shifts: Shift[]): Map<string, ExtLoadRec> {
  const loadMap = new Map<string, ExtLoadRec>();

  const init = (id: string) => {
    const key = String(id);
    if (!loadMap.has(key)) {
      loadMap.set(key, { total: 0, night: 0, lastShiftByDay: new Map(), weekNight: new Map() });
    }
    return loadMap.get(key)!;
  };

  const shiftById = new Map((shifts || []).map((s) => [String(s.id), s] as const));

  const planningSet = new Set(planningDays.map(String));
  const firstISO = planningDays[0];
  const firstDate = parseISODate(firstISO);

  const prevWeekDays: string[] = [];
  for (let i = 7; i >= 1; i--) {
    const d = new Date(firstDate);
    d.setDate(firstDate.getDate() - i);
    prevWeekDays.push(toISODate(d));
  }
  const contextDates = new Set<string>([...prevWeekDays, ...planningSet]);

  for (const a of allAssignments) {
    const dateISO = String(a.date);
    if (!contextDates.has(dateISO)) continue;
    const shiftId = String(a.shiftId ?? '');
    const shift = shiftById.get(shiftId);
    const night = isNightShift(shift);
    const wk = weekKeyFromISO(dateISO);
    const inPlanning = planningSet.has(dateISO);

    for (const empId of getEmployeeIdsFromAssignment(a)) {
      const rec = init(String(empId));
      rec.lastShiftByDay.set(dateISO, shiftId);
      if (inPlanning) rec.total += 1;
      if (night) {
        rec.weekNight.set(wk, (rec.weekNight.get(wk) || 0) + 1);
        if (inPlanning) rec.night += 1;
      }
    }
  }

  return loadMap;
}

export function scoreAssignment(params: {
  emp: Employee;
  shift: Shift;
  dateISO: string;
  extLoadMap: Map<string, ExtLoadRec>;
  avgLoad: number;
  weekKey: string;
  preferredShiftId: string | null;
  settings: Settings;
}): number {
  const { emp, shift, dateISO, extLoadMap, avgLoad, weekKey, preferredShiftId, settings } = params;
  const cfg = getPlanningConfig(settings);
  let score = 0;
  const empId = String(emp.id);
  const rec = extLoadMap.get(empId) || { total: 0, night: 0, lastShiftByDay: new Map(), weekNight: new Map() };

  const loadDiff = rec.total - avgLoad;
  if (loadDiff > 0) score += Math.pow(loadDiff, 2) * cfg.penaltyOverloadSquare;
  else score += cfg.bonusLowLoad * Math.abs(loadDiff);

  if (isNightShift(shift)) {
    const currentNight = rec.weekNight.get(weekKey) || 0;
    if (currentNight >= cfg.maxNightShiftsPerWeek) score += cfg.penaltyNightOverLimit;
  }

  const prev = new Date(parseISODate(dateISO));
  prev.setDate(prev.getDate() - 1);
  const prevISO = toISODate(prev);
  const lastShiftId = rec.lastShiftByDay.get(prevISO);
  if (lastShiftId && lastShiftId === String(shift.id)) score += cfg.penaltySameShiftConsecutive;

  const shiftId = String(shift.id);
  if (preferredShiftId) {
    if (shiftId === preferredShiftId) score += cfg.bonusPreferred;
    else score += cfg.penaltyNotPreferred;
  }

  if (cfg.blockNightToMorning && lastShiftId) {
    const prevShiftObj = (settings?.shifts || []).find((s) => String(s.id) === String(lastShiftId));
    if (isNightShift(prevShiftObj) && isMorningShift(shift)) score += cfg.penaltyNightToMorning;
  }

  const hash = (stableHashForScoring(`${empId}:${weekKey}:${shiftId}`) % 100) * 0.01;
  score += hash;

  return score;
}

export function pickBestByScore<T>(candidates: T[], count: number, scoreFn: (c: T) => number): T[] {
  if (!candidates.length) return [];
  const scored = candidates.map((c) => ({ c, score: scoreFn(c) }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, count).map((x) => x.c);
}

export type PlanResult = {
  created: number;
  touchedDays: string[];
};

export async function planDays(params: {
  days: string[];
  settings: Settings;
  employees: Employee[];
  positions: Position[];
  vacations: Vacation[];
  assignments: Assignment[];
  apply: (change: { date: string; shiftId: string; positionId: string; employeeIds: string[] }) => Promise<void>;
  selectedShiftIds?: string[];
  skipSaturdays?: boolean;
}): Promise<PlanResult> {
  const { days: rawDays, settings, employees, positions, vacations, assignments, apply } = params;

  // Filter out Saturdays if requested, and disabled days from settings
  const disabledDays: number[] = Array.isArray(settings?.disabledDays) ? (settings.disabledDays as number[]) : [];
  const days = rawDays.filter((d) => {
    const dt = parseISODate(d);
    const dow = dt.getDay();
    if (params.skipSaturdays && dow === 6) return false;
    if (disabledDays.includes(dow)) return false;
    return true;
  });
  const createdDays = new Set<string>();
  let created = 0;

  const allShiftIds = (settings?.shifts || []).map((s) => String(s.id));
  const debugMode = settings?.debugMode === true;
  
  // Debug logging (only if debug mode enabled in settings)
  if (debugMode) {
    console.log('[planDays] Starting planning for', days.length, 'days');
    console.log('[planDays] Positions:', positions.map(p => ({ id: p.id, name: p.name, targetCount: p.targetCount || 1 })));
    console.log('[planDays] Active employees:', employees.filter(e => e.active !== false).length);
    console.log('[planDays] Employees with positionIds:', employees.filter(e => Array.isArray(e.positionIds) && e.positionIds.length > 0).map(e => ({ id: e.id, name: e.name, positionIds: e.positionIds })));
    console.log('[planDays] Selected shift IDs:', params.selectedShiftIds);
    console.log('[planDays] All shift IDs:', allShiftIds);
  }

  // Build indexed maps once
  const assignsByDate = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const key = String(a.date);
    const arr = assignsByDate.get(key);
    if (arr) arr.push(a);
    else assignsByDate.set(key, [a]);
  }
  const vacsByEmp = new Map<string, Array<{ start: string; end: string }>>();
  for (const v of vacations) {
    const key = String(v.employeeId);
    const arr = vacsByEmp.get(key);
    const entry = { start: String(v.start), end: String(v.end) };
    if (arr) arr.push(entry);
    else vacsByEmp.set(key, [entry]);
  }

  const extLoadMap = buildExtendedLoadMap(days, assignments, settings?.shifts || []);
  const loadMap = new Map<string, number>();
  extLoadMap.forEach((rec, empId) => loadMap.set(empId, rec.total));

  const activeEmployees = employees.filter((e) => e.active !== false);

  // Build employee pair lookup: empId -> partnerId
  const pairMap = new Map<string, string>();
  const pairs = Array.isArray(settings?.employeePairs) ? settings!.employeePairs : [];
  for (const p of pairs) {
    const e1 = String(p.emp1Id || '');
    const e2 = String(p.emp2Id || '');
    if (e1 && e2 && e1 !== e2) {
      pairMap.set(e1, e2);
      pairMap.set(e2, e1);
    }
  }

  const weekAssigned = new Map<string, Map<string, string>>();
  const weekPreferred = new Map<string, Map<string, string | null>>();
  const ensureWeekMap = (wk: string) => {
    if (!weekAssigned.has(wk)) weekAssigned.set(wk, new Map());
    return weekAssigned.get(wk)!;
  };
  const ensureWeekPref = (wk: string) => {
    if (!weekPreferred.has(wk)) weekPreferred.set(wk, new Map());
    return weekPreferred.get(wk)!;
  };

  const getPreferredShiftFor = (wk: string, empId: string, availableShiftIds: string[]) => {
    const m = ensureWeekPref(wk);
    const key = String(empId);
    if (m.has(key)) return m.get(key)!;
    const list = Array.isArray(availableShiftIds) ? availableShiftIds.map(String).filter(Boolean) : [];
    const chosen = list.length ? list[stableHashForScoring(`${wk}:${key}`) % list.length] : null;
    m.set(key, chosen);
    return chosen;
  };

  // Track weekly shift+position assignments for consistency: wk -> "shiftId:posId" -> Set<empId>
  const weekPosAssigned = new Map<string, Map<string, Set<string>>>();
  const ensureWeekPosMap = (wk: string) => {
    if (!weekPosAssigned.has(wk)) weekPosAssigned.set(wk, new Map());
    return weekPosAssigned.get(wk)!;
  };

  // seed weekAssigned with existing assignments in range
  const daySet = new Set(days.map(String));
  for (const a of assignments) {
    if (!daySet.has(String(a.date))) continue;
    const wk = weekKeyFromISO(String(a.date));
    const sid = String(a.shiftId ?? '');
    if (!sid) continue;
    const m = ensureWeekMap(wk);
    const wpm = ensureWeekPosMap(wk);
    const posId = String(a.positionId ?? '');
    const wpKey = `${sid}:${posId}`;
    if (!wpm.has(wpKey)) wpm.set(wpKey, new Set());
    const wpSet = wpm.get(wpKey)!;
    for (const id of getEmployeeIdsFromAssignment(a)) {
      const k = String(id);
      if (!m.has(k)) m.set(k, sid);
      wpSet.add(k);
    }
  }

  // Pre-seed preferred shifts for rotation: prefer a DIFFERENT shift than last week
  const weekKeysInRange = new Set(days.map(d => weekKeyFromISO(d)));
  for (const wk of weekKeysInRange) {
    const prevWkMonday = new Date(parseISODate(wk));
    prevWkMonday.setDate(prevWkMonday.getDate() - 7);
    // Count shift assignments per employee in previous week
    const empShiftCount = new Map<string, Map<string, number>>();
    for (let i = 0; i < 7; i++) {
      const d = new Date(prevWkMonday);
      d.setDate(prevWkMonday.getDate() + i);
      const dISO = toISODate(d);
      const dayAs = assignsByDate.get(dISO) || [];
      for (const a of dayAs) {
        const sid = String(a.shiftId ?? '');
        if (!sid) continue;
        for (const empId of getEmployeeIdsFromAssignment(a)) {
          const eid = String(empId);
          if (!empShiftCount.has(eid)) empShiftCount.set(eid, new Map());
          const m = empShiftCount.get(eid)!;
          m.set(sid, (m.get(sid) || 0) + 1);
        }
      }
    }
    // Set preferred shift = the shift the employee worked LEAST last week (rotation)
    const prefMap = ensureWeekPref(wk);
    for (const [empId, shiftCounts] of empShiftCount) {
      if (prefMap.has(empId)) continue;
      // Find which of the employee's allowed shifts they worked the least
      const emp = activeEmployees.find(e => String(e.id) === empId);
      const allowed = emp && Array.isArray(emp.allowedShiftIds) && emp.allowedShiftIds.length
        ? emp.allowedShiftIds.map(String)
        : allShiftIds;
      let leastShift = '';
      let leastCount = Infinity;
      for (const sid of allowed) {
        const count = shiftCounts.get(sid) || 0;
        if (count < leastCount) { leastShift = sid; leastCount = count; }
      }
      if (leastShift) {
        prefMap.set(empId, leastShift);
      }
    }

    // Pre-seed wkMap for pairs: ensure partners rotate TOGETHER to a new shift
    const wkMap = ensureWeekMap(wk);
    for (const [empId, partnerId] of pairMap) {
      if (wkMap.has(empId) || wkMap.has(partnerId)) continue;
      // If both have a preferred shift set and it's the same, lock them together
      const empPref = prefMap.get(empId);
      const partPref = prefMap.get(partnerId);
      if (empPref && empPref === partPref) {
        wkMap.set(empId, empPref);
        wkMap.set(partnerId, empPref);
      }
    }
  }

  for (const dateISO of days) {
    const shifts = effectiveShiftsForDate(settings, dateISO);
    if (debugMode) console.log('[planDays] Date:', dateISO, 'Effective shifts:', shifts.length, shifts.map(s => s.id));
    if (!shifts.length) continue;
    const wk = weekKeyFromISO(dateISO);
    const wkMap = ensureWeekMap(wk);

    const perShiftUsed = new Map<string, Set<string>>();
    const perDayUsed = new Set<string>();

    // existing — use indexed map
    const dayAssigns = assignsByDate.get(dateISO) || [];
    for (const a of dayAssigns) {
      const sid = String(a.shiftId ?? '');
      if (!perShiftUsed.has(sid)) perShiftUsed.set(sid, new Set());
      const set = perShiftUsed.get(sid)!;
      for (const empId of getEmployeeIdsFromAssignment(a)) {
        const idStr = String(empId);
        set.add(idStr);
        perDayUsed.add(idStr);
      }
    }

    // Previous week consistency: find who was on each shift+position 7 days ago
    const prevWeekDate = new Date(parseISODate(dateISO));
    prevWeekDate.setDate(prevWeekDate.getDate() - 7);
    const prevWeekDateISO = toISODate(prevWeekDate);
    const prevWeekAssigns = assignsByDate.get(prevWeekDateISO) || [];
    const prevWeekPosMap = new Map<string, Set<string>>();
    for (const a of prevWeekAssigns) {
      const key = `${String(a.shiftId ?? '')}:${String(a.positionId ?? '')}`;
      if (!prevWeekPosMap.has(key)) prevWeekPosMap.set(key, new Set());
      const set = prevWeekPosMap.get(key)!;
      for (const empId of getEmployeeIdsFromAssignment(a)) {
        set.add(String(empId));
      }
    }

    // Compute shift flexibility: how many of today's planned shifts each employee can work
    const dayPlannedShifts = params.selectedShiftIds?.length
      ? shifts.filter(sh => params.selectedShiftIds!.includes(String(sh.id)))
      : shifts;
    const dayPlannedShiftIds = dayPlannedShifts.map(sh => String(sh.id));
    const flexibilityMap = new Map<string, number>();
    if (dayPlannedShiftIds.length > 1) {
      for (const e of activeEmployees) {
        const count = dayPlannedShiftIds.filter(sid => isEmployeeAllowedOnShift(e, sid)).length;
        flexibilityMap.set(String(e.id), count);
      }
    }

    // Sort shifts: process most constrained first (fewer eligible employees → filled first)
    // This ensures restricted employees get their only available shift before flexible ones take it
    const shiftsToProcess = (params.selectedShiftIds?.length
      ? shifts.filter(sh => params.selectedShiftIds!.includes(String(sh.id)))
      : shifts
    ).slice();
    if (shiftsToProcess.length > 1) {
      const shiftEligibleCount = new Map<string, number>();
      for (const sh of shiftsToProcess) {
        const sid = String(sh.id);
        const count = activeEmployees.filter(e =>
          isEmployeeAllowedOnShift(e, sid) &&
          !isOnVacationIndexed(String(e.id), dateISO, vacsByEmp) &&
          !perDayUsed.has(String(e.id))
        ).length;
        shiftEligibleCount.set(sid, count);
      }
      shiftsToProcess.sort((a, b) => (shiftEligibleCount.get(String(a.id)) || 0) - (shiftEligibleCount.get(String(b.id)) || 0));
    }

    for (const s of shiftsToProcess) {
      const shiftId = String(s.id);

      const usedInShift = perShiftUsed.get(shiftId) || new Set<string>();

      for (const p of positions) {
        const posId = String(p.id);
        
        // Check if position has specific target count for this shift
        const shiftTargetCount = p.targetCounts?.[shiftId];
        const hasShiftTarget = typeof shiftTargetCount === 'number' && shiftTargetCount > 0;
        
        // Use shift-specific target or default to 1
        const target = hasShiftTarget ? shiftTargetCount : (typeof p.targetCount === 'number' && p.targetCount > 0 ? p.targetCount : 1);

        const existing = getAssignmentFromMap(assignsByDate, dateISO, shiftId, posId);
        const existingIds = getEmployeeIdsFromAssignment(existing);

        // Check if any existing assigned employees are on vacation today → remove them
        const vacatingIds = existingIds.filter(id => isOnVacationIndexed(id, dateISO, vacsByEmp));
        const healthyIds = existingIds.filter(id => !isOnVacationIndexed(id, dateISO, vacsByEmp));

        // If we have vacating employees, we need to update the assignment to remove them
        const needsVacReplacement = vacatingIds.length > 0;

        // How many more employees do we need?
        const currentCount = healthyIds.length;
        const needed = target - currentCount;

        // Skip if fully staffed with non-vacating employees
        if (needed <= 0 && !needsVacReplacement) continue;

        // If there are existing healthy employees, mark them as used
        for (const id of healthyIds) {
          perDayUsed.add(id);
          usedInShift.add(id);
        }

        // Use general pool
        let pool = activeEmployees
          .filter((e) => employeeHasPosition(e, posId))
          .filter((e) => isEmployeeAllowedOnShift(e, shiftId))
          .filter((e) => !isOnVacationIndexed(String(e.id), dateISO, vacsByEmp))
          .filter((e) => !perDayUsed.has(String(e.id)))
          .filter((e) => !usedInShift.has(String(e.id)))
          .filter((e) => !healthyIds.includes(String(e.id)));

        // If no replacements needed and no pool, just update to remove vacating
        if (needed <= 0 && needsVacReplacement) {
          // Just remove vacating employees, keep healthy ones
          await apply({ date: dateISO, shiftId, positionId: posId, employeeIds: healthyIds });
          // Update assignsByDate
          const dayArr = assignsByDate.get(dateISO);
          if (dayArr) {
            const idx = dayArr.findIndex(a => String(a.shiftId) === shiftId && String(a.positionId) === posId);
            if (idx >= 0) dayArr[idx] = { ...dayArr[idx], employeeIds: healthyIds } as Assignment;
          }
          created += 0; // no new assignments, just cleanup
          createdDays.add(dateISO);
          continue;
        }

        if (!pool.length && !needsVacReplacement) continue;
        if (!pool.length && needed > 0) {
          // No replacements available but we need to remove vacating employees
          if (needsVacReplacement) {
            await apply({ date: dateISO, shiftId, positionId: posId, employeeIds: healthyIds });
            const dayArr = assignsByDate.get(dateISO);
            if (dayArr) {
              const idx = dayArr.findIndex(a => String(a.shiftId) === shiftId && String(a.positionId) === posId);
              if (idx >= 0) dayArr[idx] = { ...dayArr[idx], employeeIds: healthyIds } as Assignment;
            }
            createdDays.add(dateISO);
          }
          continue;
        }

        let eligiblePool: Employee[] = [];
        for (const e of pool) {
          const id = String(e.id);
          const assigned = wkMap.get(id);
          if (assigned && assigned !== shiftId) continue;
          eligiblePool.push(e);
        }
        // Fallback: if wkMap blocks all candidates, use full pool to avoid empty positions
        const usingFallbackPool = !eligiblePool.length && pool.length > 0;
        if (usingFallbackPool) {
          eligiblePool = pool.slice();
        }
        if (!eligiblePool.length) continue;

        const totalLoad = Array.from(loadMap.values()).reduce((a, b) => a + b, 0);
        const avgLoad = loadMap.size ? totalLoad / loadMap.size : 0;

        // Collect IDs of employees already assigned to this shift today (for pair bonus)
        const assignedToShiftToday = new Set<string>();
        for (const [sid, empSet] of perShiftUsed.entries()) {
          if (sid === shiftId) {
            for (const eid of empSet) assignedToShiftToday.add(eid);
          }
        }

        // Weekly position consistency: who was already on this shift+position this week
        const wpKey = `${shiftId}:${posId}`;
        const wpm = ensureWeekPosMap(wk);
        const weekPosEmps = wpm.get(wpKey);

        const scoreFn = (emp: Employee) => {
          const empAllowed = Array.isArray(emp.allowedShiftIds) && emp.allowedShiftIds.length
            ? emp.allowedShiftIds.map(String)
            : allShiftIds;
          const available = empAllowed.filter((sid) => allShiftIds.includes(String(sid)));
          const prefSid = getPreferredShiftFor(wk, String(emp.id), available);
          let score = scoreAssignment({ emp, shift: s, dateISO, extLoadMap, avgLoad, weekKey: wk, preferredShiftId: prefSid, settings });

          // Weekly consistency bonus: strongly prefer employees already on this shift+position this week
          // -35 is strong enough to beat hash (0-1), rotation (+8), preferred shift (+3),
          // but not so strong that it overrides severe overload (loadDiff²*2 = 32 at +4 over avg)
          if (weekPosEmps?.has(String(emp.id))) {
            score -= 35;
          }

          // Previous week rotation: mild preference to rotate from last week (but not override weekly consistency)
          const prevWeekEmps = prevWeekPosMap.get(wpKey);
          if (prevWeekEmps?.has(String(emp.id))) {
            score += 8;
          }

          // Pair bonus: strongly prefer if partner is already on this shift
          const partnerId = pairMap.get(String(emp.id));
          if (partnerId) {
            if (assignedToShiftToday.has(partnerId)) {
              score -= 200; // strong bonus to be with partner
            } else if (eligiblePool.some(ep => String(ep.id) === partnerId)) {
              score -= 30; // moderate bonus: partner is eligible for this shift too
            }
          }

          // Flexibility: prioritize employees who can work fewer shifts today
          // Prevents flexible employees from taking slots needed by restricted ones
          if (dayPlannedShiftIds.length > 1) {
            const flex = flexibilityMap.get(String(emp.id)) || dayPlannedShiftIds.length;
            score -= 100 * (dayPlannedShiftIds.length - flex);
          }

          // Penalty for breaking weekly shift consistency (fallback mode)
          if (usingFallbackPool) {
            const assignedShift = wkMap.get(String(emp.id));
            if (assignedShift && assignedShift !== shiftId) {
              score += 80;
            }
          }

          return score;
        };

        const prioIds = Array.isArray(p.priorityEmployeeIds) ? p.priorityEmployeeIds.map(String).filter(Boolean) : [];
        const prioSet = new Set(prioIds);
        const prioPool = prioIds.length ? eligiblePool.filter((e) => prioSet.has(String(e.id))) : [];
        const restPool = prioIds.length ? eligiblePool.filter((e) => !prioSet.has(String(e.id))) : eligiblePool;

        const slotsToFill = Math.max(needed, 0);
        let chosen = prioPool.length ? pickBestByScore(prioPool, slotsToFill, scoreFn) : [];
        if (chosen.length < slotsToFill) {
          chosen = chosen.concat(pickBestByScore(restPool, slotsToFill - chosen.length, scoreFn));
        }

        const newIds = chosen.map((e) => String(e.id));
        // Combine existing healthy employees with newly chosen replacements
        const employeeIds = [...healthyIds, ...newIds];
        if (!employeeIds.length) continue;

        await apply({ date: dateISO, shiftId, positionId: posId, employeeIds });

        // Track in assignsByDate so subsequent days/weeks can see these new assignments
        const dayArr = assignsByDate.get(dateISO);
        if (dayArr) {
          const existIdx = dayArr.findIndex(a => String(a.shiftId) === shiftId && String(a.positionId) === posId);
          if (existIdx >= 0) {
            dayArr[existIdx] = { ...dayArr[existIdx], employeeIds } as Assignment;
          } else {
            dayArr.push({ id: '', date: dateISO, shiftId, positionId: posId, employeeIds } as Assignment);
          }
        } else {
          assignsByDate.set(dateISO, [{ id: '', date: dateISO, shiftId, positionId: posId, employeeIds } as Assignment]);
        }

        // Track this assignment for weekly position consistency
        if (!wpm.has(wpKey)) wpm.set(wpKey, new Set());
        const wpTrack = wpm.get(wpKey)!;

        const healthySet = new Set(healthyIds);
        for (const id of employeeIds) {
          usedInShift.add(id);
          perDayUsed.add(id);
          wpTrack.add(id);

          // Only update load/ext for newly assigned employees (not already-existing healthy ones)
          if (!healthySet.has(id)) {
            loadMap.set(id, (loadMap.get(id) || 0) + 1);

            const rec = extLoadMap.get(id) || { total: 0, night: 0, lastShiftByDay: new Map(), weekNight: new Map() };
            rec.total += 1;
            rec.lastShiftByDay.set(dateISO, shiftId);
            if (isNightShift(s)) {
              rec.weekNight.set(wk, (rec.weekNight.get(wk) || 0) + 1);
              rec.night += 1;
            }
            extLoadMap.set(id, rec);
          }

          if (!wkMap.has(id)) {
            wkMap.set(id, shiftId);
            // If paired, also set partner's preferred week shift
            const partnerId = pairMap.get(id);
            if (partnerId && !wkMap.has(partnerId)) {
              wkMap.set(partnerId, shiftId);
            }
          }
        }

        perShiftUsed.set(shiftId, usedInShift);
        created += newIds.length;
        createdDays.add(dateISO);
      }
    }
  }

  return { created, touchedDays: Array.from(createdDays).sort() };
}
