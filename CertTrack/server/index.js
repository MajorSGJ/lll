import express from 'express';
import cors from 'cors';
import compression from 'compression';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import multer from 'multer';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '..', 'data', 'certtrack.db');
const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

// ── Config ──────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || 'certtrack-dev-secret-' + crypto.randomBytes(16).toString('hex');
if (!process.env.JWT_SECRET) console.warn('[CertTrack] UWAGA: Brak JWT_SECRET w env. Wygenerowano losowy klucz (sesja nie przetrwa restartu).');
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const TRIAL_DAYS = 7;
const ONEHOST_API = process.env.ONEHOST_API || 'http://127.0.0.1:56';
const AUTH_ENABLED = process.env.AUTH_ENABLED !== '0';

const ONEHOST_API_CANDIDATES = Array.from(new Set([
  (ONEHOST_API || '').trim(),
  'http://127.0.0.1:56',
  'http://localhost:56',
  'https://sklep.onehost.site',
].filter(Boolean)));

async function validateOneHostToken(token) {
  let lastError = 'unknown';
  for (const baseUrl of ONEHOST_API_CANDIDATES) {
    try {
      const resp = await fetch(`${baseUrl}/api/auth/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const text = await resp.text();
      let data = null;
      try { data = JSON.parse(text); } catch { data = null; }
      if (data && typeof data === 'object') return data;
      lastError = `non-json response from ${baseUrl}`;
    } catch (err) {
      lastError = `${baseUrl}: ${err.message}`;
    }
  }
  throw new Error(lastError);
}

let stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ──────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    plan TEXT DEFAULT 'trial',
    trial_ends_at TEXT NOT NULL,
    stripe_customer_id TEXT DEFAULT '',
    stripe_subscription_id TEXT DEFAULT '',
    subscription_status TEXT DEFAULT 'trialing',
    onehost_tenant_id TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    role TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    alert_days_before INTEGER DEFAULT 30,
    color TEXT DEFAULT '#3b82f6',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    position TEXT DEFAULT '',
    department TEXT DEFAULT '',
    email TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    hire_date TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS certificates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL,
    cert_number TEXT DEFAULT '',
    issued_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    issuer TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    file_name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS super_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS plans_config (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_employees INTEGER NOT NULL DEFAULT 25,
    max_users INTEGER NOT NULL DEFAULT 3,
    price_pln INTEGER NOT NULL DEFAULT 99,
    price_pln_yearly INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT DEFAULT '',
    stripe_price_id_yearly TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT NOT NULL,
    action TEXT NOT NULL,
    ts INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notification_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    email TEXT NOT NULL,
    label TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id INTEGER NOT NULL,
    key TEXT NOT NULL,
    value TEXT DEFAULT '',
    PRIMARY KEY (tenant_id, key),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
`);

// ── Indexes (performance) ────────────────────────────────
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_employees_tenant_active ON employees(tenant_id, active);
  CREATE INDEX IF NOT EXISTS idx_certificates_tenant ON certificates(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_certificates_employee ON certificates(employee_id);
  CREATE INDEX IF NOT EXISTS idx_certificates_category ON certificates(category_id);
  CREATE INDEX IF NOT EXISTS idx_certificates_expiry ON certificates(tenant_id, expiry_date);
  CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_notification_emails_tenant ON notification_emails(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action ON rate_limits(ip, action);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_ts ON rate_limits(ts);
  CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_tenants_subscription_status ON tenants(subscription_status);
`);

// Add email_verified and verify_token columns to users if missing
try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN verify_token TEXT DEFAULT ""'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN verify_expires TEXT DEFAULT ""'); } catch {}
// Add onehost_tenant_id column if missing (OneHost shared auth migration)
try { db.exec('ALTER TABLE tenants ADD COLUMN onehost_tenant_id TEXT DEFAULT ""'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_tenants_onehost ON tenants(onehost_tenant_id)'); } catch {}

// ── Profile support migration ───────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
`);
// Add profile_id to data tables (default 0 = default profile)
try { db.exec('ALTER TABLE employees ADD COLUMN profile_id INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE categories ADD COLUMN profile_id INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE certificates ADD COLUMN profile_id INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE notification_emails ADD COLUMN profile_id INTEGER DEFAULT 0'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_employees_profile ON employees(tenant_id, profile_id)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_categories_profile ON categories(tenant_id, profile_id)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_certificates_profile ON certificates(tenant_id, profile_id)'); } catch {}
try { db.exec('CREATE INDEX IF NOT EXISTS idx_notif_emails_profile ON notification_emails(tenant_id, profile_id)'); } catch {}

// ── Remove local super-admin accounts (managed in OneHost) ───────
try { db.prepare('DELETE FROM super_admins').run(); } catch {}

// ── Seed plans_config if empty ──────────────────────────
// Add yearly columns if missing (migration)
try { db.exec('ALTER TABLE plans_config ADD COLUMN price_pln_yearly INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE plans_config ADD COLUMN stripe_price_id_yearly TEXT DEFAULT ""'); } catch {}

const plansCount = db.prepare('SELECT COUNT(*) as c FROM plans_config').get().c;
if (plansCount === 0) {
  const ins = db.prepare('INSERT INTO plans_config (key, name, max_employees, max_users, price_pln, price_pln_yearly, stripe_price_id, stripe_price_id_yearly, sort_order) VALUES (?,?,?,?,?,?,?,?,?)');
  ins.run('starter', 'Starter', 40, 3, 99, 990, '', '', 1);
  ins.run('business', 'Business', 200, 15, 249, 2490, '', '', 2);
  ins.run('enterprise', 'Enterprise', 1000, 50, 499, 4990, '', '', 3);
} else {
  // Ensure existing plans have yearly prices
  const plans = db.prepare('SELECT key, price_pln, price_pln_yearly FROM plans_config').all();
  for (const p of plans) {
    if (!p.price_pln_yearly) {
      db.prepare('UPDATE plans_config SET price_pln_yearly=? WHERE key=?').run(p.price_pln * 10, p.key);
    }
  }
}
try { db.exec("UPDATE plans_config SET max_employees=40 WHERE key='starter' AND max_employees=25"); } catch {}
try { db.exec("UPDATE plans_config SET max_employees=200 WHERE key='business' AND max_employees=100"); } catch {}
try { db.exec("UPDATE plans_config SET max_employees=1000 WHERE key='enterprise' AND max_employees=500"); } catch {}
try { db.exec("UPDATE plans_config SET max_users=15 WHERE key='business' AND max_users=10"); } catch {}

// Helper: get Stripe instance (prefer DB-stored key, fallback to env)
function getStripe() {
  const dbKey = db.prepare("SELECT value FROM settings WHERE key='stripe_secret_key'").get();
  if (dbKey?.value && dbKey.value !== '••••••••') {
    return new Stripe(dbKey.value);
  }
  return stripe;
}

// ── Load plans from DB ──────────────────────────────────
function loadPlans() {
  const rows = db.prepare('SELECT * FROM plans_config WHERE active=1 ORDER BY sort_order').all();
  const plans = {};
  for (const r of rows) {
    plans[r.key] = { name: r.name, maxEmployees: r.max_employees, maxUsers: r.max_users, pricePLN: r.price_pln, pricePLNYearly: r.price_pln_yearly || r.price_pln * 10, stripePriceId: r.stripe_price_id || '', stripePriceIdYearly: r.stripe_price_id_yearly || '' };
  }
  return plans;
}
let PLANS_CACHE = loadPlans();
function getPlans() { return PLANS_CACHE; }
function reloadPlans() { PLANS_CACHE = loadPlans(); }

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// ── Prepared statements cache (perf: avoid re-parsing SQL on every request) ──
const stmt = {
  getUserById: db.prepare('SELECT u.*, t.company_name, t.plan, t.trial_ends_at, t.subscription_status, t.stripe_customer_id FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id=?'),
  getUserByEmail: db.prepare('SELECT u.*, t.company_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email=?'),
  getUserIdByEmail: db.prepare('SELECT id FROM users WHERE email=?'),
  getSuperAdminById: db.prepare('SELECT * FROM super_admins WHERE id=?'),
  getSuperAdminByEmail: db.prepare('SELECT * FROM super_admins WHERE email=?'),
  getSettingByKey: db.prepare('SELECT value FROM settings WHERE key=?'),
  upsertSetting: db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'),
  getTenantById: db.prepare('SELECT * FROM tenants WHERE id=?'),
  getTenantByStripeCustomer: db.prepare('SELECT * FROM tenants WHERE stripe_customer_id=?'),
  // Rate limiting
  rateLimitCleanup: db.prepare('DELETE FROM rate_limits WHERE ts < ?'),
  rateLimitCount: db.prepare('SELECT COUNT(*) as c FROM rate_limits WHERE ip=? AND action=?'),
  rateLimitInsert: db.prepare('INSERT INTO rate_limits (ip, action, ts) VALUES (?,?,?)'),
  // Profiles
  getProfilesByTenant: db.prepare('SELECT id, tenant_id, name, created_at FROM profiles WHERE tenant_id=? ORDER BY created_at'),
  insertProfile: db.prepare('INSERT INTO profiles (tenant_id, name) VALUES (?,?)'),
  updateProfile: db.prepare('UPDATE profiles SET name=? WHERE id=? AND tenant_id=?'),
  deleteProfile: db.prepare('DELETE FROM profiles WHERE id=? AND tenant_id=?'),
  getProfileById: db.prepare('SELECT * FROM profiles WHERE id=? AND tenant_id=?'),
  // Categories (profile-scoped)
  getCategoriesByTenant: db.prepare('SELECT * FROM categories WHERE tenant_id=? AND profile_id=? ORDER BY name'),
  countCategoriesByProfile: db.prepare('SELECT COUNT(*) as c FROM categories WHERE tenant_id=? AND profile_id=?'),
  insertCategory: db.prepare('INSERT INTO categories (tenant_id, profile_id, name, description, alert_days_before, color) VALUES (?,?,?,?,?,?)'),
  updateCategory: db.prepare('UPDATE categories SET name=?, description=?, alert_days_before=?, color=? WHERE id=? AND tenant_id=?'),
  deleteCategory: db.prepare('DELETE FROM categories WHERE id=? AND tenant_id=?'),
  // Employees (profile-scoped)
  getEmployeesByTenant: db.prepare('SELECT * FROM employees WHERE tenant_id=? AND profile_id=? ORDER BY last_name, first_name'),
  getEmployeeById: db.prepare('SELECT * FROM employees WHERE id=? AND tenant_id=?'),
  countEmployeesByTenant: db.prepare('SELECT COUNT(*) as c FROM employees WHERE tenant_id=? AND profile_id=?'),
  insertEmployee: db.prepare('INSERT INTO employees (tenant_id, profile_id, first_name, last_name, position, department, email, phone, hire_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?)'),
  updateEmployee: db.prepare('UPDATE employees SET first_name=?, last_name=?, position=?, department=?, email=?, phone=?, hire_date=?, active=?, notes=? WHERE id=? AND tenant_id=?'),
  deleteEmployee: db.prepare('DELETE FROM employees WHERE id=? AND tenant_id=?'),
  // Certificates (profile-scoped)
  getCertsByTenant: db.prepare(`
    SELECT c.*, e.first_name, e.last_name, e.position as emp_position, e.department,
           cat.name as category_name, cat.color as category_color, cat.alert_days_before
    FROM certificates c
    JOIN employees e ON c.employee_id = e.id
    JOIN categories cat ON c.category_id = cat.id
    WHERE c.tenant_id=? AND c.profile_id=?
    ORDER BY c.expiry_date ASC
  `),
  getCertsByEmployee: db.prepare(`
    SELECT c.*, cat.name as category_name, cat.color as category_color, cat.alert_days_before
    FROM certificates c
    JOIN categories cat ON c.category_id = cat.id
    WHERE c.employee_id = ? AND c.tenant_id=?
    ORDER BY c.expiry_date ASC
  `),
  getEmpIdForTenant: db.prepare('SELECT id FROM employees WHERE id=? AND tenant_id=?'),
  insertCert: db.prepare('INSERT INTO certificates (tenant_id, profile_id, employee_id, category_id, cert_number, issued_date, expiry_date, issuer, notes) VALUES (?,?,?,?,?,?,?,?,?)'),
  updateCert: db.prepare('UPDATE certificates SET employee_id=?, category_id=?, cert_number=?, issued_date=?, expiry_date=?, issuer=?, notes=? WHERE id=? AND tenant_id=?'),
  deleteCert: db.prepare('DELETE FROM certificates WHERE id=? AND tenant_id=?'),
  getCertById: db.prepare('SELECT id FROM certificates WHERE id=? AND tenant_id=?'),
  getCertFileName: db.prepare('SELECT file_name FROM certificates WHERE id=? AND tenant_id=?'),
  getCertByFileName: db.prepare('SELECT id FROM certificates WHERE file_name=? AND tenant_id=?'),
  updateCertFile: db.prepare('UPDATE certificates SET file_name=? WHERE id=? AND tenant_id=?'),
  clearCertFile: db.prepare("UPDATE certificates SET file_name='' WHERE id=? AND tenant_id=?"),
  // Users
  getUsersByTenant: db.prepare('SELECT id, email, name, role, created_at FROM users WHERE tenant_id=?'),
  countUsersByTenant: db.prepare('SELECT COUNT(*) as c FROM users WHERE tenant_id=?'),
  insertUser: db.prepare('INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES (?,?,?,?,?)'),
  updateUserRole: db.prepare('UPDATE users SET role=? WHERE id=? AND tenant_id=?'),
  deleteUser: db.prepare('DELETE FROM users WHERE id=? AND tenant_id=?'),
  // Notification emails (profile-scoped)
  getNotifEmails: db.prepare('SELECT * FROM notification_emails WHERE tenant_id=? AND profile_id=? ORDER BY created_at'),
  getTenantSetting: db.prepare('SELECT value FROM tenant_settings WHERE tenant_id=? AND key=?'),
  upsertTenantSetting: db.prepare('INSERT INTO tenant_settings (tenant_id, key, value) VALUES (?,?,?) ON CONFLICT(tenant_id, key) DO UPDATE SET value=excluded.value'),
  getNotifEmailByAddr: db.prepare('SELECT id FROM notification_emails WHERE tenant_id=? AND email=?'),
  insertNotifEmail: db.prepare('INSERT INTO notification_emails (tenant_id, profile_id, email, label) VALUES (?,?,?,?)'),
  updateNotifEmailActive: db.prepare('UPDATE notification_emails SET active=? WHERE id=? AND tenant_id=?'),
  deleteNotifEmail: db.prepare('DELETE FROM notification_emails WHERE id=? AND tenant_id=?'),
  // Verify
  getUserByVerifyToken: db.prepare('SELECT * FROM users WHERE verify_token=?'),
  markEmailVerified: db.prepare("UPDATE users SET email_verified=1, verify_token='', verify_expires='' WHERE id=?"),
  updateVerifyToken: db.prepare('UPDATE users SET verify_token=?, verify_expires=? WHERE id=?'),
};

const seedCategoriesTx = db.transaction((tenantId, profileId = 0) => {
  const defaults = [
    ['Badania lekarskie', 'Okresowe badania lekarskie pracownika', 30, '#22c55e'],
    ['Szkolenie BHP', 'Szkolenie wstępne i okresowe BHP', 60, '#f59e0b'],
    ['Uprawnienia spawalnicze', 'Certyfikaty spawalnicze wg EN/ASME/AWS', 60, '#ef4444'],
    ['Uprawnienia UDT', 'Wózki widłowe, suwnice, podesty ruchome', 30, '#8b5cf6'],
    ['Uprawnienia SEP', 'Uprawnienia elektryczne i gazowe', 30, '#06b6d4'],
    ['Certyfikat NDT', 'Badania nieniszczące RT/UT/MT/PT', 60, '#ec4899'],
    ['Prawo jazdy', 'Prawo jazdy kat. B/C/CE', 30, '#f97316'],
    ['Szkolenie stanowiskowe', 'Instruktaż stanowiskowy', 30, '#64748b'],
    ['Odzież robocza / PPE', 'Przydział odzieży ochronnej i środków PPE', 14, '#a3a3a3'],
  ];
  for (const [name, desc, days, color] of defaults) {
    stmt.insertCategory.run(tenantId, profileId, name, desc, days, color);
  }
});
function seedCategories(tenantId, profileId = 0) { seedCategoriesTx(tenantId, profileId); }

function ensureDefaultCategories(tenantId, profileId) {
  const count = stmt.countCategoriesByProfile.get(tenantId, profileId).c;
  if (count === 0) seedCategories(tenantId, profileId);
}

// ── Helpers ─────────────────────────────────────────────
function getTenantAccess(tenant) {
  const now = new Date().toISOString().slice(0, 10);
  const trialActive = tenant.trial_ends_at >= now;
  const subActive = ['active', 'trialing'].includes(tenant.subscription_status);
  const hasAccess = trialActive || subActive;
  const plans = getPlans();
  const plan = plans[tenant.plan] || plans.starter || { name: 'Trial', maxEmployees: 25, maxUsers: 3, pricePLN: 0, stripePriceId: '' };
  const daysLeft = trialActive && tenant.subscription_status === 'trialing'
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at + 'T00:00:00').getTime() - Date.now()) / 86400000))
    : null;
  return { hasAccess, plan, trialActive, subActive, daysLeft, subscriptionStatus: tenant.subscription_status };
}

// ── Rate limiting (uses cached prepared statements) ─────
function checkRateLimit(ip, action, maxAttempts, windowSeconds) {
  const cutoff = Math.floor(Date.now() / 1000) - windowSeconds;
  stmt.rateLimitCleanup.run(cutoff);
  const count = stmt.rateLimitCount.get(ip, action).c;
  if (count >= maxAttempts) return false;
  stmt.rateLimitInsert.run(ip, action, Math.floor(Date.now() / 1000));
  return true;
}

// ── Email helper (cached SMTP transport) ────────────────
let _smtpCache = null;
let _smtpCacheTs = 0;
let _ctCachedTransport = null;
let _ctSmtpSig = '';

function getSmtpConfig() {
  const now = Date.now();
  if (_smtpCache && now - _smtpCacheTs < 60000) return _smtpCache;
  const get = (k) => { const r = stmt.getSettingByKey.get(k); return r?.value || ''; };
  const secureSetting = get('smtp_secure').toLowerCase();
  const port = Number(get('smtp_port')) || 587;
  const secure = secureSetting ? ['1', 'true', 'yes'].includes(secureSetting) : port === 465;
  _smtpCache = { host: get('smtp_host'), port, user: get('smtp_user'), pass: get('smtp_pass'), from: get('smtp_from') || 'noreply@onehost.site', secure };
  _smtpCacheTs = now;
  return _smtpCache;
}
function invalidateSmtpCache() { _smtpCache = null; _smtpCacheTs = 0; _ctCachedTransport = null; _ctSmtpSig = ''; }

async function sendEmail(to, subject, html) {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user) { console.warn('[Email] SMTP not configured, skipping email to', to); return false; }
  try {
    const sig = `${cfg.host}:${cfg.port}:${cfg.user}:${cfg.pass}:${cfg.secure}`;
    if (!_ctCachedTransport || _ctSmtpSig !== sig) {
      _ctCachedTransport = nodemailer.createTransport({
        host: cfg.host, port: cfg.port, secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
        tls: { rejectUnauthorized: false },
        requireTLS: !cfg.secure && cfg.port !== 25,
        connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      });
      _ctSmtpSig = sig;
      console.log(`[Email] SMTP transport created: ${cfg.host}:${cfg.port} secure=${cfg.secure}`);
    }
    const info = await _ctCachedTransport.sendMail({ from: cfg.from, to, subject, html });
    console.log(`[Email] Sent to ${to} (messageId: ${info.messageId || '-'})`);
    return true;
  } catch (err) {
    if (err.code === 'EAUTH' || err.code === 'ESOCKET' || err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      _ctCachedTransport = null; _ctSmtpSig = '';
    }
    console.error('[Email] Failed:', err.code || '', err.message);
    return false;
  }
}

function generateVerifyToken() { return crypto.randomBytes(32).toString('hex'); }

// ── Super-admin middleware ───────────────────────────────
const ONEHOST_ADMIN_KEY = process.env.ONEHOST_ADMIN_KEY || '';
if (!ONEHOST_ADMIN_KEY) console.warn('[CertTrack] UWAGA: Brak ONEHOST_ADMIN_KEY w env. Lokalne endpointy /api/admin będą zablokowane.');

function superAuth(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  if (!ONEHOST_ADMIN_KEY) return res.status(503).json({ error: 'admin_key_not_configured' });
  if (adminKey !== ONEHOST_ADMIN_KEY) return res.status(401).json({ error: 'unauthorized' });
  req.admin = { id: 0, email: 'onehost@internal', name: 'OneHost Admin Key' };
  return next();
}

// ── Express ─────────────────────────────────────────────
const app = express();

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(cors({
  origin: (origin, cb) => {
    const allowed = (process.env.CORS_ORIGINS || 'https://sklep.onehost.site,https://certtrack.onehost.site,http://127.0.0.1:55,http://127.0.0.1:61').split(',').map(o => o.trim());
    if (!origin || allowed.includes(origin) || allowed.includes('*')) return cb(null, true);
    cb(null, false);
  },
  credentials: true
}));
app.use(compression());

// Stripe webhook needs raw body
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const stripeInstance = getStripe();
  if (!stripeInstance || !STRIPE_WEBHOOK_SECRET) return res.status(400).json({ error: 'stripe_not_configured' });
  let event;
  try {
    event = stripeInstance.webhooks.constructEvent(req.body, req.headers['stripe-signature'], STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[Stripe] Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const tenantId = session.metadata?.tenant_id;
      if (tenantId) {
        db.prepare('UPDATE tenants SET stripe_customer_id=?, stripe_subscription_id=?, subscription_status=?, plan=? WHERE id=?')
          .run(session.customer, session.subscription, 'active', session.metadata?.plan || 'starter', tenantId);
        console.log(`[Stripe] Tenant ${tenantId} activated plan ${session.metadata?.plan}`);
      }
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const tenant = db.prepare('SELECT * FROM tenants WHERE stripe_customer_id=?').get(sub.customer);
      if (tenant) {
        const status = sub.status === 'active' ? 'active' : sub.status === 'trialing' ? 'trialing' : 'canceled';
        db.prepare('UPDATE tenants SET subscription_status=? WHERE id=?').run(status, tenant.id);
        console.log(`[Stripe] Tenant ${tenant.id} subscription status: ${status}`);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const tenant = db.prepare('SELECT * FROM tenants WHERE stripe_customer_id=?').get(invoice.customer);
      if (tenant) {
        db.prepare('UPDATE tenants SET subscription_status=? WHERE id=?').run('past_due', tenant.id);
        console.log(`[Stripe] Tenant ${tenant.id} payment failed`);
      }
      break;
    }
  }
  res.json({ received: true });
});

