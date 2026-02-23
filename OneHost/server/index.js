import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'data', 'onehost.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ── Config ──────────────────────────────────────────────
const PORT = Number(process.env.PORT || 56);
const JWT_SECRET = process.env.JWT_SECRET || 'onehost-local-dev-secret-change-me';
if (!process.env.JWT_SECRET) {
  console.warn('[OneHost] UWAGA: Brak JWT_SECRET w env. Używany jest stały sekret deweloperski. Ustaw JWT_SECRET w produkcji.');
}
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';
const TRIAL_DAYS = 7;
const BUNDLE_DISCOUNT = 20; // %
const REQUIRE_CARD_FOR_TRIAL = process.env.REQUIRE_CARD_FOR_TRIAL === '1';
const ONEHOST_PUBLIC_URL = process.env.ONEHOST_PUBLIC_URL || 'https://sklep.onehost.site';

let stripe = STRIPE_SECRET ? new Stripe(STRIPE_SECRET) : null;

// ── Database ────────────────────────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS tenants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    plan TEXT DEFAULT 'trial',
    products TEXT DEFAULT 'shiftplanner,equipment,certtrack',
    trial_ends_at TEXT NOT NULL,
    stripe_customer_id TEXT DEFAULT '',
    stripe_subscription_id TEXT DEFAULT '',
    subscription_status TEXT DEFAULT 'trialing',
    allow_without_card INTEGER DEFAULT 0,
    max_profiles INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    role TEXT DEFAULT 'admin',
    email_verified INTEGER DEFAULT 0,
    verify_token TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS super_admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS plans_config (
    key TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    max_employees INTEGER NOT NULL DEFAULT 25,
    max_users INTEGER NOT NULL DEFAULT 3,
    max_profiles INTEGER NOT NULL DEFAULT 1,
    price_pln INTEGER NOT NULL DEFAULT 99,
    price_pln_yearly INTEGER NOT NULL DEFAULT 990,
    stripe_price_id TEXT DEFAULT '',
    stripe_price_id_yearly TEXT DEFAULT '',
    sort_order INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT NOT NULL,
    action TEXT NOT NULL,
    ts INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    target_plans TEXT DEFAULT '',
    target_products TEXT DEFAULT '',
    requires_action INTEGER DEFAULT 0,
    action_type TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS announcement_dismissals (
    user_id INTEGER NOT NULL,
    announcement_id INTEGER NOT NULL,
    action TEXT DEFAULT 'dismissed',
    created_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, announcement_id)
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    product TEXT NOT NULL DEFAULT 'shiftplanner',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS profile_users (
    profile_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    PRIMARY KEY (profile_id, user_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip, action);
  CREATE INDEX IF NOT EXISTS idx_tenants_stripe ON tenants(stripe_customer_id);
  CREATE INDEX IF NOT EXISTS idx_profiles_tenant ON profiles(tenant_id);
  CREATE INDEX IF NOT EXISTS idx_profile_users_user ON profile_users(user_id);
`);

// ── Seed / enforce super admin ──────────────────────────
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
const ADMIN_PASSWORD_HASH = (process.env.ADMIN_PASSWORD_HASH || '').trim();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || '').trim();
const ADMIN_EFFECTIVE_PASSWORD_HASH = ADMIN_PASSWORD_HASH || (ADMIN_PASSWORD ? bcrypt.hashSync(ADMIN_PASSWORD, 10) : '');
let ADMIN_AUTH_READY = false;
if (ADMIN_EMAIL && ADMIN_EFFECTIVE_PASSWORD_HASH) {
  const existing = db.prepare('SELECT * FROM super_admins WHERE LOWER(email)=?').get(ADMIN_EMAIL);
  const hash = ADMIN_EFFECTIVE_PASSWORD_HASH;
  if (!ADMIN_PASSWORD_HASH && ADMIN_PASSWORD) {
    console.warn('[OneHost] Użyto ADMIN_PASSWORD (plain) do wygenerowania hasha admina podczas startu. Dla produkcji zalecane jest użycie ADMIN_PASSWORD_HASH.');
  }
  if (!existing) {
    db.prepare('DELETE FROM super_admins').run();
    db.prepare('INSERT INTO super_admins (email, password_hash, name) VALUES (?,?,?)').run(ADMIN_EMAIL, hash, 'Super Admin');
    console.log(`[OneHost] Super admin created: ${ADMIN_EMAIL}`);
  } else {
    db.prepare('UPDATE super_admins SET password_hash=?, email=? WHERE id=?').run(hash, ADMIN_EMAIL, existing.id);
    db.prepare('DELETE FROM super_admins WHERE id!=?').run(existing.id);
  }
  ADMIN_AUTH_READY = true;
} else {
  const persistedAdmin = db.prepare('SELECT id, email FROM super_admins LIMIT 1').get();
  if (persistedAdmin) {
    ADMIN_AUTH_READY = true;
    console.warn(`[OneHost] Brak ADMIN_* w env. Używany zapisany super admin z bazy: ${persistedAdmin.email}`);
  } else {
    const bootstrapEmail = (process.env.ADMIN_BOOTSTRAP_EMAIL || 'admin@onehost.local').toLowerCase().trim();
    const bootstrapPassword = (process.env.ADMIN_BOOTSTRAP_PASSWORD || crypto.randomBytes(12).toString('base64url')).trim();
    const bootstrapHash = bcrypt.hashSync(bootstrapPassword, 10);
    db.prepare('DELETE FROM super_admins').run();
    db.prepare('INSERT INTO super_admins (email, password_hash, name) VALUES (?,?,?)').run(bootstrapEmail, bootstrapHash, 'Super Admin');
    ADMIN_AUTH_READY = true;
    console.warn(`[OneHost] AUTO-BOOTSTRAP admin utworzony: ${bootstrapEmail}`);
    console.warn(`[OneHost] AUTO-BOOTSTRAP hasło jednorazowe: ${bootstrapPassword}`);
    console.warn('[OneHost] Ustaw ADMIN_EMAIL + ADMIN_PASSWORD_HASH (lub ADMIN_PASSWORD) w env i zrestartuj usługę.');
  }
}

// ── Seed plans ──────────────────────────────────────────
const planCount = db.prepare('SELECT COUNT(*) as c FROM plans_config').get().c;
if (planCount === 0) {
  const ins = db.prepare('INSERT INTO plans_config (key, name, max_employees, max_users, max_profiles, price_pln, price_pln_yearly, sort_order) VALUES (?,?,?,?,?,?,?,?)');
  ins.run('starter', 'Starter', 40, 3, 1, 99, 990, 1);
  ins.run('business', 'Business', 200, 15, 5, 249, 2490, 2);
  ins.run('enterprise', 'Enterprise', 1000, 0, 20, 499, 4990, 3);
}

try { db.exec("UPDATE plans_config SET max_users=0 WHERE key='enterprise' AND max_users=50"); } catch {}
try { db.exec("UPDATE plans_config SET max_employees=40 WHERE key='starter' AND max_employees=25"); } catch {}
try { db.exec("UPDATE plans_config SET max_employees=200 WHERE key='business' AND max_employees=100"); } catch {}
try { db.exec("UPDATE plans_config SET max_employees=1000 WHERE key='enterprise' AND max_employees=500"); } catch {}
try { db.exec("UPDATE plans_config SET max_users=15 WHERE key='business' AND max_users=10"); } catch {}
try { db.exec("UPDATE plans_config SET max_profiles=5 WHERE key='business' AND max_profiles=3"); } catch {}
try { db.exec("UPDATE plans_config SET max_profiles=20 WHERE key='enterprise' AND max_profiles=10"); } catch {}
try { db.exec("UPDATE plans_config SET price_pln=99 WHERE key='starter' AND price_pln=79"); } catch {}
try { db.exec("UPDATE plans_config SET price_pln_yearly=990 WHERE key='starter' AND price_pln_yearly=758"); } catch {}
try { db.exec("UPDATE plans_config SET price_pln=249 WHERE key='business' AND price_pln=199"); } catch {}
try { db.exec("UPDATE plans_config SET price_pln_yearly=2490 WHERE key='business' AND price_pln_yearly=1910"); } catch {}
try { db.exec("UPDATE plans_config SET price_pln=499 WHERE key='enterprise' AND price_pln=399"); } catch {}
try { db.exec("UPDATE plans_config SET price_pln_yearly=4990 WHERE key='enterprise' AND price_pln_yearly=3830"); } catch {}

// ── Ensure new columns exist (migrations) ───────────────
try { db.exec('ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE users ADD COLUMN verify_token TEXT DEFAULT ""'); } catch {}
try { db.exec("ALTER TABLE profiles ADD COLUMN product TEXT NOT NULL DEFAULT 'shiftplanner'"); } catch {}
try { db.exec("UPDATE profiles SET product='shiftplanner' WHERE product IS NULL OR product=''"); } catch {}
try { db.exec('ALTER TABLE tenants ADD COLUMN allow_without_card INTEGER DEFAULT 0'); } catch {}

// ── Prepared statements ─────────────────────────────────
const stmt = {
  getUserById: db.prepare('SELECT u.*, t.company_name, t.plan, t.trial_ends_at, t.subscription_status, t.stripe_customer_id, t.products, t.max_profiles, t.allow_without_card FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id=?'),
  getUserByEmail: db.prepare('SELECT u.*, t.company_name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.email=?'),
  getUserIdByEmail: db.prepare('SELECT id FROM users WHERE email=?'),
  getSuperAdminById: db.prepare('SELECT * FROM super_admins WHERE id=?'),
  getSuperAdminByEmail: db.prepare('SELECT * FROM super_admins WHERE email=?'),
  getSettingByKey: db.prepare('SELECT value FROM settings WHERE key=?'),
  upsertSetting: db.prepare('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'),
  getTenantById: db.prepare('SELECT * FROM tenants WHERE id=?'),
  getPlanConfigByKey: db.prepare('SELECT * FROM plans_config WHERE key=?'),
  updatePlanStripeIds: db.prepare('UPDATE plans_config SET stripe_price_id=?, stripe_price_id_yearly=? WHERE key=?'),
  getUsersByTenant: db.prepare('SELECT id, email, name, role, email_verified, created_at FROM users WHERE tenant_id=?'),
  getProfileByIdAndTenant: db.prepare('SELECT id FROM profiles WHERE id=? AND tenant_id=?'),
  countProfileAssignments: db.prepare('SELECT COUNT(*) as c FROM profile_users WHERE profile_id=?'),
  hasProfileUser: db.prepare('SELECT 1 as ok FROM profile_users WHERE profile_id=? AND user_id=?'),
  rateLimitCleanup: db.prepare('DELETE FROM rate_limits WHERE ts < ?'),
  rateLimitCount: db.prepare('SELECT COUNT(*) as c FROM rate_limits WHERE ip=? AND action=?'),
  rateLimitInsert: db.prepare('INSERT INTO rate_limits (ip, action, ts) VALUES (?,?,?)'),
  getUserByVerifyToken: db.prepare('SELECT * FROM users WHERE verify_token=?'),
};

// ── Helpers ─────────────────────────────────────────────
function loadPlans() {
  const rows = db.prepare('SELECT * FROM plans_config WHERE active=1 ORDER BY sort_order').all();
  const plans = {};
  for (const r of rows) {
    plans[r.key] = { name: r.name, maxEmployees: r.max_employees, maxUsers: r.max_users, maxProfiles: r.max_profiles, pricePLN: r.price_pln, pricePLNYearly: r.price_pln_yearly, stripePriceId: r.stripe_price_id || '', stripePriceIdYearly: r.stripe_price_id_yearly || '' };
  }
  return plans;
}
let PLANS_CACHE = loadPlans();
function getPlans() { return PLANS_CACHE; }
function reloadPlans() { PLANS_CACHE = loadPlans(); }

function getBundleDiscounts() {
  const d2 = Number(stmt.getSettingByKey.get('bundle_discount_two')?.value || 10);
  const d3 = Number(stmt.getSettingByKey.get('bundle_discount')?.value || BUNDLE_DISCOUNT);
  return {
    two: Math.max(0, Math.min(90, Number.isFinite(d2) ? d2 : 10)),
    three: Math.max(0, Math.min(90, Number.isFinite(d3) ? d3 : BUNDLE_DISCOUNT)),
  };
}

function calculatePlanTotal(planConfig, interval, productCount) {
  const count = Math.max(1, Math.min(3, Number(productCount || 1)));
  const base = interval === 'yearly' ? Number(planConfig.pricePLNYearly || 0) : Number(planConfig.pricePLN || 0);
  const discounts = getBundleDiscounts();
  const discountPercent = count >= 3 ? discounts.three : count === 2 ? discounts.two : 0;
  const gross = base * count;
  const net = Math.max(1, Math.round(gross * (1 - discountPercent / 100)));
  return { count, discountPercent, gross, totalPLN: net };
}

function addDaysISO(iso, days) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getTenantAccess(tenant) {
  const now = new Date().toISOString().slice(0, 10);
  const trialActive = tenant.subscription_status === 'trialing' && tenant.trial_ends_at >= now;
  const subActive = ['active', 'trialing', 'cancel_pending'].includes(tenant.subscription_status);
  const allowWithoutCard = Number(tenant.allow_without_card || 0) === 1;
  const needsCardForTrial = REQUIRE_CARD_FOR_TRIAL
    && tenant.subscription_status === 'trialing'
    && !allowWithoutCard
    && !(tenant.stripe_customer_id || '').trim();
  const blockedByStatus = ['past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired'].includes(tenant.subscription_status);
  const hasAccess = !blockedByStatus && (trialActive || subActive) && !needsCardForTrial;
  const plans = getPlans();
  const plan = plans[tenant.plan] || plans.starter || { name: 'Trial', maxEmployees: 40, maxUsers: 3, maxProfiles: 1 };
  const daysLeft = trialActive && tenant.subscription_status === 'trialing'
    ? Math.max(0, Math.ceil((new Date(tenant.trial_ends_at + 'T00:00:00').getTime() - Date.now()) / 86400000))
    : null;
  return { hasAccess, requiresPaymentMethod: needsCardForTrial, plan, trialActive, subActive, daysLeft, subscriptionStatus: tenant.subscription_status };
}

function checkRateLimit(ip, action, max, windowSec) {
  const cutoff = Math.floor(Date.now() / 1000) - windowSec;
  stmt.rateLimitCleanup.run(cutoff);
  const c = stmt.rateLimitCount.get(ip, action).c;
  if (c >= max) return false;
  stmt.rateLimitInsert.run(ip, action, Math.floor(Date.now() / 1000));
  return true;
}

function getStripe() {
  const dbKey = stmt.getSettingByKey.get('stripe_secret_key');
  if (dbKey?.value && !dbKey.value.includes('•')) return new Stripe(dbKey.value);
  return stripe;
}

async function ensurePlanStripePrices(planKey) {
  const si = getStripe();
  if (!si) return null;

  const row = stmt.getPlanConfigByKey.get(planKey);
  if (!row) return null;

  const productSettingKey = `stripe_product_${row.key}`;
  let productId = stmt.getSettingByKey.get(productSettingKey)?.value || '';

  if (productId) {
    try {
      await si.products.retrieve(productId);
    } catch {
      productId = '';
    }
  }

  if (!productId) {
    const product = await si.products.create({
      name: `OneHost ${row.name}`,
      metadata: { plan_key: row.key },
    });
    productId = product.id;
    stmt.upsertSetting.run(productSettingKey, productId);
  }

  const ensurePrice = async (existingId, amountPLN, interval) => {
    const amount = Math.max(1, Math.round(Number(amountPLN || 0) * 100));
    if (existingId) {
      try {
        const existing = await si.prices.retrieve(existingId);
        if (
          existing?.active
          && existing.currency === 'pln'
          && existing.unit_amount === amount
          && existing.recurring?.interval === interval
        ) {
          return existingId;
        }
      } catch {}
    }

    const created = await si.prices.create({
      currency: 'pln',
      unit_amount: amount,
      recurring: { interval },
      product: productId,
      nickname: `${row.name} ${interval === 'month' ? 'miesięczny' : 'roczny'}`,
      metadata: { plan_key: row.key, interval },
    });
    return created.id;
  };

  const monthlyId = await ensurePrice(row.stripe_price_id || '', row.price_pln, 'month');
  const yearlyId = await ensurePrice(row.stripe_price_id_yearly || '', row.price_pln_yearly, 'year');

  if (monthlyId !== (row.stripe_price_id || '') || yearlyId !== (row.stripe_price_id_yearly || '')) {
    stmt.updatePlanStripeIds.run(monthlyId, yearlyId, row.key);
  }

  return { monthlyId, yearlyId };
}

function purgeTenantExternalData(tenantId) {
  const targets = [
    path.join(__dirname, '..', '..', 'Equipment Managment', 'server', 'data', String(tenantId)),
  ];

  const report = [];
  for (const target of targets) {
    try {
      const existed = fs.existsSync(target);
      fs.rmSync(target, { recursive: true, force: true });
      report.push({ path: target, existed, removed: true });
    } catch (err) {
      report.push({ path: target, existed: true, removed: false, error: err.message });
    }
  }

  return report;
}

// ── Email helper ────────────────────────────────────────
let _cachedTransporter = null;
let _cachedSmtpSignature = '';

function getMailTransporter() {
  const host = stmt.getSettingByKey.get('smtp_host')?.value;
  const portRaw = stmt.getSettingByKey.get('smtp_port')?.value || '587';
  const port = parseInt(portRaw) || 587;
  const user = stmt.getSettingByKey.get('smtp_user')?.value;
  const pass = stmt.getSettingByKey.get('smtp_pass')?.value;
  if (!host || !user || !pass) return null;

  const secureSetting = String(stmt.getSettingByKey.get('smtp_secure')?.value || '').toLowerCase();
  const secure = secureSetting ? ['1', 'true', 'yes'].includes(secureSetting) : port === 465;

  // Cache transport — recreate only when config changes
  const sig = `${host}:${port}:${user}:${pass}:${secure}`;
  if (_cachedTransporter && _cachedSmtpSignature === sig) return _cachedTransporter;

  _cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    requireTLS: !secure && port !== 25,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    pool: false,
    logger: false,
    debug: false,
  });
  _cachedSmtpSignature = sig;
  console.log(`[Mail] SMTP transport created: ${host}:${port} secure=${secure} requireTLS=${!secure && port !== 25}`);
  return _cachedTransporter;
}

async function sendMailDetailed(to, subject, html) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn('[Mail] SMTP not configured — set smtp_host, smtp_user, smtp_pass in Admin > Ustawienia');
    return { ok: false, error: 'SMTP nie skonfigurowany. Ustaw dane SMTP w panelu admina (Ustawienia > SMTP).' };
  }

  const from = stmt.getSettingByKey.get('smtp_from')?.value || stmt.getSettingByKey.get('smtp_user')?.value || 'noreply@onehost.site';
  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    console.log(`[Mail] Sent "${subject}" to ${to} (messageId: ${info.messageId || '-'})`);
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    // Invalidate cached transport on auth/connection errors so next attempt re-creates it
    if (err.code === 'EAUTH' || err.code === 'ESOCKET' || err.code === 'ECONNECTION' || err.code === 'ETIMEDOUT') {
      _cachedTransporter = null;
      _cachedSmtpSignature = '';
    }
    console.error(`[Mail] Error sending to ${to}:`, err.code || '', err.message);
    return { ok: false, error: `${err.code || 'SMTP_ERROR'}: ${err.message}` };
  }
}

async function sendMail(to, subject, html) {
  const result = await sendMailDetailed(to, subject, html);
  return result.ok;
}

function emailTemplate(title, body) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;background:#f1f5f9}
.wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.06)}
.hdr{background:linear-gradient(135deg,#0d9488,#06b6d4);padding:24px 32px;color:#fff}
.hdr h1{margin:0;font-size:20px;font-weight:700}
.body{padding:28px 32px;color:#334155;font-size:14px;line-height:1.6}
.btn{display:inline-block;background:#0d9488;color:#fff!important;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;margin:16px 0}
.ftr{padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}</style></head>
<body><div class="wrap"><div class="hdr"><h1>${title}</h1></div><div class="body">${body}</div><div class="ftr">OneHost — sklep.onehost.site</div></div></body></html>`;
}

// ── Express ─────────────────────────────────────────────
const app = express();

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// CORS — restrict to allowed origins in production
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || [
  'https://sklep.onehost.site',
  'https://shiftplanner.onehost.site',
  'https://em.onehost.site',
  'https://certtrack.onehost.site',
  'http://127.0.0.1:55',
  'http://127.0.0.1:57',
  'http://127.0.0.1:59',
  'http://127.0.0.1:61',
].join(',')).split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) cb(null, true);
    else cb(null, false);
  },
  credentials: true,
}));

