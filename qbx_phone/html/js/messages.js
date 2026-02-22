let currentChatNumber = null;

function getContactName(number) {
    const contacts = Array.isArray(allContacts) ? allContacts : [];
    const found = contacts.find((contact) => contact.number === number);
    return found ? found.name : number;
}

function formatMessageTime(value) {
    let timestamp = value;
    if (typeof timestamp === 'string' && timestamp.trim() !== '' && !Number.isNaN(Number(timestamp))) {
        timestamp = Number(timestamp);
    }

    if (typeof timestamp === 'number' && timestamp > 0 && timestamp < 1000000000000) {
        timestamp = timestamp * 1000;
    }

    const date = new Date(timestamp);
    if (!Number.isNaN(date.getTime())) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    const unixDate = new Date(Number(value) * 1000);
    if (!Number.isNaN(unixDate.getTime())) {
        const hours = String(unixDate.getHours()).padStart(2, '0');
        const minutes = String(unixDate.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    return '';
}

function renderConversations(conversations) {
    const list = document.getElementById('conversations-list');
    if (!list) {
        return;
    }

    const items = conversations || [];
    if (items.length === 0) {
        list.innerHTML = '<div class="conversation-item">Brak konwersacji</div>';
        return;
    }

    list.innerHTML = items.map((conv) => {
        const name = getContactName(conv.other_number);
        const avatar = (name || '?').charAt(0).toUpperCase();
        const preview = String(conv.message || '').slice(0, 60);
        const time = formatMessageTime(conv.timestamp);
        const unread = Number(conv.unread_count || 0);

        return `
            <div class="conversation-item" onclick="openChat('${conv.other_number}')">
                <div class="conv-avatar">${avatar}</div>
                <div class="conv-info">
                    <div class="conv-name">${name}</div>
                    <div class="conv-preview">${preview}</div>
                </div>
                <div class="conv-meta">
                    <div class="conv-time">${time}</div>
                    ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderMessages(messages, theirNumber) {
    const messagesContainer = document.getElementById('messages-list');
    if (!messagesContainer) {
        return;
    }

    const rows = messages || [];
    messagesContainer.innerHTML = rows.map((msg) => {
        const messageClass = msg.sender !== theirNumber ? 'sent' : 'received';
        return `
            <div class="message-bubble ${messageClass}">
                <div>${msg.message || ''}</div>
                <span class="msg-time">${formatMessageTime(msg.timestamp)}</span>
            </div>
        `;
    }).join('');

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function openChat(number) {
    currentChatNumber = number;
    await fetchNUI('openChat', { number });

    const headerName = document.getElementById('chat-header-name');
    const headerNumber = document.getElementById('chat-header-number');
    if (headerName) {
        headerName.textContent = getContactName(number);
    }
    if (headerNumber) {
        headerNumber.textContent = number;
    }

    const msgs = await fetchNUI('getMessages', { number });
    renderMessages((msgs || []).reverse(), number);
    fetchNUI('markAsRead', { number });
    showScreen('chat');
}

async function initMessagesScreen() {
    const convs = await fetchNUI('getConversations');
    renderConversations(convs || []);
}

async function sendCurrentMessage() {
    const input = document.getElementById('message-input');
    if (!input || !currentChatNumber) {
        return;
    }

    const inputValue = String(input.value || '').trim();
    if (!inputValue) {
        return;
    }

    await fetchNUI('sendMessage', { number: currentChatNumber, message: inputValue });
    input.value = '';
}

function openNewMessageModal() {
    const modal = document.getElementById('new-message-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeNewMessageModal() {
    const modal = document.getElementById('new-message-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const form = document.getElementById('new-message-form');

    if (input) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendCurrentMessage();
            }
        });
    }

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            sendCurrentMessage();
        });
    }

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const numberInput = document.getElementById('new-message-number');
            const number = String(numberInput?.value || '').trim();
            if (!number) {
                return;
            }

            await openChat(number);
            closeNewMessageModal();
            if (numberInput) {
                numberInput.value = '';
            }
        });
    }
});

window.addEventListener('message', (event) => {
    const payload = event.data || {};

    if (payload.type === 'newMessage' && payload.message) {
        if (currentChatNumber === payload.message.sender) {
            const messagesContainer = document.getElementById('messages-list');
            if (messagesContainer) {
                messagesContainer.insertAdjacentHTML('beforeend', `
                    <div class="message-bubble received">
                        <div>${payload.message.message || ''}</div>
                        <span class="msg-time">${formatMessageTime(payload.message.timestamp)}</span>
                    </div>
                `);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    if (payload.type === 'conversationsUpdated') {
        const screen = document.getElementById('messages-screen');
        if (screen && screen.classList.contains('active')) {
            initMessagesScreen();
        }
    }

    if (payload.type === 'messageSent') {
        const sent = payload.payload || {};
        if (sent.number === currentChatNumber) {
            const messagesContainer = document.getElementById('messages-list');
            if (messagesContainer) {
                messagesContainer.insertAdjacentHTML('beforeend', `
                    <div class="message-bubble sent">
                        <div>${sent.message || ''}</div>
                        <span class="msg-time">${formatMessageTime(sent.timestamp || Date.now())}</span>
                    </div>
                `);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    }

    if (payload.type === 'sendFailed') {
        showPushNotification({
            title: 'SMS',
            body: 'Nie udało się wysłać wiadomości.'
        });
    }

});