app.use(express.json());

// ── OneHost shared auth middleware ───────────────────────
async function onehostAuth(req, res, next) {
  if (!AUTH_ENABLED) {
    // Dev fallback — ensure a default tenant exists
    let tenant = db.prepare("SELECT * FROM tenants WHERE company_name='Dev Default'").get();
    if (!tenant) {
      const r = db.prepare("INSERT INTO tenants (company_name, plan, trial_ends_at, subscription_status) VALUES ('Dev Default','starter',?,?)")
        .run(addDaysISO(new Date().toISOString().slice(0,10), 365), 'active');
      tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(r.lastInsertRowid);
      seedCategories(tenant.id);
    }
    req.tenantId = tenant.id;
    req.user = { id: 0, email: 'dev@local', name: 'Dev', role: 'admin', tenant_id: tenant.id, company_name: tenant.company_name };
    req.access = getTenantAccess(tenant);
    req.maxEmployees = 9999;
    return next();
  }
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized', message: 'Zaloguj się w OneHost' });
  try {
    const data = await validateOneHostToken(header.slice(7));
    if (!data.valid || !data.hasAccess) return res.status(403).json({ error: 'no_access', message: 'Brak aktywnej subskrypcji' });
    if (!data.subscription?.products?.includes('certtrack')) return res.status(403).json({ error: 'product_not_included', message: 'CertTrack nie jest w Twoim planie' });

    const ohTenantId = String(data.user?.tenantId || 'default');
    const ohEmail = (data.user?.email || '').toLowerCase().trim();
    const ohName = data.user?.name || '';
    const ohCompany = data.user?.company_name || 'Firma';

    // Map OneHost tenant to CertTrack internal tenant
    let tenant = db.prepare('SELECT * FROM tenants WHERE onehost_tenant_id=?').get(ohTenantId);
    if (!tenant) {
      const r = db.prepare('INSERT INTO tenants (company_name, plan, trial_ends_at, subscription_status, onehost_tenant_id) VALUES (?,?,?,?,?)')
        .run(ohCompany, data.subscription?.plan || 'starter', addDaysISO(new Date().toISOString().slice(0,10), 365), 'active', ohTenantId);
      tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(r.lastInsertRowid);
      seedCategories(tenant.id);
    }

    // Map OneHost user to CertTrack internal user
    let user = db.prepare('SELECT u.*, t.company_name, t.plan, t.trial_ends_at, t.subscription_status FROM users u JOIN tenants t ON u.tenant_id=t.id WHERE u.email=? AND u.tenant_id=?').get(ohEmail, tenant.id);
    if (!user) {
      const existingByEmail = db.prepare('SELECT id, tenant_id FROM users WHERE email=?').get(ohEmail);
      if (existingByEmail) {
        db.prepare('UPDATE users SET tenant_id=?, name=? WHERE id=?').run(tenant.id, ohName, existingByEmail.id);
        user = db.prepare('SELECT u.*, t.company_name, t.plan, t.trial_ends_at, t.subscription_status FROM users u JOIN tenants t ON u.tenant_id=t.id WHERE u.id=?').get(existingByEmail.id);
      } else {
        const userCount = stmt.countUsersByTenant.get(tenant.id).c;
        const role = userCount === 0 ? 'admin' : 'viewer';
        const r = stmt.insertUser.run(tenant.id, ohEmail, 'ONEHOST_AUTH', ohName, role);
        user = db.prepare('SELECT u.*, t.company_name, t.plan, t.trial_ends_at, t.subscription_status FROM users u JOIN tenants t ON u.tenant_id=t.id WHERE u.id=?').get(r.lastInsertRowid);
      }
    }

    req.tenantId = tenant.id;
    req.user = user;
    req.access = getTenantAccess(tenant);
    req.maxEmployees = data.subscription?.maxEmployees || 25;
    req.allowedProfiles = Array.isArray(data.assignedProfiles)
      ? data.assignedProfiles.filter((p) => p.product === 'certtrack')
      : [];
    req.allowedProfileIds = req.allowedProfiles.map((p) => Number(p.id)).filter((id) => Number.isInteger(id));

    // Keep local profiles in sync with OneHost IDs/names for CertTrack
    const upsertLocalProfile = db.prepare(`
      INSERT INTO profiles (id, tenant_id, name)
      VALUES (?,?,?)
      ON CONFLICT(id) DO UPDATE SET
        tenant_id = excluded.tenant_id,
        name = excluded.name
    `);
    for (const p of req.allowedProfiles) {
      upsertLocalProfile.run(Number(p.id), tenant.id, p.name || `Profil ${p.id}`);
    }

    if (!req.allowedProfileIds.length) {
      return res.status(403).json({ error: 'no_profile_assigned', message: 'Brak przypisanego profilu CertTrack dla tego użytkownika.' });
    }
    next();
  } catch (err) {
    console.warn('[Auth] OneHost validation failed:', err.message);
    return res.status(401).json({ error: 'auth_failed', message: 'Nie udało się zweryfikować tokenu' });
  }
}