app.use(express.json());

// ── Auth middleware ──────────────────────────────────────
function auth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET);
    const user = stmt.getUserById.get(payload.userId);
    if (!user) return res.status(401).json({ error: 'user_not_found' });
    req.user = user;
    req.tenantId = user.tenant_id;
    const access = getTenantAccess(user);
    if (access.requiresPaymentMethod) {
      return res.status(402).json({
        error: 'payment_method_required',
        message: 'Aby korzystać z okresu próbnego, dodaj kartę płatniczą w panelu rozliczeń.',
      });
    }
    if (!access.hasAccess) return res.status(403).json({ error: 'subscription_expired' });
    req.access = access;
    next();
  } catch { return res.status(401).json({ error: 'invalid_token' }); }
}

function authLight(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET);
    const user = stmt.getUserById.get(payload.userId);
    if (!user) return res.status(401).json({ error: 'user_not_found' });
    req.user = user;
    req.tenantId = user.tenant_id;
    req.access = getTenantAccess(user);
    next();
  } catch { return res.status(401).json({ error: 'invalid_token' }); }
}

function superAuth(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(h.slice(7), JWT_SECRET);
    if (!payload.superAdmin) return res.status(403).json({ error: 'not_super_admin' });
    const admin = stmt.getSuperAdminById.get(payload.adminId);
    if (!admin) return res.status(401).json({ error: 'admin_not_found' });
    req.admin = admin;
    next();
  } catch { return res.status(401).json({ error: 'invalid_token' }); }
}

