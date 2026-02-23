/**
 * ShiftPlanner – standalone API server (browser version)
 * Stores all data in server/data/<tenantId>/<profileId>/ as JSON files.
 * Supports multi-profile per tenant and validates OneHost JWT tokens.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

const ONEHOST_API = process.env.ONEHOST_API || 'http://127.0.0.1:56';
const AUTH_ENABLED = process.env.AUTH_ENABLED !== '0'; // default: on
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://sklep.onehost.site,https://shiftplanner.onehost.site,http://127.0.0.1:55,http://127.0.0.1:57')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (!ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── OneHost auth middleware ──────────────────────────────
async function onehostAuth(req, res, next) {
  if (!AUTH_ENABLED) {
    req.tenantId = 'default';
    req.maxProfiles = 99;
    req.maxEmployees = 9999;
    req.allowedProfiles = [{ id: 'default', name: 'Domyślny', product: 'shiftplanner' }];
    req.allowedProfileIds = ['default'];
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized', message: 'Zaloguj się w OneHost' });
  try {
    const resp = await fetch(`${ONEHOST_API}/api/auth/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: header.slice(7) }),
    });
    const data = await resp.json();
    if (!data.valid || !data.hasAccess) return res.status(403).json({ error: 'no_access', message: 'Brak aktywnej subskrypcji' });
    if (!data.subscription?.products?.includes('shiftplanner')) return res.status(403).json({ error: 'product_not_included', message: 'ShiftPlanner nie jest w Twoim planie' });
    req.tenantId = String(data.user?.tenantId || 'default');
    req.user = data.user;
    req.maxProfiles = data.subscription?.maxProfiles || 1;
    req.maxEmployees = data.subscription?.maxEmployees || 25;
    req.allowedProfiles = Array.isArray(data.assignedProfiles)
      ? data.assignedProfiles.filter((p) => p.product === 'shiftplanner').map((p) => ({ id: String(p.id), name: p.name || `Profil ${p.id}`, product: p.product }))
      : [];
    req.allowedProfileIds = req.allowedProfiles.map((p) => p.id);

    if (!req.allowedProfileIds.length) {
      return res.status(403).json({ error: 'no_profile_assigned', message: 'Brak przypisanego profilu ShiftPlanner dla tego użytkownika.' });
    }

    for (const p of req.allowedProfiles) {
      const dir = tenantDir(req.tenantId, p.id);
      const metaPath = path.join(dir, '_profile.json');
      if (!fs.existsSync(metaPath)) fs.writeFileSync(metaPath, JSON.stringify({ name: p.name, created: now() }, null, 2), 'utf-8');
      else {
        const meta = readJSON(req.tenantId, p.id, '_profile', { name: p.name });
        meta.name = p.name;
        writeJSON(req.tenantId, p.id, '_profile', meta);
      }
    }
    next();
  } catch (err) {
    console.warn('[Auth] OneHost validation failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'onehost_unavailable', message: 'OneHost chwilowo niedostępny. Spróbuj ponownie za chwilę.' });
    }
    console.warn('[Auth] Dev fallback enabled: allowing access (default tenant)');
    req.tenantId = 'default';
    req.maxProfiles = 99;
    req.maxEmployees = 9999;
    req.allowedProfiles = [{ id: 'default', name: 'Domyślny', product: 'shiftplanner' }];
    req.allowedProfileIds = ['default'];
    next();
  }
}

function resolveProfileId(req, requested) {
  const candidate = String(requested || '');
  if (Array.isArray(req.allowedProfileIds) && req.allowedProfileIds.length > 0) {
    if (candidate && req.allowedProfileIds.includes(candidate)) return candidate;
    return req.allowedProfileIds[0];
  }
  return candidate || 'default';
}

// ---------- helpers ----------
function tenantDir(tenantId, profileId) {
  const dir = path.join(DATA_DIR, String(tenantId), String(profileId || 'default'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function dataFile(tenantId, profileId, name) { return path.join(tenantDir(tenantId, profileId), `${name}.json`); }
function uid() { return crypto.randomUUID().slice(0, 8); }
function now() { return new Date().toISOString(); }

function readJSON(tenantId, profileId, name, fallback) {
  const fp = dataFile(tenantId, profileId, name);
  if (!fs.existsSync(fp)) return fallback;
  try { return JSON.parse(fs.readFileSync(fp, 'utf-8')); }
  catch { return fallback; }
}

function writeJSON(tenantId, profileId, name, data) {
  const fp = dataFile(tenantId, profileId, name);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
}

// ---------- Profile management ----------
function getProfiles(tenantId) {
  const tDir = path.join(DATA_DIR, String(tenantId));
  if (!fs.existsSync(tDir)) return [{ id: 'default', name: 'Domyślny' }];
  const dirs = fs.readdirSync(tDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  if (dirs.length === 0) return [{ id: 'default', name: 'Domyślny' }];
  return dirs.map(d => {
    const meta = readJSON(tenantId, d, '_profile', { name: d === 'default' ? 'Domyślny' : d });
    return { id: d, name: meta.name || d };
  });
}

function createProfile(tenantId, profileId, name) {
  const dir = tenantDir(tenantId, profileId);
  writeJSON(tenantId, profileId, '_profile', { name, created: now() });
  return { id: profileId, name };
}

function deleteProfile(tenantId, profileId) {
  if (profileId === 'default') return false;
  const dir = path.join(DATA_DIR, String(tenantId), profileId);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  return true;
}

function renameProfile(tenantId, profileId, newName) {
  const meta = readJSON(tenantId, profileId, '_profile', { name: profileId });
  meta.name = newName;
  writeJSON(tenantId, profileId, '_profile', meta);
  return true;
}

// ---------- data layer (tenant+profile scoped) ----------
function getSettings(t, p)   { return readJSON(t, p, 'settings', defaultSettings()); }
function saveSettings(t, p, s) { writeJSON(t, p, 'settings', s); return s; }

function getEmployees(t, p)    { return readJSON(t, p, 'employees', []); }
function saveEmployees(t, p, a)  { writeJSON(t, p, 'employees', a); }

function getPositions(t, p)    { return readJSON(t, p, 'positions', []); }
function savePositions(t, p, a)  { writeJSON(t, p, 'positions', a); }

function getVacations(t, p)    { return readJSON(t, p, 'vacations', []); }
function saveVacations(t, p, a)  { writeJSON(t, p, 'vacations', a); }

function getAssignments(t, p)    { return readJSON(t, p, 'assignments', []); }
function saveAssignments(t, p, a)  { writeJSON(t, p, 'assignments', a); }

function getWeekTemplates(t, p)    { return readJSON(t, p, 'weekTemplates', []); }
function saveWeekTemplates(t, p, a)  { writeJSON(t, p, 'weekTemplates', a); }

function defaultSettings() {
  return {
    appName: 'ShiftPlanner',
    hallName: '',
    shifts: [
      { id: '1', name: 'Ranna', start: '06:00', end: '14:00' },
      { id: '2', name: 'Popołudniowa', start: '14:00', end: '22:00' },
      { id: '3', name: 'Nocna', start: '22:00', end: '06:00' },
    ],
    saturdayShifts: [],
    dayOverrides: {},
    showWeekends: true,
    showHolidays: true,
    autoDayFocus: false,
    autoSuggest: false,
    hideInactiveInSelect: false,
    showWeekNumbers: false,
    showCoverageReport: false,
    firstDayOfWeek: 'monday',
    defaultView: 'month',
    defaultPrintMode: 'cards',
    planningMode: 'balanced',
    maxNightShiftsPerWeek: 3,
    maxLoadDifference: 2,
    blockNightToMorning: false,
    showSuccessToasts: true,
    showInfoToasts: true,
    warnDoubleShift: true,
    warnUnderstaffed: true,
    exportHoursSummary: false,
    debugMode: false,
    employeePairs: [],
    smtp: {},
  };
}

// ---------- bootstrap ----------
function bootstrap(t, p) {
  return {
    ok: true,
    settings: getSettings(t, p),
    employees: getEmployees(t, p),
    positions: getPositions(t, p),
    vacations: getVacations(t, p),
    assignments: getAssignments(t, p),
    weekTemplates: getWeekTemplates(t, p),
  };
}

// ---------- handler factories (tenant+profile scoped) ----------
function makeHandlers(t, p, maxEmployees) {
  return {
  bootstrap: {
    get: () => bootstrap(t, p),
  },

  settings: {
    save: ({ settings: incoming }) => {
      const merged = { ...getSettings(t, p), ...incoming };
      saveSettings(t, p, merged);
      return bootstrap(t, p);
    },
    setDayOverride: ({ date, shifts }) => {
      const s = getSettings(t, p);
      if (!s.dayOverrides) s.dayOverrides = {};
      s.dayOverrides[date] = shifts;
      saveSettings(t, p, s);
      return bootstrap(t, p);
    },
    clearDayOverride: ({ date }) => {
      const s = getSettings(t, p);
      if (s.dayOverrides) { delete s.dayOverrides[date]; }
      saveSettings(t, p, s);
      return bootstrap(t, p);
    },
  },

  employees: {
    create: (payload) => {
      const list = getEmployees(t, p);
      if (list.length >= maxEmployees) {
        return { ok: false, error: `Limit pracowników: ${maxEmployees}. Zmień plan na wyższy.` };
      }
      const emp = { id: uid(), ...payload, created: now(), updated: now() };
      list.push(emp);
      saveEmployees(t, p, list);
      return bootstrap(t, p);
    },
    update: ({ id, ...rest }) => {
      const list = getEmployees(t, p);
      const idx = list.findIndex(e => e.id === id);
      if (idx < 0) return { ok: false, error: 'employee_not_found' };
      list[idx] = { ...list[idx], ...rest, updated: now() };
      saveEmployees(t, p, list);
      return bootstrap(t, p);
    },
    delete: ({ id }) => {
      saveEmployees(t, p, getEmployees(t, p).filter(e => e.id !== id));
      return bootstrap(t, p);
    },
  },

  positions: {
    create: (payload) => {
      const list = getPositions(t, p);
      const pos = { id: uid(), ...payload, created: now(), updated: now() };
      list.push(pos);
      savePositions(t, p, list);
      return bootstrap(t, p);
    },
    update: ({ id, ...rest }) => {
      const list = getPositions(t, p);
      const idx = list.findIndex(e => e.id === id);
      if (idx < 0) return { ok: false, error: 'position_not_found' };
      list[idx] = { ...list[idx], ...rest, updated: now() };
      savePositions(t, p, list);
      return bootstrap(t, p);
    },
    delete: ({ id }) => {
      savePositions(t, p, getPositions(t, p).filter(e => e.id !== id));
      return bootstrap(t, p);
    },
  },

  vacations: {
    create: (payload) => {
      const list = getVacations(t, p);
      const v = { id: uid(), ...payload, created: now(), updated: now() };
      list.push(v);
      saveVacations(t, p, list);
      return bootstrap(t, p);
    },
    update: ({ id, ...rest }) => {
      const list = getVacations(t, p);
      const idx = list.findIndex(e => e.id === id);
      if (idx < 0) return { ok: false, error: 'vacation_not_found' };
      list[idx] = { ...list[idx], ...rest, updated: now() };
      saveVacations(t, p, list);
      return bootstrap(t, p);
    },
    delete: ({ id }) => {
      saveVacations(t, p, getVacations(t, p).filter(e => e.id !== id));
      return bootstrap(t, p);
    },
  },

  assignments: {
    set: ({ date, shiftId, positionId, employeeIds, employeeId, allowDoubleShift }) => {
      const list = getAssignments(t, p);
      const ids = employeeIds || (employeeId ? [employeeId] : []);
      const idx = list.findIndex(a => a.date === date && a.shiftId === shiftId && a.positionId === positionId);

      if (!ids.length) {
        if (idx >= 0) list.splice(idx, 1);
      } else {
        if (!allowDoubleShift && ids.length) {
          const conflicts = list.filter(a => a.date === date && a.shiftId === shiftId && a.positionId !== positionId);
          for (const c of conflicts) {
            const overlap = (c.employeeIds || []).filter(e => ids.includes(e));
            if (overlap.length) {
              return { ok: false, error: `Pracownik jest już przypisany na tej zmianie do innego stanowiska.` };
            }
          }
        }

        if (idx >= 0) {
          list[idx] = { ...list[idx], employeeIds: ids, updated: now() };
        } else {
          list.push({ id: uid(), date, shiftId, positionId, employeeIds: ids, created: now(), updated: now() });
        }
      }

      saveAssignments(t, p, list);
      return bootstrap(t, p);
    },

    bulkSet: ({ operations }) => {
      const h = makeHandlers(t, p, maxEmployees);
      for (const op of operations) {
        h.assignments.set(op);
      }
      return bootstrap(t, p);
    },

    copyDay: ({ sourceDate, targetDates }) => {
      const all = getAssignments(t, p);
      const source = all.filter(a => a.date === sourceDate);
      for (const tDate of targetDates) {
        for (const s of source) {
          const existing = all.findIndex(a => a.date === tDate && a.shiftId === s.shiftId && a.positionId === s.positionId);
          if (existing >= 0) {
            all[existing] = { ...all[existing], employeeIds: [...(s.employeeIds || [])], updated: now() };
          } else {
            all.push({ id: uid(), date: tDate, shiftId: s.shiftId, positionId: s.positionId, employeeIds: [...(s.employeeIds || [])], created: now(), updated: now() });
          }
        }
      }
      saveAssignments(t, p, all);
      return bootstrap(t, p);
    },
  },

  weekTemplates: {
    create: (payload) => {
      const list = getWeekTemplates(t, p);
      list.push({ id: uid(), ...payload, created: now(), updated: now() });
      saveWeekTemplates(t, p, list);
      return bootstrap(t, p);
    },
    update: ({ id, ...rest }) => {
      const list = getWeekTemplates(t, p);
      const idx = list.findIndex(e => e.id === id);
      if (idx >= 0) list[idx] = { ...list[idx], ...rest, updated: now() };
      saveWeekTemplates(t, p, list);
      return bootstrap(t, p);
    },
    delete: ({ id }) => {
      saveWeekTemplates(t, p, getWeekTemplates(t, p).filter(e => e.id !== id));
      return bootstrap(t, p);
    },
  },

  reset: {
    do: ({ type }) => {
      if (type === 'all' || type === 'settings') saveSettings(t, p, defaultSettings());
      if (type === 'all' || type === 'employees') saveEmployees(t, p, []);
      if (type === 'all' || type === 'positions') savePositions(t, p, []);
      if (type === 'all' || type === 'vacations') saveVacations(t, p, []);
      if (type === 'all' || type === 'assignments') saveAssignments(t, p, []);
      if (type === 'all' || type === 'weekTemplates') saveWeekTemplates(t, p, []);
      return bootstrap(t, p);
    },
  },

  backup: {
    import: ({ backup }) => {
      if (backup.settings) saveSettings(t, p, backup.settings);
      if (backup.employees) saveEmployees(t, p, backup.employees);
      if (backup.positions) savePositions(t, p, backup.positions);
      if (backup.vacations) saveVacations(t, p, backup.vacations);
      if (backup.assignments) saveAssignments(t, p, backup.assignments);
      if (backup.weekTemplates) saveWeekTemplates(t, p, backup.weekTemplates);
      return bootstrap(t, p);
    },
  },

  email: {
    test: () => ({ ok: true, message: 'Email test – serwer nie ma skonfigurowanego SMTP. Skonfiguruj go osobno.' }),
    send: () => ({ ok: false, error: 'Serwer przeglądarkowy nie obsługuje wysyłki email. Użyj osobnego serwera SMTP.' }),
    sendEmployee: () => ({ ok: false, error: 'Serwer przeglądarkowy nie obsługuje wysyłki email. Użyj osobnego serwera SMTP.' }),
  },
  };
}

// ---------- Express ----------
const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// ── Profile management endpoints ────────────────────────
app.get('/api/profiles', onehostAuth, (req, res) => {
  if (Array.isArray(req.allowedProfiles) && req.allowedProfiles.length > 0) {
    return res.json({ ok: true, profiles: req.allowedProfiles.map((p) => ({ id: p.id, name: p.name })), maxProfiles: req.maxProfiles });
  }
  res.json({ ok: true, profiles: getProfiles(req.tenantId), maxProfiles: req.maxProfiles });
});

app.post('/api/profiles', onehostAuth, (req, res) => {
  return res.status(410).json({ ok: false, error: 'profiles_managed_by_onehost' });
});

app.put('/api/profiles/:profileId', onehostAuth, (req, res) => {
  return res.status(410).json({ ok: false, error: 'profiles_managed_by_onehost' });
});

app.delete('/api/profiles/:profileId', onehostAuth, (req, res) => {
  return res.status(410).json({ ok: false, error: 'profiles_managed_by_onehost' });
});

// ── Main data endpoint (profile-scoped) ─────────────────
app.post('/api', onehostAuth, (req, res) => {
  const { entity, action, profileId: bodyProfileId, ...payload } = req.body;
  const profileId = resolveProfileId(req, bodyProfileId || req.headers['x-profile-id']);
  const handlers = makeHandlers(req.tenantId, profileId, req.maxEmployees);
  const entityHandlers = handlers[entity];
  if (!entityHandlers) return res.json({ ok: false, error: `unknown_entity: ${entity}` });
  const handler = entityHandlers[action];
  if (!handler) return res.json({ ok: false, error: `unknown_action: ${entity}.${action}` });

  try {
    const result = handler(payload);
    res.json(result);
  } catch (err) {
    console.error(`[API ERROR] ${entity}.${action}:`, err);
    res.json({ ok: false, error: String(err.message || err) });
  }
});

const PORT = Number(process.env.PORT || 58);
app.listen(PORT, '127.0.0.1', () => {
  console.log(`ShiftPlanner API running → http://127.0.0.1:${PORT}/api`);
});