const auth = onehostAuth;
const authLight = onehostAuth;

// Extract profileId from header/query
function profileMiddleware(req, res, next) {
  const requested = parseInt(req.headers['x-profile-id'] || req.query.profileId || '0', 10) || 0;
  if (Array.isArray(req.allowedProfileIds) && req.allowedProfileIds.length > 0) {
    if (requested && req.allowedProfileIds.includes(requested)) req.profileId = requested;
    else req.profileId = req.allowedProfileIds[0];
    ensureDefaultCategories(req.tenantId, req.profileId);
    return next();
  }
  req.profileId = requested;
  if (req.tenantId) ensureDefaultCategories(req.tenantId, req.profileId);
  next();
}

// Write-protection: viewer role can only GET
function writeGuard(req, res, next) {
  if (req.user?.role === 'viewer' && req.method !== 'GET') {
    return res.status(403).json({ error: 'Rola "podgląd" nie pozwala na modyfikację danych.' });
  }
  next();
}

// ── Auth routes (OneHost-based) ─────────────────────────
// Registration and login are handled by OneHost (sklep.onehost.site)
// These endpoints are kept as no-ops for backward compatibility
app.post('/api/auth/register', (_req, res) => {
  res.status(400).json({ error: 'Rejestracja odbywa się przez OneHost (sklep.onehost.site)' });
});

