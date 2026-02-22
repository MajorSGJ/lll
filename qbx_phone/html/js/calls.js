let currentCallId = null;
let callTimerInterval = null;

function formatCallDuration(totalSeconds) {
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
}

function getCallLabel(entry) {
    if (entry.call_type === 'missed') {
        return 'Nieodebrane';
    }

    if (entry.call_type === 'incoming') {
        return 'Przychodzące';
    }

    return 'Wychodzące';
}

function getCallIcon(entry) {
    if (entry.call_type === 'missed') {
        return '📵';
    }

    if (entry.call_type === 'incoming') {
        return '⬇️';
    }

    return '⬆️';
}

function showIncomingOverlay(payload) {
    const container = document.getElementById('phone-container');
    const overlay = document.getElementById('incoming-call-overlay');
    const callerName = document.getElementById('incoming-caller-name');
    const callerNumber = document.getElementById('incoming-caller-number');

    if (!container || !overlay || !callerName || !callerNumber) {
        return;
    }

    container.style.display = 'flex';
    currentCallId = payload.callId;
    callerName.textContent = getContactName(payload.number || 'Nieznany');
    callerNumber.textContent = payload.number || '';
    overlay.classList.add('visible');
}

function hideIncomingOverlay() {
    const overlay = document.getElementById('incoming-call-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

function showActiveOverlay(payload) {
    const container = document.getElementById('phone-container');
    const overlay = document.getElementById('active-call-overlay');
    const name = document.getElementById('active-call-name');
    const number = document.getElementById('active-call-number');
    const timer = document.getElementById('active-call-timer');

    if (!container || !overlay || !name || !number || !timer) {
        return;
    }

    container.style.display = 'flex';
    currentCallId = payload.callId;
    name.textContent = getContactName(payload.number || 'Nieznany');
    number.textContent = payload.number || '';
    timer.textContent = '00:00';
    overlay.classList.add('visible');

    if (callTimerInterval) {
        clearInterval(callTimerInterval);
    }

    const startedAt = Number(payload.startedAt || Date.now());
    callTimerInterval = setInterval(() => {
        const diff = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
        timer.textContent = formatCallDuration(diff);
    }, 1000);
}

function hideActiveOverlay() {
    const overlay = document.getElementById('active-call-overlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }

    if (callTimerInterval) {
        clearInterval(callTimerInterval);
        callTimerInterval = null;
    }

    currentCallId = null;
}

async function initCallsScreen() {
    const history = await fetchNUI('getCallHistory', {});
    renderCallHistory(history || []);
}

function renderCallHistory(entries) {
    const list = document.getElementById('calls-history-list');
    if (!list) {
        return;
    }

    if (!entries || entries.length === 0) {
        list.innerHTML = '<div class="conversation-item">Brak historii połączeń</div>';
        return;
    }

    list.innerHTML = entries.map((entry) => {
        const other = entry.caller === playerData.phoneNumber ? entry.receiver : entry.caller;
        const name = getContactName(other);
        const date = new Date(entry.timestamp);
        const time = Number.isNaN(date.getTime()) ? '' : `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

        return `
            <div class="conversation-item" onclick="fetchNUI('startCall', { number: '${other}' })">
                <div class="conv-avatar">${getCallIcon(entry)}</div>
                <div class="conv-info">
                    <div class="conv-name">${name}</div>
                    <div class="conv-preview">${getCallLabel(entry)} • ${entry.duration || 0}s</div>
                </div>
                <div class="conv-meta">
                    <div class="conv-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
}

function acceptIncomingCall() {
    if (!currentCallId) {
        return;
    }

    fetchNUI('acceptCall', { callId: currentCallId });
}

function declineIncomingCall() {
    if (!currentCallId) {
        return;
    }

    fetchNUI('declineCall', { callId: currentCallId });
}

function endActiveCall() {
    if (!currentCallId) {
        return;
    }

    fetchNUI('endCall', { callId: currentCallId });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const incomingOverlay = document.getElementById('incoming-call-overlay');
        if (incomingOverlay && incomingOverlay.classList.contains('visible')) {
            declineIncomingCall();
        }
    }
});

window.addEventListener('message', (event) => {
    const payload = event.data || {};

    if (payload.type === 'incomingCall') {
        showIncomingOverlay(payload.payload || {});
    }

    if (payload.type === 'outgoingCallStarted') {
        showPushNotification({
            title: 'Połączenie',
            body: `Dzwonisz do ${getContactName(payload.payload?.number || '')}`
        });
    }

    if (payload.type === 'callAccepted') {
        hideIncomingOverlay();
        showActiveOverlay(payload.payload || {});
    }

    if (payload.type === 'callEnded') {
        hideIncomingOverlay();
        hideActiveOverlay();
    }

    if (payload.type === 'callFailed') {
        showPushNotification({
            title: 'Połączenie',
            body: 'Nie udało się rozpocząć połączenia.'
        });
    }

    if (payload.type === 'callsHistoryUpdated') {
        const screen = document.getElementById('calls-screen');
        if (screen && screen.classList.contains('active')) {
            initCallsScreen();
        }
    }
});
