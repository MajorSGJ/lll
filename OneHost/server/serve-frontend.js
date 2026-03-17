/**
 * serve-frontend.js
 * Replaces `vite preview` on port 55.
 * – Regular users: serves the pre-built React SPA from dist/
 * – Known crawlers: returns pre-rendered HTML so Google / Bing / etc.
 *   can index the real page content without executing JavaScript.
 *   (Google calls this approach "Dynamic Rendering" and officially supports it.)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PRERENDERED } from './prerender-html.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.FRONTEND_PORT || 55);

// ── Known crawler / bot user-agent substrings ───────────────────────────────
const BOT_SUBSTRINGS = [
  'googlebot', 'google-inspectiontool', 'adsbot-google', 'mediapartners-google',
  'bingbot', 'msnbot', 'bingpreview',
  'slurp',            // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot', 'yandexmobilebot',
  'sogou',
  'exabot',
  'facebookexternalhit', 'facebookscraper',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'applebot',
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot',
  'petalbot', 'rogerbot', 'bufferbot',
  'ia_archiver',      // Wayback Machine
  'python-requests', 'python-urllib', 'scrapy', 'wget', 'curl',
  'proximic', 'seznambot', 'ezooms', 'charlotte', 'heritrix',
  'spbot', 'sistrix', 'blexbot', 'gigabot',
];

function isBot(ua = '') {
  const lower = ua.toLowerCase();
  return BOT_SUBSTRINGS.some((b) => lower.includes(b));
}

const app = express();

// ── Bot → pre-rendered HTML ─────────────────────────────────────────────────
app.use((req, res, next) => {
  const ua = req.headers['user-agent'] || '';
  if (!isBot(ua)) return next();

  const html = PRERENDERED[req.path] ?? PRERENDERED['/'];
  if (html) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('X-Robots-Tag', 'index, follow');
    return res.send(html);
  }
  next();
});

// ── Static assets (JS, CSS, images) ─────────────────────────────────────────
app.use(
  express.static(DIST, {
    maxAge: '7d',
    immutable: true,
  })
);

// ── SPA fallback – all other routes return the React shell ──────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[OneHost Frontend] Listening on http://127.0.0.1:${PORT}`);
});