// ── Auth routes ─────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'register', 5, 3600)) return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj za godzinę.' });

  const { email, password, name, company_name } = req.body;
  if (!email || !password || !company_name) return res.status(400).json({ error: 'Wypełnij wszystkie pola' });
  if (password.length < 6) return res.status(400).json({ error: 'Hasło musi mieć min. 6 znaków' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Nieprawidłowy email' });

  const existing = stmt.getUserIdByEmail.get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Ten email jest już zarejestrowany' });

  const hash = bcrypt.hashSync(password, 10);
  const trialEnds = addDaysISO(new Date().toISOString().slice(0, 10), TRIAL_DAYS);
  const verifyToken = crypto.randomBytes(32).toString('hex');

  const tenantResult = db.prepare('INSERT INTO tenants (company_name, plan, trial_ends_at, subscription_status) VALUES (?,?,?,?)')
    .run(company_name.trim(), 'trial', trialEnds, 'trialing');
  const tenantId = tenantResult.lastInsertRowid;

  const userResult = db.prepare('INSERT INTO users (tenant_id, email, password_hash, name, role, email_verified, verify_token) VALUES (?,?,?,?,?,0,?)')
    .run(tenantId, email.toLowerCase().trim(), hash, name || '', 'admin', verifyToken);

  // Send verification email
  const verifyUrl = `${req.headers.origin || ONEHOST_PUBLIC_URL}/verify?token=${verifyToken}`;
  sendMail(email.toLowerCase().trim(), 'Potwierdź adres email — OneHost',
    emailTemplate('Potwierdź swój email', `<p>Cześć${name ? ` ${name}` : ''}!</p>
    <p>Dziękujemy za rejestrację w OneHost. Kliknij poniższy przycisk, aby potwierdzić swój adres email:</p>
    <a class="btn" href="${verifyUrl}">Potwierdź email</a>
    <p style="font-size:12px;color:#94a3b8;margin-top:16px">Jeśli nie zakładałeś konta w OneHost, zignoruj tę wiadomość.</p>`)
  ).catch(() => {});

  const token = jwt.sign({ userId: userResult.lastInsertRowid, tenantId }, JWT_SECRET, { expiresIn: '30d' });
  const user = stmt.getUserById.get(userResult.lastInsertRowid);

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, company_name: user.company_name, emailVerified: false },
    subscription: { ...getTenantAccess(user), plan: 'trial', status: 'trialing', trialEndsAt: trialEnds },
    message: 'Konto utworzone! Sprawdź email w celu weryfikacji.',
  });
});

