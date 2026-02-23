import { useMemo, useState } from 'react';
import { api } from '../api';
import { useStore } from '../store';
import type { Employee } from '../types';
import { Modal } from '../ui/Modal';
import { useAlert, useConfirm } from '../ui/Confirm';

function fullName(e: Employee) {
  return `${e.name || ''} ${e.surname || ''}`.trim();
}

type EditModel = {
  id?: string;
  name: string;
  surname: string;
  phone: string;
  active: boolean;
  positionIds: string[];
  allowedShiftIds: string[];
};

type BulkMode = 'nochange' | 'replace' | 'add' | 'remove';

type BulkModel = {
  activeMode: 'nochange' | 'active' | 'inactive';
  positionsMode: BulkMode;
  positions: string[];
  shiftsMode: BulkMode;
  shifts: string[];
};

export function EmployeesView() {
  const { data, reload } = useStore();
  const confirm = useConfirm();
  const alert = useAlert();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [model, setModel] = useState<EditModel>({
    name: '',
    surname: '',
    phone: '',
    active: true,
    positionIds: [],
    allowedShiftIds: [],
  });

  const employees = data?.employees || [];
  const positions = data?.positions || [];
  const shifts = data?.settings?.shifts || [];

  const positionNameById = useMemo(() => {
    const map = new Map<string, string>();
    positions.forEach((p) => map.set(String(p.id), String(p.name || '')));
    return map;
  }, [positions]);

  const shiftNameById = useMemo(() => {
    const map = new Map<string, string>();
    shifts.forEach((s) => map.set(String(s.id), String(s.name || '')));
    return map;
  }, [shifts]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    const list = employees.slice();
    list.sort((a, b) => fullName(a).localeCompare(fullName(b), 'pl'));
    if (!qq) return list;
    return list.filter((e) => {
      const hay = `${fullName(e)} ${e.phone || ''} ${e.id || ''}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [employees, q]);

  const selectedSet = useMemo(() => new Set(selectedIds.map(String)), [selectedIds]);

  const [bulkModel, setBulkModel] = useState<BulkModel>({
    activeMode: 'nochange',
    positionsMode: 'nochange',
    positions: [],
    shiftsMode: 'nochange',
    shifts: [],
  });

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const s = new Set(prev.map(String));
      if (s.has(String(id))) s.delete(String(id));
      else s.add(String(id));
      return Array.from(s);
    });
  }

  function selectAllFiltered(on: boolean) {
    if (!on) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filtered.map((e) => String(e.id)));
  }

  function openBulkEdit() {
    setErr(null);
    setBulkModel({
      activeMode: 'nochange',
      positionsMode: 'nochange',
      positions: [],
      shiftsMode: 'nochange',
      shifts: [],
    });
    setBulkOpen(true);
  }

  function openCreate() {
    setErr(null);
    setModel({ name: '', surname: '', phone: '', active: true, positionIds: [], allowedShiftIds: [] });
    setOpen(true);
  }

  function applyBulkArray(mode: BulkMode, prev: string[], chosen: string[]) {
    const p = Array.isArray(prev) ? prev.map(String).filter(Boolean) : [];
    const c = Array.isArray(chosen) ? chosen.map(String).filter(Boolean) : [];
    if (mode === 'nochange') return p;
    if (mode === 'replace') return Array.from(new Set(c));
    if (mode === 'add') return Array.from(new Set([...p, ...c]));
    // remove
    const remove = new Set(c);
    return p.filter((x) => !remove.has(String(x)));
  }

  async function saveBulk() {
    setErr(null);
    if (!selectedIds.length) {
      setBulkOpen(false);
      return;
    }
    setSaving(true);
    try {
      const map = new Map(employees.map((e) => [String(e.id), e] as const));

      const updates = selectedIds
        .map((id) => String(id))
        .map((id) => {
          const e = map.get(id);
          if (!e) return null;

          const next: Record<string, unknown> = { id };

          if (bulkModel.activeMode === 'active') next.active = true;
          if (bulkModel.activeMode === 'inactive') next.active = false;

          if (bulkModel.positionsMode !== 'nochange') {
            const prev = Array.isArray(e.positionIds) ? e.positionIds.map(String) : [];
            next.positionIds = applyBulkArray(bulkModel.positionsMode, prev, bulkModel.positions);
          }

          if (bulkModel.shiftsMode !== 'nochange') {
            const prev = Array.isArray(e.allowedShiftIds) ? e.allowedShiftIds.map(String) : [];
            next.allowedShiftIds = applyBulkArray(bulkModel.shiftsMode, prev, bulkModel.shifts);
          }

          return next;
        })
        .filter(Boolean) as Record<string, unknown>[];

      const res = await Promise.all(updates.map((u) => api('employees', 'update', u)));
      const bad = res.find((r) => !r.ok);
      if (bad && !bad.ok) {
        setErr(bad.error || 'bulk_update_failed');
        return;
      }

      setBulkOpen(false);
      setSelectedIds([]);
      await reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  function openEdit(e: Employee) {
    setErr(null);
    setModel({
      id: e.id,
      name: e.name || '',
      surname: e.surname || '',
      phone: e.phone || '',
      active: e.active !== false,
      positionIds: Array.isArray(e.positionIds) ? e.positionIds.map(String) : [],
      allowedShiftIds: Array.isArray(e.allowedShiftIds) ? e.allowedShiftIds.map(String) : [],
    });
    setOpen(true);
  }

  async function save() {
    setErr(null);
    setSaving(true);
    try {
      const payload = {
        name: model.name.trim(),
        surname: model.surname.trim(),
        phone: model.phone.trim(),
        active: model.active,
        positionIds: model.positionIds,
        allowedShiftIds: model.allowedShiftIds,
      };

      if (!payload.name || !payload.surname) {
        setErr('Wymagane: imię i nazwisko');
        return;
      }

      if (model.id) {
        const res = await api('employees', 'update', { id: model.id, ...payload });
        if (!res.ok) {
          setErr(res.error || 'update_failed');
          return;
        }
      } else {
        const res = await api('employees', 'create', payload);
        if (!res.ok) {
          setErr(res.error || 'create_failed');
          return;
        }
      }

      setOpen(false);
      await reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  }

  async function del(id: string) {
    const ok = await confirm({
      title: 'Usuń pracownika',
      message: 'Usunąć pracownika?',
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    });
    if (!ok) return;
    const res = await api('employees', 'delete', { id });
    if (!res.ok) {
      await alert({ title: 'Błąd', message: res.error || 'delete_failed', variant: 'danger' });
      return;
    }
    await reload();
  }

  const vacations = data?.vacations || [];
  const activeCount = employees.filter(e => e.active !== false).length;
  const vacationsCount = vacations.length;
  const employeesWithVacations = new Set(vacations.map(v => v.employeeId)).size;

  return (
    <div className="panel">
      <div className="kpi" style={{ marginBottom: 14 }}>
        <div className="kpiItem"><div className="kpiVal">{employees.length}</div><div className="kpiLab">Pracownicy</div></div>
        <div className="kpiItem"><div className="kpiVal">{activeCount}</div><div className="kpiLab">Aktywni</div></div>
        <div className="kpiItem"><div className="kpiVal">{vacationsCount}</div><div className="kpiLab">Wpisy urlopów</div></div>
        <div className="kpiItem"><div className="kpiVal">{employeesWithVacations}</div><div className="kpiLab">Osób z urlopami</div></div>
      </div>

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Pracownicy</div>
            <div className="sub">Dodawaj pracowników i przypisuj urlopy.</div>
          </div>
          <button className="btn primary" type="button" onClick={openCreate}>
            ＋ Dodaj pracownika
          </button>
        </div>

        <div className="row" style={{ marginTop: 12, justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="sub">Zaznaczone: <strong>{selectedIds.length}</strong></div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Szukaj…" style={{ minWidth: 150 }} />
            <button className="btn" type="button" onClick={() => selectAllFiltered(true)}>Zaznacz wszystko</button>
            <button className="btn" type="button" onClick={() => setSelectedIds([])}>Wyczyść</button>
            <button className="btn primary" type="button" onClick={openBulkEdit} disabled={!selectedIds.length}>Masowa edycja</button>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && selectedIds.length === filtered.length}
                  onChange={(e) => selectAllFiltered(e.target.checked)}
                />
              </th>
              <th>Pracownik</th>
              <th>Telefon</th>
              <th>Status</th>
              <th>Stanowiska</th>
              <th>Zmiany</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length ? (
              filtered.map((e) => (
                <tr key={e.id}>
                  <td>
                    <input type="checkbox" checked={selectedSet.has(String(e.id))} onChange={() => toggleSelected(String(e.id))} />
                  </td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{fullName(e)}</div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      {e.id}
                    </div>
                  </td>
                  <td>{e.phone || '—'}</td>
                  <td>{e.active === false ? <span className="badge">Nieaktywny</span> : <span className="badge ok">Aktywny</span>}</td>
                  <td className="muted" style={{ maxWidth: 260 }}>
                    {Array.isArray(e.positionIds) && e.positionIds.length
                      ? e.positionIds
                          .map((id) => positionNameById.get(String(id)) || String(id))
                          .filter(Boolean)
                          .join(', ')
                      : '—'}
                  </td>
                  <td className="muted" style={{ maxWidth: 200 }}>
                    {Array.isArray(e.allowedShiftIds) && e.allowedShiftIds.length
                      ? `Tylko: ${e.allowedShiftIds
                          .map((id) => shiftNameById.get(String(id)) || String(id))
                          .filter(Boolean)
                          .join(', ')}`
                      : 'Wszystkie zmiany'}
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn" type="button" onClick={() => openEdit(e)}>
                      Edytuj
                    </button>{' '}
                    <button className="btn danger" type="button" onClick={() => del(e.id)}>
                      Usuń
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 18 }}>
                  Brak pracowników
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title={model.id ? 'Edytuj pracownika' : 'Dodaj pracownika'} onClose={() => (saving ? null : setOpen(false))}>
        <div className="grid2">
          <div>
            <div className="label">Imię</div>
            <input className="input" value={model.name} onChange={(e) => setModel((m) => ({ ...m, name: e.target.value }))} />
          </div>
          <div>
            <div className="label">Nazwisko</div>
            <input className="input" value={model.surname} onChange={(e) => setModel((m) => ({ ...m, surname: e.target.value }))} />
          </div>
          <div>
            <div className="label">Telefon</div>
            <input className="input" value={model.phone} onChange={(e) => setModel((m) => ({ ...m, phone: e.target.value }))} />
          </div>
          <label className="row" style={{ alignItems: 'center', gap: 10, paddingTop: 18 }}>
            <input
              type="checkbox"
              checked={model.active}
              onChange={(e) => setModel((m) => ({ ...m, active: e.target.checked }))}
            />
            <div>
              <div className="label">Aktywny</div>
              <div className="muted">Nieaktywny pracownik nie jest brany do automatyzacji</div>
            </div>
          </label>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Stanowiska</div>
            <div className="chips">
              {positions.length ? (
                positions
                  .slice()
                  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
                  .map((p) => {
                    const on = model.positionIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={on ? 'chip on' : 'chip'}
                        onClick={() =>
                          setModel((m) => ({
                            ...m,
                            positionIds: on ? m.positionIds.filter((x) => x !== p.id) : [...m.positionIds, p.id],
                          }))
                        }
                      >
                        {p.name}
                      </button>
                    );
                  })
              ) : (
                <div className="muted">Brak stanowisk</div>
              )}
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Dozwolone zmiany</div>
            <div className="chips">
              {shifts.length ? (
                shifts.map((s) => {
                  const on = model.allowedShiftIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() =>
                        setModel((m) => ({
                          ...m,
                          allowedShiftIds: on
                            ? m.allowedShiftIds.filter((x) => x !== s.id)
                            : [...m.allowedShiftIds, s.id],
                        }))
                      }
                    >
                      {s.name}
                    </button>
                  );
                })
              ) : (
                <div className="muted">Brak zmian w ustawieniach</div>
              )}
            </div>
          </div>

          {err ? (
            <div className="errorBox" style={{ gridColumn: '1 / -1' }}>
              {err}
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, gridColumn: '1 / -1' }}>
            <button className="btn" type="button" onClick={() => setOpen(false)} disabled={saving}>
              Anuluj
            </button>
            <button className="btn primary" type="button" onClick={save} disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zapisz'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={bulkOpen} title={`Masowa edycja (${selectedIds.length})`} onClose={() => (saving ? null : setBulkOpen(false))}>
        <div className="grid2">
          <div>
            <div className="label">Aktywność</div>
            <select
              className="input"
              value={bulkModel.activeMode}
              onChange={(e) => setBulkModel((m) => ({ ...m, activeMode: e.target.value as BulkModel['activeMode'] }))}
            >
              <option value="nochange">Bez zmian</option>
              <option value="active">Ustaw aktywny</option>
              <option value="inactive">Ustaw nieaktywny</option>
            </select>
          </div>

          <div>
            <div className="label">Tryb zmiany stanowisk</div>
            <select
              className="input"
              value={bulkModel.positionsMode}
              onChange={(e) => setBulkModel((m) => ({ ...m, positionsMode: e.target.value as BulkMode }))}
            >
              <option value="nochange">Bez zmian</option>
              <option value="replace">Nadpisz</option>
              <option value="add">Dodaj</option>
              <option value="remove">Usuń</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Stanowiska</div>
            <div className="chips">
              {positions.length ? (
                positions
                  .slice()
                  .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pl'))
                  .map((p) => {
                    const on = bulkModel.positions.includes(p.id)
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={on ? 'chip on' : 'chip'}
                        onClick={() =>
                          setBulkModel((m) => ({
                            ...m,
                            positions: on ? m.positions.filter((x) => x !== p.id) : [...m.positions, p.id],
                          }))
                        }
                      >
                        {p.name}
                      </button>
                    )
                  })
              ) : (
                <div className="muted">Brak stanowisk</div>
              )}
            </div>
          </div>

          <div>
            <div className="label">Tryb zmiany zmian</div>
            <select
              className="input"
              value={bulkModel.shiftsMode}
              onChange={(e) => setBulkModel((m) => ({ ...m, shiftsMode: e.target.value as BulkMode }))}
            >
              <option value="nochange">Bez zmian</option>
              <option value="replace">Nadpisz</option>
              <option value="add">Dodaj</option>
              <option value="remove">Usuń</option>
            </select>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <div className="label">Dozwolone zmiany</div>
            <div className="chips">
              {shifts.length ? (
                shifts.map((s) => {
                  const on = bulkModel.shifts.includes(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      className={on ? 'chip on' : 'chip'}
                      onClick={() =>
                        setBulkModel((m) => ({
                          ...m,
                          shifts: on ? m.shifts.filter((x) => x !== s.id) : [...m.shifts, s.id],
                        }))
                      }
                    >
                      {s.name}
                    </button>
                  )
                })
              ) : (
                <div className="muted">Brak zmian w ustawieniach</div>
              )}
            </div>
          </div>

          {err ? (
            <div className="errorBox" style={{ gridColumn: '1 / -1' }}>
              {err}
            </div>
          ) : null}

          <div className="row" style={{ justifyContent: 'flex-end', gap: 10, gridColumn: '1 / -1' }}>
            <button className="btn" type="button" onClick={() => setBulkOpen(false)} disabled={saving}>
              Anuluj
            </button>
            <button className="btn primary" type="button" onClick={saveBulk} disabled={saving}>
              {saving ? 'Zapisywanie…' : 'Zastosuj'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
