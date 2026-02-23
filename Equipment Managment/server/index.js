const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT || 60);
const DATA_DIR = path.join(__dirname, 'data');
const ONEHOST_API = process.env.ONEHOST_API || 'http://127.0.0.1:56';
const AUTH_ENABLED = process.env.AUTH_ENABLED !== '0'; // default: on
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://sklep.onehost.site,https://em.onehost.site,http://127.0.0.1:55,http://127.0.0.1:59')
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

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

// ── OneHost auth middleware ────────────────────────────────────────
async function onehostAuth(req, res, next) {
  if (!AUTH_ENABLED) {
    req.tenantId = 'default';
    req.maxEmployees = 9999;
    req.maxProfiles = 99;
    req.allowedProfiles = [{ id: 'default', name: 'Domyślny', product: 'equipment' }];
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
    if (!data.valid || !data.hasAccess) return res.status(403).json({ error: 'no_access' });
    if (!data.subscription?.products?.includes('equipment')) return res.status(403).json({ error: 'product_not_included' });
    req.tenantId = String(data.user?.tenantId || 'default');
    req.user = data.user;
    req.maxEmployees = data.subscription?.maxEmployees || 25;
    req.maxProfiles = data.subscription?.maxProfiles || 1;
    req.allowedProfiles = Array.isArray(data.assignedProfiles)
      ? data.assignedProfiles.filter((p) => p.product === 'equipment').map((p) => ({ id: String(p.id), name: p.name || `Profil ${p.id}`, product: p.product }))
      : [];
    req.allowedProfileIds = req.allowedProfiles.map((p) => p.id);

    if (!req.allowedProfileIds.length) return res.status(403).json({ error: 'no_profile_assigned' });

    next();
  } catch (err) {
    console.warn('[Auth] OneHost validation failed:', err.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({ error: 'onehost_unavailable', message: 'OneHost chwilowo niedostępny. Spróbuj ponownie za chwilę.' });
    }
    console.warn('[Auth] Dev fallback enabled: allowing access (default tenant)');
    req.tenantId = 'default';
    req.maxEmployees = 9999;
    req.maxProfiles = 99;
    req.allowedProfiles = [{ id: 'default', name: 'Domyślny', product: 'equipment' }];
    req.allowedProfileIds = ['default'];
    next();
  }
}

// Apply auth to all /api routes
app.use('/api', onehostAuth);

// Extract profileId from header/query for all requests
app.use('/api', (req, res, next) => {
  const requested = String(req.headers['x-profile-id'] || req.query.profileId || '');
  if (Array.isArray(req.allowedProfileIds) && req.allowedProfileIds.length > 0) {
    req.profileId = req.allowedProfileIds.includes(requested) ? requested : req.allowedProfileIds[0];
  } else {
    req.profileId = requested || 'default';
  }
  next();
});

// ── Tenant+Profile-scoped helpers ──────────────────────────────────
function tenantDir(tenantId, profileId) {
  const dir = path.join(DATA_DIR, String(tenantId), String(profileId || 'default'));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function readJSON(tenantId, profileId, file, fallback) {
  const fp = path.join(tenantDir(tenantId, profileId), file);
  try {
    if (!fs.existsSync(fp)) return fallback;
    return JSON.parse(fs.readFileSync(fp, 'utf-8'));
  } catch { return fallback; }
}

function writeJSON(tenantId, profileId, file, data) {
  const dir = tenantDir(tenantId, profileId);
  fs.writeFileSync(path.join(dir, file), JSON.stringify(data, null, 2), 'utf-8');
}

// ── Profile management ─────────────────────────────────────────────
function getProfiles(tenantId) {
  const dir = path.join(DATA_DIR, String(tenantId));
  if (!fs.existsSync(dir)) return [{ id: 'default', name: 'Domyślny' }];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter(e => e.isDirectory());
  if (entries.length === 0) return [{ id: 'default', name: 'Domyślny' }];
  return entries.map(e => {
    const meta = readJSON(tenantId, e.name, '_profile.json', { name: e.name === 'default' ? 'Domyślny' : e.name });
    return { id: e.name, name: meta.name || e.name };
  });
}

function createProfileDir(tenantId, profileId, name) {
  const dir = path.join(DATA_DIR, String(tenantId), profileId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '_profile.json'), JSON.stringify({ name }, null, 2), 'utf-8');
}

app.get('/api/profiles', (req, res) => {
  if (Array.isArray(req.allowedProfiles) && req.allowedProfiles.length > 0) {
    return res.json({ ok: true, profiles: req.allowedProfiles.map((p) => ({ id: p.id, name: p.name })), maxProfiles: req.maxProfiles || 1 });
  }
  res.json({ ok: true, profiles: getProfiles(req.tenantId), maxProfiles: req.maxProfiles || 1 });
});

app.post('/api/profiles', (req, res) => {
  return res.status(410).json({ ok: false, error: 'profiles_managed_by_onehost' });
});

app.put('/api/profiles/:profileId', (req, res) => {
  return res.status(410).json({ ok: false, error: 'profiles_managed_by_onehost' });
});

app.delete('/api/profiles/:profileId', (req, res) => {
  return res.status(410).json({ ok: false, error: 'profiles_managed_by_onehost' });
});

