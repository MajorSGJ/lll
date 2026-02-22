let allContacts = [];
let editingContactId = null;

function getAvatarDisplay(contact) {
    if (contact.avatar && String(contact.avatar).trim() !== '') {
        return contact.avatar;
    }

    const name = contact.name || '';
    const initial = name.trim().charAt(0).toUpperCase();
    return initial || '?';
}

function getContactById(id) {
    return allContacts.find((contact) => Number(contact.id) === Number(id));
}

function startCallFromContact(id) {
    const contact = getContactById(id);
    if (!contact) {
        return;
    }

    fetchNUI('startCall', { number: contact.number });
}

function openMessagesFromContact(id) {
    const contact = getContactById(id);
    if (!contact) {
        return;
    }

    const message = prompt(`Napisz wiadomość do ${contact.name || contact.number}:`);
    if (message === null) {
        return;
    }

    const trimmedMessage = String(message).trim();
    if (!trimmedMessage) {
        return;
    }

    fetchNUI('startSms', {
        number: contact.number,
        message: trimmedMessage
    });
}

function editContactById(id) {
    const contact = getContactById(id);
    if (!contact) {
        return;
    }

    openModal(contact);
}

function deleteContactById(id) {
    deleteContact(Number(id));
}

function renderContacts(contacts) {
    const contactsList = document.getElementById('contacts-list');
    if (!contactsList) {
        return;
    }

    const sortedContacts = [...(contacts || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    if (sortedContacts.length === 0) {
        contactsList.innerHTML = '<div class="contact-item">Brak kontaktów</div>';
        return;
    }

    contactsList.innerHTML = sortedContacts.map((contact) => `
        <div class="contact-item" data-id="${contact.id}">
            <div class="contact-avatar">${getAvatarDisplay(contact)}</div>
            <div class="contact-main">
                <div class="contact-name">${contact.name || ''}</div>
                <div class="contact-number">${contact.number || ''}</div>
            </div>
            <div class="contact-actions">
                <button type="button" onclick="startCallFromContact(${contact.id})">📞</button>
                <button type="button" onclick="openMessagesFromContact(${contact.id})">💬</button>
                <button type="button" onclick="editContactById(${contact.id})">✏️</button>
                <button type="button" onclick="deleteContactById(${contact.id})">🗑️</button>
            </div>
        </div>
    `).join('');
}

function openModal(contact = null) {
    const modal = document.getElementById('contact-modal');
    const title = document.getElementById('contact-modal-title');
    const nameInput = document.getElementById('contact-name');
    const numberInput = document.getElementById('contact-number');
    const avatarInput = document.getElementById('contact-avatar');

    if (!modal || !title || !nameInput || !numberInput || !avatarInput) {
        return;
    }

    if (contact) {
        editingContactId = contact.id;
        title.textContent = 'Edytuj kontakt';
        nameInput.value = contact.name || '';
        numberInput.value = contact.number || '';
        avatarInput.value = contact.avatar || '';
    } else {
        editingContactId = null;
        title.textContent = 'Dodaj kontakt';
        nameInput.value = '';
        numberInput.value = '';
        avatarInput.value = '';
    }

    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('contact-modal');
    if (!modal) {
        return;
    }

    modal.style.display = 'none';
}

async function deleteContact(id) {
    if (!confirm('Czy na pewno chcesz usunąć ten kontakt?')) {
        return;
    }

    await fetchNUI('deleteContact', { id });
}

async function initContactsScreen() {
    const contacts = await fetchNUI('getContacts');
    allContacts = contacts || [];
    renderContacts(allContacts);
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('contacts-search');
    const form = document.getElementById('contact-form');

    if (searchInput) {
        searchInput.addEventListener('input', (event) => {
            const term = String(event.target.value || '').toLowerCase();
            const filtered = allContacts.filter((contact) => {
                const name = String(contact.name || '').toLowerCase();
                const number = String(contact.number || '').toLowerCase();
                return name.includes(term) || number.includes(term);
            });

            renderContacts(filtered);
        });
    }

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const name = document.getElementById('contact-name')?.value || '';
            const number = document.getElementById('contact-number')?.value || '';
            const avatar = document.getElementById('contact-avatar')?.value || '';

            if (editingContactId) {
                await fetchNUI('editContact', {
                    id: editingContactId,
                    name,
                    number,
                    avatar
                });
            } else {
                await fetchNUI('addContact', {
                    name,
                    number,
                    avatar
                });
            }

            closeModal();
        });
    }
});

window.addEventListener('message', (event) => {
    const payload = event.data || {};
    if (payload.type === 'contactsUpdated') {
        allContacts = payload.contacts || [];
        renderContacts(allContacts);
    }
});