// ── Email verification ──────────────────────────────────
app.get('/api/auth/verify-email', (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Brak tokena' });
  const user = stmt.getUserByVerifyToken.get(token);
  if (!user) return res.status(400).json({ error: 'Nieprawidłowy lub wygasły token' });
  db.prepare('UPDATE users SET email_verified=1, verify_token="" WHERE id=?').run(user.id);
  res.json({ ok: true, message: 'Email zweryfikowany pomyślnie!' });
});

app.post('/api/auth/resend-verification', authLight, (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'resend_verify', 3, 3600)) return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj ponownie za godzinę.' });
  if (req.user.email_verified) return res.json({ ok: true, message: 'Email jest już zweryfikowany.' });
  const verifyToken = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE users SET verify_token=? WHERE id=?').run(verifyToken, req.user.id);
  const verifyUrl = `${req.headers.origin || ONEHOST_PUBLIC_URL}/verify?token=${verifyToken}`;
  sendMail(req.user.email, 'Potwierdź adres email — OneHost',
    emailTemplate('Potwierdź swój email', `<p>Kliknij poniższy przycisk, aby potwierdzić swój adres email:</p>
    <a class="btn" href="${verifyUrl}">Potwierdź email</a>`)
  ).catch(() => {});
  res.json({ ok: true, message: 'Email weryfikacyjny wysłany ponownie.' });
});

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'login', 10, 900)) return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj za 15 min.' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Podaj email i hasło' });

  const user = stmt.getUserByEmail.get(email.toLowerCase().trim());
  if (!user) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });
  if (!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Nieprawidłowy email lub hasło' });

  const token = jwt.sign({ userId: user.id, tenantId: user.tenant_id }, JWT_SECRET, { expiresIn: '30d' });
  const fullUser = stmt.getUserById.get(user.id);

  res.json({
    token,
    user: { id: fullUser.id, email: fullUser.email, name: fullUser.name, role: fullUser.role, company_name: fullUser.company_name, emailVerified: !!fullUser.email_verified },
    subscription: {
      ...getTenantAccess(fullUser),
      plan: fullUser.plan || 'trial',
      planDetails: getTenantAccess(fullUser).plan,
      status: fullUser.subscription_status,
      trialEndsAt: fullUser.trial_ends_at,
    },
  });
});

app.get('/api/auth/me', authLight, (req, res) => {
  const u = req.user;
  res.json({
    user: { id: u.id, email: u.email, name: u.name, role: u.role, company_name: u.company_name, emailVerified: !!u.email_verified },
    subscription: {
      ...req.access,
      plan: u.plan || 'trial',
      planDetails: req.access.plan,
      status: u.subscription_status,
      trialEndsAt: u.trial_ends_at,
      products: (u.products || 'shiftplanner,equipment,certtrack').split(','),
      maxProfiles: u.max_profiles || 1,
    },
  });
});

// ── Token validation endpoint for child apps ────────────
app.post('/api/auth/validate', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ valid: false });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = stmt.getUserById.get(payload.userId);
    if (!user) return res.json({ valid: false });
    const access = getTenantAccess(user);
    const assignedProfiles = db.prepare(`
      SELECT p.id, p.name, p.product, p.created_at
      FROM profiles p
      JOIN profile_users pu ON pu.profile_id = p.id
      WHERE p.tenant_id = ? AND pu.user_id = ?
      ORDER BY p.created_at
    `).all(user.tenant_id, user.id);
    res.json({
      valid: true,
      hasAccess: access.hasAccess,
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id, company_name: user.company_name },
      subscription: { plan: user.plan, status: user.subscription_status, products: (user.products || '').split(','), maxProfiles: access.plan.maxProfiles || 1, maxEmployees: access.plan.maxEmployees || 40 },
      assignedProfiles,
    });
  } catch { res.json({ valid: false }); }
});

// ── Users (tenant-scoped) ───────────────────────────────
app.get('/api/users', auth, (req, res) => {
  res.json(stmt.getUsersByTenant.all(req.tenantId));
});