// ── Defaults ───────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  notifyMonthsBefore: 2,
  dailyNotifyWeeksBefore: 2,
  hourlyNotifyOnLastDay: true,
  notificationCheckMinutes: 30,
  darkMode: false,
};
const DEFAULT_CATEGORIES = ['Narzędzia', 'Maszyny', 'Gaśnice', 'Pojazdy', 'Urządzenia elektryczne', 'Urządzenia pomiarowe', 'Inne'];
const DEFAULT_CONTROL_TYPES = ['Przegląd', 'Kalibracja', 'Wymiana', 'Kontrola', 'Certyfikacja', 'Serwis', 'Inspekcja', 'Inne'];
const DEFAULT_TOOL_TYPES = [
  { name: 'Wiertło', params: [{ key: 'Średnica', value: '' }, { key: 'Długość', value: '' }] },
  { name: 'Frez', params: [{ key: 'Średnica', value: '' }, { key: 'Liczba ostrzy', value: '' }] },
  { name: 'Klucz', params: [{ key: 'Rozmiar', value: '' }] },
  { name: 'Suwmiarka', params: [{ key: 'Zakres', value: '' }, { key: 'Dokładność', value: '' }] },
];

// ── Items (tenant+profile scoped) ──────────────────────────────────
app.get('/api/items', (req, res) => {
  res.json(readJSON(req.tenantId, req.profileId, 'items.json', []));
});

app.post('/api/items', (req, res) => {
  const items = readJSON(req.tenantId, req.profileId, 'items.json', []);
  if (items.length >= req.maxEmployees) {
    return res.status(403).json({ error: `Limit sprzętu: ${req.maxEmployees}. Zmień plan na wyższy.` });
  }
  let nextId = readJSON(req.tenantId, req.profileId, 'meta.json', { nextId: 1 }).nextId;
  const item = { id: nextId, ...req.body, created_at: new Date().toISOString() };
  items.push(item);
  writeJSON(req.tenantId, req.profileId, 'items.json', items);
  writeJSON(req.tenantId, req.profileId, 'meta.json', { nextId: nextId + 1 });
  res.json({ id: nextId });
});

app.put('/api/items/:id', (req, res) => {
  const items = readJSON(req.tenantId, req.profileId, 'items.json', []);
  const id = parseInt(req.params.id);
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx] = { ...items[idx], ...req.body, id };
  writeJSON(req.tenantId, req.profileId, 'items.json', items);
  res.json({ ok: true });
});

app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const items = readJSON(req.tenantId, req.profileId, 'items.json', []).filter(i => i.id !== id);
  writeJSON(req.tenantId, req.profileId, 'items.json', items);
  res.json({ ok: true });
});

app.patch('/api/items/:id/date', (req, res) => {
  const items = readJSON(req.tenantId, req.profileId, 'items.json', []);
  const id = parseInt(req.params.id);
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  items[idx].last_date = req.body.date;
  writeJSON(req.tenantId, req.profileId, 'items.json', items);
  res.json({ ok: true });
});

// ── Settings (tenant+profile scoped) ───────────────────────────────
app.get('/api/settings', (req, res) => {
  res.json(readJSON(req.tenantId, req.profileId, 'settings.json', DEFAULT_SETTINGS));
});

app.put('/api/settings', (req, res) => {
  writeJSON(req.tenantId, req.profileId, 'settings.json', req.body);
  res.json({ ok: true });
});

// ── Categories (tenant+profile scoped) ─────────────────────────────
app.get('/api/categories', (req, res) => {
  res.json(readJSON(req.tenantId, req.profileId, 'categories.json', DEFAULT_CATEGORIES));
});

app.put('/api/categories', (req, res) => {
  writeJSON(req.tenantId, req.profileId, 'categories.json', req.body);
  res.json({ ok: true });
});

// ── Control Types (tenant+profile scoped) ──────────────────────────
app.get('/api/control-types', (req, res) => {
  res.json(readJSON(req.tenantId, req.profileId, 'controlTypes.json', DEFAULT_CONTROL_TYPES));
});

app.put('/api/control-types', (req, res) => {
  writeJSON(req.tenantId, req.profileId, 'controlTypes.json', req.body);
  res.json({ ok: true });
});

// ── Tool Types (tenant+profile scoped) ─────────────────────────────
app.get('/api/tool-types', (req, res) => {
  res.json(readJSON(req.tenantId, req.profileId, 'toolTypes.json', DEFAULT_TOOL_TYPES));
});

app.put('/api/tool-types', (req, res) => {
  writeJSON(req.tenantId, req.profileId, 'toolTypes.json', req.body);
  res.json({ ok: true });
});

// ── Export / Import (tenant+profile scoped) ────────────────────────
app.get('/api/export', (req, res) => {
  const data = {
    items: readJSON(req.tenantId, req.profileId, 'items.json', []),
    settings: readJSON(req.tenantId, req.profileId, 'settings.json', DEFAULT_SETTINGS),
    categories: readJSON(req.tenantId, req.profileId, 'categories.json', DEFAULT_CATEGORIES),
    controlTypes: readJSON(req.tenantId, req.profileId, 'controlTypes.json', DEFAULT_CONTROL_TYPES),
    toolTypes: readJSON(req.tenantId, req.profileId, 'toolTypes.json', DEFAULT_TOOL_TYPES),
  };
  res.json(data);
});

app.post('/api/import', (req, res) => {
  const data = req.body;
  if (data.items) writeJSON(req.tenantId, req.profileId, 'items.json', data.items);
  if (data.settings) writeJSON(req.tenantId, req.profileId, 'settings.json', data.settings);
  if (data.categories) writeJSON(req.tenantId, req.profileId, 'categories.json', data.categories);
  if (data.controlTypes) writeJSON(req.tenantId, req.profileId, 'controlTypes.json', data.controlTypes);
  if (data.toolTypes) writeJSON(req.tenantId, req.profileId, 'toolTypes.json', data.toolTypes);
  if (data.items) {
    const maxId = data.items.reduce((m, i) => Math.max(m, i.id || 0), 0);
    writeJSON(req.tenantId, req.profileId, 'meta.json', { nextId: maxId + 1 });
  }
  res.json({ ok: true });
});

// ── Start ──────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Equipment Manager API running on http://localhost:${PORT}`);
});
