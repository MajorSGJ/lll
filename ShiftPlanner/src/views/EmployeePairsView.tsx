import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { useConfirm } from '../ui/Confirm';

type Pair = { id: string; emp1Id: string; emp2Id: string };

export function EmployeePairsView() {
  const { data, reload } = useStore();
  const confirm = useConfirm();

  const employees = data?.employees || [];
  const settings = data?.settings;
  const pairs: Pair[] = Array.isArray(settings?.employeePairs) ? (settings!.employeePairs as Pair[]) : [];

  const [newEmp1, setNewEmp1] = useState('');
  const [newEmp2, setNewEmp2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const activeEmployees = employees
    .filter(e => e.active !== false)
    .sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, 'pl'));

  async function savePairs(nextPairs: Pair[]) {
    setBusy(true);
    setErr(null);
    try {
      const newSettings = { ...settings, employeePairs: nextPairs };
      const res = await api('settings', 'save', { settings: newSettings });
      if (!res.ok) {
        setErr(res.error || 'save_failed');
        return;
      }
      await reload();
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleAdd() {
    if (!newEmp1 || !newEmp2 || newEmp1 === newEmp2) return;
    const alreadyPaired = pairs.some(p =>
      (p.emp1Id === newEmp1 && p.emp2Id === newEmp2) ||
      (p.emp1Id === newEmp2 && p.emp2Id === newEmp1)
    );
    if (alreadyPaired) return;
    const nextPairs = [...pairs, { id: String(Date.now()), emp1Id: newEmp1, emp2Id: newEmp2 }];
    await savePairs(nextPairs);
    setNewEmp1('');
    setNewEmp2('');
  }

  async function handleDelete(pairId: string) {
    const pair = pairs.find(p => p.id === pairId);
    if (!pair) return;
    const e1 = employees.find(e => String(e.id) === pair.emp1Id);
    const e2 = employees.find(e => String(e.id) === pair.emp2Id);
    const n1 = e1 ? `${e1.name} ${e1.surname}` : pair.emp1Id;
    const n2 = e2 ? `${e2.name} ${e2.surname}` : pair.emp2Id;
    const ok = await confirm({
      title: 'Usuń parę',
      message: `Usunąć parę: ${n1} + ${n2}?`,
      confirmText: 'Usuń',
      cancelText: 'Anuluj',
      variant: 'danger',
    });
    if (!ok) return;
    await savePairs(pairs.filter(p => p.id !== pairId));
  }

  return (
    <div className="panel">
      <h2>Pary pracowników</h2>
      <div className="sub" style={{ marginBottom: 16 }}>
        Pracownicy w parze zawsze pracują razem na tej samej zmianie podczas automatycznego planowania.
      </div>

      {err && <div className="errorBox" style={{ marginBottom: 12 }}>{err}</div>}

      {pairs.length > 0 ? (
        <table className="table" style={{ marginBottom: 20 }}>
          <thead>
            <tr>
              <th>Pracownik 1</th>
              <th>Pracownik 2</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => {
              const e1 = employees.find(e => String(e.id) === pair.emp1Id);
              const e2 = employees.find(e => String(e.id) === pair.emp2Id);
              return (
                <tr key={pair.id}>
                  <td>{e1 ? `${e1.name} ${e1.surname}` : <span className="sub">{pair.emp1Id}</span>}</td>
                  <td>{e2 ? `${e2.name} ${e2.surname}` : <span className="sub">{pair.emp2Id}</span>}</td>
                  <td>
                    <button className="btn danger" type="button" disabled={busy} onClick={() => handleDelete(pair.id)}>
                      Usuń
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="sub" style={{ marginBottom: 20, padding: '16px 0', textAlign: 'center' }}>
          Brak zdefiniowanych par. Dodaj pierwszą parę poniżej.
        </div>
      )}

      <div className="card">
        <div className="cardHeader">
          <div>
            <div className="cardTitle">Dodaj nową parę</div>
            <div className="sub">Wybierz dwóch pracowników, którzy mają zawsze pracować razem.</div>
          </div>
        </div>
        <div className="row" style={{ gap: 10, alignItems: 'flex-end', marginTop: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <div className="label">Pracownik 1</div>
            <select className="select" value={newEmp1} onChange={(e) => setNewEmp1(e.target.value)}>
              <option value="">— wybierz —</option>
              {activeEmployees.map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.surname}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <div className="label">Pracownik 2</div>
            <select className="select" value={newEmp2} onChange={(e) => setNewEmp2(e.target.value)}>
              <option value="">— wybierz —</option>
              {activeEmployees.filter(e => String(e.id) !== newEmp1).map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.surname}</option>
              ))}
            </select>
          </div>
          <button
            className="btn primary"
            type="button"
            disabled={busy || !newEmp1 || !newEmp2 || newEmp1 === newEmp2}
            onClick={handleAdd}
          >
            {busy ? '⏳' : '+ Dodaj parę'}
          </button>
        </div>
      </div>
    </div>
  );
}