app.post('/api/users', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin może dodawać użytkowników' });

  const { email, name, role } = req.body;
  if (!email) return res.status(400).json({ error: 'Email jest wymagany' });
  const existing = stmt.getUserIdByEmail.get(email.toLowerCase().trim());
  if (existing) return res.status(400).json({ error: 'Ten email jest już zarejestrowany' });

  const tempPassword = crypto.randomBytes(6).toString('hex');
  const hash = bcrypt.hashSync(tempPassword, 10);
  const r = db.prepare('INSERT INTO users (tenant_id, email, password_hash, name, role) VALUES (?,?,?,?,?)')
    .run(req.tenantId, email.toLowerCase().trim(), hash, name || '', role || 'viewer');

  res.json({ id: r.lastInsertRowid, tempPassword });
});

app.delete('/api/users/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Nie możesz usunąć siebie' });
  db.prepare('DELETE FROM users WHERE id=? AND tenant_id=?').run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

app.post('/api/users/:id/reset-password', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin może resetować hasła' });
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) return res.status(400).json({ error: 'Nieprawidłowe ID użytkownika' });

  const target = db.prepare('SELECT id, tenant_id, email FROM users WHERE id=? AND tenant_id=?').get(userId, req.tenantId);
  if (!target) return res.status(404).json({ error: 'Użytkownik nie istnieje' });

  const tempPassword = crypto.randomBytes(6).toString('hex');
  const hash = bcrypt.hashSync(tempPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=? AND tenant_id=?').run(hash, userId, req.tenantId);

  res.json({ ok: true, userId, email: target.email, tempPassword });
});

// ── Announcements (user-facing) ─────────────────────────
app.get('/api/announcements', authLight, (req, res) => {
  const all = db.prepare('SELECT * FROM announcements WHERE active=1 ORDER BY created_at DESC').all();
  const dismissed = db.prepare('SELECT announcement_id, action FROM announcement_dismissals WHERE user_id=?').all(req.user.id);
  const dismissedMap = {};
  for (const d of dismissed) dismissedMap[d.announcement_id] = d.action;

  const userPlan = req.user.plan || 'trial';
  const userProducts = (req.user.products || 'shiftplanner,equipment,certtrack').split(',');

  const filtered = all.filter(a => {
    if (dismissedMap[a.id]) return false;
    if (a.target_plans && !a.target_plans.split(',').includes(userPlan) && !a.target_plans.split(',').includes('all')) return false;
    if (a.target_products) {
      const tp = a.target_products.split(',');
      if (!tp.includes('all') && !tp.some(p => userProducts.includes(p))) return false;
    }
    return true;
  });

  res.json(filtered.map(a => ({
    id: a.id, title: a.title, message: a.message, type: a.type,
    requiresAction: !!a.requires_action, actionType: a.action_type, createdAt: a.created_at,
  })));
});

app.post('/api/announcements/:id/dismiss', authLight, (req, res) => {
  const { action } = req.body; // 'dismissed', 'accepted', 'canceled'
  db.prepare('INSERT OR REPLACE INTO announcement_dismissals (user_id, announcement_id, action) VALUES (?,?,?)')
    .run(req.user.id, req.params.id, action || 'dismissed');
  res.json({ ok: true });
});

