let twitterFeed = [];
let twitterPage = 0;
let twitterProfile = { username: '' };
let cameraGallery = [];

function loadCameraGallery() {
    try {
        const raw = localStorage.getItem('qbx_phone_camera_gallery');
        cameraGallery = raw ? JSON.parse(raw) : [];
    } catch (error) {
        cameraGallery = [];
    }
}

function saveCameraGallery() {
    localStorage.setItem('qbx_phone_camera_gallery', JSON.stringify(cameraGallery.slice(0, 20)));
}

function renderCameraGallery() {
    const container = document.getElementById('camera-gallery');
    if (!container) {
        return;
    }

    if (!cameraGallery.length) {
        container.innerHTML = '<div class="transaction-item">Brak zdjęć</div>';
        return;
    }

    container.innerHTML = cameraGallery.map((item) => `
        <div class="camera-photo-item">
            <img src="${item.url}" alt="selfie" />
        </div>
    `).join('');
}

function initCameraScreen() {
    loadCameraGallery();
    renderCameraGallery();
}

function takeSelfieFromUI() {
    fetchNUI('takeSelfie', {});
}

function renderTwitterFeed() {
    const list = document.getElementById('twitter-feed-list');
    if (!list) {
        return;
    }

    if (!twitterFeed.length) {
        list.innerHTML = '<div class="transaction-item">Brak tweetów</div>';
        return;
    }

    list.innerHTML = twitterFeed.map((tweet) => {
        const ownDeleteButton = tweet.isOwn
            ? `<button class="tweet-action" onclick="deleteTweet(${tweet.id})">Usuń</button>`
            : '';

        return `
            <div class="tweet-item">
                <div class="tweet-header">
                    <div class="tweet-avatar">${(tweet.username || '?').charAt(0).toUpperCase()}</div>
                    <div class="tweet-meta">
                        <div class="tweet-username">@${tweet.username || 'unknown'}</div>
                    </div>
                </div>
                <div class="tweet-message">${tweet.message || ''}</div>
                <div class="tweet-actions">
                    <button class="tweet-action" onclick="likeTweet(${tweet.id})">❤️ ${tweet.likes || 0}</button>
                    <button class="tweet-action" disabled>💬 Odpowiedz</button>
                    ${ownDeleteButton}
                </div>
            </div>
        `;
    }).join('');
}

async function refreshTwitterFeed() {
    twitterFeed = await fetchNUI('getTweets', { page: twitterPage }) || [];
    renderTwitterFeed();
}

async function initTwitterScreen() {
    twitterProfile = await fetchNUI('getTwitterProfile', {}) || { username: '' };
    const usernameEl = document.getElementById('twitter-username-display');
    const titleEl = document.getElementById('twitter-title');

    if (usernameEl) {
        usernameEl.textContent = `@${twitterProfile.username || 'unknown'}`;
    }

    if (titleEl) {
        titleEl.textContent = 'Twatter';
    }

    await refreshTwitterFeed();
}

async function likeTweet(id) {
    const result = await fetchNUI('likeTweet', { id });
    if (!result?.success) {
        showPushNotification({
            title: 'Twatter',
            body: 'Nie udało się polubić tweeta.'
        });
    }
}

async function deleteTweet(id) {
    const result = await fetchNUI('deleteTweet', { id });
    if (!result?.success) {
        showPushNotification({
            title: 'Twatter',
            body: 'Nie udało się usunąć tweeta.'
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('twitter-post-form');
    const postInput = document.getElementById('twitter-post-input');
    const count = document.getElementById('twitter-char-count');

    if (postInput && count) {
        postInput.addEventListener('input', () => {
            count.textContent = `${postInput.value.length}/280`;
        });
    }

    if (postForm && postInput) {
        postForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            const message = String(postInput.value || '').trim();
            if (!message) {
                return;
            }

            if (message.length > 280) {
                showPushNotification({
                    title: 'Twatter',
                    body: 'Tweet może mieć maksymalnie 280 znaków.'
                });
                return;
            }

            const result = await fetchNUI('postTweet', { message });
            if (!result?.success) {
                showPushNotification({
                    title: 'Twatter',
                    body: 'Nie udało się opublikować tweeta.'
                });
                return;
            }

            postInput.value = '';
            if (count) {
                count.textContent = '0/280';
            }

            refreshTwitterFeed();
        });
    }

    loadCameraGallery();
    renderCameraGallery();
});

window.addEventListener('message', (event) => {
    const payload = event.data || {};

    if (payload.type === 'tweetsUpdated') {
        const screen = document.getElementById('twitter-screen');
        if (screen && screen.classList.contains('active')) {
            refreshTwitterFeed();
        }
    }

    if (payload.type === 'selfieCaptured') {
        if (!payload.success || !payload.image) {
            showPushNotification({
                title: 'Aparat',
                body: 'Nie udało się wykonać zdjęcia.'
            });
            return;
        }

        cameraGallery.unshift({
            url: payload.image,
            createdAt: Date.now()
        });
        cameraGallery = cameraGallery.slice(0, 20);
        saveCameraGallery();
        renderCameraGallery();

        showPushNotification({
            title: 'Aparat',
            body: 'Zdjęcie zapisane w galerii.'
        });
    }
});
