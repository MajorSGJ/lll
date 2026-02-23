import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import type { AppView, Assignment, BootstrapPayload, Employee, Position, ScheduleState } from './types';
import { monthStartISO, toISODate, uniq } from './date';

type IndexedMaps = {
  assignmentsByDate: Map<string, Assignment[]>;
  vacationsByEmployee: Map<string, Array<{ start: string; end: string }>>;
  employeesById: Map<string, Employee>;
  positionsById: Map<string, Position>;
};

type StoreState = {
  view: AppView;
  loading: boolean;
  error: string | null;
  data: BootstrapPayload | null;
  schedule: ScheduleState;
  undoCount: number;
  redoCount: number;
  indexed: IndexedMaps;
};

type StoreActions = {
  setView: (v: AppView) => void;
  reload: () => Promise<BootstrapPayload | null>;
  setSelectedDate: (iso: string) => void;
  setSelectedDates: (isos: string[]) => void;
  setSelection: (isos: string[], primaryISO?: string) => void;
  setVisibleMonth: (monthISO: string) => void;
  pushUndoSnapshot: () => void;
  discardLastUndoSnapshot: () => void;
  undoLastChange: () => Promise<void>;
  redoLastChange: () => Promise<void>;
};

type Store = StoreState & StoreActions;

const StoreCtx = createContext<Store | null>(null);