// ── Subscription management ─────────────────────────────
app.post('/api/billing/cancel', authLight, async (req, res) => {
  const tenant = stmt.getTenantById.get(req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany' });

  let subscriptionId = tenant.stripe_subscription_id || '';
  if (!subscriptionId && tenant.stripe_customer_id) {
    try {
      const subs = await si.subscriptions.list({ customer: tenant.stripe_customer_id, status: 'all', limit: 10 });
      const activeSub = subs.data.find(s => ['trialing', 'active', 'past_due', 'unpaid'].includes(s.status));
      if (activeSub) {
        subscriptionId = activeSub.id;
        db.prepare('UPDATE tenants SET stripe_subscription_id=? WHERE id=?').run(subscriptionId, req.tenantId);
      }
    } catch (err) {
      return res.status(500).json({ error: 'Nie udało się odnaleźć subskrypcji: ' + err.message });
    }
  }

  if (!subscriptionId) return res.status(400).json({ error: 'Brak aktywnej subskrypcji do anulowania' });

  try {
    await si.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Nie udało się anulować subskrypcji w Stripe: ' + err.message });
  }

  db.prepare('UPDATE tenants SET subscription_status=? WHERE id=?').run('cancel_pending', req.tenantId);

  sendMail(req.user.email, 'Subskrypcja anulowana — OneHost',
    emailTemplate('Subskrypcja anulowana', `<p>Twoja subskrypcja OneHost została anulowana.</p>
    <p>Dostęp do usług będzie aktywny do końca bieżącego okresu rozliczeniowego. Po tym czasie konto przejdzie w tryb nieaktywny.</p>
    <p>Jeśli zmienisz zdanie, możesz reaktywować subskrypcję w panelu rozliczeniowym.</p>`)
  ).catch(() => {});

  res.json({ ok: true, message: 'Subskrypcja zostanie anulowana na koniec okresu rozliczeniowego.' });
});

app.post('/api/billing/reactivate', authLight, async (req, res) => {
  const tenant = stmt.getTenantById.get(req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany' });
  if (!tenant.stripe_subscription_id) return res.status(400).json({ error: 'Brak subskrypcji do reaktywacji' });

  try {
    await si.subscriptions.update(tenant.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Nie udało się reaktywować subskrypcji w Stripe: ' + err.message });
  }

  db.prepare('UPDATE tenants SET subscription_status=? WHERE id=?').run('active', req.tenantId);
  res.json({ ok: true, message: 'Subskrypcja reaktywowana!' });
});

// ── Profiles / databases management ─────────────────────
app.get('/api/profiles', auth, (req, res) => {
  const profiles = db.prepare('SELECT * FROM profiles WHERE tenant_id=? ORDER BY created_at').all(req.tenantId);
  const result = profiles.map(p => {
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.role FROM profile_users pu
      JOIN users u ON pu.user_id = u.id
      WHERE pu.profile_id=?
    `).all(p.id);
    return { ...p, users };
  });
  res.json(result);
});

app.post('/api/profiles', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  const { name, product } = req.body;
  if (!name) return res.status(400).json({ error: 'Nazwa profilu jest wymagana' });
  const validProducts = ['shiftplanner', 'equipment', 'certtrack'];
  if (product && !validProducts.includes(product)) return res.status(400).json({ error: 'Nieprawidłowy produkt' });

  // Limit profili jest PER APP (na każdą aplikację osobno)
  const prod = product || 'shiftplanner';
  const count = db.prepare('SELECT COUNT(*) as c FROM profiles WHERE tenant_id=? AND product=?').get(req.tenantId, prod).c;
  const maxProfiles = Number(req.user?.max_profiles || req.access?.plan?.maxProfiles || 1);
  if (count >= maxProfiles) return res.status(403).json({ error: `Limit profili dla ${prod}: ${maxProfiles} na aplikację. Zmień plan.` });

  const r = db.prepare('INSERT INTO profiles (tenant_id, name, product) VALUES (?,?,?)').run(req.tenantId, name.trim(), prod);
  // Auto-assign admin
  db.prepare('INSERT INTO profile_users (profile_id, user_id) VALUES (?,?)').run(r.lastInsertRowid, req.user.id);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/profiles/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Nazwa jest wymagana' });
  db.prepare('UPDATE profiles SET name=? WHERE id=? AND tenant_id=?').run(name.trim(), req.params.id, req.tenantId);
  res.json({ ok: true });
});

app.delete('/api/profiles/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  db.prepare('DELETE FROM profiles WHERE id=? AND tenant_id=?').run(req.params.id, req.tenantId);
  res.json({ ok: true });
});

app.post('/api/profiles/:id/users', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  const profileId = Number(req.params.id);
  if (!Number.isInteger(profileId) || profileId <= 0) return res.status(400).json({ error: 'Nieprawidłowy profil' });

  const profile = stmt.getProfileByIdAndTenant.get(profileId, req.tenantId);
  if (!profile) return res.status(404).json({ error: 'Profil nie znaleziony' });

  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId wymagany' });
  // Verify user belongs to same tenant
  const u = db.prepare('SELECT * FROM users WHERE id=? AND tenant_id=?').get(userId, req.tenantId);
  if (!u) return res.status(404).json({ error: 'Użytkownik nie znaleziony' });

  const existingAssignment = stmt.hasProfileUser.get(profileId, userId);
  if (existingAssignment) return res.json({ ok: true });

  const maxAssignments = Number(req.access?.plan?.maxUsers || 0);
  if (maxAssignments > 0) {
    const assigned = stmt.countProfileAssignments.get(profileId).c;
    if (assigned >= maxAssignments) {
      return res.status(403).json({ error: `Limit przypisań użytkowników do profilu: ${maxAssignments}. Zmień plan.` });
    }
  }

  try {
    db.prepare('INSERT INTO profile_users (profile_id, user_id) VALUES (?,?)').run(profileId, userId);
  } catch {} // ignore if already exists
  res.json({ ok: true });
});

app.delete('/api/profiles/:id/users/:userId', auth, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Tylko admin' });
  db.prepare('DELETE FROM profile_users WHERE profile_id=? AND user_id=?').run(req.params.id, req.params.userId);
  res.json({ ok: true });
});

// ── Billing ─────────────────────────────────────────────
app.get('/api/billing/plans', (req, res) => {
  const plans = getPlans();
  const discounts = getBundleDiscounts();
  res.json(Object.entries(plans).map(([key, p]) => ({
    key, name: p.name, maxEmployees: p.maxEmployees, maxUsers: p.maxUsers, maxProfiles: p.maxProfiles,
    pricePLN: p.pricePLN, pricePLNYearly: p.pricePLNYearly,
    bundleDiscountTwo: discounts.two,
    bundleDiscountThree: discounts.three,
  })));
});

app.post('/api/billing/checkout', authLight, async (req, res) => {
  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany. Ustaw klucz w panelu admina.' });

  const { plan, interval, products, bundle } = req.body;
  const isYearly = interval === 'yearly';
  const plans = getPlans();
  const planConfig = plans[plan];
  if (!planConfig) return res.status(400).json({ error: 'Nieprawidłowy plan' });

  const selectedProducts = Array.isArray(products)
    ? Array.from(new Set(products.filter(p => ['shiftplanner', 'equipment', 'certtrack'].includes(p))))
    : [];
  const productCount = Math.max(1, selectedProducts.length || 1);
  const pricing = calculatePlanTotal(planConfig, isYearly ? 'yearly' : 'monthly', productCount);

  const productList = (selectedProducts.length ? selectedProducts : ['shiftplanner']).join(',');
  const tenant = stmt.getTenantById.get(req.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  if (tenant.stripe_subscription_id) {
    try {
      const existingSub = await si.subscriptions.retrieve(tenant.stripe_subscription_id);
      if (existingSub && ['active', 'trialing', 'past_due', 'unpaid'].includes(existingSub.status) && !existingSub.cancel_at_period_end) {
        if (tenant.stripe_customer_id) {
          const portal = await si.billingPortal.sessions.create({
            customer: tenant.stripe_customer_id,
            return_url: `${req.headers.origin || ONEHOST_PUBLIC_URL}/billing`,
          });
          return res.status(409).json({
            error: 'Masz już aktywną subskrypcję. Zmień plan w portalu Stripe, aby uniknąć podwójnych obciążeń.',
            portalUrl: portal.url,
          });
        }
        return res.status(409).json({ error: 'Masz już aktywną subskrypcję. Użyj portalu rozliczeń Stripe.' });
      }
    } catch {}
  }

  try {
    const pmSetting = stmt.getSettingByKey.get('stripe_payment_methods');
    const paymentMethods = (pmSetting?.value || 'card').split(',').map(m => m.trim()).filter(Boolean);

    const sessionOpts = {
      mode: 'subscription',
      payment_method_types: paymentMethods,
      line_items: [{
        price_data: {
          currency: 'pln',
          unit_amount: Math.round(pricing.totalPLN * 100),
          recurring: { interval: isYearly ? 'year' : 'month' },
          product_data: {
            name: `OneHost ${planConfig.name} (${pricing.count} ${pricing.count === 1 ? 'produkt' : pricing.count < 5 ? 'produkty' : 'produktów'})`,
            metadata: { plan, products: productList, product_count: String(pricing.count), discount_percent: String(pricing.discountPercent) },
          },
        },
        quantity: 1,
      }],
      metadata: {
        tenant_id: String(req.tenantId),
        plan,
        products: productList,
        product_count: String(pricing.count),
        discount_percent: String(pricing.discountPercent),
        amount_pln: String(pricing.totalPLN),
        interval: isYearly ? 'yearly' : 'monthly',
        bundle: bundle ? '1' : '0',
      },
      success_url: `${req.headers.origin || ONEHOST_PUBLIC_URL}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin || ONEHOST_PUBLIC_URL}/billing?canceled=1`,
      customer_email: req.user.email,
    };
    if (tenant.stripe_customer_id) {
      sessionOpts.customer = tenant.stripe_customer_id;
      delete sessionOpts.customer_email;
    }

    const session = await si.checkout.sessions.create(sessionOpts);
    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] Checkout error:', err.message);
    res.status(500).json({ error: 'Błąd Stripe: ' + err.message });
  }
});

app.post('/api/billing/confirm', authLight, async (req, res) => {
  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany' });

  const { sessionId } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'Brak sessionId' });

  try {
    const session = await si.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    const tenantIdFromMeta = Number(session?.metadata?.tenant_id || 0);
    if (!tenantIdFromMeta || tenantIdFromMeta !== Number(req.tenantId)) {
      return res.status(403).json({ error: 'Session nie należy do tej firmy' });
    }

    if (session.mode !== 'subscription') return res.status(400).json({ error: 'Nieprawidłowy typ sesji' });
    if (session.status !== 'complete') return res.status(400).json({ error: 'Płatność nie jest zakończona' });

    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    if (!subscriptionId) return res.status(400).json({ error: 'Brak subskrypcji w sesji Stripe' });

    const sub = typeof session.subscription === 'object' && session.subscription
      ? session.subscription
      : await si.subscriptions.retrieve(subscriptionId);

    const subStatus = sub?.status || 'active';
    const mappedStatus = subStatus === 'trialing' ? 'trialing' : ['active', 'past_due', 'canceled', 'unpaid'].includes(subStatus) ? subStatus : 'active';

    const tenant = stmt.getTenantById.get(req.tenantId);
    if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

    db.prepare(`UPDATE tenants SET
      stripe_customer_id=?,
      stripe_subscription_id=?,
      subscription_status=?,
      plan=?,
      products=?
      WHERE id=?`).run(
      customerId || tenant.stripe_customer_id || '',
      subscriptionId,
      mappedStatus,
      session?.metadata?.plan || tenant.plan,
      session?.metadata?.products || tenant.products,
      req.tenantId
    );

    res.json({ ok: true, status: mappedStatus });
  } catch (err) {
    res.status(500).json({ error: 'Nie udało się potwierdzić płatności: ' + err.message });
  }
});

app.post('/api/billing/portal', authLight, async (req, res) => {
  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany' });
  const tenant = stmt.getTenantById.get(req.tenantId);
  if (!tenant?.stripe_customer_id) return res.status(400).json({ error: 'Brak aktywnej subskrypcji' });

  try {
    const session = await si.billingPortal.sessions.create({
      customer: tenant.stripe_customer_id,
      return_url: `${req.headers.origin || ONEHOST_PUBLIC_URL}/billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: 'Błąd portalu: ' + err.message });
  }
});

// ── Admin routes ────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_AUTH_READY) return res.status(503).json({ error: 'admin_auth_not_configured' });
  const ip = req.ip || 'unknown';
  if (!checkRateLimit(ip, 'admin_login', 5, 900)) return res.status(429).json({ error: 'Zbyt wiele prób. Spróbuj za 15 min.' });
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Podaj dane' });
  const admin = stmt.getSuperAdminByEmail.get(email.toLowerCase().trim());
  if (!admin) return res.status(401).json({ error: 'Nieprawidłowe dane' });
  if (!bcrypt.compareSync(password, admin.password_hash)) return res.status(401).json({ error: 'Nieprawidłowe dane' });

  const token = jwt.sign({ adminId: admin.id, superAdmin: true }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

app.get('/api/admin/tenants', superAuth, (req, res) => {
  res.json(db.prepare(`
    SELECT t.*,
      (
        SELECT u.email
        FROM users u
        WHERE u.tenant_id = t.id
        ORDER BY CASE WHEN u.role='admin' THEN 0 ELSE 1 END, u.created_at ASC
        LIMIT 1
      ) AS owner_email
    FROM tenants t
    ORDER BY t.created_at DESC
  `).all());
});

app.delete('/api/admin/tenants/:id', superAuth, (req, res) => {
  db.prepare('DELETE FROM tenants WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/tenants/:id/purge', superAuth, (req, res) => {
  const tenant = stmt.getTenantById.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  const externalCleanup = purgeTenantExternalData(req.params.id);
  db.prepare('DELETE FROM tenants WHERE id=?').run(req.params.id);

  res.json({
    ok: true,
    message: 'Firma i dane OneHost usunięte. Wykonano także próbę czyszczenia danych zewnętrznych.',
    externalCleanup,
  });
});

app.put('/api/admin/tenants/:id', superAuth, (req, res) => {
  const { plan, subscription_status, trial_ends_at, products, max_profiles, company_name, allow_without_card } = req.body;
  const tenant = db.prepare('SELECT * FROM tenants WHERE id=?').get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });
  db.prepare(`UPDATE tenants SET
    plan=?, subscription_status=?, trial_ends_at=?, products=?, max_profiles=?, company_name=?, allow_without_card=?
    WHERE id=?`).run(
    plan ?? tenant.plan,
    subscription_status ?? tenant.subscription_status,
    trial_ends_at ?? tenant.trial_ends_at,
    products ?? tenant.products,
    max_profiles ?? tenant.max_profiles,
    company_name ?? tenant.company_name,
    typeof allow_without_card === 'undefined' ? tenant.allow_without_card : (allow_without_card ? 1 : 0),
    req.params.id
  );
  res.json({ ok: true });
});

app.get('/api/admin/tenants/:id/billing', superAuth, async (req, res) => {
  const tenant = stmt.getTenantById.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  const si = getStripe();
  if (!si) {
    return res.json({
      stripeEnabled: false,
      customerId: tenant.stripe_customer_id || '',
      subscriptionId: tenant.stripe_subscription_id || '',
      subscriptionStatus: tenant.subscription_status,
      paymentMethods: [],
    });
  }

  try {
    let subscription = null;
    if (tenant.stripe_subscription_id) {
      try {
        subscription = await si.subscriptions.retrieve(tenant.stripe_subscription_id);
      } catch {}
    }

    let methods = [];
    if (tenant.stripe_customer_id) {
      const list = await si.paymentMethods.list({ customer: tenant.stripe_customer_id, type: 'card', limit: 10 });
      methods = list.data.map(pm => ({
        id: pm.id,
        brand: pm.card?.brand || 'card',
        last4: pm.card?.last4 || '----',
        exp_month: pm.card?.exp_month || null,
        exp_year: pm.card?.exp_year || null,
      }));
    }

    res.json({
      stripeEnabled: true,
      customerId: tenant.stripe_customer_id || '',
      subscriptionId: tenant.stripe_subscription_id || '',
      subscriptionStatus: subscription?.status || tenant.subscription_status,
      cancelAtPeriodEnd: !!subscription?.cancel_at_period_end,
      currentPeriodEnd: subscription?.current_period_end || null,
      paymentMethods: methods,
    });
  } catch (err) {
    res.status(500).json({ error: 'Błąd pobierania danych billingowych: ' + err.message });
  }
});

app.post('/api/admin/tenants/:id/billing/cancel', superAuth, async (req, res) => {
  const tenant = stmt.getTenantById.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany' });
  if (!tenant.stripe_subscription_id) return res.status(400).json({ error: 'Brak subskrypcji Stripe dla tej firmy' });

  try {
    const sub = await si.subscriptions.update(tenant.stripe_subscription_id, { cancel_at_period_end: true });
    db.prepare('UPDATE tenants SET subscription_status=? WHERE id=?').run('cancel_pending', req.params.id);
    res.json({ ok: true, status: sub.status, cancelAtPeriodEnd: !!sub.cancel_at_period_end });
  } catch (err) {
    res.status(500).json({ error: 'Błąd anulowania subskrypcji: ' + err.message });
  }
});

app.post('/api/admin/tenants/:id/billing/detach-cards', superAuth, async (req, res) => {
  const tenant = stmt.getTenantById.get(req.params.id);
  if (!tenant) return res.status(404).json({ error: 'Firma nie znaleziona' });

  const si = getStripe();
  if (!si) return res.status(400).json({ error: 'Stripe nie jest skonfigurowany' });
  if (!tenant.stripe_customer_id) return res.status(400).json({ error: 'Brak klienta Stripe dla tej firmy' });

  try {
    if (tenant.stripe_subscription_id) {
      let sub = null;
      try { sub = await si.subscriptions.retrieve(tenant.stripe_subscription_id); } catch {}
      if (sub && ['active', 'trialing', 'past_due', 'unpaid'].includes(sub.status) && !sub.cancel_at_period_end) {
        return res.status(400).json({ error: 'Najpierw anuluj subskrypcję. Aktywna subskrypcja wymaga metody płatności.' });
      }
    }

    const methods = await si.paymentMethods.list({ customer: tenant.stripe_customer_id, type: 'card', limit: 100 });
    for (const pm of methods.data) {
      try { await si.paymentMethods.detach(pm.id); } catch {}
    }

    try {
      await si.customers.update(tenant.stripe_customer_id, {
        invoice_settings: { default_payment_method: null },
      });
    } catch {}

    res.json({ ok: true, detached: methods.data.length });
  } catch (err) {
    res.status(500).json({ error: 'Błąd odpinania kart: ' + err.message });
  }
});

app.get('/api/admin/tenants/:id/users', superAuth, (req, res) => {
  res.json(db.prepare('SELECT id, email, name, role, email_verified, created_at FROM users WHERE tenant_id=? ORDER BY created_at').all(req.params.id));
});

app.get('/api/admin/plans', superAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM plans_config ORDER BY sort_order').all());
});

app.put('/api/admin/plans', superAuth, async (req, res) => {
  const plans = req.body;
  if (!Array.isArray(plans)) return res.status(400).json({ error: 'Invalid' });
  const upd = db.prepare('UPDATE plans_config SET name=?, max_employees=?, max_users=?, max_profiles=?, price_pln=?, price_pln_yearly=?, stripe_price_id=?, stripe_price_id_yearly=? WHERE key=?');
  for (const p of plans) {
    upd.run(p.name, p.max_employees, p.max_users, p.max_profiles || 1, p.price_pln, p.price_pln_yearly, p.stripe_price_id || '', p.stripe_price_id_yearly || '', p.key);
  }

  let autoGenerated = 0;
  if (getStripe()) {
    for (const p of plans) {
      try {
        await ensurePlanStripePrices(p.key);
        autoGenerated++;
      } catch (err) {
        console.error(`[Stripe] Auto-generate failed for ${p.key}:`, err.message);
      }
    }
  }

  reloadPlans();
  res.json({ ok: true, autoGenerated });
});

app.get('/api/admin/settings', superAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM settings').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  res.json(obj);
});