app.post('/api/auth/login', (_req, res) => {
  res.status(400).json({ error: 'Logowanie odbywa się przez OneHost (sklep.onehost.site)' });
});

app.post('/api/auth/verify', (_req, res) => {
  res.json({ ok: true, message: 'Weryfikacja obsługiwana przez OneHost' });
});

app.post('/api/auth/resend-verify', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/auth/me', onehostAuth, (req, res) => {
  const u = req.user;
  const access = req.access || {};
  res.json({
    user: { id: u.id, email: u.email, name: u.name, role: u.role, company_name: u.company_name, email_verified: true },
    subscription: {
      ...access,
      plan: u.plan || 'starter',
      planDetails: access.plan,
      status: u.subscription_status || 'active',
      trialEndsAt: u.trial_ends_at,
    },
  });
});

// ── Billing is managed in OneHost ───────────────────────
app.post('/api/billing/checkout', authLight, (_req, res) => {
  return res.status(410).json({
    error: 'billing_managed_by_onehost',
    message: 'Płatności i plan są zarządzane centralnie w OneHost.',
    redirectUrl: process.env.ONEHOST_BILLING_URL || 'http://localhost:5100/dashboard',
  });
});

app.post('/api/billing/portal', authLight, (_req, res) => {
  return res.status(410).json({
    error: 'billing_managed_by_onehost',
    message: 'Portal subskrypcji jest dostępny w OneHost.',
    redirectUrl: process.env.ONEHOST_BILLING_URL || 'http://localhost:5100/dashboard',
  });
});

app.get('/api/billing/plans', (_req, res) => {
  return res.status(410).json({
    error: 'billing_managed_by_onehost',
    message: 'Plany są zarządzane w OneHost.',
    redirectUrl: process.env.ONEHOST_BILLING_URL || 'http://localhost:5100/dashboard',
  });
});

// ── Profile CRUD ────────────────────────────────────────
app.get('/api/profiles', auth, (req, res) => {
  const allowed = Array.isArray(req.allowedProfileIds) ? new Set(req.allowedProfileIds) : null;
  let rows = stmt.getProfilesByTenant.all(req.tenantId);
  if (allowed) rows = rows.filter((r) => allowed.has(Number(r.id)));
  res.json(rows);
});
app.post('/api/profiles', auth, writeGuard, (req, res) => {
  return res.status(410).json({
    error: 'profiles_managed_by_onehost',
    message: 'Profile CertTrack są zarządzane w OneHost (przypisania użytkowników).',
  });
});
app.put('/api/profiles/:id', auth, writeGuard, (req, res) => {
  return res.status(410).json({
    error: 'profiles_managed_by_onehost',
    message: 'Profile CertTrack są zarządzane w OneHost (przypisania użytkowników).',
  });
});
app.delete('/api/profiles/:id', auth, writeGuard, (req, res) => {
  return res.status(410).json({
    error: 'profiles_managed_by_onehost',
    message: 'Profile CertTrack są zarządzane w OneHost (przypisania użytkowników).',
  });
});

// ── Protected data routes (all tenant-scoped) ───────────

