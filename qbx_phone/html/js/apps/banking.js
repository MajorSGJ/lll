let bankingData = {
    enabled: true,
    balance: 0,
    transactions: []
};

function formatCurrency(value) {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 0 }).format(amount);
}

function mapBankError(errorCode) {
    const messages = {
        banking_disabled: 'Aplikacja bankowa jest wyłączona.',
        invalid_data: 'Podaj poprawne dane przelewu.',
        receiver_not_found: 'Nie znaleziono odbiorcy.',
        insufficient_funds: 'Brak wystarczających środków.',
        invalid_target: 'Nieprawidłowy odbiorca.',
        atm_only: 'Ta operacja jest dostępna tylko przez ATM.',
        unknown_error: 'Wystąpił nieznany błąd.'
    };

    return messages[errorCode] || 'Nie udało się wykonać operacji.';
}

function renderBankingData() {
    const balanceEl = document.getElementById('bank-balance-amount');
    const txList = document.getElementById('bank-transactions-list');
    const bankButton = document.getElementById('home-bank-app');

    if (bankButton) {
        bankButton.style.display = bankingData.enabled ? '' : 'none';
    }

    if (!bankingData.enabled) {
        const disabledNotice = document.getElementById('banking-disabled-notice');
        if (disabledNotice) {
            disabledNotice.style.display = 'block';
        }

        if (txList) {
            txList.innerHTML = '';
        }

        return;
    }

    const disabledNotice = document.getElementById('banking-disabled-notice');
    if (disabledNotice) {
        disabledNotice.style.display = 'none';
    }

    if (balanceEl) {
        balanceEl.textContent = `$${formatCurrency(bankingData.balance)}`;
        balanceEl.classList.remove('pulse-balance');
        void balanceEl.offsetWidth;
        balanceEl.classList.add('pulse-balance');
    }

    if (!txList) {
        return;
    }

    const tx = bankingData.transactions || [];
    if (tx.length === 0) {
        txList.innerHTML = '<div class="transaction-item">Brak transakcji</div>';
        return;
    }

    txList.innerHTML = tx.map((item) => {
        const incoming = item.type === 'incoming';
        const amountClass = incoming ? 'tx-positive' : 'tx-negative';
        const icon = incoming ? '⬇️' : '⬆️';
        const sign = incoming ? '+' : '-';

        return `
            <div class="transaction-item">
                <div class="tx-icon">${icon}</div>
                <div class="tx-body">
                    <div class="tx-title">${item.description || 'Przelew bankowy'}</div>
                    <div class="tx-subtitle">${item.counterparty || ''}</div>
                </div>
                <div class="tx-amount ${amountClass}">${sign}$${formatCurrency(item.amount)}</div>
            </div>
        `;
    }).join('');
}

async function initBankingScreen() {
    const data = await fetchNUI('getBankData', {});
    bankingData = data || bankingData;
    renderBankingData();
}

function openBankTransferModal() {
    const modal = document.getElementById('bank-transfer-modal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeBankTransferModal() {
    const modal = document.getElementById('bank-transfer-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

async function submitBankTransfer(event) {
    event.preventDefault();

    const target = String(document.getElementById('bank-transfer-target')?.value || '').trim();
    const amount = Number(document.getElementById('bank-transfer-amount')?.value || 0);
    const description = String(document.getElementById('bank-transfer-description')?.value || '').trim();

    const result = await fetchNUI('bankTransfer', {
        target,
        amount,
        description
    });

    if (!result || !result.success) {
        showPushNotification({
            title: 'Bank',
            body: mapBankError(result?.error)
        });
        return;
    }

    bankingData = {
        enabled: true,
        balance: result.balance || 0,
        transactions: result.transactions || []
    };

    renderBankingData();
    closeBankTransferModal();
    showPushNotification({
        title: 'Bank',
        body: 'Przelew został wykonany.'
    });
}

async function handleBankAtmAction(type) {
    const endpoint = type === 'deposit' ? 'bankDeposit' : 'bankWithdraw';
    const result = await fetchNUI(endpoint, {});
    if (!result || !result.success) {
        showPushNotification({
            title: 'Bank',
            body: mapBankError(result?.error)
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const transferForm = document.getElementById('bank-transfer-form');
    if (transferForm) {
        transferForm.addEventListener('submit', submitBankTransfer);
    }
});

window.addEventListener('message', (event) => {
    const payload = event.data || {};
    if (payload.type === 'bankDataUpdated') {
        bankingData = payload.payload || bankingData;
        renderBankingData();
    }
});