app.put('/api/admin/settings', superAuth, (req, res) => {
  const data = req.body;
  for (const [key, value] of Object.entries(data)) {
    if (key === 'stripe_secret_key' && value.includes('•')) continue;
    stmt.upsertSetting.run(key, String(value));
  }
  res.json({ ok: true });
});

app.get('/api/admin/stats', superAuth, (req, res) => {
  const totalTenants = db.prepare('SELECT COUNT(*) as c FROM tenants').get().c;
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const activeSubscriptions = db.prepare("SELECT COUNT(*) as c FROM tenants WHERE subscription_status='active'").get().c;
  const trialTenants = db.prepare("SELECT COUNT(*) as c FROM tenants WHERE subscription_status='trialing'").get().c;
  const byPlan = db.prepare('SELECT plan, COUNT(*) as count FROM tenants GROUP BY plan ORDER BY count DESC').all();

  res.json({ totalTenants, totalUsers, activeSubscriptions, trialTenants, byPlan });
});

// ── Admin test email ────────────────────────────────────
app.post('/api/admin/test-email', superAuth, async (req, res) => {
  const from = stmt.getSettingByKey.get('smtp_from')?.value || stmt.getSettingByKey.get('smtp_user')?.value;
  if (!from) return res.status(400).json({ error: 'Brak konfiguracji adresu nadawcy (SMTP From / User)' });

  const to = from.includes('<') ? from.match(/<(.+)>/)?.[1] || from : from;
  const result = await sendMailDetailed(to, 'OneHost — test email',
    emailTemplate('Test konfiguracji SMTP',
      `<p>Ten email potwierdza, że konfiguracja SMTP w panelu admina OneHost działa poprawnie.</p>
      <p>Data testu: ${new Date().toLocaleString('pl-PL')}</p>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px">Jeśli widzisz tę wiadomość, wysyłka maili (weryfikacja, powiadomienia, masowe wiadomości) będzie działać prawidłowo.</p>`)
  );

  if (result.ok) res.json({ ok: true });
  else res.status(500).json({ error: `Nie udało się wysłać emaila: ${result.error}` });
});

