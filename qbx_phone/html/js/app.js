let playerData = {};
let currentScreen = 'home';
let notificationQueue = [];
let notificationInProgress = false;

function getPhoneSetting(key, fallback) {
    const raw = localStorage.getItem(`qbx_phone_setting_${key}`);
    if (raw === null || raw === undefined) {
        return fallback;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return raw;
    }
}

function setPhoneSetting(key, value) {
    localStorage.setItem(`qbx_phone_setting_${key}`, JSON.stringify(value));
}

function applyWallpaperPreset(preset) {
    const phone = document.getElementById('phone');
    if (!phone) {
        return;
    }

    phone.classList.remove('wallpaper-default', 'wallpaper-blue', 'wallpaper-red', 'wallpaper-green');
    phone.classList.add(`wallpaper-${preset || 'default'}`);
}

function playNotificationSound() {
    if (!getPhoneSetting('notifSoundEnabled', true)) {
        return;
    }

    const audio = document.getElementById('notif-sound');
    if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.value = 880;
            gain.gain.value = 0.03;
            oscillator.connect(gain);
            gain.connect(ctx.destination);
            oscillator.start();
            oscillator.stop(ctx.currentTime + 0.12);
        });
    }
}

function processNotificationQueue() {
    if (notificationInProgress || notificationQueue.length === 0) {
        return;
    }

    const payload = notificationQueue.shift();
    const notif = document.getElementById('push-notification');
    const title = document.getElementById('push-notif-title');
    const body = document.getElementById('push-notif-body');
    const icon = document.getElementById('push-notif-icon');

    if (!notif || !title || !body || !icon) {
        return;
    }

    notificationInProgress = true;
    const appIconMap = {
        SMS: '💬',
        Twatter: '🐦',
        Połączenie: '📞'
    };

    const senderName = (typeof getContactName === 'function' && payload.sender)
        ? getContactName(payload.sender)
        : null;

    title.textContent = senderName || payload.title || payload.app || 'Powiadomienie';
    body.textContent = payload.body || '';
    icon.textContent = payload.icon || appIconMap[payload.app] || '🔔';

    notif.classList.add('visible');
    playNotificationSound();

    const duration = Number(getPhoneSetting('notifDuration', 5000)) || 5000;
    setTimeout(() => {
        notif.classList.remove('visible');
        notificationInProgress = false;
        processNotificationQueue();
    }, duration);
}

function showPushNotification(payload) {
    notificationQueue.push(payload || {});
    processNotificationQueue();
}

function applyPlayerData(data) {
    playerData = data || {};
    updatePlayerDataUI();
}

async function fetchNUI(eventName, data) {
    const response = await fetch(`https://qbx_phone/${eventName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data ?? {})
    });

    return response.json();
}

function showScreen(screenName) {
    const screens = document.querySelectorAll('.app-screen');
    let previousScreen = null;
    screens.forEach((screen) => {
        if (screen.classList.contains('active')) {
            previousScreen = screen;
        }
        screen.classList.remove('slide-in', 'slide-out');
        screen.classList.remove('active');
    });

    if (previousScreen) {
        previousScreen.classList.add('slide-out');
    }

    const target = document.getElementById(`${screenName}-screen`);
    if (!target) {
        return;
    }

    target.classList.add('active', 'slide-in');
    currentScreen = screenName;
}

function updatePlayerDataUI() {
    if (!playerData) {
        return;
    }

    const bankButton = document.getElementById('home-bank-app');
    const bankDockButton = document.getElementById('home-bank-dock');
    if (bankButton) {
        const isEnabled = playerData.bankingEnabled !== false;
        bankButton.style.display = isEnabled ? '' : 'none';
        if (bankDockButton) {
            bankDockButton.style.display = isEnabled ? '' : 'none';
        }
    }
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    const clock = document.getElementById('clock');
    const dateDisplay = document.getElementById('date-display');

    if (clock) {
        clock.textContent = `${hours}:${minutes}`;
    }

    if (dateDisplay) {
        dateDisplay.textContent = `${day}.${month}.${year}`;
    }

    const signal = document.getElementById('status-signal');
    const battery = document.getElementById('status-battery');
    if (signal) {
        signal.textContent = '📶 QBX';
    }
    if (battery) {
        battery.textContent = '🔋 87%';
    }
}

window.addEventListener('message', (event) => {
    const payload = event.data || {};

    if (payload.type === 'openPhone') {
        const container = document.getElementById('phone-container');
        if (container) {
            container.style.display = 'flex';
        }

        showScreen('home');

        if (payload.playerData) {
            applyPlayerData(payload.playerData);
        }
    }

    if (payload.type === 'closePhone') {
        const container = document.getElementById('phone-container');
        if (container) {
            container.style.display = 'none';
        }
    }

    if (payload.type === 'setPlayerData') {
        applyPlayerData(payload.playerData);
    }

    if (payload.type === 'pushNotification') {
        showPushNotification(payload);
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        fetchNUI('closePhone', {});
    }
});

document.addEventListener('DOMContentLoaded', () => {
    applyWallpaperPreset(getPhoneSetting('wallpaperPreset', 'default'));
    updateClock();
    setInterval(updateClock, 1000);
    fetchNUI('ready', {});
});