// --- Categories ---
app.get('/api/categories', auth, profileMiddleware, (req, res) => {
  res.json(stmt.getCategoriesByTenant.all(req.tenantId, req.profileId));
});
app.post('/api/categories', auth, profileMiddleware, writeGuard, (req, res) => {
  const { name, description, alert_days_before, color } = req.body;
  const r = stmt.insertCategory.run(req.tenantId, req.profileId, name || '', description || '', alert_days_before ?? 30, color || '#3b82f6');
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/categories/:id', auth, writeGuard, (req, res) => {
  const { name, description, alert_days_before, color } = req.body;
  stmt.updateCategory.run(name, description, alert_days_before, color, req.params.id, req.tenantId);
  res.json({ ok: true });
});
app.delete('/api/categories/:id', auth, writeGuard, (req, res) => {
  stmt.deleteCategory.run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

// --- Employees ---
app.get('/api/employees', auth, profileMiddleware, (req, res) => {
  res.json(stmt.getEmployeesByTenant.all(req.tenantId, req.profileId));
});
app.get('/api/employees/:id', auth, (req, res) => {
  const row = stmt.getEmployeeById.get(req.params.id, req.tenantId);
  if (!row) return res.status(404).json({ error: 'not_found' });
  res.json(row);
});
app.post('/api/employees', auth, profileMiddleware, writeGuard, (req, res) => {
  // Enforce plan limit
  const count = stmt.countEmployeesByTenant.get(req.tenantId, req.profileId).c;
  const maxEmployees = Number(req.maxEmployees || req.access?.plan?.maxEmployees || 25);
  if (count >= maxEmployees) {
    return res.status(403).json({ error: `Limit pracowników dla tego konta: ${maxEmployees}. Zmień plan w OneHost.` });
  }
  const { first_name, last_name, position, department, email, phone, hire_date, notes } = req.body;
  const r = stmt.insertEmployee.run(req.tenantId, req.profileId, first_name || '', last_name || '', position || '', department || '', email || '', phone || '', hire_date || '', notes || '');
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/employees/:id', auth, writeGuard, (req, res) => {
  const { first_name, last_name, position, department, email, phone, hire_date, active, notes } = req.body;
  stmt.updateEmployee.run(first_name, last_name, position, department, email, phone, hire_date, active ?? 1, notes, req.params.id, req.tenantId);
  res.json({ ok: true });
});
app.delete('/api/employees/:id', auth, writeGuard, (req, res) => {
  stmt.deleteEmployee.run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

// --- Certificates ---
app.get('/api/certificates', auth, profileMiddleware, (req, res) => {
  res.json(stmt.getCertsByTenant.all(req.tenantId, req.profileId));
});
app.get('/api/certificates/employee/:empId', auth, (req, res) => {
  res.json(stmt.getCertsByEmployee.all(req.params.empId, req.tenantId));
});
app.post('/api/certificates', auth, profileMiddleware, writeGuard, (req, res) => {
  const { employee_id, category_id, cert_number, issued_date, expiry_date, issuer, notes } = req.body;
  const emp = stmt.getEmpIdForTenant.get(employee_id, req.tenantId);
  if (!emp) return res.status(400).json({ error: 'invalid_employee' });
  const r = stmt.insertCert.run(req.tenantId, req.profileId, employee_id, category_id, cert_number || '', issued_date, expiry_date, issuer || '', notes || '');
  res.json({ id: r.lastInsertRowid });
});
app.put('/api/certificates/:id', auth, writeGuard, (req, res) => {
  const { employee_id, category_id, cert_number, issued_date, expiry_date, issuer, notes } = req.body;
  stmt.updateCert.run(employee_id, category_id, cert_number, issued_date, expiry_date, issuer, notes, req.params.id, req.tenantId);
  res.json({ ok: true });
});
app.delete('/api/certificates/:id', auth, writeGuard, (req, res) => {
  stmt.deleteCert.run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

// --- Dashboard (optimized: 1 aggregated query instead of 7 separate COUNTs) ---
const stmtDashCounts = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM employees WHERE active=1 AND tenant_id=? AND profile_id=?) as totalEmployees,
    (SELECT COUNT(*) FROM certificates WHERE tenant_id=? AND profile_id=?) as totalCerts,
    (SELECT COUNT(*) FROM certificates WHERE expiry_date < ? AND tenant_id=? AND profile_id=?) as expired,
    (SELECT COUNT(*) FROM certificates WHERE expiry_date >= ? AND expiry_date <= ? AND tenant_id=? AND profile_id=?) as expiring7,
    (SELECT COUNT(*) FROM certificates WHERE expiry_date > ? AND expiry_date <= ? AND tenant_id=? AND profile_id=?) as expiring30,
    (SELECT COUNT(*) FROM certificates WHERE expiry_date > ? AND expiry_date <= ? AND tenant_id=? AND profile_id=?) as expiring60,
    (SELECT COUNT(*) FROM certificates WHERE expiry_date > ? AND tenant_id=? AND profile_id=?) as valid
`);
const stmtDashUrgent = db.prepare(`
  SELECT c.id, c.expiry_date, c.cert_number,
         e.first_name, e.last_name, e.position as emp_position,
         cat.name as category_name, cat.color as category_color
  FROM certificates c JOIN employees e ON c.employee_id = e.id JOIN categories cat ON c.category_id = cat.id
  WHERE c.expiry_date <= ? AND e.active = 1 AND c.tenant_id=? AND c.profile_id=?
  ORDER BY c.expiry_date ASC LIMIT 50
`);
const stmtDashByCategory = db.prepare(`
  SELECT cat.name, cat.color, COUNT(*) as total,
         SUM(CASE WHEN c.expiry_date < ? THEN 1 ELSE 0 END) as expired,
         SUM(CASE WHEN c.expiry_date >= ? AND c.expiry_date <= ? THEN 1 ELSE 0 END) as expiring_soon
  FROM certificates c JOIN categories cat ON c.category_id = cat.id
  WHERE c.tenant_id=? AND c.profile_id=? GROUP BY cat.id ORDER BY cat.name
`);

app.get('/api/dashboard', auth, profileMiddleware, (req, res) => {
  const tid = req.tenantId;
  const pid = req.profileId;
  const today = new Date().toISOString().slice(0, 10);
  const in7 = addDaysISO(today, 7);
  const in30 = addDaysISO(today, 30);
  const in60 = addDaysISO(today, 60);

  const counts = stmtDashCounts.get(tid, pid, tid, pid, today, tid, pid, today, in7, tid, pid, in7, in30, tid, pid, in30, in60, tid, pid, in60, tid, pid);
  const urgentList = stmtDashUrgent.all(in30, tid, pid);
  const byCategory = stmtDashByCategory.all(today, today, in30, tid, pid);

  res.json({ ...counts, urgentList, byCategory });
});

// ── File upload / download ───────────────────────────────
app.post('/api/certificates/:id/upload', auth, writeGuard, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Brak pliku lub niedozwolony format' });
  const cert = stmt.getCertById.get(req.params.id, req.tenantId);
  if (!cert) return res.status(404).json({ error: 'not_found' });
  // Remove old file if exists
  const old = stmt.getCertFileName.get(req.params.id, req.tenantId);
  if (old?.file_name) {
    const oldPath = path.join(UPLOADS_DIR, old.file_name);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  stmt.updateCertFile.run(req.file.filename, req.params.id, req.tenantId);
  res.json({ file_name: req.file.filename });
});

app.get('/api/files/:filename', async (req, res) => {
  // Support token via query param (for <a href> downloads) or Authorization header
  const tokenStr = req.query.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!tokenStr) return res.status(401).json({ error: 'unauthorized' });
  try {
    const data = await validateOneHostToken(tokenStr);
    if (!data.valid || !data.user?.tenantId) return res.status(401).json({ error: 'invalid_token' });

    const ohTenantId = String(data.user.tenantId);
    const tenant = db.prepare('SELECT id FROM tenants WHERE onehost_tenant_id=?').get(ohTenantId);
    if (!tenant) return res.status(404).json({ error: 'tenant_not_found' });

    const filename = path.basename(req.params.filename);
    const cert = stmt.getCertByFileName.get(filename, tenant.id);
    if (!cert) return res.status(404).json({ error: 'not_found' });
    const filePath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'file_missing' });
    return res.sendFile(filePath);
  } catch {
    return res.status(401).json({ error: 'invalid_token' });
  }
});

app.delete('/api/certificates/:id/file', auth, writeGuard, (req, res) => {
  const cert = stmt.getCertFileName.get(req.params.id, req.tenantId);
  if (!cert) return res.status(404).json({ error: 'not_found' });
  if (cert.file_name) {
    const filePath = path.join(UPLOADS_DIR, cert.file_name);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
  stmt.clearCertFile.run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

// ── PDF export ──────────────────────────────────────────
app.get('/api/employees/:id/pdf', auth, (req, res) => {
  const emp = stmt.getEmployeeById.get(req.params.id, req.tenantId);
  if (!emp) return res.status(404).json({ error: 'not_found' });
  const certs = stmt.getCertsByEmployee.all(req.params.id, req.tenantId);
  const tenant = stmt.getTenantById.get(req.tenantId);
  const today = new Date().toISOString().slice(0, 10);

  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Uprawnienia - ${emp.first_name} ${emp.last_name}`, Author: 'CertTrack' } });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="uprawnienia-${emp.last_name}-${emp.first_name}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(18).font('Helvetica-Bold').text('CertTrack', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(tenant?.company_name || '', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(14).font('Helvetica-Bold').text(`Raport uprawnien - ${emp.first_name} ${emp.last_name}`);
  doc.fontSize(9).font('Helvetica').text(`Stanowisko: ${emp.position || '-'}  |  Dzial: ${emp.department || '-'}  |  Email: ${emp.email || '-'}`);
  doc.text(`Data wygenerowania: ${today}`);
  doc.moveDown();

  if (certs.length === 0) {
    doc.fontSize(11).text('Brak uprawnien w systemie.');
  } else {
    // Table header
    const colX = [50, 200, 300, 380, 460];
    doc.fontSize(8).font('Helvetica-Bold');
    doc.text('Kategoria', colX[0], doc.y, { width: 145 });
    doc.text('Nr certyfikatu', colX[1], doc.y, { width: 95 });
    doc.text('Wydano', colX[2], doc.y, { width: 75 });
    doc.text('Wygasa', colX[3], doc.y, { width: 75 });
    doc.text('Status', colX[4], doc.y, { width: 80 });
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);

    doc.font('Helvetica').fontSize(8);
    for (const c of certs) {
      const days = Math.ceil((new Date(c.expiry_date + 'T00:00:00').getTime() - Date.now()) / 86400000);
      const status = days < 0 ? 'WYGASLO' : days <= 7 ? 'KRYTYCZNE' : days <= 30 ? 'OSTRZEZENIE' : 'OK';
      const y = doc.y;
      if (y > 750) { doc.addPage(); }
      doc.text(c.category_name, colX[0], doc.y, { width: 145 });
      doc.text(c.cert_number || '-', colX[1], doc.y, { width: 95 });
      doc.text(c.issued_date, colX[2], doc.y, { width: 75 });
      doc.text(c.expiry_date, colX[3], doc.y, { width: 75 });
      doc.text(`${status} (${days}d)`, colX[4], doc.y, { width: 80 });
      doc.moveDown(0.5);
    }
  }

  doc.moveDown(2);
  doc.fontSize(7).fillColor('#999').text('Wygenerowano automatycznie przez CertTrack | onehost.site', { align: 'center' });
  doc.end();
});

