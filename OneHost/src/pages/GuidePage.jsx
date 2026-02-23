import React, { useState } from 'react';
import { Link } from 'react-router-dom';

/* ══════════════════════════════════════════════════════════════
   SVG helper functions — reused across illustrations
   ══════════════════════════════════════════════════════════════ */

function Chrome({ w }) {
  return (
    <g>
      <rect width={w} height="28" fill="#1e1e1e" />
      <circle cx="14" cy="14" r="4" fill="#ff5f57" />
      <circle cx="28" cy="14" r="4" fill="#ffbd2e" />
      <circle cx="42" cy="14" r="4" fill="#28c840" />
      <rect x={w / 2 - 80} y="7" width="160" height="14" rx="4" fill="rgba(255,255,255,.08)" />
    </g>
  );
}

/* ShiftPlanner sidebar — dark theme, emoji nav, teal accent */
function SpNav({ h, active = 0 }) {
  const items = ['📅 Kalendarz', '👷 Pracownicy', '🤝 Pary pracowników', '🏷️ Stanowiska', '🏖️ Urlopy', '🧩 Planowanie tyg.', '📧 Email', '⚙️ Opcje'];
  return (
    <g>
      <rect x="0" y="28" width="170" height={h - 28} fill="#0a0a0b" />
      <rect x="8" y="36" width="154" height="38" rx="8" fill="rgba(20,184,166,.08)" />
      <text x="18" y="53" fontSize="11" fontWeight="700" fill="#14b8a6">{'🗓️ ShiftPlanner'}</text>
      <text x="18" y="66" fontSize="7.5" fill="#52525b">Planer zmian</text>
      {items.map((t, i) => (
        <g key={i}>
          {i === active && <rect x="6" y={84 + i * 26} width="158" height="22" rx="5" fill="rgba(20,184,166,.16)" />}
          {i === active && <rect x="6" y={84 + i * 26} width="2.5" height="22" rx="1" fill="#14b8a6" />}
          <text x="18" y={99 + i * 26} fontSize="9" fill={i === active ? '#5eead4' : '#71717a'}>{t}</text>
        </g>
      ))}
      <text x="18" y={h - 10} fontSize="7.5" fill="#3f3f46">{'🌙 Ciemny motyw'}</text>
    </g>
  );
}

/* Equipment Manager sidebar — light theme, blue accent */
function EmNav({ h, active = 0 }) {
  const items = ['🔔 Powiadomienia', '🗄️ Baza danych', '⚙️ Ustawienia'];
  return (
    <g>
      <rect x="0" y="28" width="150" height={h - 28} fill="#ffffff" />
      <line x1="150" y1="28" x2="150" y2={h} stroke="#e2e8f0" strokeWidth="1" />
      <text x="16" y="52" fontSize="12" fontWeight="800" fill="#1e293b">{'🔧 Equipment'}</text>
      <text x="16" y="66" fontSize="12" fontWeight="800" fill="#1e293b">Manager</text>
      {items.map((t, i) => (
        <g key={i}>
          <rect x="8" y={80 + i * 32} width="134" height="26" rx="6" fill={i === active ? '#2563eb' : 'transparent'} />
          <text x="18" y={97 + i * 32} fontSize="10" fill={i === active ? '#ffffff' : '#64748b'}>{t}</text>
        </g>
      ))}
      <text x="16" y={h - 10} fontSize="7.5" fill="#94a3b8">v2.0.0</text>
    </g>
  );
}

/* CertTrack sidebar — light theme, blue accent, shield brand */
function CtNav({ h, active = 0 }) {
  const items = ['📊 Dashboard', '👥 Pracownicy', '🏆 Uprawnienia', '📁 Kategorie', '📤 Import CSV', '👤 Użytkownicy', '⚙️ Ustawienia'];
  return (
    <g>
      <rect x="0" y="28" width="150" height={h - 28} fill="#ffffff" />
      <line x1="150" y1="28" x2="150" y2={h} stroke="#e2e8f0" strokeWidth="1" />
      <rect x="8" y="36" width="134" height="34" rx="6" fill="#eff6ff" />
      <text x="16" y="50" fontSize="9" fill="#2563eb">{'🛡️'}</text>
      <text x="30" y="57" fontSize="12" fontWeight="700" fill="#1e293b">CertTrack</text>
      {items.map((t, i) => (
        <g key={i}>
          {i === active && <rect x="6" y={80 + i * 24} width="138" height="20" rx="4" fill="#eff6ff" />}
          {i === active && <rect x="6" y={80 + i * 24} width="2.5" height="20" rx="1" fill="#2563eb" />}
          <text x="16" y={94 + i * 24} fontSize="8.5" fill={i === active ? '#1d4ed8' : '#64748b'}>{t}</text>
        </g>
      ))}
    </g>
  );
}

/* ══════════════════════════════════════════════════════════════
   ILLUSTRATIONS — realistic app-specific SVG mockups
   ══════════════════════════════════════════════════════════════ */