export function useStore() {
  const s = useContext(StoreCtx);
  if (!s) throw new Error('StoreCtx not mounted');
  return s;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<AppView>('calendar');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BootstrapPayload | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const undoMaxSize = 50;

  const today = useMemo(() => toISODate(new Date()), []);
  const [schedule, setSchedule] = useState<ScheduleState>(() => ({
    selectedDate: today,
    selectedDates: [today],
    visibleMonth: monthStartISO(today),
  }));

  const reload = useCallback(async (): Promise<BootstrapPayload | null> => {
    setLoading(true);
    setError(null);
    try {
      const json = await api<BootstrapPayload>('bootstrap', 'get');
      if (!json.ok) {
        setError(json.error || 'bootstrap_failed');
        setData(null);
        return null;
      }
      // json contains { ok: true, ...payload } -> store only payload
      const { ok: _ok, ...payload } = json as unknown as { ok: true } & BootstrapPayload;
      setData(payload);
      return payload;
    } catch (e) {
      setError(String(e));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setSelectedDate = useCallback((iso: string) => {
    setSchedule((s) => ({ ...s, selectedDate: iso, selectedDates: uniq([iso]) }));
  }, []);

  const setSelectedDates = useCallback((isos: string[]) => {
    const u = uniq(isos);
    const next = u.length ? u : [today];
    setSchedule((s) => ({ ...s, selectedDates: next, selectedDate: next[0] }));
  }, [today]);

  const setSelection = useCallback((isos: string[], primaryISO?: string) => {
    const u = uniq(isos);
    const next = u.length ? u : [today];
    const primary = primaryISO && next.includes(String(primaryISO)) ? String(primaryISO) : next[0];
    setSchedule((s) => ({ ...s, selectedDates: next, selectedDate: primary }));
  }, [today]);

  const setVisibleMonth = useCallback((monthISO: string) => {
    setSchedule((s) => ({ ...s, visibleMonth: monthISO }));
  }, []);

  const pushUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => {
      const snapshot = JSON.stringify(data?.assignments || []);
      const next = prev.concat(snapshot);
      if (next.length > undoMaxSize) return next.slice(next.length - undoMaxSize);
      return next;
    });
    setRedoStack([]);
  }, [data?.assignments]);

  const discardLastUndoSnapshot = useCallback(() => {
    setUndoStack((prev) => (prev.length ? prev.slice(0, -1) : prev));
  }, []);

  function getEmployeeIdsFromAssignment(a: Partial<Assignment> | null | undefined) {
    if (!a) return [];
    if (Array.isArray(a.employeeIds)) return a.employeeIds.map(String).filter(Boolean);
    if (a.employeeId) return [String(a.employeeId)];
    return [];
  }

  const undoLastChange = useCallback(async () => {
    if (undoStack.length === 0) return;
    const snapshot = undoStack[undoStack.length - 1];
    let snapAssignments;
    try {
      snapAssignments = JSON.parse(snapshot);
    } catch {
      setUndoStack((prev) => prev.slice(0, -1));
      return;
    }

    const current = (data?.assignments || []) as Assignment[];
    const currentSnapshot = JSON.stringify(current);
    const snap = (Array.isArray(snapAssignments) ? snapAssignments : []) as Assignment[];

    const currentDates = Array.from(new Set(current.map((a) => String(a.date))));
    const snapshotDates = Array.from(new Set(snap.map((a) => String(a.date))));
    const allDates = Array.from(new Set([...currentDates, ...snapshotDates]));

    const posSet = new Set((data?.positions || []).map((p) => String(p.id)));

    const changes: Array<{ date: string; shiftId: string; positionId: string; employeeIds: string[] }> = [];
    for (const date of allDates) {
      const daySnap = snap.filter((a) => String(a.date) === String(date));
      const dayCur = current.filter((a) => String(a.date) === String(date));
      const keys = new Set<string>();
      daySnap.forEach((a) => keys.add(`${String(a.shiftId)}:${String(a.positionId)}`));
      dayCur.forEach((a) => keys.add(`${String(a.shiftId)}:${String(a.positionId)}`));

      for (const key of keys) {
        const [shiftId, positionId] = key.split(':');
        if (!posSet.has(String(positionId))) continue;
        const snapEntry = daySnap.find((a) => String(a.shiftId) === String(shiftId) && String(a.positionId) === String(positionId));
        const employeeIds = getEmployeeIdsFromAssignment(snapEntry);
        changes.push({ date, shiftId, positionId, employeeIds });
      }
    }

    try {
      const results = await Promise.all(
        changes.map((c) => api('assignments', 'set', { ...c, allowDoubleShift: true })),
      );
      const bad = results.find((r) => !r.ok);
      if (bad && !bad.ok) return;
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => {
        const next = prev.concat(currentSnapshot);
        if (next.length > undoMaxSize) return next.slice(next.length - undoMaxSize);
        return next;
      });
      await reload();
    } catch {
      // keep snapshot
    }
  }, [undoStack, data?.assignments, data?.positions, reload]);

  const redoLastChange = useCallback(async () => {
    if (redoStack.length === 0) return;
    const snapshot = redoStack[redoStack.length - 1];
    let snapAssignments;
    try {
      snapAssignments = JSON.parse(snapshot);
    } catch {
      setRedoStack((prev) => prev.slice(0, -1));
      return;
    }

    const current = (data?.assignments || []) as Assignment[];
    const currentSnapshot = JSON.stringify(current);
    const snap = (Array.isArray(snapAssignments) ? snapAssignments : []) as Assignment[];

    const currentDates = Array.from(new Set(current.map((a) => String(a.date))));
    const snapshotDates = Array.from(new Set(snap.map((a) => String(a.date))));
    const allDates = Array.from(new Set([...currentDates, ...snapshotDates]));

    const posSet = new Set((data?.positions || []).map((p) => String(p.id)));

    const changes: Array<{ date: string; shiftId: string; positionId: string; employeeIds: string[] }> = [];
    for (const date of allDates) {
      const daySnap = snap.filter((a) => String(a.date) === String(date));
      const dayCur = current.filter((a) => String(a.date) === String(date));
      const keys = new Set<string>();
      daySnap.forEach((a) => keys.add(`${String(a.shiftId)}:${String(a.positionId)}`));
      dayCur.forEach((a) => keys.add(`${String(a.shiftId)}:${String(a.positionId)}`));

      for (const key of keys) {
        const [shiftId, positionId] = key.split(':');
        if (!posSet.has(String(positionId))) continue;
        const snapEntry = daySnap.find((a) => String(a.shiftId) === String(shiftId) && String(a.positionId) === String(positionId));
        const employeeIds = getEmployeeIdsFromAssignment(snapEntry);
        changes.push({ date, shiftId, positionId, employeeIds });
      }
    }

    try {
      const results = await Promise.all(
        changes.map((c) => api('assignments', 'set', { ...c, allowDoubleShift: true })),
      );
      const bad = results.find((r) => !r.ok);
      if (bad && !bad.ok) return;
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => {
        const next = prev.concat(currentSnapshot);
        if (next.length > undoMaxSize) return next.slice(next.length - undoMaxSize);
        return next;
      });
      await reload();
    } catch {
      // keep snapshot
    }
  }, [redoStack, data?.assignments, data?.positions, reload]);

  const indexed = useMemo<IndexedMaps>(() => {
    const assignmentsByDate = new Map<string, Assignment[]>();
    for (const a of (data?.assignments || [])) {
      const key = String(a.date);
      const arr = assignmentsByDate.get(key);
      if (arr) arr.push(a);
      else assignmentsByDate.set(key, [a]);
    }
    const vacationsByEmployee = new Map<string, Array<{ start: string; end: string }>>();
    for (const v of (data?.vacations || [])) {
      const key = String(v.employeeId);
      const arr = vacationsByEmployee.get(key);
      const entry = { start: v.start, end: v.end };
      if (arr) arr.push(entry);
      else vacationsByEmployee.set(key, [entry]);
    }
    const employeesById = new Map<string, Employee>();
    for (const e of (data?.employees || [])) {
      employeesById.set(String(e.id), e);
    }
    const positionsById = new Map<string, Position>();
    for (const p of (data?.positions || [])) {
      positionsById.set(String(p.id), p);
    }
    return { assignmentsByDate, vacationsByEmployee, employeesById, positionsById };
  }, [data?.assignments, data?.vacations, data?.employees, data?.positions]);

  const value = useMemo<Store>(
    () => ({
      view,
      loading,
      error,
      data,
      schedule,
      undoCount: undoStack.length,
      redoCount: redoStack.length,
      indexed,
      setView,
      reload,
      setSelectedDate,
      setSelectedDates,
      setSelection,
      setVisibleMonth,
      pushUndoSnapshot,
      discardLastUndoSnapshot,
      undoLastChange,
      redoLastChange,
    }),
    [
      view,
      loading,
      error,
      data,
      schedule,
      undoStack.length,
      redoStack.length,
      indexed,
      reload,
      setSelectedDate,
      setSelectedDates,
      setSelection,
      setVisibleMonth,
      pushUndoSnapshot,
      discardLastUndoSnapshot,
      undoLastChange,
      redoLastChange,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