// ── CSV Import ──────────────────────────────────────────
app.post('/api/import/employees', auth, profileMiddleware, writeGuard, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Brak danych do importu' });

  const currentCount = stmt.countEmployeesByTenant.get(req.tenantId, req.profileId).c;
  const maxAllowed = Number(req.maxEmployees || req.access?.plan?.maxEmployees || 25);
  if (currentCount + rows.length > maxAllowed) {
    return res.status(403).json({ error: `Import ${rows.length} pracownikow przekroczy limit planu ${req.access.plan.name} (${maxAllowed}). Aktualnie: ${currentCount}.` });
  }

  let imported = 0;
  let errors = [];
  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.first_name || !r.last_name) { errors.push(`Wiersz ${i + 1}: brak imienia lub nazwiska`); continue; }
      try {
        stmt.insertEmployee.run(req.tenantId, req.profileId, r.first_name.trim(), r.last_name.trim(), r.position?.trim() || '', r.department?.trim() || '', r.email?.trim() || '', r.phone?.trim() || '', r.hire_date?.trim() || '', r.notes?.trim() || '');
        imported++;
      } catch (e) { errors.push(`Wiersz ${i + 1}: ${e.message}`); }
    }
  });
  tx();
  res.json({ imported, errors, total: rows.length });
});

app.post('/api/import/certificates', auth, profileMiddleware, writeGuard, (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) return res.status(400).json({ error: 'Brak danych do importu' });

  const categories = stmt.getCategoriesByTenant.all(req.tenantId, req.profileId);
  const catMap = {};
  for (const c of categories) catMap[c.name.toLowerCase()] = c.id;

  const employees = stmt.getEmployeesByTenant.all(req.tenantId, req.profileId);
  const empMap = {};
  for (const e of employees) empMap[`${e.first_name} ${e.last_name}`.toLowerCase()] = e.id;

  let imported = 0;
  let errors = [];
  const tx = db.transaction(() => {
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const empId = r.employee_id || empMap[(r.employee_name || '').toLowerCase()];
      const catId = r.category_id || catMap[(r.category_name || '').toLowerCase()];
      if (!empId) { errors.push(`Wiersz ${i + 1}: nie znaleziono pracownika "${r.employee_name}"`); continue; }
      if (!catId) { errors.push(`Wiersz ${i + 1}: nie znaleziono kategorii "${r.category_name}"`); continue; }
      if (!r.issued_date || !r.expiry_date) { errors.push(`Wiersz ${i + 1}: brak daty wydania lub waznosci`); continue; }
      try {
        stmt.insertCert.run(req.tenantId, req.profileId, empId, catId, r.cert_number?.trim() || '', r.issued_date.trim(), r.expiry_date.trim(), r.issuer?.trim() || '', r.notes?.trim() || '');
        imported++;
      } catch (e) { errors.push(`Wiersz ${i + 1}: ${e.message}`); }
    }
  });
  tx();
  res.json({ imported, errors, total: rows.length });
});

// ── Multi-user management ───────────────────────────────
app.get('/api/users', auth, (req, res) => {
  return res.status(410).json({
    error: 'users_managed_by_onehost',
    message: 'Użytkownicy są zarządzani centralnie w OneHost.',
  });
});

app.post('/api/users/invite', auth, async (req, res) => {
  return res.status(410).json({
    error: 'users_managed_by_onehost',
    message: 'Użytkownicy są zarządzani centralnie w OneHost.',
  });
});

app.put('/api/users/:id/role', auth, (req, res) => {
  return res.status(410).json({
    error: 'users_managed_by_onehost',
    message: 'Użytkownicy są zarządzani centralnie w OneHost.',
  });
});

app.delete('/api/users/:id', auth, (req, res) => {
  return res.status(410).json({
    error: 'users_managed_by_onehost',
    message: 'Użytkownicy są zarządzani centralnie w OneHost.',
  });
});

// ── Notification emails (per tenant, profile-scoped) ─────────────────────
app.get('/api/settings/notifications', auth, profileMiddleware, (req, res) => {
  const emails = stmt.getNotifEmails.all(req.tenantId, req.profileId);
  const gs = (k) => { const r = stmt.getTenantSetting.get(req.tenantId, k); return r?.value || ''; };
  res.json({
    emails,
    alert_days: gs('alert_days') || '7,30,60',
    alert_enabled: gs('alert_enabled') !== '0',
  });
});

app.post('/api/settings/notifications/emails', auth, profileMiddleware, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin może zarządzać ustawieniami' });
  const { email, label } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Nieprawidłowy email' });
  const existing = stmt.getNotifEmailByAddr.get(req.tenantId, email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Ten email jest już dodany' });
  const r = stmt.insertNotifEmail.run(req.tenantId, req.profileId, email.toLowerCase().trim(), label || '');
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/settings/notifications/emails/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  const { active } = req.body;
  stmt.updateNotifEmailActive.run(active ? 1 : 0, req.params.id, req.tenantId);
  res.json({ ok: true });
});

