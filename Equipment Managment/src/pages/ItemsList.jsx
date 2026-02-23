import React, { useState, useMemo } from 'react';
import { calcDaysLeft, getExpiryDate, formatDate, getStatusInfo, todayISO } from '../utils/dates';
import ItemForm from '../components/ItemForm';

export default function ItemsList({ items, categories, controlTypes, toolTypes, onAdd, onUpdate, onDelete, onUpdateDate, onViewCard, darkMode }) {
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [sortBy, setSortBy] = useState('daysLeft');
  const [sortDir, setSortDir] = useState('asc');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const d = darkMode;

  const enriched = useMemo(() => {
    return items
      .map((item) => {
        const daysLeft = calcDaysLeft(item.last_date, item.interval_days);
        const expiryDate = getExpiryDate(item.last_date, item.interval_days);
        const status = getStatusInfo(daysLeft);
        return { ...item, daysLeft, expiryDate, status };
      })
      .filter((item) => {
        const q = search.toLowerCase();
        const matchSearch =
          !search ||
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          String(item.id).includes(q) ||
          (item.nr_narzedzia || '').toLowerCase().includes(q) ||
          (item.assigned_to || '').toLowerCase().includes(q) ||
          (item.tool_type || '').toLowerCase().includes(q);
        const matchCat = !filterCategory || item.category === filterCategory;
        const matchAssignee = !filterAssignee || (item.assigned_to || '').toLowerCase().includes(filterAssignee.toLowerCase());
        const matchStatus = !filterStatus ||
          (filterStatus === 'expired' && item.daysLeft <= 0) ||
          (filterStatus === 'soon' && item.daysLeft > 0 && item.daysLeft <= 30) ||
          (filterStatus === 'upcoming' && item.daysLeft > 30 && item.daysLeft <= 90) ||
          (filterStatus === 'ok' && item.daysLeft > 90);
        const expDateStr = item.expiryDate instanceof Date ? item.expiryDate.toISOString().split('T')[0] : '';
        const matchDateFrom = !filterDateFrom || expDateStr >= filterDateFrom;
        const matchDateTo = !filterDateTo || expDateStr <= filterDateTo;
        return matchSearch && matchCat && matchAssignee && matchStatus && matchDateFrom && matchDateTo;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'daysLeft') cmp = a.daysLeft - b.daysLeft;
        else if (sortBy === 'name') cmp = a.name.localeCompare(b.name, 'pl');
        else if (sortBy === 'category') cmp = (a.category || '').localeCompare(b.category || '', 'pl');
        else if (sortBy === 'assigned_to') cmp = (a.assigned_to || '').localeCompare(b.assigned_to || '', 'pl');
        else if (sortBy === 'last_date') cmp = (a.last_date || '').localeCompare(b.last_date || '');
        else if (sortBy === 'tool_type') cmp = (a.tool_type || '').localeCompare(b.tool_type || '', 'pl');
        else if (sortBy === 'nr_narzedzia') cmp = (a.nr_narzedzia || '').localeCompare(b.nr_narzedzia || '', 'pl');
        else if (sortBy === 'id') cmp = (a.id || 0) - (b.id || 0);
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [items, search, filterCategory, filterAssignee, filterStatus, filterDateFrom, filterDateTo, sortBy, sortDir]);

  const handleSave = async (item) => {
    if (item.id) {
      await onUpdate(item);
    } else {
      await onAdd(item);
    }
    setShowForm(false);
    setEditItem(null);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    await onDelete(id);
    setConfirmDelete(null);
  };

  const handleToggleNotifications = async (item) => {
    const updated = { ...item };
    updated.notifications_enabled = !item.notifications_enabled && item.notifications_enabled !== 0 ? false : true;
    if (item.notifications_enabled === 1 || item.notifications_enabled === true) updated.notifications_enabled = false;
    else updated.notifications_enabled = true;
    await onUpdate(updated);
  };

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
  };

  const clearFilters = () => {
    setSearch(''); setFilterCategory(''); setFilterAssignee(''); setFilterStatus('');
    setFilterDateFrom(''); setFilterDateTo('');
  };

  const hasActiveFilters = filterCategory || filterAssignee || filterStatus || filterDateFrom || filterDateTo;

  const usedCategories = useMemo(() => {
    const cats = new Set(items.map((i) => i.category));
    return [...cats].sort();
  }, [items]);

  const usedAssignees = useMemo(() => {
    const set = new Set(items.map((i) => i.assigned_to).filter(Boolean));
    return [...set].sort();
  }, [items]);

  const inputCls = `border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none ${d ? 'bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500' : 'bg-white border-gray-200'}`;

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-primary ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const formatToolParams = (item) => {
    if (!item.tool_type) return null;
    const params = item.tool_params || {};
    const filledParams = Object.entries(params).filter(([, v]) => v);
    if (filledParams.length === 0) return item.tool_type;
    return `${item.tool_type}: ${filledParams.map(([k, v]) => `${k} ${v}`).join(', ')}`;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${d ? 'text-gray-100' : 'text-gray-800'}`}>Baza danych</h2>
          <p className={`text-sm mt-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Zarządzaj urządzeniami, maszynami i sprzętem</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Dodaj element
        </button>
      </div>

      {/* Search + filter toggle */}
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          placeholder="Szukaj po nazwie, nr narzędzia, opisie, przypisaniu, typie..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex-1 ${inputCls}`}
        />
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer flex items-center gap-2 ${
            showFilters || hasActiveFilters
              ? 'bg-primary text-white border-primary'
              : d ? 'border-gray-700 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtry {hasActiveFilters ? '●' : ''}
        </button>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className={`rounded-xl border p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <div>
            <label className={`block text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Kategoria</label>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={`w-full cursor-pointer ${inputCls}`}>
              <option value="">Wszystkie</option>
              {usedCategories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Przypisany do</label>
            <input type="text" placeholder="Szukaj po przypisaniu..." value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)} className={`w-full ${inputCls}`} list="assignee-list" />
            <datalist id="assignee-list">
              {usedAssignees.map((a) => <option key={a} value={a} />)}
            </datalist>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`w-full cursor-pointer ${inputCls}`}>
              <option value="">Wszystkie</option>
              <option value="expired">Przeterminowane</option>
              <option value="soon">Wkrótce (≤30 dni)</option>
              <option value="upcoming">Nadchodzące (≤90 dni)</option>
              <option value="ok">W porządku (90+ dni)</option>
            </select>
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Data wygaśnięcia od</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Data wygaśnięcia do</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} className={`w-full ${inputCls}`} />
          </div>
          <div>
            <label className={`block text-xs font-medium mb-1 ${d ? 'text-gray-400' : 'text-gray-500'}`}>Sortuj wg</label>
            <select value={`${sortBy}_${sortDir}`} onChange={(e) => { const [f, dir] = e.target.value.split('_'); setSortBy(f); setSortDir(dir); }} className={`w-full cursor-pointer ${inputCls}`}>
              <option value="daysLeft_asc">Pozostało (rosnąco)</option>
              <option value="daysLeft_desc">Pozostało (malejąco)</option>
              <option value="name_asc">Nazwa (A-Z)</option>
              <option value="name_desc">Nazwa (Z-A)</option>
              <option value="category_asc">Kategoria (A-Z)</option>
              <option value="assigned_to_asc">Przypisany (A-Z)</option>
              <option value="tool_type_asc">Typ narzędzia (A-Z)</option>
              <option value="tool_type_desc">Typ narzędzia (Z-A)</option>
              <option value="nr_narzedzia_asc">Nr narzędzia (A-Z)</option>
              <option value="nr_narzedzia_desc">Nr narzędzia (Z-A)</option>
              <option value="last_date_asc">Data (najstarsze)</option>
              <option value="last_date_desc">Data (najnowsze)</option>
              <option value="id_asc">Nr ID (rosnąco)</option>
              <option value="id_desc">Nr ID (malejąco)</option>
            </select>
          </div>
          {hasActiveFilters && (
            <div className="col-span-full flex justify-end">
              <button onClick={clearFilters} className={`text-sm font-medium cursor-pointer ${d ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>
                Wyczyść filtry
              </button>
            </div>
          )}
        </div>
      )}

      <p className={`text-xs mb-4 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
        Wyniki: {enriched.length} / {items.length}
      </p>

      {/* Table */}
      {enriched.length > 0 ? (
        <div className={`rounded-xl border shadow-sm overflow-x-auto ${d ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${d ? 'bg-gray-800/80 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                <th className={`text-left px-4 py-3 font-semibold ${d ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('nr_narzedzia')}>Nr narz.<SortIcon field="nr_narzedzia" /></th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('name')}>Nazwa<SortIcon field="name" /></th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('category')}>Kategoria<SortIcon field="category" /></th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('assigned_to')}>Przypisany<SortIcon field="assigned_to" /></th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('tool_type')}>Typ narz.<SortIcon field="tool_type" /></th>
                <th className={`text-left px-4 py-3 font-semibold ${d ? 'text-gray-400' : 'text-gray-600'}`}>Typ kontroli</th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('last_date')}>Ostatnia<SortIcon field="last_date" /></th>
                <th className={`text-left px-4 py-3 font-semibold ${d ? 'text-gray-400' : 'text-gray-600'}`}>Wygasa</th>
                <th className={`text-left px-4 py-3 font-semibold cursor-pointer select-none ${d ? 'text-gray-400' : 'text-gray-600'}`} onClick={() => handleSort('daysLeft')}>Pozostało<SortIcon field="daysLeft" /></th>
                <th className={`text-left px-4 py-3 font-semibold ${d ? 'text-gray-400' : 'text-gray-600'}`}>Powiad.</th>
                <th className={`text-right px-4 py-3 font-semibold ${d ? 'text-gray-400' : 'text-gray-600'}`}>Akcje</th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((item) => (
                <tr key={item.id} className={`border-b transition-colors ${d ? 'border-gray-700 hover:bg-gray-700/40' : 'border-gray-50 hover:bg-gray-50/50'}`}>
                  <td className="px-4 py-3">
                    <span className={`w-3 h-3 rounded-full inline-block ${item.status.dot}`}></span>
                  </td>
                  <td className={`px-4 py-3 font-mono ${d ? 'text-gray-400' : 'text-gray-500'}`}>{item.nr_narzedzia || '—'}</td>
                  <td className="px-4 py-3">
                    <div>
                      <span className={`font-medium ${d ? 'text-gray-100' : 'text-gray-800'}`}>{item.name}</span>
                      {item.description && (
                        <p className={`text-xs mt-0.5 truncate max-w-[200px] ${d ? 'text-gray-500' : 'text-gray-400'}`}>{item.description}</p>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{item.category}</td>
                  <td className={`px-4 py-3 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{item.assigned_to || '—'}</td>
                  <td className={`px-4 py-3 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{item.tool_type || '—'}</td>
                  <td className={`px-4 py-3 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{item.interval_label || '—'}</td>
                  <td className={`px-4 py-3 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(item.last_date)}</td>
                  <td className={`px-4 py-3 ${d ? 'text-gray-300' : 'text-gray-600'}`}>{formatDate(item.expiryDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.status.color}`}>
                      {item.daysLeft > 0 ? `${item.daysLeft} dni` : item.daysLeft === 0 ? 'Dziś' : `${Math.abs(item.daysLeft)} dni temu`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleNotifications(item)}
                      title={item.notifications_enabled && item.notifications_enabled !== 0 ? 'Kliknij aby wyłączyć powiadomienia' : 'Kliknij aby włączyć powiadomienia'}
                      className={`p-1.5 rounded-md transition-colors cursor-pointer ${item.notifications_enabled && item.notifications_enabled !== 0 ? 'text-primary hover:bg-primary/10' : d ? 'text-gray-600 hover:text-gray-400 hover:bg-gray-700' : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'}`}
                    >
                      {item.notifications_enabled && item.notifications_enabled !== 0
                        ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /><line x1="3" y1="3" x2="21" y2="21" strokeLinecap="round" /></svg>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Karta button */}
                      <button
                        onClick={() => onViewCard(item.id)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${d ? 'text-gray-400 hover:text-blue-400 hover:bg-gray-700' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50'}`}
                        title="Karta"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${d ? 'text-gray-400 hover:text-primary hover:bg-gray-700' : 'text-gray-400 hover:text-primary hover:bg-primary/10'}`}
                        title="Edytuj"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {confirmDelete === item.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 cursor-pointer"
                          >
                            Potwierdź
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer ${d ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                          >
                            Anuluj
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(item.id)}
                          className={`p-1.5 rounded-md transition-colors cursor-pointer ${d ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                          title="Usuń"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`text-center py-20 ${d ? 'text-gray-500' : 'text-gray-400'}`}>
          <p className="text-5xl mb-4">🗄️</p>
          <p className="text-lg font-medium">Brak elementów</p>
          <p className="text-sm mt-1">Kliknij „Dodaj element" aby rozpocząć</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <ItemForm
          item={editItem}
          categories={categories}
          controlTypes={controlTypes}
          toolTypes={toolTypes}
          darkMode={darkMode}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

