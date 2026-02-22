function setWallpaper(preset) {
    setPhoneSetting('wallpaperPreset', preset);
    applyWallpaperPreset(preset);
}

function refreshSettingsInfo() {
    const info = document.getElementById('settings-phone-info');
    const notifToggle = document.getElementById('settings-notif-sound');

    if (info) {
        const name = `${playerData.firstName || ''} ${playerData.lastName || ''}`.trim();
        info.innerHTML = `
            Właściciel: ${name || 'Nieznany'}<br>
            Numer: ${playerData.phoneNumber || 'Brak'}
        `;
    }

    if (notifToggle) {
        notifToggle.checked = getPhoneSetting('notifSoundEnabled', true);
    }
}

async function initSettingsScreen() {
    refreshSettingsInfo();
}

document.addEventListener('DOMContentLoaded', () => {
    const twitterForm = document.getElementById('settings-twitter-form');
    const twitterInput = document.getElementById('settings-twitter-username');
    const notifToggle = document.getElementById('settings-notif-sound');

    if (notifToggle) {
        notifToggle.addEventListener('change', () => {
            setPhoneSetting('notifSoundEnabled', notifToggle.checked);
        });
    }

    if (twitterForm && twitterInput) {
        twitterForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const username = String(twitterInput.value || '').trim();
            if (!username) {
                return;
            }

            const result = await fetchNUI('setTwitterUsername', { username });
            if (!result?.success) {
                showPushNotification({
                    icon: '⚙️',
                    title: 'Ustawienia',
                    body: 'Nie udało się zmienić nazwy Twatter.'
                });
                return;
            }

            twitterInput.value = '';
            showPushNotification({
                icon: '⚙️',
                title: 'Ustawienia',
                body: `Zmieniono nazwę na @${result.username}`
            });

            if (typeof initTwitterScreen === 'function') {
                initTwitterScreen();
            }
        });
    }
});