app.delete('/api/settings/notifications/emails/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  stmt.deleteNotifEmail.run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

app.put('/api/settings/notifications', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  const { alert_days, alert_enabled } = req.body;
  if (alert_days !== undefined) stmt.upsertTenantSetting.run(req.tenantId, 'alert_days', alert_days);
  if (alert_enabled !== undefined) stmt.upsertTenantSetting.run(req.tenantId, 'alert_enabled', alert_enabled ? '1' : '0');
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════
// ── SUPER-ADMIN API ─────────────────────────────────────
// ══════════════════════════════════════════════════════════

app.post('/api/admin/login', (req, res) => {
  return res.status(410).json({ error: 'disabled', message: 'Lokalne konto admina CertTrack zostało wyłączone. Użyj panelu admina OneHost.' });
});

app.get('/api/admin/me', superAuth, (req, res) => {
  res.json({ admin: { id: req.admin.id, email: req.admin.email, name: req.admin.name } });
});

// ── Admin: Dashboard stats ──────────────────────────────
// Optimized: single aggregated query instead of 8 separate COUNTs
const stmtAdminStats = db.prepare(`
  SELECT
    (SELECT COUNT(*) FROM tenants) as totalTenants,
    (SELECT COUNT(*) FROM users) as totalUsers,
    (SELECT COUNT(*) FROM employees) as totalEmployees,
    (SELECT COUNT(*) FROM certificates) as totalCerts,
    (SELECT COUNT(*) FROM tenants WHERE subscription_status='active') as activeSubs,
    (SELECT COUNT(*) FROM tenants WHERE subscription_status='trialing') as trialingSubs,
    (SELECT COUNT(*) FROM tenants WHERE subscription_status NOT IN ('active','trialing')) as expiredSubs,
    (SELECT COUNT(*) FROM users WHERE email_verified=1) as verifiedUsers
`);
const stmtRecentTenants = db.prepare('SELECT t.*, (SELECT COUNT(*) FROM users u WHERE u.tenant_id=t.id) as user_count, (SELECT COUNT(*) FROM employees e WHERE e.tenant_id=t.id) as emp_count FROM tenants t ORDER BY t.created_at DESC LIMIT 10');

app.get('/api/admin/stats', superAuth, (_req, res) => {
  const stats = stmtAdminStats.get();
  const recentTenants = stmtRecentTenants.all();
  res.json({ ...stats, recentTenants });
});

app.get('/api/admin/config', superAuth, (_req, res) => {
  const plans = getPlans();
  const plansArr = Object.entries(plans).map(([key, p]) => ({ key, name: p.name, maxEmployees: p.maxEmployees, maxUsers: p.maxUsers, pricePLN: p.pricePLN }));
  res.json({
    ok: true,
    app: 'certtrack',
    port: PORT,
    plans: plansArr,
    trialDays: TRIAL_DAYS,
    totalTenants: db.prepare('SELECT COUNT(*) as c FROM tenants').get().c,
    totalUsers: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
    totalEmployees: db.prepare('SELECT COUNT(*) as c FROM employees').get().c,
    totalCerts: db.prepare('SELECT COUNT(*) as c FROM certificates').get().c,
  });
});

// ── Admin: Tenants CRUD ─────────────────────────────────
app.get('/api/admin/tenants', superAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id=t.id) as user_count,
      (SELECT COUNT(*) FROM employees e WHERE e.tenant_id=t.id) as emp_count,
      (SELECT COUNT(*) FROM certificates c WHERE c.tenant_id=t.id) as cert_count
    FROM tenants t ORDER BY t.created_at DESC
  `).all();
  res.json(rows);
});

app.get('/api/admin/tenants/:id', superAuth, (req, res) => {
  const tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'not_found' });
  const users = db.prepare('SELECT id, email, name, role, email_verified, created_at FROM users WHERE tenant_id=?').all(req.params.id);
  res.json({ tenant, users });
});

app.put('/api/admin/tenants/:id', superAuth, (req, res) => {
  const { plan, subscription_status, trial_ends_at } = req.body;
  const tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'not_found' });
  db.prepare('UPDATE tenants SET plan=?, subscription_status=?, trial_ends_at=? WHERE id=?')
    .run(plan || tenant.plan, subscription_status || tenant.subscription_status, trial_ends_at || tenant.trial_ends_at, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/tenants/:id', superAuth, (req, res) => {
  db.prepare('DELETE FROM tenants WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── Admin: Plans CRUD ───────────────────────────────────
app.get('/api/admin/plans', superAuth, (_req, res) => {
  res.json(db.prepare('SELECT * FROM plans_config ORDER BY sort_order').all());
});

// Helper: auto-create Stripe Product + Price for a plan (monthly + yearly)
async function syncPlanToStripe(planKey, planName, pricePln, pricePlnYearly) {
  const stripeInstance = getStripe();
  if (!stripeInstance) return { monthly: '', yearly: '' };
  const currSetting = db.prepare("SELECT value FROM settings WHERE key='currency_name'").get();
  const currency = (currSetting?.value || 'PLN').toLowerCase();
  const yearlyAmount = pricePlnYearly || pricePln * 10;
  try {
    // Create or find product
    const products = await stripeInstance.products.list({ limit: 100 });
    let product = products.data.find(p => p.metadata?.certtrack_plan === planKey);
    if (!product) {
      product = await stripeInstance.products.create({ name: `CertTrack - ${planName}`, metadata: { certtrack_plan: planKey } });
      console.log(`[Stripe] Created product for plan "${planKey}": ${product.id}`);
    } else {
      await stripeInstance.products.update(product.id, { name: `CertTrack - ${planName}` });
    }
    // Find or create monthly price
    const activePrices = await stripeInstance.prices.list({ product: product.id, active: true, limit: 20 });
    let monthlyPrice = activePrices.data.find(p => p.unit_amount === pricePln * 100 && p.currency === currency && p.recurring?.interval === 'month');
    if (!monthlyPrice) {
      monthlyPrice = await stripeInstance.prices.create({
        product: product.id, unit_amount: pricePln * 100, currency, recurring: { interval: 'month' },
      });
      console.log(`[Stripe] Created monthly price for plan "${planKey}": ${monthlyPrice.id} (${pricePln} ${currency}/mo)`);
    }
    // Find or create yearly price
    let yearlyPrice = activePrices.data.find(p => p.unit_amount === yearlyAmount * 100 && p.currency === currency && p.recurring?.interval === 'year');
    if (!yearlyPrice) {
      yearlyPrice = await stripeInstance.prices.create({
        product: product.id, unit_amount: yearlyAmount * 100, currency, recurring: { interval: 'year' },
      });
      console.log(`[Stripe] Created yearly price for plan "${planKey}": ${yearlyPrice.id} (${yearlyAmount} ${currency}/yr)`);
    }
    return { monthly: monthlyPrice.id, yearly: yearlyPrice.id };
  } catch (err) {
    console.error(`[Stripe] Failed to sync plan "${planKey}":`, err.message);
    return { monthly: '', yearly: '' };
  }
}

app.post('/api/admin/plans', superAuth, async (req, res) => {
  const { key, name, max_employees, max_users, price_pln, price_pln_yearly, sort_order } = req.body;
  if (!key || !name) return res.status(400).json({ error: 'Podaj key i name' });
  const existing = db.prepare('SELECT key FROM plans_config WHERE key=?').get(key);
  if (existing) return res.status(400).json({ error: 'Plan o tym kluczu już istnieje' });
  const monthlyPrice = price_pln || 99;
  const yearlyPrice = price_pln_yearly || monthlyPrice * 10;
  // Auto-create Stripe prices (monthly + yearly)
  const stripePrices = await syncPlanToStripe(key, name, monthlyPrice, yearlyPrice);
  db.prepare('INSERT INTO plans_config (key, name, max_employees, max_users, price_pln, price_pln_yearly, stripe_price_id, stripe_price_id_yearly, sort_order) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(key, name, max_employees || 25, max_users || 3, monthlyPrice, yearlyPrice, stripePrices.monthly, stripePrices.yearly, sort_order || 0);
  reloadPlans();
  res.json({ ok: true, stripe_price_id: stripePrices.monthly, stripe_price_id_yearly: stripePrices.yearly });
});

app.put('/api/admin/plans/:key', superAuth, async (req, res) => {
  const { name, max_employees, max_users, price_pln, price_pln_yearly, sort_order, active } = req.body;
  const plan = db.prepare('SELECT * FROM plans_config WHERE key=?').get(req.params.key);
  if (!plan) return res.status(404).json({ error: 'not_found' });
  const newName = name ?? plan.name;
  const newPrice = price_pln ?? plan.price_pln;
  const newYearlyPrice = price_pln_yearly ?? plan.price_pln_yearly ?? newPrice * 10;
  // Re-sync Stripe prices if name or price changed
  let stripePriceId = plan.stripe_price_id;
  let stripePriceIdYearly = plan.stripe_price_id_yearly;
  if (newName !== plan.name || newPrice !== plan.price_pln || newYearlyPrice !== plan.price_pln_yearly || !stripePriceId) {
    const synced = await syncPlanToStripe(req.params.key, newName, newPrice, newYearlyPrice);
    if (synced.monthly) stripePriceId = synced.monthly;
    if (synced.yearly) stripePriceIdYearly = synced.yearly;
  }
  db.prepare('UPDATE plans_config SET name=?, max_employees=?, max_users=?, price_pln=?, price_pln_yearly=?, stripe_price_id=?, stripe_price_id_yearly=?, sort_order=?, active=? WHERE key=?')
    .run(newName, max_employees ?? plan.max_employees, max_users ?? plan.max_users, newPrice, newYearlyPrice, stripePriceId, stripePriceIdYearly, sort_order ?? plan.sort_order, active ?? plan.active, req.params.key);
  reloadPlans();
  res.json({ ok: true, stripe_price_id: stripePriceId, stripe_price_id_yearly: stripePriceIdYearly });
});

app.delete('/api/admin/plans/:key', superAuth, (req, res) => {
  db.prepare('DELETE FROM plans_config WHERE key=?').run(req.params.key);
  reloadPlans();
  res.json({ ok: true });
});

// Sync ALL plans to Stripe (bulk)
app.post('/api/admin/plans/sync-stripe', superAuth, async (_req, res) => {
  const stripeInstance = getStripe();
  if (!stripeInstance) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany. Ustaw klucz API w ustawieniach płatności.' });
  const allPlans = db.prepare('SELECT * FROM plans_config WHERE active=1').all();
  const results = [];
  for (const p of allPlans) {
    const prices = await syncPlanToStripe(p.key, p.name, p.price_pln, p.price_pln_yearly);
    if (prices.monthly || prices.yearly) {
      db.prepare('UPDATE plans_config SET stripe_price_id=?, stripe_price_id_yearly=? WHERE key=?').run(prices.monthly || p.stripe_price_id, prices.yearly || p.stripe_price_id_yearly, p.key);
      results.push({ key: p.key, stripe_price_id: prices.monthly, stripe_price_id_yearly: prices.yearly, ok: true });
    } else {
      results.push({ key: p.key, ok: false });
    }
  }
  reloadPlans();
  res.json({ ok: true, results });
});

// ── Admin: SMTP Settings ────────────────────────────────
app.get('/api/admin/settings/smtp', superAuth, (_req, res) => {
  const cfg = getSmtpConfig();
  res.json({ ...cfg, pass: cfg.pass ? '••••••••' : '' });
});

app.put('/api/admin/settings/smtp', superAuth, (req, res) => {
  const { host, port, user, pass, from, secure } = req.body;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  if (host !== undefined) upsert.run('smtp_host', host);
  if (port !== undefined) upsert.run('smtp_port', String(port));
  if (user !== undefined) upsert.run('smtp_user', user);
  if (pass !== undefined && pass !== '••••••••') upsert.run('smtp_pass', pass);
  if (from !== undefined) upsert.run('smtp_from', from);
  if (secure !== undefined) upsert.run('smtp_secure', secure ? '1' : '0');
  res.json({ ok: true });
});

app.post('/api/admin/settings/smtp/test', superAuth, async (req, res) => {
  const { to } = req.body;
  if (!to) return res.status(400).json({ error: 'Podaj adres email do testu' });
  const ok = await sendEmail(to, 'CertTrack - Test SMTP', '<h2>Test SMTP</h2><p>Jeśli widzisz tę wiadomość, konfiguracja SMTP działa poprawnie!</p>');
  res.json({ ok, message: ok ? 'Email wysłany!' : 'Błąd wysyłki. Sprawdź konfigurację SMTP.' });
});

// ── Admin: Payment / Stripe Settings ────────────────────
app.get('/api/admin/settings/payment', superAuth, (_req, res) => {
  const get = (k) => { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(k); return r?.value || ''; };
  res.json({
    stripe_secret_key: get('stripe_secret_key') ? '••••••••' : '',
    currency_name: get('currency_name') || 'PLN',
    internal_currency_name: get('internal_currency_name') || 'PLN',
    stripe_payment_methods: get('stripe_payment_methods') || 'card',
  });
});

app.put('/api/admin/settings/payment', superAuth, (req, res) => {
  const { stripe_secret_key, currency_name, internal_currency_name, stripe_payment_methods } = req.body;
  const upsert = db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  if (stripe_secret_key !== undefined && stripe_secret_key !== '••••••••') upsert.run('stripe_secret_key', stripe_secret_key);
  if (currency_name !== undefined) upsert.run('currency_name', currency_name);
  if (internal_currency_name !== undefined) upsert.run('internal_currency_name', internal_currency_name);
  if (stripe_payment_methods !== undefined) upsert.run('stripe_payment_methods', stripe_payment_methods);
  res.json({ ok: true });
});

// ── Admin: Super-admin management ───────────────────────
app.get('/api/admin/admins', superAuth, (_req, res) => {
  return res.status(410).json({ error: 'disabled', message: 'Zarządzanie lokalnymi adminami CertTrack zostało wyłączone.' });
});

app.post('/api/admin/admins', superAuth, (req, res) => {
  return res.status(410).json({ error: 'disabled', message: 'Zarządzanie lokalnymi adminami CertTrack zostało wyłączone.' });
});

app.put('/api/admin/admins/:id/password', superAuth, (req, res) => {
  return res.status(410).json({ error: 'disabled', message: 'Zarządzanie lokalnymi adminami CertTrack zostało wyłączone.' });
});

app.delete('/api/admin/admins/:id', superAuth, (req, res) => {
  return res.status(410).json({ error: 'disabled', message: 'Zarządzanie lokalnymi adminami CertTrack zostało wyłączone.' });
});

// ══════════════════════════════════════════════════════════
// ── AUTOMATIC EXPIRY ALERTS (cron-like) ─────────────────
// ══════════════════════════════════════════════════════════

async function runExpiryAlerts() {
  const cfg = getSmtpConfig();
  if (!cfg.host || !cfg.user) { return; }

  const today = new Date().toISOString().slice(0, 10);
  const in7 = addDaysISO(today, 7);
  const in30 = addDaysISO(today, 30);

  // Get all active tenants with active subscriptions or trials
  const tenants = db.prepare("SELECT * FROM tenants WHERE subscription_status IN ('active','trialing') AND trial_ends_at >= ?").all(today);

  for (const tenant of tenants) {
    // Get expiring certificates for this tenant
    const expiring = db.prepare(`
      SELECT c.expiry_date, c.cert_number, e.first_name, e.last_name, e.email as emp_email,
             cat.name as category_name, cat.alert_days_before
      FROM certificates c
      JOIN employees e ON c.employee_id = e.id
      JOIN categories cat ON c.category_id = cat.id
      WHERE c.tenant_id = ? AND e.active = 1
        AND c.expiry_date <= ?
      ORDER BY c.expiry_date ASC
    `).all(tenant.id, in30);

    if (expiring.length === 0) continue;

    // Check if alerts are enabled for this tenant
    const alertEnabled = db.prepare("SELECT value FROM tenant_settings WHERE tenant_id=? AND key='alert_enabled'").get(tenant.id);
    if (alertEnabled && alertEnabled.value === '0') continue;

    // Get notification emails (custom list) + fallback to admin users
    let recipients = db.prepare("SELECT email FROM notification_emails WHERE tenant_id = ? AND active = 1").all(tenant.id).map(r => r.email);
    if (recipients.length === 0) {
      recipients = db.prepare("SELECT email FROM users WHERE tenant_id = ? AND role = 'admin' AND email_verified = 1").all(tenant.id).map(r => r.email);
    }
    if (recipients.length === 0) continue;

    // Build alert email
    const expired = expiring.filter(c => c.expiry_date < today);
    const critical = expiring.filter(c => c.expiry_date >= today && c.expiry_date <= in7);
    const warning = expiring.filter(c => c.expiry_date > in7);

    const certRow = (c) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${c.first_name} ${c.last_name}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${c.category_name}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${c.cert_number || '—'}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${c.expiry_date}</td></tr>`;

    let html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#2563eb;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
        <h2 style="margin:0;font-size:18px">CertTrack — Raport wygasających uprawnień</h2>
        <p style="margin:4px 0 0;font-size:13px;opacity:0.8">${tenant.company_name} • ${today}</p>
      </div>
      <div style="padding:20px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">`;

    if (expired.length > 0) {
      html += `<h3 style="color:#dc2626;font-size:14px;margin:0 0 8px">🔴 Wygasłe (${expired.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
        <tr style="background:#fef2f2"><th style="text-align:left;padding:6px 10px">Pracownik</th><th style="text-align:left;padding:6px 10px">Kategoria</th><th style="text-align:left;padding:6px 10px">Nr cert.</th><th style="text-align:left;padding:6px 10px">Wygasa</th></tr>
        ${expired.map(certRow).join('')}</table>`;
    }
    if (critical.length > 0) {
      html += `<h3 style="color:#ea580c;font-size:14px;margin:0 0 8px">🟠 Krytyczne — wygasają w ciągu 7 dni (${critical.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
        <tr style="background:#fff7ed"><th style="text-align:left;padding:6px 10px">Pracownik</th><th style="text-align:left;padding:6px 10px">Kategoria</th><th style="text-align:left;padding:6px 10px">Nr cert.</th><th style="text-align:left;padding:6px 10px">Wygasa</th></tr>
        ${critical.map(certRow).join('')}</table>`;
    }
    if (warning.length > 0) {
      html += `<h3 style="color:#ca8a04;font-size:14px;margin:0 0 8px">🟡 Ostrzeżenie — wygasają w ciągu 30 dni (${warning.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:16px">
        <tr style="background:#fefce8"><th style="text-align:left;padding:6px 10px">Pracownik</th><th style="text-align:left;padding:6px 10px">Kategoria</th><th style="text-align:left;padding:6px 10px">Nr cert.</th><th style="text-align:left;padding:6px 10px">Wygasa</th></tr>
        ${warning.map(certRow).join('')}</table>`;
    }

    html += `<p style="font-size:12px;color:#64748b;margin-top:16px">Ten email został wysłany automatycznie przez CertTrack. Zaloguj się, aby zarządzać uprawnieniami.</p>
      </div></div>`;

    // Send to all recipients
    for (const email of recipients) {
      await sendEmail(email, `CertTrack: ${expiring.length} uprawnień wymaga uwagi — ${tenant.company_name}`, html);
    }
    console.log(`[Alerts] Sent expiry alert for "${tenant.company_name}" (${expiring.length} certs) to ${recipients.length} recipient(s)`);
  }
}

// Also expose manual trigger for super-admin
app.post('/api/admin/alerts/run', superAuth, async (_req, res) => {
  try {
    await runExpiryAlerts();
    res.json({ ok: true, message: 'Alerty wysłane' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Start ───────────────────────────────────────────────
const PORT = Number(process.env.PORT || 62);
app.listen(PORT, () => {
  console.log(`[CertTrack] API server running on http://localhost:${PORT}`);
  console.log(`[CertTrack] Stripe: ${stripe ? 'configured' : 'NOT configured (set STRIPE_SECRET_KEY)'}`);
  console.log(`[CertTrack] Trial: ${TRIAL_DAYS} days`);
  console.log(`[CertTrack] Admin panel: /admin`);

  // Run expiry alerts every 24h (and once 60s after startup)
  setTimeout(() => runExpiryAlerts().catch(e => console.error('[Alerts] Error:', e.message)), 60000);
  setInterval(() => runExpiryAlerts().catch(e => console.error('[Alerts] Error:', e.message)), 24 * 60 * 60 * 1000);
  console.log(`[CertTrack] Expiry alerts: scheduled (every 24h)`);

  // Periodic cleanup: rate_limits older than 24h
  setInterval(() => {
    const cutoff = Math.floor(Date.now() / 1000) - 86400;
    const deleted = db.prepare('DELETE FROM rate_limits WHERE ts < ?').run(cutoff);
    if (deleted.changes > 0) console.log(`[Cleanup] Removed ${deleted.changes} old rate_limit entries`);
  }, 3600000); // every hour

  if (JWT_SECRET === 'certtrack-dev-secret-change-in-production') {
    console.warn('[CertTrack] ⚠ WARNING: Using default JWT_SECRET! Set JWT_SECRET env var in production.');
  }
});