const ILLUSTRATIONS = {

  /* ─── ShiftPlanner: Kalendarz ─── */
  sp_calendar: (W, H) => {
    const days = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
    return (
      <g>
        <Chrome w={W} />
        <SpNav h={H} active={0} />
        <rect x="170" y="28" width={W - 170} height={H - 28} fill="#09090b" />

        {/* Top bar */}
        <rect x="170" y="28" width={W - 170} height="34" fill="rgba(255,255,255,.02)" />
        <text x="186" y="50" fontSize="13" fontWeight="700" fill="#fafafa">Kalendarz</text>
        <rect x={W - 168} y="35" width="90" height="20" rx="10" fill="rgba(20,184,166,.12)" />
        <text x={W - 123} y="49" fontSize="8" fill="#14b8a6" textAnchor="middle">22 lut 2026</text>
        <rect x={W - 70} y="35" width="24" height="20" rx="4" fill="rgba(255,255,255,.05)" />
        <text x={W - 58} y="49" fontSize="9" fill="#a1a1aa" textAnchor="middle">{'🖨️'}</text>

        {/* Calendar card */}
        <rect x="182" y="70" width="390" height={H - 82} rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        <text x="198" y="92" fontSize="12" fontWeight="600" fill="#fafafa">Luty 2026</text>
        <rect x="290" y="78" width="18" height="18" rx="4" fill="rgba(255,255,255,.06)" />
        <text x="299" y="91" fontSize="9" fill="#a1a1aa" textAnchor="middle">{'‹'}</text>
        <rect x="312" y="78" width="40" height="18" rx="4" fill="rgba(20,184,166,.15)" />
        <text x="332" y="91" fontSize="7.5" fill="#14b8a6" textAnchor="middle">Dziś</text>
        <rect x="356" y="78" width="18" height="18" rx="4" fill="rgba(255,255,255,.06)" />
        <text x="365" y="91" fontSize="9" fill="#a1a1aa" textAnchor="middle">{'›'}</text>

        {/* Day headers */}
        {days.map((d, i) => (
          <text key={d} x={208 + i * 52} y="114" fontSize="8" fill="#71717a" textAnchor="middle">{d}</text>
        ))}

        {/* Calendar cells */}
        {Array.from({ length: 35 }, (_, idx) => {
          const col = idx % 7;
          const row = Math.floor(idx / 7);
          const day = idx - 6 + 1;
          const x = 185 + col * 53;
          const y = 120 + row * (Math.min(H - 200, 260) / 5);
          const cellH = Math.min(H - 200, 260) / 5 - 3;
          const isWeekend = col >= 5;
          const isSunday = col === 6;
          const isToday = day === 22;
          if (day < 1 || day > 28) return null;
          return (
            <g key={idx}>
              <rect x={x} y={y} width="49" height={cellH} rx="6"
                fill={isSunday ? 'rgba(244,63,94,.06)' : isWeekend ? 'rgba(234,179,8,.04)' : 'rgba(255,255,255,.025)'}
                stroke={isToday ? '#14b8a6' : 'rgba(255,255,255,.05)'} strokeWidth={isToday ? 1.5 : 0.5}
              />
              <text x={x + 5} y={y + 11} fontSize="7.5" fill={isToday ? '#14b8a6' : '#71717a'}>{day}</text>
              {day % 3 !== 0 && <rect x={x + 3} y={y + 16} width="43" height="7" rx="2" fill="#14b8a6" opacity="0.3" />}
              {day % 4 !== 0 && <rect x={x + 3} y={y + 26} width="43" height="7" rx="2" fill="#3b82f6" opacity="0.22" />}
              {day % 5 === 0 && cellH > 38 && <rect x={x + 3} y={y + 36} width="43" height="7" rx="2" fill="#a855f7" opacity="0.2" />}
            </g>
          );
        })}

        {/* Day detail panel (right) */}
        <rect x="584" y="70" width={W - 596} height={H - 82} rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="1" />
        <text x="600" y="92" fontSize="11" fontWeight="600" fill="#fafafa">Dzień: 22 lutego 2026</text>
        <text x="600" y="106" fontSize="7.5" fill="#71717a">Obsada stanowisk dla wybranej zmiany</text>

        {/* Shift tabs */}
        {[
          { n: 'Zmiana 1', t: '07:00–15:00', c: '#14b8a6', a: true },
          { n: 'Zmiana 2', t: '15:00–23:00', c: '#3b82f6', a: false },
          { n: 'Zmiana 3', t: '23:00–07:00', c: '#a855f7', a: false },
        ].map((s, i) => (
          <g key={i}>
            <rect x={600 + i * 82} y="114" width="76" height="24" rx="6"
              fill={s.a ? `${s.c}22` : 'rgba(255,255,255,.04)'}
              stroke={s.a ? s.c : 'transparent'} strokeWidth="1"
            />
            <text x={600 + i * 82 + 8} y="127" fontSize="7" fontWeight="600" fill={s.a ? s.c : '#71717a'}>{s.n}</text>
            <text x={600 + i * 82 + 8} y="135" fontSize="5.5" fill="#52525b">{s.t}</text>
          </g>
        ))}

        {/* Assignment cards */}
        {['Operator CNC', 'Spawacz', 'Brygadzista', 'Elektryk'].map((pos, i) => {
          const names = [['Jan K.', 'Marek S.'], ['Anna N.', 'Ewa Z.'], ['Piotr W.'], ['Tomek B.', 'Kasia L.']];
          return (
            <g key={i}>
              <text x="600" y={160 + i * 58} fontSize="8" fontWeight="600" fill="#a1a1aa">{pos}</text>
              <rect x="600" y={164 + i * 58} width={W - 616} height="38" rx="6" fill="rgba(255,255,255,.025)" stroke="rgba(255,255,255,.05)" strokeWidth="0.5" />
              {names[i].map((name, j) => (
                <g key={j}>
                  <rect x={608 + j * 68} y={172 + i * 58} width="62" height="16" rx="4" fill="rgba(20,184,166,.1)" />
                  <text x={614 + j * 68} y={183 + i * 58} fontSize="7" fill="#5eead4">{name}</text>
                </g>
              ))}
            </g>
          );
        })}
      </g>
    );
  },

  /* ─── ShiftPlanner: Pracownicy ─── */
  sp_employees: (W, H) => {
    const employees = [
      { name: 'Jan Kowalski', phone: '512 345 678', status: true, pos: 'Operator CNC' },
      { name: 'Anna Nowak', phone: '601 234 567', status: true, pos: 'Spawacz' },
      { name: 'Marek Szymański', phone: '693 456 789', status: true, pos: 'Brygadzista' },
      { name: 'Ewa Zielińska', phone: '502 789 012', status: true, pos: 'Elektryk' },
      { name: 'Piotr Wiśniewski', phone: '721 555 333', status: false, pos: 'Tokarz' },
      { name: 'Katarzyna Lewandowska', phone: '608 111 222', status: true, pos: 'Spawacz' },
    ];
    return (
      <g>
        <Chrome w={W} />
        <SpNav h={H} active={1} />
        <rect x="170" y="28" width={W - 170} height={H - 28} fill="#09090b" />

        {/* Top bar */}
        <rect x="170" y="28" width={W - 170} height="34" fill="rgba(255,255,255,.02)" />
        <text x="186" y="50" fontSize="13" fontWeight="700" fill="#fafafa">Pracownicy</text>

        {/* KPI cards */}
        {[
          { label: 'Pracownicy', value: '12', color: '#14b8a6' },
          { label: 'Aktywni', value: '10', color: '#22c55e' },
          { label: 'Urlopy', value: '3', color: '#eab308' },
          { label: 'Z urlopami', value: '2', color: '#f43f5e' },
        ].map((k, i) => (
          <g key={i}>
            <rect x={182 + i * 160} y="70" width="148" height="52" rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
            <text x={198 + i * 160} y="88" fontSize="7.5" fill="#71717a">{k.label}</text>
            <text x={198 + i * 160} y="108" fontSize="18" fontWeight="700" fill={k.color}>{k.value}</text>
          </g>
        ))}

        {/* Table card */}
        <rect x="182" y="132" width={W - 194} height={H - 144} rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />

        {/* Search + button */}
        <rect x="194" y="142" width="220" height="24" rx="6" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />
        <text x="206" y="158" fontSize="8" fill="#52525b">Szukaj…</text>
        <rect x={W - 270} y="142" width="100" height="24" rx="6" fill="rgba(20,184,166,.8)" />
        <text x={W - 220} y="158" fontSize="8" fontWeight="600" fill="#fff" textAnchor="middle">＋ Dodaj pracownika</text>

        {/* Table header */}
        <rect x="194" y="176" width={W - 218} height="22" rx="0" fill="rgba(255,255,255,.03)" />
        {['Pracownik', 'Telefon', 'Status', 'Stanowiska', 'Zmiany'].map((h, i) => (
          <text key={h} x={[210, 350, 460, 540, 640][i]} y="191" fontSize="7.5" fontWeight="600" fill="#71717a">{h}</text>
        ))}

        {/* Table rows */}
        {employees.map((e, i) => (
          <g key={i}>
            <rect x="194" y={200 + i * 30} width={W - 218} height="28" fill={i % 2 ? 'rgba(255,255,255,.015)' : 'transparent'} />
            <text x="210" y={218 + i * 30} fontSize="8.5" fontWeight="500" fill="#e4e4e7">{e.name}</text>
            <text x="350" y={218 + i * 30} fontSize="8" fill="#a1a1aa">{e.phone}</text>
            <rect x="460" y={208 + i * 30} width={e.status ? 52 : 62} height="16" rx="4" fill={e.status ? 'rgba(34,197,94,.12)' : 'rgba(161,161,170,.1)'} />
            <text x="468" y={219 + i * 30} fontSize="7" fill={e.status ? '#4ade80' : '#a1a1aa'}>{e.status ? 'Aktywny' : 'Nieaktywny'}</text>
            <text x="540" y={218 + i * 30} fontSize="8" fill="#a1a1aa">{e.pos}</text>
            <text x="640" y={218 + i * 30} fontSize="7.5" fill="#71717a">Wszystkie zmiany</text>
          </g>
        ))}
      </g>
    );
  },

  /* ─── ShiftPlanner: System zmianowy & ustawienia ─── */
  sp_shifts: (W, H) => {
    const shifts = [
      { id: 1, name: 'Zmiana 1', start: '07:00', end: '15:00', color: '#14b8a6' },
      { id: 2, name: 'Zmiana 2', start: '15:00', end: '23:00', color: '#3b82f6' },
      { id: 3, name: 'Zmiana 3', start: '23:00', end: '07:00', color: '#a855f7' },
    ];
    const daysOff = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
    return (
      <g>
        <Chrome w={W} />
        <SpNav h={H} active={7} />
        <rect x="170" y="28" width={W - 170} height={H - 28} fill="#09090b" />

        <rect x="170" y="28" width={W - 170} height="34" fill="rgba(255,255,255,.02)" />
        <text x="186" y="50" fontSize="13" fontWeight="700" fill="#fafafa">Opcje</text>

        {/* Settings card */}
        <rect x="182" y="70" width={W - 194} height={H - 82} rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
        <text x="198" y="94" fontSize="11" fontWeight="600" fill="#fafafa">{'⚙️ Opcje aplikacji'}</text>

        {/* Shift config */}
        <text x="198" y="120" fontSize="9" fontWeight="600" fill="#d4d4d8">Zdefiniowane zmiany</text>

        {/* Shift table header */}
        <rect x="198" y="128" width={W / 2 - 30} height="20" fill="rgba(255,255,255,.03)" rx="4" />
        {['ID', 'Nazwa', 'Początek', 'Koniec', 'Kolor'].map((h, i) => (
          <text key={h} x={[210, 250, 330, 390, 445][i]} y="142" fontSize="7" fontWeight="600" fill="#71717a">{h}</text>
        ))}
        {shifts.map((s, i) => (
          <g key={i}>
            <rect x="198" y={150 + i * 26} width={W / 2 - 30} height="24" fill={i % 2 ? 'rgba(255,255,255,.015)' : 'transparent'} />
            <text x="210" y={166 + i * 26} fontSize="8" fill="#a1a1aa">{s.id}</text>
            <text x="250" y={166 + i * 26} fontSize="8.5" fontWeight="500" fill="#e4e4e7">{s.name}</text>
            <text x="330" y={166 + i * 26} fontSize="8" fill="#a1a1aa">{s.start}</text>
            <text x="390" y={166 + i * 26} fontSize="8" fill="#a1a1aa">{s.end}</text>
            <circle cx="452" cy={163 + i * 26} r="5" fill={s.color} />
          </g>
        ))}

        {/* Days off section */}
        <text x="198" y={240} fontSize="9" fontWeight="600" fill="#d4d4d8">Dni wolne od planowania</text>
        {daysOff.map((d, i) => {
          const checked = i === 6; // Sunday checked
          const x = 198 + (i % 4) * 120;
          const y = 252 + Math.floor(i / 4) * 26;
          return (
            <g key={i}>
              <rect x={x} y={y} width="12" height="12" rx="3" fill={checked ? '#14b8a6' : 'transparent'} stroke={checked ? '#14b8a6' : '#52525b'} strokeWidth="1" />
              {checked && <text x={x + 2} y={y + 10} fontSize="9" fill="#fff">✓</text>}
              <text x={x + 18} y={y + 10} fontSize="8" fill="#a1a1aa">{d}</text>
            </g>
          );
        })}

        {/* Right side — app settings */}
        <text x={W / 2 + 60} y="120" fontSize="9" fontWeight="600" fill="#d4d4d8">Ustawienia ogólne</text>
        {[
          { label: 'Pokaż weekendy w kalendarzu', on: true },
          { label: 'Pokaż święta', on: true },
          { label: 'Automatyczne sugestie', on: false },
          { label: 'Ukryj nieaktywnych w listach', on: true },
          { label: 'Pokaż numery tygodni', on: false },
        ].map((opt, i) => (
          <g key={i}>
            <text x={W / 2 + 60} y={142 + i * 26} fontSize="8" fill="#a1a1aa">{opt.label}</text>
            <rect x={W - 60} y={132 + i * 26} width="32" height="16" rx="8" fill={opt.on ? '#14b8a6' : '#3f3f46'} />
            <circle cx={opt.on ? W - 36 : W - 52} cy={140 + i * 26} r="6" fill="#fff" />
          </g>
        ))}

        {/* Save button */}
        <rect x={W - 130} y={H - 46} width="90" height="28" rx="8" fill="rgba(20,184,166,.85)" />
        <text x={W - 85} y={H - 28} fontSize="9" fontWeight="600" fill="#fff" textAnchor="middle">Zapisz</text>
      </g>
    );
  },

  /* ─── ShiftPlanner: Urlopy ─── */
  sp_vacations: (W, H) => {
    const vacations = [
      { name: 'Jan Kowalski', from: '03.02.2026', to: '07.02.2026', type: 'urlop', days: 5 },
      { name: 'Anna Nowak', from: '10.02.2026', to: '14.02.2026', type: 'urlop', days: 5 },
      { name: 'Marek Szymański', from: '17.02.2026', to: '20.02.2026', type: 'urlop', days: 4 },
      { name: 'Ewa Zielińska', from: '24.02.2026', to: '28.02.2026', type: 'urlop', days: 5 },
      { name: 'Piotr Wiśniewski', from: '01.03.2026', to: '06.03.2026', type: 'urlop', days: 6 },
    ];
    return (
      <g>
        <Chrome w={W} />
        <SpNav h={H} active={4} />
        <rect x="170" y="28" width={W - 170} height={H - 28} fill="#09090b" />

        <rect x="170" y="28" width={W - 170} height="34" fill="rgba(255,255,255,.02)" />
        <text x="186" y="50" fontSize="13" fontWeight="700" fill="#fafafa">Urlopy</text>

        {/* Filter */}
        <rect x="182" y="70" width="200" height="26" rx="6" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />
        <text x="194" y="87" fontSize="8" fill="#71717a">Filtruj pracownika…</text>

        {/* Vacation table */}
        <rect x="182" y="106" width={W - 194} height={H - 118} rx="10" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
        <text x="198" y="128" fontSize="10" fontWeight="600" fill="#fafafa">Wpisy urlopowe</text>

        {/* Header */}
        <rect x="198" y="136" width={W - 226} height="22" fill="rgba(255,255,255,.03)" rx="4" />
        {['Pracownik', 'Od', 'Do', 'Typ', 'Dni', 'Akcje'].map((h, i) => (
          <text key={h} x={[214, 340, 430, 520, 590, 640][i]} y="150" fontSize="7.5" fontWeight="600" fill="#71717a">{h}</text>
        ))}

        {vacations.map((v, i) => (
          <g key={i}>
            <rect x="198" y={160 + i * 30} width={W - 226} height="28" fill={i % 2 ? 'rgba(255,255,255,.015)' : 'transparent'} />
            <text x="214" y={178 + i * 30} fontSize="8.5" fontWeight="500" fill="#e4e4e7">{v.name}</text>
            <text x="340" y={178 + i * 30} fontSize="8" fill="#a1a1aa">{v.from}</text>
            <text x="430" y={178 + i * 30} fontSize="8" fill="#a1a1aa">{v.to}</text>
            <rect x="520" y={168 + i * 30} width="40" height="16" rx="4" fill="rgba(234,179,8,.12)" />
            <text x="528" y={179 + i * 30} fontSize="7" fill="#eab308">{v.type}</text>
            <text x="590" y={178 + i * 30} fontSize="8" fill="#a1a1aa">{v.days}</text>
            <rect x="640" y={168 + i * 30} width="36" height="16" rx="4" fill="rgba(244,63,94,.1)" />
            <text x="646" y={179 + i * 30} fontSize="7" fill="#f43f5e">Usuń</text>
          </g>
        ))}
      </g>
    );
  },

  /* ─── ShiftPlanner: Drukowanie ─── */
  sp_print: (W, H) => {
    return (
      <g>
        <Chrome w={W} />
        <SpNav h={H} active={0} />
        <rect x="170" y="28" width={W - 170} height={H - 28} fill="#09090b" />

        <rect x="170" y="28" width={W - 170} height="34" fill="rgba(255,255,255,.02)" />
        <text x="186" y="50" fontSize="13" fontWeight="700" fill="#fafafa">{'🖨️ Podgląd wydruku'}</text>

        {/* Print options */}
        {['Karty', 'Tabela', 'Minimalny'].map((m, i) => (
          <g key={i}>
            <rect x={186 + i * 76} y="70" width="70" height="22" rx="6"
              fill={i === 1 ? 'rgba(20,184,166,.2)' : 'rgba(255,255,255,.04)'}
              stroke={i === 1 ? '#14b8a6' : 'rgba(255,255,255,.06)'} strokeWidth="0.5"
            />
            <text x={221 + i * 76} y="85" fontSize="8" fill={i === 1 ? '#14b8a6' : '#71717a'} textAnchor="middle">{m}</text>
          </g>
        ))}

        {/* Print preview — white page */}
        <rect x="220" y="102" width={W - 260} height={H - 114} rx="4" fill="#ffffff" />
        {/* Page header */}
        <text x="240" y="126" fontSize="11" fontWeight="700" fill="#1e293b">Grafik zmian — Luty 2026</text>
        <text x="240" y="140" fontSize="8" fill="#64748b">Hala 1 — ShiftPlanner</text>

        {/* Table */}
        <rect x="240" y="150" width={W - 300} height="20" fill="#f1f5f9" />
        {['Pracownik', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14'].map((d, i) => (
          <text key={i} x={i === 0 ? 252 : 318 + (i - 1) * 32} y="163" fontSize={i === 0 ? '7' : '6.5'} fontWeight="600" fill="#64748b" textAnchor={i === 0 ? 'start' : 'middle'}>{d}</text>
        ))}

        {['Jan Kowalski', 'Anna Nowak', 'Marek Szymański', 'Ewa Zielińska', 'Piotr Wiśniewski', 'Katarzyna L.'].map((name, r) => (
          <g key={r}>
            <rect x="240" y={172 + r * 22} width={W - 300} height="20" fill={r % 2 ? '#fafafa' : '#fff'} />
            <text x="252" y={185 + r * 22} fontSize="7" fill="#334155">{name}</text>
            {Array.from({ length: 14 }, (_, c) => {
              const shifts = ['Z1', 'Z2', 'Z3', 'U', ''];
              const colors = ['#14b8a6', '#3b82f6', '#a855f7', '#eab308', 'transparent'];
              const idx = (r + c) % 5;
              return shifts[idx] ? (
                <g key={c}>
                  <rect x={306 + c * 32} y={175 + r * 22} width="24" height="12" rx="2" fill={colors[idx]} opacity="0.2" />
                  <text x={318 + c * 32} y={184 + r * 22} fontSize="5.5" fill={colors[idx]} textAnchor="middle" fontWeight="600">{shifts[idx]}</text>
                </g>
              ) : null;
            })}
          </g>
        ))}

        <text x={(W - 40) / 2 + 110} y={H - 20} fontSize="7" fill="#94a3b8" textAnchor="middle">Strona 1 z 1</text>
      </g>
    );
  },

  /* ─── ShiftPlanner: Auto-planowanie ─── */
  sp_auto: (W, H) => {
    return (
      <g>
        <Chrome w={W} />
        <SpNav h={H} active={5} />
        <rect x="170" y="28" width={W - 170} height={H - 28} fill="#09090b" />

        <rect x="170" y="28" width={W - 170} height="34" fill="rgba(255,255,255,.02)" />
        <text x="186" y="50" fontSize="13" fontWeight="700" fill="#fafafa">Planowanie tygodnia</text>

        {/* Configuration card */}
        <rect x="182" y="70" width="320" height={H - 82} rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
        <text x="198" y="94" fontSize="10" fontWeight="600" fill="#fafafa">Konfiguracja</text>

        {/* Date range */}
        <text x="198" y="118" fontSize="8" fill="#71717a">Tydzień od:</text>
        <rect x="198" y="122" width="140" height="24" rx="6" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.08)" strokeWidth="0.5" />
        <text x="210" y="138" fontSize="8" fill="#a1a1aa">23.02.2026</text>

        {/* Shift checkboxes */}
        <text x="198" y="164" fontSize="8" fill="#71717a">Zmiany do zaplanowania:</text>
        {['Zmiana 1', 'Zmiana 2', 'Zmiana 3'].map((s, i) => (
          <g key={i}>
            <rect x={198 + i * 100} y="170" width="12" height="12" rx="3" fill="#14b8a6" stroke="#14b8a6" strokeWidth="1" />
            <text x={198 + i * 100 + 2} y="180" fontSize="9" fill="#fff">✓</text>
            <text x={198 + i * 100 + 18} y="180" fontSize="8" fill="#a1a1aa">{s}</text>
          </g>
        ))}

        {/* Options */}
        {['Tylko puste sloty', 'Pomiń soboty'].map((opt, i) => (
          <g key={i}>
            <rect x="198" y={196 + i * 26} width="12" height="12" rx="3" fill={i === 0 ? '#14b8a6' : 'transparent'} stroke={i === 0 ? '#14b8a6' : '#52525b'} strokeWidth="1" />
            {i === 0 && <text x="200" y={206 + i * 26} fontSize="9" fill="#fff">✓</text>}
            <text x="218" y={206 + i * 26} fontSize="8" fill="#a1a1aa">{opt}</text>
          </g>
        ))}

        {/* Action buttons */}
        <rect x="198" y="260" width="120" height="28" rx="8" fill="rgba(20,184,166,.85)" />
        <text x="258" y="278" fontSize="9" fontWeight="600" fill="#fff" textAnchor="middle">Planuj tydzień</text>
        <rect x="326" y="260" width="120" height="28" rx="8" fill="rgba(20,184,166,.4)" />
        <text x="386" y="278" fontSize="9" fontWeight="600" fill="#14b8a6" textAnchor="middle">Planuj miesiąc</text>

        {/* Results panel */}
        <rect x="514" y="70" width={W - 526} height={H - 82} rx="12" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.06)" strokeWidth="0.5" />
        <text x="530" y="94" fontSize="10" fontWeight="600" fill="#fafafa">Raport planowania</text>

        {/* Stats */}
        {[
          { label: 'Śr. obciążenie', value: '4.2 zm/os', color: '#14b8a6' },
          { label: 'Min. obciążenie', value: '3 zm', color: '#22c55e' },
          { label: 'Max obciążenie', value: '6 zm', color: '#f43f5e' },
          { label: 'Odch. standardowe', value: '0.8', color: '#eab308' },
          { label: 'Pokrycie zmian', value: '94%', color: '#14b8a6' },
          { label: 'Konflikty', value: '0', color: '#22c55e' },
        ].map((s, i) => (
          <g key={i}>
            <rect x="530" y={106 + i * 38} width={W - 558} height="32" rx="6" fill="rgba(255,255,255,.025)" />
            <text x="546" y={122 + i * 38} fontSize="7.5" fill="#71717a">{s.label}</text>
            <text x={W - 44} y={126 + i * 38} fontSize="13" fontWeight="700" fill={s.color} textAnchor="end">{s.value}</text>
          </g>
        ))}

        {/* Top loaded employees */}
        <text x="530" y={106 + 6 * 38 + 14} fontSize="8" fontWeight="600" fill="#a1a1aa">Najwięcej zmian:</text>
        {['Jan Kowalski (6)', 'Anna Nowak (5)', 'Marek S. (5)'].map((e, i) => (
          <text key={i} x="530" y={106 + 6 * 38 + 30 + i * 16} fontSize="7.5" fill="#71717a">{e}</text>
        ))}
      </g>
    );
  },

  /* ═══ Equipment Manager: Dashboard ═══ */
  em_dashboard: (W, H) => {
    return (
      <g>
        <Chrome w={W} />
        <EmNav h={H} active={0} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f8fafc" />

        {/* Header */}
        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Powiadomienia</text>
        <text x="170" y="72" fontSize="8" fill="#94a3b8">Przegląd statusów i alertów wszystkich urządzeń i sprzętu</text>

        {/* Stat cards */}
        {[
          { label: 'Razem', value: '24', bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' },
          { label: 'Przeterminowane', value: '3', bg: '#fef2f2', border: '#fecaca', color: '#dc2626' },
          { label: 'Wkrótce wygasają', value: '5', bg: '#fffbeb', border: '#fde68a', color: '#d97706' },
          { label: 'W porządku', value: '16', bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
        ].map((s, i) => (
          <g key={i}>
            <rect x={170 + i * 155} y="82" width="143" height="58" rx="10" fill={s.bg} stroke={s.border} strokeWidth="1" />
            <text x={186 + i * 155} y="100" fontSize="7.5" fill="#64748b">{s.label}</text>
            <text x={186 + i * 155} y="126" fontSize="20" fontWeight="700" fill={s.color}>{s.value}</text>
          </g>
        ))}

        {/* Overdue section */}
        <rect x="170" y="152" width={W - 186} height="4" rx="2" fill="#dc2626" opacity="0.5" />
        <rect x="170" y="152" width={W - 186} height="80" rx="0" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
        <rect x="170" y="152" width="4" height="80" fill="#dc2626" />
        <text x="186" y="170" fontSize="9" fontWeight="600" fill="#dc2626">{'⚠️ Przeterminowane — wymaga uwagi'}</text>
        {['Gaśnica GP-6 (Hala 1)', 'Suwmiarka 150mm (Narzędziownia)', 'Frez HSS Ø12 (Magazyn)'].map((item, i) => (
          <g key={i}>
            <circle cx="192" cy={187 + i * 18} r="3" fill="#dc2626" />
            <text x="200" y={190 + i * 18} fontSize="7.5" fill="#1e293b">{item}</text>
            <text x={W - 100} y={190 + i * 18} fontSize="7" fill="#dc2626">Wygasło</text>
          </g>
        ))}

        {/* Expiring soon section */}
        <rect x="170" y="242" width={W - 186} height="70" rx="0" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
        <rect x="170" y="242" width="4" height="70" fill="#f59e0b" />
        <text x="186" y="260" fontSize="9" fontWeight="600" fill="#d97706">{'🟡 Wkrótce wygasają (≤ 30 dni)'}</text>
        {['Wiertarka stołowa WS-20 — za 12 dni', 'Klucz dynamometryczny KD50 — za 18 dni', 'Wózek widłowy Toyota — za 25 dni'].map((item, i) => (
          <g key={i}>
            <circle cx="192" cy={277 + i * 16} r="3" fill="#f59e0b" />
            <text x="200" y={280 + i * 16} fontSize="7.5" fill="#1e293b">{item}</text>
          </g>
        ))}

        {/* OK section */}
        <rect x="170" y="322" width={W - 186} height="50" rx="0" fill="#fff" stroke="#e2e8f0" strokeWidth="0.5" />
        <rect x="170" y="322" width="4" height="50" fill="#16a34a" />
        <text x="186" y="340" fontSize="9" fontWeight="600" fill="#16a34a">{'✅ Aktualne'}</text>
        <text x="186" y="356" fontSize="7.5" fill="#64748b">16 urządzeń z aktualnym przeglądem</text>
      </g>
    );
  },

  /* ─── Equipment Manager: Baza danych ─── */
  em_items: (W, H) => {
    const items = [
      { nr: 'GS-001', name: 'Gaśnica GP-6', cat: 'Gaśnice', assigned: 'Hala 1', type: 'Przegląd', last: '15.01.2025', exp: '15.01.2026', status: 'red', days: -38 },
      { nr: 'SW-012', name: 'Suwmiarka 150mm', cat: 'Narzędzia', assigned: 'Narzędziownia', type: 'Kalibracja', last: '01.06.2025', exp: '01.12.2025', status: 'red', days: -83 },
      { nr: 'WS-020', name: 'Wiertarka stołowa WS-20', cat: 'Maszyny', assigned: 'Hala 2', type: 'Przegląd', last: '01.10.2025', exp: '06.03.2026', status: 'yellow', days: 12 },
      { nr: 'KD-050', name: 'Klucz dynamometryczny KD50', cat: 'Narzędzia', assigned: 'Magazyn', type: 'Kalibracja', last: '01.07.2025', exp: '12.03.2026', status: 'yellow', days: 18 },
      { nr: 'FR-003', name: 'Frez HSS Ø12', cat: 'Narzędzia', assigned: 'CNC', type: 'Wymiana', last: '20.01.2026', exp: '20.07.2026', status: 'green', days: 148 },
      { nr: 'TK-007', name: 'Tokarka CNC TK-500', cat: 'Maszyny', assigned: 'Hala 1', type: 'Serwis', last: '15.12.2025', exp: '15.06.2026', status: 'green', days: 113 },
    ];
    const statusColors = { red: '#dc2626', yellow: '#f59e0b', green: '#16a34a' };
    return (
      <g>
        <Chrome w={W} />
        <EmNav h={H} active={1} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f8fafc" />

        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Baza danych</text>
        <text x="170" y="72" fontSize="8" fill="#94a3b8">Zarządzaj urządzeniami, maszynami i sprzętem</text>

        {/* Search + Add button */}
        <rect x="170" y="82" width="280" height="26" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="182" y="99" fontSize="8" fill="#94a3b8">Szukaj po nazwie, nr narzędzia, opisie…</text>
        <rect x={W - 140} y="82" width="110" height="26" rx="6" fill="#2563eb" />
        <text x={W - 85} y="99" fontSize="8.5" fontWeight="600" fill="#fff" textAnchor="middle">➕ Dodaj element</text>

        {/* Results count */}
        <text x="170" y="122" fontSize="7.5" fill="#64748b">Wyniki: 24 / 24</text>

        {/* Table */}
        <rect x="170" y="130" width={W - 186} height={H - 142} rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />

        {/* Header */}
        <rect x="170" y="130" width={W - 186} height="22" rx="8" fill="#f8fafc" />
        {['', 'Nr narz.', 'Nazwa', 'Kategoria', 'Przypisany', 'Typ kontr.', 'Wygasa', 'Dni'].map((h, i) => (
          <text key={i} x={[180, 194, 258, 408, 500, 590, 660, W - 50][i]} y="145" fontSize="7" fontWeight="600" fill="#94a3b8">{h}</text>
        ))}

        {items.map((item, i) => (
          <g key={i}>
            <rect x="170" y={154 + i * 28} width={W - 186} height="27" fill={i % 2 ? '#fafafa' : '#fff'} />
            <circle cx="186" cy={168 + i * 28} r="4" fill={statusColors[item.status]} />
            <text x="194" y={171 + i * 28} fontSize="7.5" fontFamily="monospace" fill="#64748b">{item.nr}</text>
            <text x="258" y={171 + i * 28} fontSize="8" fontWeight="500" fill="#1e293b">{item.name}</text>
            <text x="408" y={171 + i * 28} fontSize="7.5" fill="#64748b">{item.cat}</text>
            <text x="500" y={171 + i * 28} fontSize="7.5" fill="#64748b">{item.assigned}</text>
            <text x="590" y={171 + i * 28} fontSize="7.5" fill="#64748b">{item.type}</text>
            <text x="660" y={171 + i * 28} fontSize="7.5" fill="#64748b">{item.exp}</text>
            <text x={W - 50} y={171 + i * 28} fontSize="7.5" fontWeight="600" fill={statusColors[item.status]}>{item.days > 0 ? item.days : Math.abs(item.days)}</text>
          </g>
        ))}
      </g>
    );
  },

  /* ─── Equipment Manager: Karta urządzenia ─── */
  em_card: (W, H) => {
    return (
      <g>
        <Chrome w={W} />
        <EmNav h={H} active={1} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f8fafc" />

        {/* Back button */}
        <text x="170" y="52" fontSize="8.5" fill="#2563eb">{'← Powrót do bazy danych'}</text>

        {/* Header card */}
        <rect x="170" y="60" width={W - 186} height="70" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <circle cx="210" cy="95" r="22" fill="#dbeafe" />
        <text x="210" y="100" fontSize="16" textAnchor="middle">{'🔧'}</text>
        <text x="244" y="88" fontSize="13" fontWeight="700" fill="#1e293b">Wiertarka stołowa WS-20</text>
        <text x="244" y="103" fontSize="8" fill="#94a3b8">Nr: WS-020 • Maszyny</text>
        <text x="244" y="118" fontSize="7.5" fill="#64748b">Wiertarka kolumnowa do metali, zakres wierteł 1–20 mm</text>
        <rect x={W - 260} y="80" width="60" height="22" rx="6" fill="#fffbeb" stroke="#fde68a" strokeWidth="1" />
        <text x={W - 230} y="95" fontSize="7.5" fontWeight="600" fill="#d97706" textAnchor="middle">Wkrótce</text>

        {/* Info grid */}
        {[
          { label: 'Kategoria', value: 'Maszyny' },
          { label: 'Przypisany do', value: 'Hala 2' },
          { label: 'Typ kontroli', value: 'Przegląd' },
          { label: 'Okres', value: 'co 6 miesięcy' },
          { label: 'Ostatnia data', value: '01.10.2025' },
          { label: 'Wygasa', value: '06.03.2026' },
        ].map((info, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const cardW = (W - 186 - 20) / 3;
          return (
            <g key={i}>
              <rect x={170 + col * (cardW + 10)} y={142 + row * 64} width={cardW} height="54" rx="8" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
              <text x={182 + col * (cardW + 10)} y={160 + row * 64} fontSize="7.5" fill="#94a3b8">{info.label}</text>
              <text x={182 + col * (cardW + 10)} y={178 + row * 64} fontSize="10" fontWeight="600" fill="#1e293b">{info.value}</text>
            </g>
          );
        })}

        {/* Tool parameters */}
        <rect x="170" y="280" width={W - 186} height={H - 292} rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="302" fontSize="10" fontWeight="600" fill="#1e293b">Parametry techniczne</text>
        <rect x="186" y="310" width={W - 218} height="20" fill="#f8fafc" rx="4" />
        <text x="198" y="323" fontSize="7.5" fontWeight="600" fill="#94a3b8">Parametr</text>
        <text x={W / 2 + 40} y="323" fontSize="7.5" fontWeight="600" fill="#94a3b8">Wartość</text>
        {[
          { p: 'Zakres wierteł', v: '1–20 mm' },
          { p: 'Moc silnika', v: '750 W' },
          { p: 'Obroty', v: '500–2500 obr/min' },
        ].map((row, i) => (
          <g key={i}>
            <text x="198" y={348 + i * 20} fontSize="8" fill="#1e293b">{row.p}</text>
            <text x={W / 2 + 40} y={348 + i * 20} fontSize="8" fill="#64748b">{row.v}</text>
          </g>
        ))}
      </g>
    );
  },

  /* ─── Equipment Manager: Ustawienia ─── */
  em_settings: (W, H) => {
    const categories = ['Narzędzia', 'Maszyny', 'Gaśnice', 'Pojazdy', 'Urządzenia elektryczne', 'Urządzenia pomiarowe', 'Inne'];
    return (
      <g>
        <Chrome w={W} />
        <EmNav h={H} active={2} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f8fafc" />

        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Ustawienia</text>
        <text x="170" y="72" fontSize="8" fill="#94a3b8">Konfiguracja powiadomień, wyglądu, eksport i import danych</text>

        {/* Appearance card */}
        <rect x="170" y="82" width={(W - 186) / 2 - 6} height="100" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="102" fontSize="9" fontWeight="600" fill="#1e293b">Wygląd</text>
        <text x="186" y="118" fontSize="7.5" fill="#64748b">Motyw ciemny</text>
        <rect x="280" y="108" width="32" height="16" rx="8" fill="#e2e8f0" />
        <circle cx="290" cy="116" r="6" fill="#fff" />
        <rect x="186" y="136" width="80" height="24" rx="6" fill="#2563eb" />
        <text x="226" y="152" fontSize="8" fontWeight="600" fill="#fff" textAnchor="middle">Zastosuj motyw</text>

        {/* Notifications card */}
        <rect x={170 + (W - 186) / 2 + 6} y="82" width={(W - 186) / 2 - 6} height="100" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x={186 + (W - 186) / 2 + 6} y="102" fontSize="9" fontWeight="600" fill="#1e293b">Powiadomienia</text>
        {['Powiadomienia globalne', 'Uprawnienia przeglądarki', 'Codzienne powiadomienia'].map((opt, i) => (
          <g key={i}>
            <text x={186 + (W - 186) / 2 + 6} y={122 + i * 22} fontSize="7.5" fill="#64748b">{opt}</text>
            <rect x={W - 72} y={112 + i * 22} width="32" height="16" rx="8" fill={i < 2 ? '#2563eb' : '#e2e8f0'} />
            <circle cx={i < 2 ? W - 48 : W - 64} cy={120 + i * 22} r="6" fill="#fff" />
          </g>
        ))}

        {/* Categories */}
        <rect x="170" y="192" width={W - 186} height="120" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="212" fontSize="9" fontWeight="600" fill="#1e293b">Kategorie sprzętu</text>
        <text x="186" y="226" fontSize="7" fill="#94a3b8">Edytowalna lista kategorii do klasyfikacji urządzeń</text>
        {categories.map((cat, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          return (
            <g key={i}>
              <rect x={186 + col * 200} y={234 + row * 28} width="186" height="22" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="0.5" />
              <text x={198 + col * 200} y={249 + row * 28} fontSize="8" fill="#1e293b">{cat}</text>
            </g>
          );
        })}

        {/* Export/Import */}
        <rect x="170" y="322" width={W - 186} height="56" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="342" fontSize="9" fontWeight="600" fill="#1e293b">Dane</text>
        <rect x="186" y="350" width="100" height="22" rx="6" fill="#2563eb" />
        <text x="236" y="365" fontSize="8" fontWeight="600" fill="#fff" textAnchor="middle">Eksport danych</text>
        <rect x="296" y="350" width="100" height="22" rx="6" fill="#fff" stroke="#2563eb" strokeWidth="1" />
        <text x="346" y="365" fontSize="8" fontWeight="600" fill="#2563eb" textAnchor="middle">Import danych</text>
      </g>
    );
  },

  /* ═══ CertTrack: Dashboard ═══ */
  ct_dashboard: (W, H) => {
    return (
      <g>
        <Chrome w={W} />
        <CtNav h={H} active={0} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f1f5f9" />

        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Dashboard</text>
        <text x="170" y="72" fontSize="8" fill="#94a3b8">Przegląd statusu uprawnień i certyfikatów</text>

        {/* Stat cards */}
        {[
          { icon: '👥', label: 'Aktywni pracownicy', value: '12', bg: '#dbeafe', color: '#2563eb' },
          { icon: '🏆', label: 'Łącznie uprawnień', value: '48', bg: '#f3e8ff', color: '#7c3aed' },
          { icon: '❌', label: 'Wygasłe', value: '3', bg: '#fef2f2', color: '#dc2626' },
          { icon: '⚠️', label: 'Wygasa w 7 dni', value: '2', bg: '#fff7ed', color: '#ea580c' },
        ].map((s, i) => (
          <g key={i}>
            <rect x={170 + i * 155} y="82" width="143" height="58" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
            <circle cx={190 + i * 155} cy="104" r="12" fill={s.bg} />
            <text x={190 + i * 155} y="108" fontSize="9" textAnchor="middle">{s.icon}</text>
            <text x={210 + i * 155} y="100" fontSize="7.5" fill="#64748b">{s.label}</text>
            <text x={210 + i * 155} y="126" fontSize="20" fontWeight="700" fill={s.color}>{s.value}</text>
          </g>
        ))}

        {/* Status distribution bar */}
        <rect x="170" y="150" width={W - 186} height="60" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="170" fontSize="9" fontWeight="600" fill="#1e293b">Rozkład statusów</text>
        <rect x="186" y="178" width={W - 218} height="12" rx="6" fill="#f1f5f9" />
        <rect x="186" y="178" width={(W - 218) * 0.06} height="12" rx="6" fill="#ef4444" />
        <rect x={186 + (W - 218) * 0.06} y="178" width={(W - 218) * 0.04} height="12" fill="#f97316" />
        <rect x={186 + (W - 218) * 0.10} y="178" width={(W - 218) * 0.10} height="12" fill="#eab308" />
        <rect x={186 + (W - 218) * 0.20} y="178" width={(W - 218) * 0.80} height="12" rx="0" fill="#22c55e" />
        {/* Right end rounded */}
        <rect x={186 + (W - 218) - 6} y="178" width="6" height="12" rx="0 6 6 0" fill="#22c55e" />

        {/* Legend */}
        {[
          { label: 'Wygasłe (3)', color: '#ef4444' },
          { label: '<7 dni (2)', color: '#f97316' },
          { label: '<30 dni (5)', color: '#eab308' },
          { label: 'OK (38)', color: '#22c55e' },
        ].map((l, i) => (
          <g key={i}>
            <circle cx={186 + i * 100} cy="200" r="3" fill={l.color} />
            <text x={194 + i * 100} y="203" fontSize="7" fill="#64748b">{l.label}</text>
          </g>
        ))}

        {/* Two columns */}
        {/* Left: Urgent items */}
        <rect x="170" y="218" width={(W - 186) / 2 - 6} height={H - 230} rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="238" fontSize="9" fontWeight="600" fill="#1e293b">Wymagają uwagi</text>
        <text x="186" y="250" fontSize="7" fill="#94a3b8">Wygasłe + wygasające w 30 dni</text>
        {[
          { name: 'Jan Kowalski', cert: 'Uprawnienia SEP', status: 'Wygasło', sColor: '#ef4444' },
          { name: 'Anna Nowak', cert: 'Szkolenie BHP', status: '<7 dni', sColor: '#f97316' },
          { name: 'Piotr Wiśniewski', cert: 'UDT wózki', status: 'Wygasło', sColor: '#ef4444' },
          { name: 'Ewa Zielińska', cert: 'Spawanie MAG', status: '<30 dni', sColor: '#eab308' },
          { name: 'Marek Szymański', cert: 'BHP okresowe', status: '<30 dni', sColor: '#eab308' },
        ].map((item, i) => (
          <g key={i}>
            <rect x="186" y={258 + i * 32} width={(W - 186) / 2 - 38} height="28" rx="6" fill="#fafafa" />
            <text x="198" y={273 + i * 32} fontSize="8" fontWeight="500" fill="#1e293b">{item.name}</text>
            <text x="198" y={283 + i * 32} fontSize="7" fill="#94a3b8">{item.cert}</text>
            <rect x={(W - 186) / 2 + 170 - 80} y={264 + i * 32} width="48" height="14" rx="4"
              fill={item.sColor === '#ef4444' ? '#fef2f2' : item.sColor === '#f97316' ? '#fff7ed' : '#fefce8'}
            />
            <text x={(W - 186) / 2 + 170 - 56} y={274 + i * 32} fontSize="6.5" fontWeight="600" fill={item.sColor} textAnchor="middle">{item.status}</text>
          </g>
        ))}

        {/* Right: By category */}
        <rect x={170 + (W - 186) / 2 + 6} y="218" width={(W - 186) / 2 - 6} height={H - 230} rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x={186 + (W - 186) / 2 + 6} y="238" fontSize="9" fontWeight="600" fill="#1e293b">Wg kategorii</text>
        {[
          { name: 'BHP', total: 12, attention: 2, color: '#22c55e', pct: 0.83 },
          { name: 'UDT', total: 8, attention: 1, color: '#3b82f6', pct: 0.88 },
          { name: 'SEP', total: 10, attention: 2, color: '#f97316', pct: 0.80 },
          { name: 'Spawalnicze', total: 6, attention: 0, color: '#a855f7', pct: 1.0 },
          { name: 'Inne', total: 12, attention: 0, color: '#64748b', pct: 1.0 },
        ].map((cat, i) => {
          const bx = 186 + (W - 186) / 2 + 6;
          const barW = (W - 186) / 2 - 70;
          return (
            <g key={i}>
              <circle cx={bx + 8} cy={260 + i * 30} r="4" fill={cat.color} />
              <text x={bx + 18} y={263 + i * 30} fontSize="8" fontWeight="500" fill="#1e293b">{cat.name}</text>
              <rect x={bx + 80} y={255 + i * 30} width={barW} height="10" rx="3" fill="#f1f5f9" />
              <rect x={bx + 80} y={255 + i * 30} width={barW * cat.pct} height="10" rx="3" fill={cat.color} opacity="0.4" />
              <text x={bx + barW + 86} y={264 + i * 30} fontSize="7" fill="#64748b">{cat.total}</text>
              {cat.attention > 0 && <text x={bx + barW + 102} y={264 + i * 30} fontSize="7" fill="#ef4444">({cat.attention})</text>}
            </g>
          );
        })}
      </g>
    );
  },

  /* ─── CertTrack: Pracownicy ─── */
  ct_employees: (W, H) => {
    const employees = [
      { name: 'Jan Kowalski', initials: 'JK', pos: 'Spawacz', dept: 'Hala 1', email: 'jan.k@firma.pl', active: true },
      { name: 'Anna Nowak', initials: 'AN', pos: 'Operator CNC', dept: 'Produkcja', email: 'anna.n@firma.pl', active: true },
      { name: 'Marek Szymański', initials: 'MS', pos: 'Brygadzista', dept: 'Hala 1', email: 'marek.s@firma.pl', active: true },
      { name: 'Ewa Zielińska', initials: 'EZ', pos: 'Elektryk', dept: 'Utrzymanie', email: 'ewa.z@firma.pl', active: true },
      { name: 'Piotr Wiśniewski', initials: 'PW', pos: 'Tokarz', dept: 'Hala 2', email: 'piotr.w@firma.pl', active: false },
      { name: 'Katarzyna Lewandowska', initials: 'KL', pos: 'Spawacz', dept: 'Spawalnia', email: 'kasia.l@firma.pl', active: true },
    ];
    return (
      <g>
        <Chrome w={W} />
        <CtNav h={H} active={1} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f1f5f9" />

        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Pracownicy</text>
        <text x="340" y="58" fontSize="8" fill="#94a3b8">10 aktywnych z 12 łącznie</text>

        {/* Search + button */}
        <rect x="170" y="68" width="300" height="26" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="182" y="85" fontSize="8" fill="#94a3b8">Szukaj po imieniu, nazwisku, stanowisku, dziale…</text>
        <rect x={W - 154} y="68" width="120" height="26" rx="6" fill="#2563eb" />
        <text x={W - 94} y="85" fontSize="8.5" fontWeight="600" fill="#fff" textAnchor="middle">＋ Dodaj pracownika</text>

        {/* Table */}
        <rect x="170" y="104" width={W - 186} height={H - 116} rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />

        {/* Header */}
        <rect x="170" y="104" width={W - 186} height="24" rx="10" fill="#f8fafc" />
        {['Pracownik', 'Stanowisko', 'Dział', 'Email', 'Status', 'Akcje'].map((h, i) => (
          <text key={h} x={[190, 310, 410, 500, 620, W - 60][i]} y="120" fontSize="7.5" fontWeight="600" fill="#94a3b8">{h}</text>
        ))}

        {employees.map((e, i) => (
          <g key={i}>
            <rect x="170" y={130 + i * 34} width={W - 186} height="33" fill={i % 2 ? '#fafafa' : '#fff'} />
            {/* Avatar */}
            <circle cx="198" cy={147 + i * 34} r="11" fill="#dbeafe" />
            <text x="198" y={151 + i * 34} fontSize="8" fontWeight="600" fill="#2563eb" textAnchor="middle">{e.initials}</text>
            <text x="216" y={144 + i * 34} fontSize="8.5" fontWeight="500" fill="#1e293b">{e.name}</text>
            <text x="310" y={150 + i * 34} fontSize="8" fill="#64748b">{e.pos}</text>
            <text x="410" y={150 + i * 34} fontSize="8" fill="#64748b">{e.dept}</text>
            <text x="500" y={150 + i * 34} fontSize="7.5" fill="#94a3b8">{e.email}</text>
            {/* Status badge */}
            <rect x="620" y={140 + i * 34} width={e.active ? 52 : 62} height="18" rx="4"
              fill={e.active ? '#f0fdf4' : '#f8fafc'} stroke={e.active ? '#bbf7d0' : '#e2e8f0'} strokeWidth="0.5"
            />
            <text x={e.active ? 636 : 640} y={152 + i * 34} fontSize="7" fontWeight="500" fill={e.active ? '#16a34a' : '#94a3b8'}>{e.active ? 'Aktywny' : 'Nieaktywny'}</text>
            <text x={W - 50} y={150 + i * 34} fontSize="7" fill="#2563eb">{'Profil →'}</text>
          </g>
        ))}
      </g>
    );
  },

  /* ─── CertTrack: Kategorie ─── */
  ct_categories: (W, H) => {
    const cats = [
      { name: 'Szkolenie BHP', desc: 'Szkolenia z bezpieczeństwa i higieny pracy', alert: 30, color: '#22c55e' },
      { name: 'Uprawnienia UDT', desc: 'Urządzenia transportu bliskiego (wózki, suwnice)', alert: 60, color: '#3b82f6' },
      { name: 'Uprawnienia SEP', desc: 'Stowarzyszenie Elektryków Polskich — urządzenia elektr.', alert: 60, color: '#f97316' },
      { name: 'Spawalnicze', desc: 'Certyfikaty spawalnicze wg EN ISO 9606', alert: 90, color: '#a855f7' },
      { name: 'Badania lekarskie', desc: 'Badania okresowe i specjalistyczne', alert: 30, color: '#ec4899' },
      { name: 'Inne uprawnienia', desc: 'Dodatkowe certyfikaty i szkolenia branżowe', alert: 30, color: '#64748b' },
    ];
    return (
      <g>
        <Chrome w={W} />
        <CtNav h={H} active={3} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f1f5f9" />

        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Kategorie uprawnień</text>
        <text x="170" y="72" fontSize="8" fill="#94a3b8">Typy certyfikatów i uprawnień śledzonych w systemie</text>

        <rect x={W - 154} y="46" width="120" height="26" rx="6" fill="#2563eb" />
        <text x={W - 94} y="63" fontSize="8.5" fontWeight="600" fill="#fff" textAnchor="middle">＋ Dodaj kategorię</text>

        {/* Category cards grid (3 cols) */}
        {cats.map((cat, i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const cardW = (W - 186 - 20) / 3;
          return (
            <g key={i}>
              <rect x={170 + col * (cardW + 10)} y={86 + row * 130} width={cardW} height="120" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
              {/* Icon */}
              <rect x={182 + col * (cardW + 10)} y={98 + row * 130} width="28" height="28" rx="6" fill={cat.color} opacity="0.12" />
              <text x={196 + col * (cardW + 10)} y={117 + row * 130} fontSize="12" textAnchor="middle" fill={cat.color}>📁</text>
              {/* Name */}
              <text x={218 + col * (cardW + 10)} y={108 + row * 130} fontSize="9" fontWeight="600" fill="#1e293b">{cat.name}</text>
              {/* Description */}
              <text x={182 + col * (cardW + 10)} y={140 + row * 130} fontSize="7" fill="#94a3b8">{cat.desc.substring(0, 44)}</text>
              {cat.desc.length > 44 && <text x={182 + col * (cardW + 10)} y={150 + row * 130} fontSize="7" fill="#94a3b8">{cat.desc.substring(44)}</text>}
              {/* Alert days footer */}
              <rect x={170 + col * (cardW + 10)} y={186 + row * 130} width={cardW} height="20" rx="0" fill="#f8fafc" />
              <text x={182 + col * (cardW + 10)} y={199 + row * 130} fontSize="6.5" fill="#94a3b8">Alert: {cat.alert} dni przed wygaśnięciem</text>
              {/* Edit/delete buttons */}
              <text x={170 + col * (cardW + 10) + cardW - 34} y={116 + row * 130} fontSize="9" fill="#94a3b8">{'✏️'}</text>
              <text x={170 + col * (cardW + 10) + cardW - 18} y={116 + row * 130} fontSize="9" fill="#ef4444">{'🗑️'}</text>
            </g>
          );
        })}
      </g>
    );
  },

  /* ─── CertTrack: Import CSV i raporty ─── */
  ct_import: (W, H) => {
    return (
      <g>
        <Chrome w={W} />
        <CtNav h={H} active={4} />
        <rect x="150" y="28" width={W - 150} height={H - 28} fill="#f1f5f9" />

        <text x="170" y="58" fontSize="14" fontWeight="700" fill="#1e293b">Import danych (CSV)</text>
        <text x="170" y="72" fontSize="8" fill="#94a3b8">Masowe dodawanie pracowników i uprawnień z pliku CSV</text>

        {/* Mode switch */}
        <rect x="170" y="82" width="110" height="26" rx="6" fill="#2563eb" />
        <text x="225" y="99" fontSize="8.5" fontWeight="600" fill="#fff" textAnchor="middle">Pracownicy</text>
        <rect x="286" y="82" width="110" height="26" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="341" y="99" fontSize="8.5" fontWeight="600" fill="#64748b" textAnchor="middle">Uprawnienia</text>

        {/* Template */}
        <rect x="170" y="118" width={W - 186} height="80" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="138" fontSize="9" fontWeight="600" fill="#1e293b">Szablon CSV</text>
        <text x="186" y="154" fontSize="7.5" fill="#64748b">Kolumny: imię*, nazwisko*, stanowisko, dział, email, telefon</text>

        {/* CSV preview */}
        <rect x="186" y="162" width={W - 218} height="14" rx="2" fill="#f8fafc" fontFamily="monospace" />
        <text x="194" y="173" fontSize="6.5" fontFamily="monospace" fill="#64748b">imię;nazwisko;stanowisko;dział;email;telefon</text>
        <text x="194" y="185" fontSize="6.5" fontFamily="monospace" fill="#94a3b8">Jan;Kowalski;Spawacz;Hala 1;jan@firma.pl;512345678</text>

        <rect x={W - 230} y="130" width="90" height="22" rx="6" fill="#2563eb" opacity="0.1" stroke="#2563eb" strokeWidth="0.5" />
        <text x={W - 185} y="145" fontSize="7.5" fontWeight="600" fill="#2563eb" textAnchor="middle">Pobierz szablon</text>

        {/* File upload */}
        <rect x="170" y="208" width={W - 186} height="60" rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 2" />
        <text x={(W + 150) / 2} y="236" fontSize="10" textAnchor="middle" fill="#94a3b8">{'📤'}</text>
        <text x={(W + 150) / 2} y="254" fontSize="8" textAnchor="middle" fill="#94a3b8">Wczytaj plik CSV — przeciągnij lub kliknij</text>

        {/* Preview table */}
        <rect x="170" y="278" width={W - 186} height={H - 290} rx="10" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
        <text x="186" y="298" fontSize="9" fontWeight="600" fill="#1e293b">Podgląd (3 wierszy)</text>

        <rect x="186" y="304" width={W - 218} height="18" fill="#f8fafc" rx="4" />
        {['Imię', 'Nazwisko', 'Stanowisko', 'Dział', 'Email'].map((h, i) => (
          <text key={h} x={[198, 270, 360, 450, 540][i]} y="316" fontSize="7" fontWeight="600" fill="#94a3b8">{h}</text>
        ))}
        {[
          ['Jan', 'Kowalski', 'Spawacz', 'Hala 1', 'jan@firma.pl'],
          ['Anna', 'Nowak', 'Operator CNC', 'Produkcja', 'anna@firma.pl'],
          ['Marek', 'Szymański', 'Brygadzista', 'Hala 1', 'marek@firma.pl'],
        ].map((row, i) => (
          <g key={i}>
            {row.map((cell, j) => (
              <text key={j} x={[198, 270, 360, 450, 540][j]} y={336 + i * 18} fontSize="7.5" fill="#1e293b">{cell}</text>
            ))}
          </g>
        ))}

        {/* Import button */}
        <rect x={W - 180} y={H - 42} width="140" height="28" rx="6" fill="#2563eb" />
        <text x={W - 110} y={H - 24} fontSize="9" fontWeight="600" fill="#fff" textAnchor="middle">Importuj 3 rekordy</text>
      </g>
    );
  },
};


/* ══════════════════════════════════════════════════════════════
   GUIDE SECTIONS — realistic descriptions matching the real apps
   ══════════════════════════════════════════════════════════════ */

const GUIDES = [
  {
    id: 'shiftplanner',
    name: 'ShiftPlanner',
    icon: '📅',
    color: 'from-teal-500 to-cyan-600',
    description: 'Elastycznie planuj grafiki zmian — dowolny system zmianowy, urlopy, wydruki.',
    sections: [
      {
        title: 'Widok kalendarza',
        ill: { id: 'sp_calendar', w: 860, h: 480 },
        desc: 'Główny widok ShiftPlannera składa się z dwóch paneli: kalendarza miesięcznego po lewej i panelu dnia po prawej. W kalendarzu każda komórka dnia pokazuje kolorowe paski odpowiadające przypisanym zmianom — teal to Zmiana 1 (07:00–15:00), niebieski Zmiana 2 (15:00–23:00), fioletowy Zmiana 3 (23:00–07:00). Kliknij dzień, aby zobaczyć szczegóły obsady w panelu po prawej. Tam wybierz zakładkę zmiany i przypisz pracowników do każdego stanowiska (np. Operator CNC, Spawacz, Brygadzista). Aplikacja automatycznie podświetla dzisiejszy dzień i oznacza weekendy oraz niedziele osobnymi kolorami. Nawigacja ← Dziś → pozwala szybko przechodzić między miesiącami.',
      },
      {
        title: 'Zarządzanie pracownikami',
        ill: { id: 'sp_employees', w: 860, h: 440 },
        desc: 'Zakładka „👷 Pracownicy" wyświetla tabelę z danymi każdego pracownika: imię i nazwisko, numer telefonu, status (Aktywny/Nieaktywny), przypisane stanowiska i dozwolone zmiany. Na górze widać 4 kafelki KPI: łączna liczba pracowników, ilu aktywnych, ile wpisów urlopowych i ilu pracowników aktualnie na urlopie. Przycisk „Dodaj pracownika" otwiera formularz z polami: imię, nazwisko, telefon, stanowisko, dozwolone zmiany. Pracownicy nieaktywni nie pojawiają się w kalendarzu ani w planowaniu automatycznym. Możesz filtrować listę wyszukiwarką oraz wykonywać masową edycję (zaznacz wiele → zmień stanowisko lub zmiany).',
      },
      {
        title: 'Konfiguracja zmian i ustawień',
        ill: { id: 'sp_shifts', w: 860, h: 430 },
        desc: 'W zakładce „⚙️ Opcje" konfigurujesz cały system zmianowy. ShiftPlanner NIE jest ograniczony do 3- czy 4-brygadowego systemu — możesz stworzyć dowolną liczbę zmian z własnymi nazwami, godzinami rozpoczęcia/zakończenia i kolorami. Domyślnie: Zmiana 1 (07:00–15:00), Zmiana 2 (15:00–23:00), Zmiana 3 (23:00–07:00). W sekcji „Dni wolne od planowania" zaznacz, które dni tygodnia mają być wyłączone z grafiku (np. tylko niedziele, lub soboty i niedziele). Przełączniki po prawej stronie sterują widocznością weekendów, świąt, automatycznymi sugestiami, ukrywaniem nieaktywnych pracowników oraz numerami tygodni w kalendarzu.',
      },
      {
        title: 'Urlopy i nieobecności',
        ill: { id: 'sp_vacations', w: 860, h: 430 },
        desc: 'Zakładka „🏖️ Urlopy" pozwala zarządzać nieobecnościami. Każdy wpis urlopowy zawiera: pracownika, datę od–do, typ (urlop) i liczbę dni. Możesz filtrować po pracowniku za pomocą dropdowna na górze. Gdy dodajesz urlop, który koliduje z już przypisanymi zmianami w kalendarzu, system ostrzega o konflikcie i pozwala automatycznie usunąć te przypisania. Urlopy widoczne są też na kalendarzu jako żółte oznaczenia przy dniu.',
      },
      {
        title: 'Drukowanie i eksport',
        ill: { id: 'sp_print', w: 860, h: 400 },
        desc: 'Przycisk „🖨️ Drukuj" otwiera podgląd wydruku z trzema trybami: Karty (każdy pracownik jako osobna karta z przypisanymi zmianami), Tabela (klasyczny grafik zmian w formie tabeli — pracownicy w wierszach, dni w kolumnach, zmiany oznaczone kolorami i skrótami Z1/Z2/Z3/U), oraz Minimalny (uproszczony widok). Eksport do PDF zawiera nagłówek z nazwą hali i miesiącem. Kolory zmian (teal, niebieski, fioletowy) i oznaczenie urlopów (żółte „U") są zachowane na wydruku.',
      },
      {
        title: 'Automatyczne planowanie',
        ill: { id: 'sp_auto', w: 860, h: 420 },
        desc: 'Zakładka „🧩 Planowanie tygodnia" oferuje automat planujący, który rozkłada zmiany równomiernie między pracowników. Skonfiguruj: datę startową tygodnia, które zmiany zaplanować, opcje „Tylko puste sloty" (nie nadpisuj istniejących) i „Pomiń soboty". Przycisk „Planuj tydzień" planuje 7 dni, „Planuj miesiąc" — cały miesiąc. Panel raportu po prawej pokazuje statystyki: średnie obciążenie (zm/os), min/max obciążenie, odchylenie standardowe, pokrycie zmian (%) i liczbę konfliktów. Na dole widać ranking pracowników z największą liczbą zmian, co pomaga w równomiernym rozłożeniu pracy.',
      },
    ],
  },
  {
    id: 'equipment',
    name: 'Equipment Manager',
    icon: '🔧',
    color: 'from-blue-500 to-indigo-600',
    description: 'Zarządzaj przeglądami, kalibracjami i inspekcjami sprzętu.',
    sections: [
      {
        title: 'Dashboard — powiadomienia',
        ill: { id: 'em_dashboard', w: 780, h: 390 },
        desc: 'Dashboard „🔔 Powiadomienia" wyświetla 4 kafelki podsumowujące: Razem (łączna liczba tracked urządzeń), Przeterminowane (czerwone — wymagają natychmiastowej uwagi), Wkrótce wygasają (żółte — ≤30 dni do terminu), W porządku (zielone — termin >90 dni). Poniżej widać sekcje pogrupowane kolorową krawędzią po lewej: ⚠️ Przeterminowane (np. „Gaśnica GP-6, Hala 1" z przyciskiem odnowienia), 🟡 Wkrótce wygasają (z liczbą dni do terminu) i ✅ Aktualne. Kliknięcie elementu przenosi do jego karty szczegółów.',
      },
      {
        title: 'Baza danych',
        ill: { id: 'em_items', w: 780, h: 400 },
        desc: 'Zakładka „🗄️ Baza danych" to główna tabela sprzętu. Na górze wyszukiwarka (po nazwie, numerze narzędzia, opisie, przypisaniu) oraz przycisk „Dodaj element". Tabela zawiera kolumny: status (kolorowa kropka), Nr narzędzia (np. GS-001, SW-012), Nazwa, Kategoria (Gaśnice, Narzędzia, Maszyny…), Przypisany do (Hala 1, Narzędziownia…), Typ kontroli (Przegląd, Kalibracja, Wymiana, Serwis), Data wygaśnięcia i liczba pozostałych dni. Zaawansowane filtry pozwalają filtrować po kategorii, statusie, zakresie dat i sortować po wielu kryteriach. Kliknięcie ikony „Karta" otwiera szczegóły urządzenia.',
      },
      {
        title: 'Karta urządzenia',
        ill: { id: 'em_card', w: 780, h: 420 },
        desc: 'Każde urządzenie ma dedykowaną kartę z pełnymi informacjami. Nagłówek wyświetla nazwę, numer narzędzia, opis i plakietkę statusu (kolorową: zielony = OK, żółty = Wkrótce, czerwony = Przeterminowane). Siatka informacyjna zawiera 6 pól: Kategoria, Przypisany do, Typ kontroli, Okres (np. „co 6 miesięcy"), Ostatnia data przeglądu, Data wygaśnięcia. Poniżej — tabela parametrów technicznych specyficznych dla typu narzędzia (np. wiertarka: Zakres wierteł 1–20 mm, Moc 750 W, Obroty 500–2500 obr/min). Parametry można edytować i zapisać przyciskiem „Zapisz parametry".',
      },
      {
        title: 'Ustawienia i zarządzanie',
        ill: { id: 'em_settings', w: 780, h: 390 },
        desc: 'Zakładka „⚙️ Ustawienia" zawiera karty konfiguracyjne: Wygląd (przełącznik ciemnego motywu), Powiadomienia (przełączniki globalne, uprawnienia przeglądarki, ustawienia częstotliwości: ile miesięcy przed terminem, codzienne alerty na ile tygodni przed, co godzinę w ostatnim dniu), Kategorie sprzętu (edytowalna lista: Narzędzia, Maszyny, Gaśnice, Pojazdy, Urządzenia elektryczne, Urządzenia pomiarowe, Inne), Typy kontroli (Przegląd, Kalibracja, Wymiana, Kontrola, Certyfikacja, Serwis, Inspekcja) oraz sekcja eksportu/importu danych JSON z przyciskami „Eksport danych" i „Import danych".',
      },
    ],
  },
  {
    id: 'certtrack',
    name: 'CertTrack',
    icon: '📋',
    color: 'from-purple-500 to-pink-600',
    description: 'Śledź certyfikaty, uprawnienia i szkolenia pracowników.',
    sections: [
      {
        title: 'Dashboard',
        ill: { id: 'ct_dashboard', w: 860, h: 460 },
        desc: 'Dashboard CertTrack pokazuje rzeczywisty układ aplikacji: 4 kafelki statystyk (Aktywni pracownicy, Łącznie uprawnień, Wygasłe, Wygasa w 7 dni), pasek rozkładu statusów oraz dwie sekcje: „Wymagają uwagi" i „Wg kategorii". W bocznym panelu są tylko funkcje operacyjne (bez płatności), a wybór profilu danych odbywa się z przełącznika profilu nad menu.',
      },
      {
        title: 'Pracownicy i uprawnienia',
        ill: { id: 'ct_employees', w: 860, h: 440 },
        desc: 'Zakładka „👥 Pracownicy" wyświetla tabelę z avatarami (kolorowe kółka z inicjałami, np. JK dla Jan Kowalski), stanowiskiem (Spawacz, Operator CNC, Brygadzista…), działem (Hala 1, Produkcja, Utrzymanie…), emailem i statusem (zielona plakietka „Aktywny" lub szara „Nieaktywny"). Kliknięcie „Profil →" otwiera szczegółowy widok pracownika z pełną listą jego certyfikatów, datami wydania, wygaśnięcia i statusem każdego uprawnienia. Formularz dodawania pracownika zawiera pola: Imię*, Nazwisko*, Stanowisko (np. Spawacz, Operator CNC), Dział (np. Hala 1, Spawalnia), Email, Telefon, Data zatrudnienia.',
      },
      {
        title: 'Kategorie uprawnień',
        ill: { id: 'ct_categories', w: 860, h: 380 },
        desc: 'Zakładka „📁 Kategorie" wyświetla siatkę kart (3 kolumny) z typami certyfikatów śledzonych w systemie. Każda karta zawiera: kolorową ikonę folderu, nazwę kategorii (np. Szkolenie BHP, Uprawnienia UDT, Uprawnienia SEP, Spawalnicze, Badania lekarskie), opis i informację o alercie (np. „Alert: 60 dni przed wygaśnięciem"). Przyciski edycji ✏️ i usunięcia 🗑️ pozwalają modyfikować kategorie. Przycisk „Dodaj kategorię" otwiera formularz z polami: Nazwa (np. „Uprawnienia spawalnicze"), Opis, Alert (dni przed wygaśnięciem), Kolor (color picker). Każda kategoria ma unikalny kolor widoczny w tabelach i na dashboardzie.',
      },
      {
        title: 'Import CSV i raporty',
        ill: { id: 'ct_import', w: 860, h: 430 },
        desc: 'Zakładka „📤 Import CSV" umożliwia masowe dodawanie danych. Dwa tryby: „Pracownicy" (kolumny: imię*, nazwisko*, stanowisko, dział, email, telefon) i „Uprawnienia" (kolumny: pracownik, kategoria, nr certyfikatu, data wydania, data wygaśnięcia, wystawca). Przycisk „Pobierz szablon" generuje plik CSV z nagłówkami. Po wczytaniu pliku pojawia się podgląd danych z weryfikacją — system mapuje kolumny, sprawdza duplikaty i waliduje daty. Przycisk „Importuj N rekordów" dodaje dane do bazy. Po zakończeniu wyświetla raport: ile dodano, ile pominięto (z powodami). Dodatkowo w zakładce „Uprawnienia" przycisk „Eksport Excel" pobiera pełną listę certyfikatów z danymi pracowników i statusami.',
      },
    ],
  },
];


/* ══════════════════════════════════════════════════════════════
   AppIllustration — renders the keyed SVG illustration
   ══════════════════════════════════════════════════════════════ */

function AppIllustration({ id, w = 860, h = 480 }) {
  const render = ILLUSTRATIONS[id];
  if (!render) return null;
  return (
    <div
      className="w-full rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden shadow-sm"
      style={{ aspectRatio: `${w}/${h}`, maxHeight: 460 }}
    >
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        style={{ fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}
      >
        {render(w, h)}
      </svg>
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════
   GuidePage — main page component
   ══════════════════════════════════════════════════════════════ */

export default function GuidePage() {
  const [activeTab, setActiveTab] = useState('shiftplanner');
  const guide = GUIDES.find((g) => g.id === activeTab);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">OH</div>
            <span className="text-xl font-bold text-slate-800">OneHost</span>
          </Link>
          <Link to="/" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">← Strona główna</Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Uwaga: zrzuty ekranu w poradniku są przykładowe. Rzeczywisty wygląd aplikacji może się nieznacznie różnić w zależności od wersji.
        </div>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">Poradnik — jak korzystać z OneHost</h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">Szczegółowy przewodnik po każdym narzędziu z realistycznymi widokami interfejsu. Kliknij zakładkę, aby zobaczyć opis funkcji.</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
          {GUIDES.map((g) => (
            <button
              key={g.id}
              onClick={() => setActiveTab(g.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold border-2 transition-all cursor-pointer ${
                activeTab === g.id
                  ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <span className="text-lg">{g.icon}</span>
              {g.name}
            </button>
          ))}
        </div>

        {/* Guide content */}
        {guide && (
          <div>
            <div className="text-center mb-10">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${guide.color} text-3xl mb-4`}>
                {guide.icon}
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{guide.name}</h2>
              <p className="text-slate-500">{guide.description}</p>
            </div>

            <div className="space-y-12">
              {guide.sections.map((section, i) => (
                <section key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                        {i + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">{section.title}</h3>
                        <p className="text-sm text-slate-500 leading-relaxed">{section.desc}</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <AppIllustration id={section.ill.id} w={section.ill.w} h={section.ill.h} />
                    </div>
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-16 py-12 bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 rounded-2xl">
          <h2 className="text-2xl font-bold text-white mb-3">Gotowy na start?</h2>
          <p className="text-slate-300 mb-6">Wypróbuj plan Starter — 7 dni za darmo.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/register" className="inline-block bg-gradient-to-r from-teal-500 to-cyan-600 text-white px-8 py-3 rounded-xl text-sm font-semibold hover:from-teal-600 hover:to-cyan-700 transition-all shadow-lg">
              Załóż konto
            </Link>
            <a href="mailto:Admin@onehost.site" className="inline-block border border-slate-600 text-slate-300 px-6 py-3 rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors">
              Napisz do nas
            </a>
          </div>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} OneHost. Wszelkie prawa zastrzeżone.</p>
        </div>
      </footer>
    </div>
  );
}
