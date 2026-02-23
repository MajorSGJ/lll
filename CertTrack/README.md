# CertTrack — System zarządzania uprawnieniami i certyfikatami

SaaS do śledzenia ważności uprawnień, certyfikatów i badań lekarskich pracowników.
Idealny dla firm produkcyjnych, budowlanych, transportowych i energetycznych.

Status integracji: CertTrack działa jako moduł OneHost (logowanie, dostęp i rozliczenia są obsługiwane centralnie przez OneHost).

## Funkcje

- **Logowanie OneHost** — brak lokalnych kont CertTrack
- **Dostęp i plan** — walidowane centralnie przez OneHost
- **Dashboard** — przegląd statusów (wygasłe / krytyczne / ostrzeżenie / OK)
- **Pracownicy** — kartoteka z danymi kontaktowymi i listą uprawnień
- **Uprawnienia** — pełna lista z filtrami po kategorii i statusie
- **Kategorie** — konfigurowalne typy uprawnień (BHP, spawalnicze, UDT, SEP, NDT...)
- **Alerty** — automatyczne oznaczanie wygasających certyfikatów (60/30/7 dni)
- **Eksport CSV** — eksport do Excela jednym kliknięciem
- **Multi-tenancy** — pełna izolacja danych między firmami
- **Profile danych** — przełączanie profilu bazy w obrębie tenantu

## Uruchomienie (dev)

```bash
cd CertTrack
npm install
npm run dev
```

Frontend: http://localhost:5180
Backend API: http://localhost:3080

## Integracja z OneHost

1. Skopiuj `.env.example` jako `.env`
2. Ustaw `ONEHOST_API` (np. `http://localhost:18090`)
3. Upewnij się, że OneHost przekazuje `oh_token` przy wejściu do CertTrack
4. Rozliczenia i plan użytkownika prowadź wyłącznie w OneHost (nie w CertTrack)

## Stack technologiczny

- **Frontend:** React 19 + TypeScript + Tailwind CSS + Lucide Icons + React Router
- **Backend:** Express.js + better-sqlite3 + OneHost shared auth
- **Baza danych:** SQLite (plik `data/certtrack.db` — tworzony automatycznie)
- **Auth:** wspólne uwierzytelnianie OneHost (`oh_token`)

## Struktura

```
CertTrack/
├── server/
│   └── index.js              # API + OneHost auth + multi-tenant SQLite
├── src/
│   ├── pages/
│   │   ├── Dashboard.tsx      # Statusy, statystyki, pilne sprawy
│   │   ├── EmployeesPage.tsx  # Lista pracowników
│   │   ├── EmployeeDetail.tsx # Kartoteka + certyfikaty pracownika
│   │   ├── CertificatesPage.tsx # Wszystkie uprawnienia z filtrami
│   │   ├── CategoriesPage.tsx # Zarządzanie kategoriami
│   │   └── ImportPage.tsx     # Import masowy CSV
│   ├── auth.tsx               # AuthProvider context
│   ├── api.ts                 # Fetch wrapper z tokenem OneHost + profileId
│   ├── types.ts               # TypeScript types + helpers
│   ├── App.tsx                # Layout + routing + auth guard
│   ├── main.tsx               # Entry point
│   └── index.css              # Tailwind + custom styles
├── .env.example               # Konfiguracja OneHost
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

## Bezpieczeństwo

- Token `oh_token` walidowany przez OneHost
- Każde zapytanie API weryfikuje tenant_id — firma A nie widzi danych firmy B
- Brak dostępu do danych przy braku dostępu w OneHost (403)

## Licencja

Proprietary — © 2026 Konrad Wiśniewski