// ── Admin mass email ────────────────────────────────────
app.post('/api/admin/send-email', superAuth, async (req, res) => {
  const { subject, body, targetPlan, targetPlans, targetProducts } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'Podaj temat i treść' });

  // Support both targetPlan (single string from frontend) and targetPlans (array)
  const plans = targetPlans || (targetPlan ? [targetPlan] : []);

  let query = 'SELECT DISTINCT u.email, u.name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE 1=1';
  const params = [];

  if (plans.length > 0 && !plans.includes('all') && !plans.includes('')) {
    query += ` AND t.plan IN (${plans.map(() => '?').join(',')})`;
    params.push(...plans);
  }

  const users = db.prepare(query).all(...params);
  let sent = 0, failed = 0;

  for (const u of users) {
    if (targetProducts && targetProducts.length > 0 && !targetProducts.includes('all')) {
      // Filter by product usage — skip for now, send to all matching plan users
    }
    const ok = await sendMail(u.email, subject, emailTemplate(subject,
      `<p>Cześć${u.name ? ` ${u.name}` : ''}!</p>${body}<p style="font-size:12px;color:#94a3b8;margin-top:20px">Wiadomość wysłana automatycznie z OneHost.</p>`
    ));
    if (ok) sent++; else failed++;
  }

  res.json({ ok: true, sent, failed, total: users.length });
});

// ── Admin announcements ─────────────────────────────────
app.get('/api/admin/announcements', superAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM announcements ORDER BY created_at DESC').all());
});

app.post('/api/admin/announcements', superAuth, (req, res) => {
  const { title, message, type, targetPlans, targetProducts, requiresAction, actionType } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Tytuł i treść wymagane' });

  const r = db.prepare('INSERT INTO announcements (title, message, type, target_plans, target_products, requires_action, action_type) VALUES (?,?,?,?,?,?,?)')
    .run(title, message, type || 'info', (targetPlans || []).join(','), (targetProducts || []).join(','), requiresAction ? 1 : 0, actionType || '');

  // Optionally send email to all targeted users
  if (req.body.sendEmail) {
    let query = 'SELECT DISTINCT u.email, u.name FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE 1=1';
    const params = [];
    if (targetPlans && targetPlans.length > 0 && !targetPlans.includes('all')) {
      query += ` AND t.plan IN (${targetPlans.map(() => '?').join(',')})`;
      params.push(...targetPlans);
    }
    const users = db.prepare(query).all(...params);
    for (const u of users) {
      sendMail(u.email, `OneHost: ${title}`, emailTemplate(title,
        `<p>Cześć${u.name ? ` ${u.name}` : ''}!</p><p>${message}</p>`
      )).catch(() => {});
    }
  }

  res.json({ id: r.lastInsertRowid });
});

app.delete('/api/admin/announcements/:id', superAuth, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM announcement_dismissals WHERE announcement_id=?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/admin/announcements/:id/toggle', superAuth, (req, res) => {
  const a = db.prepare('SELECT active FROM announcements WHERE id=?').get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Nie znaleziono' });
  db.prepare('UPDATE announcements SET active=? WHERE id=?').run(a.active ? 0 : 1, req.params.id);
  res.json({ ok: true });
});

// ── Start ───────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[OneHost] Platform API running on http://localhost:${PORT}`);
});
