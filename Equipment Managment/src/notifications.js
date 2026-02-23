/**
 * Equipment Manager — Browser Notification Engine
 * Uses the Web Notifications API to send desktop alerts
 * about expiring equipment inspections.
 */

import { calcDaysLeft, getExpiryDate, formatDate } from './utils/dates';

let checkInterval = null;
let lastNotified = {}; // { itemId: timestamp } — avoid spamming

// ── Permission ──────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function getNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

// ── Send notification ───────────────────────────────────
function sendNotification(title, body, tag, icon = '🔧') {
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      tag, // prevents duplicates with same tag
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      requireInteraction: false,
      silent: false,
    });
    // Auto-close after 10 seconds
    setTimeout(() => n.close(), 10000);
  } catch (err) {
    console.warn('[Notifications] Failed to send:', err.message);
  }
}

// ── Throttle per item ───────────────────────────────────
function shouldNotify(itemId, throttleMs) {
  const now = Date.now();
  const last = lastNotified[itemId] || 0;
  if (now - last < throttleMs) return false;
  lastNotified[itemId] = now;
  return true;
}

// ── Check items & send alerts ───────────────────────────
export function checkAndNotify(items, settings) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!settings?.notificationsEnabled) return;

  const {
    notifyMonthsBefore = 2,
    dailyNotifyWeeksBefore = 2,
    hourlyNotifyOnLastDay = true,
  } = settings;

  const earlyThresholdDays = notifyMonthsBefore * 30;
  const dailyThresholdDays = dailyNotifyWeeksBefore * 7;

  for (const item of items) {
    if (!item.last_date || !item.interval_days) continue;

    const daysLeft = calcDaysLeft(item.last_date, item.interval_days);
    const expiryDate = getExpiryDate(item.last_date, item.interval_days);
    const expiryStr = formatDate(expiryDate.toISOString());
    const name = item.name || `Sprzęt #${item.id}`;

    // Expired
    if (daysLeft <= 0) {
      const throttle = hourlyNotifyOnLastDay ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
      if (shouldNotify(`expired-${item.id}`, throttle)) {
        sendNotification(
          `⚠️ PRZETERMINOWANE: ${name}`,
          `Termin minął ${Math.abs(daysLeft)} dni temu (${expiryStr}).\nKategoria: ${item.category || '—'} | Typ: ${item.control_type || '—'}`,
          `em-expired-${item.id}`
        );
      }
    }
    // Last day — hourly
    else if (daysLeft === 1 && hourlyNotifyOnLastDay) {
      if (shouldNotify(`lastday-${item.id}`, 60 * 60 * 1000)) {
        sendNotification(
          `🔴 OSTATNI DZIEŃ: ${name}`,
          `Termin upływa JUTRO (${expiryStr}).\nKategoria: ${item.category || '—'}`,
          `em-lastday-${item.id}`
        );
      }
    }
    // Daily zone (within dailyThresholdDays)
    else if (daysLeft <= dailyThresholdDays) {
      if (shouldNotify(`daily-${item.id}`, 24 * 60 * 60 * 1000)) {
        sendNotification(
          `🟡 Wkrótce wygasa: ${name}`,
          `Pozostało ${daysLeft} dni (do ${expiryStr}).\nKategoria: ${item.category || '—'}`,
          `em-daily-${item.id}`
        );
      }
    }
    // Early warning zone (within earlyThresholdDays)
    else if (daysLeft <= earlyThresholdDays) {
      // Notify once per week in this zone
      if (shouldNotify(`early-${item.id}`, 7 * 24 * 60 * 60 * 1000)) {
        sendNotification(
          `🔵 Zbliża się termin: ${name}`,
          `Pozostało ${daysLeft} dni (do ${expiryStr}).\nKategoria: ${item.category || '—'}`,
          `em-early-${item.id}`
        );
      }
    }
  }
}

// ── Start / stop periodic checking ──────────────────────
export function startNotificationEngine(getItems, getSettings) {
  stopNotificationEngine();

  // Initial check after 5 seconds
  setTimeout(() => {
    const items = getItems();
    const settings = getSettings();
    checkAndNotify(items, settings);
  }, 5000);

  // Periodic checks
  checkInterval = setInterval(() => {
    const items = getItems();
    const settings = getSettings();
    const intervalMs = (settings?.notificationCheckMinutes || 30) * 60 * 1000;

    checkAndNotify(items, settings);

    // Adjust interval if settings changed (restart engine)
    const currentInterval = (settings?.notificationCheckMinutes || 30) * 60 * 1000;
    if (checkInterval && currentInterval !== intervalMs) {
      startNotificationEngine(getItems, getSettings);
    }
  }, 60 * 1000); // Check every minute internally, throttle sends per-item

  console.log('[Notifications] Engine started');
}

export function stopNotificationEngine() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

// ── Reset throttle cache (e.g. after settings change) ───
export function resetNotificationThrottle() {
  lastNotified = {};
}
