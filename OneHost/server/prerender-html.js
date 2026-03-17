/**
 * prerender-html.js
 * Pre-rendered HTML pages served to crawlers by serve-frontend.js.
 * Content mirrors the React components exactly — keep in sync when
 * the landing page copy or pricing changes.
 */

const BASE_URL = 'https://sklep.onehost.site';

// ── Shared JSON-LD blocks (same as index.html) ─────────────────────────────
const JSONLD_SOFTWARE = `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "OneHost",
  "url": "${BASE_URL}",
  "description": "Kompleksowa platforma SaaS do zarządzania firmą: grafiki pracy, przeglądy sprzętu, certyfikaty pracowników.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "name": "ShiftPlanner — Starter",        "price": "89",  "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "Equipment Manager — Starter",   "price": "59",  "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "CertTrack — Starter",           "price": "79",  "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "ShiftPlanner — Business",       "price": "249", "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "Equipment Manager — Business",  "price": "169", "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "CertTrack — Business",          "price": "199", "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "ShiftPlanner — Enterprise",     "price": "499", "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "Equipment Manager — Enterprise","price": "349", "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" },
    { "@type": "Offer", "name": "CertTrack — Enterprise",        "price": "399", "priceCurrency": "PLN", "priceValidUntil": "2026-12-31" }
  ],
  "featureList": [
    "Planowanie grafików zmianowych",
    "Zarządzanie przeglądami sprzętu",
    "Śledzenie certyfikatów pracowników",
    "Multi-tenant z izolacją danych",
    "Wiele profili danych",
    "Powiadomienia w przeglądarce",
    "Eksport PDF",
    "Import CSV"
  ]
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "OneHost",
  "url": "${BASE_URL}",
  "logo": "${BASE_URL}/logo.png",
  "description": "Platforma SaaS do zarządzania firmą — grafiki pracy, przeglądy sprzętu, certyfikaty.",
  "contactPoint": { "@type": "ContactPoint", "email": "Admin@onehost.site", "contactType": "customer service", "availableLanguage": "Polish" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "OneHost",
  "url": "${BASE_URL}",
  "description": "Platforma SaaS dla polskich firm: ShiftPlanner, Equipment Manager, CertTrack.",
  "potentialAction": { "@type": "SearchAction", "target": "${BASE_URL}/?q={search_term_string}", "query-input": "required name=search_term_string" }
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Czym jest OneHost?",
      "acceptedAnswer": { "@type": "Answer", "text": "OneHost to kompleksowa platforma SaaS dla polskich firm, łącząca trzy narzędzia: ShiftPlanner (planowanie grafików pracy), Equipment Manager (zarządzanie przeglądami sprzętu) oraz CertTrack (śledzenie certyfikatów i uprawnień pracowników)." }
    },
    {
      "@type": "Question",
      "name": "Czy mogę wypróbować OneHost za darmo?",
      "acceptedAnswer": { "@type": "Answer", "text": "Tak — plan Starter oferuje 7 dni darmowego okresu próbnego bez wymaganej karty płatniczej." }
    },
    {
      "@type": "Question",
      "name": "Ile kosztuje OneHost?",
      "acceptedAnswer": { "@type": "Answer", "text": "Każdy produkt ma indywidualną cenę — na planie Starter: ShiftPlanner 89 PLN/mies., Equipment Manager 59 PLN/mies., CertTrack 79 PLN/mies. Kupując 3 produkty w pakiecie oszczędzasz 20%." }
    },
    {
      "@type": "Question",
      "name": "Czy dane mojej firmy są bezpieczne?",
      "acceptedAnswer": { "@type": "Answer", "text": "Tak. Stosujemy pełną izolację danych między firmami (multi-tenant), szyfrowane połączenia, JWT auth i rate limiting." }
    },
    {
      "@type": "Question",
      "name": "Jak działa system wielu użytkowników?",
      "acceptedAnswer": { "@type": "Answer", "text": "Admin firmy może zapraszać kolejnych użytkowników (np. kierowników, managerów). Wszyscy współdzielą dane firmy, każdy ma własne konto i hasło." }
    },
    {
      "@type": "Question",
      "name": "Jak zacząć?",
      "acceptedAnswer": { "@type": "Answer", "text": "Załóż konto, wybierz plan Starter z 7-dniowym trialem. Dane możesz zaimportować z CSV. Cały proces zajmuje kilka minut." }
    }
  ]
}
</script>`;

// ── Landing page (/) ────────────────────────────────────────────────────────
const LANDING = `<!DOCTYPE html>
<html lang="pl" prefix="og: https://ogp.me/ns#">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <title>OneHost – Grafiki pracy, przeglądy sprzętu i certyfikaty | Platforma SaaS dla firm</title>
  <meta name="description" content="OneHost to platforma SaaS: ShiftPlanner (grafiki zmian), Equipment Manager (przeglądy sprzętu), CertTrack (certyfikaty pracowników). 7 dni za darmo bez karty." />
  <meta name="keywords" content="grafiki pracy, planowanie zmian, przeglądy sprzętu, certyfikaty pracowników, zarządzanie firmą, SaaS dla firm, ShiftPlanner, Equipment Manager, CertTrack, OneHost, oprogramowanie dla firm, grafik zmianowy, platforma HR, ewidencja certyfikatów, system zmianowy 4-brygadowy" />
  <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
  <meta name="author" content="OneHost" />
  <link rel="canonical" href="${BASE_URL}/" />

  <meta property="og:type" content="website" />
  <meta property="og:url" content="${BASE_URL}/" />
  <meta property="og:title" content="OneHost – Grafiki pracy, przeglądy sprzętu i certyfikaty | Platforma SaaS" />
  <meta property="og:description" content="Grafiki pracy, przeglądy sprzętu, certyfikaty pracowników — trzy narzędzia w jednej platformie. Zaoszczędź 20% z pakietem. 7 dni za darmo!" />
  <meta property="og:site_name" content="OneHost" />
  <meta property="og:locale" content="pl_PL" />
  <meta property="og:image" content="${BASE_URL}/og-image.png" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="OneHost – Grafiki pracy, przeglądy sprzętu i certyfikaty" />
  <meta name="twitter:description" content="Kompleksowa platforma SaaS dla polskich firm. ShiftPlanner + Equipment Manager + CertTrack. Wypróbuj 7 dni za darmo." />
  <meta name="twitter:image" content="${BASE_URL}/og-image.png" />

  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

  ${JSONLD_SOFTWARE}

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 0 1rem; color: #1e293b; line-height: 1.6; }
    nav { display: flex; gap: 1.5rem; padding: 1rem 0; flex-wrap: wrap; border-bottom: 1px solid #e2e8f0; }
    nav a { color: #475569; text-decoration: none; font-size: 0.95rem; }
    nav a:hover { color: #0d9488; }
    h1 { font-size: 2.5rem; font-weight: 800; line-height: 1.2; margin: 2rem 0 1rem; color: #0f172a; }
    h2 { font-size: 1.75rem; font-weight: 700; margin: 2rem 0 0.75rem; color: #0f172a; }
    h3 { font-size: 1.25rem; font-weight: 600; margin: 1.5rem 0 0.5rem; color: #1e293b; }
    section { margin: 3rem 0; }
    ul { padding-left: 1.25rem; }
    li { margin: 0.35rem 0; }
    table { border-collapse: collapse; width: 100%; margin: 1.5rem 0; }
    th, td { text-align: left; padding: 0.6rem 1rem; border: 1px solid #e2e8f0; font-size: 0.9rem; }
    th { background: #f8fafc; font-weight: 600; }
    footer { border-top: 1px solid #e2e8f0; padding: 2rem 0; margin-top: 3rem; color: #64748b; font-size: 0.85rem; }
    footer a { color: #0d9488; text-decoration: none; }
    .badge { display: inline-block; background: #ccfbf1; color: #0f766e; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; margin-bottom: 1rem; }
    .cta-primary { display: inline-block; background: #0d9488; color: #fff; padding: 0.875rem 2rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; margin: 0.5rem; }
    .cta-secondary { display: inline-block; border: 1px solid #cbd5e1; color: #475569; padding: 0.875rem 2rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; margin: 0.5rem; }
    .product-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; }
    .product-card { border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; }
    .faq-item { border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 1.25rem; margin: 0.75rem 0; }
    .faq-item dt { font-weight: 600; color: #1e293b; margin-bottom: 0.5rem; }
    .faq-item dd { color: #475569; margin: 0; }
  </style>
</head>
<body>

<nav aria-label="Nawigacja główna">
  <a href="${BASE_URL}/" title="OneHost – strona główna"><strong>OneHost</strong></a>
  <a href="#produkty">Produkty</a>
  <a href="#cennik">Cennik</a>
  <a href="#funkcje">Funkcje</a>
  <a href="#faq">FAQ</a>
  <a href="/guide">Poradnik</a>
  <a href="/login">Zaloguj się</a>
  <a href="/register"><strong>Wypróbuj za darmo</strong></a>
</nav>

<main>

  <!-- ═══ HERO ══════════════════════════════════════════════════════════ -->
  <section aria-labelledby="hero-heading">
    <span class="badge">Plan Starter — 7 dni za darmo (bez wymaganej karty)</span>

    <h1 id="hero-heading">
      Grafiki pracy, przeglądy sprzętu i certyfikaty pracowników — w jednej platformie
    </h1>

    <p>
      <strong>OneHost</strong> to polska platforma SaaS łącząca trzy narzędzia do zarządzania firmą:
      <em>ShiftPlanner</em> (planowanie grafiku pracy),
      <em>Equipment Manager</em> (przeglądy sprzętu i maszyn) oraz
      <em>CertTrack</em> (ewidencja certyfikatów i uprawnień pracowników).
      Zaoszczędź 20% kupując pakiet wszystkich trzech narzędzi.
    </p>

    <p>
      <a href="/register" class="cta-primary">Rozpocznij darmowy trial →</a>
      <a href="#cennik" class="cta-secondary">Zobacz cennik</a>
    </p>

    <p>Korzystają z naszych narzędzi: <strong>Expom S.A. — Kurzętnik</strong> (ShiftPlanner + Equipment Manager)</p>
  </section>

  <!-- ═══ PRODUKTY ══════════════════════════════════════════════════════ -->
  <section id="produkty" aria-labelledby="products-heading">
    <h2 id="products-heading">Trzy narzędzia, jedna platforma do zarządzania firmą</h2>
    <p>Każde narzędzie rozwiązuje konkretny problem w Twojej firmie. Razem tworzą kompletne rozwiązanie do zarządzania — grafiki pracy, sprzęt i certyfikaty w jednym panelu.</p>

    <div class="product-grid">

      <!-- ShiftPlanner -->
      <article class="product-card" itemscope itemtype="https://schema.org/SoftwareApplication">
        <meta itemprop="applicationCategory" content="BusinessApplication" />
        <meta itemprop="operatingSystem" content="Web" />
        <h3 itemprop="name">ShiftPlanner — planowanie grafiku pracy online</h3>
        <p itemprop="description">Elastyczne planowanie grafików pracy — dowolny system zmianowy: standardowe godziny, 2 zmiany, 3 zmiany, 4-brygadowy, 12-godzinny, weekendowy lub własny układ.</p>
        <p>Zarządzaj urlopami, przypisuj stanowiska, wyłączaj wybrane dni. Eksport do PDF. Wiele profili dla różnych działów lub oddziałów.</p>
        <ul>
          <li itemprop="featureList">Dowolny system zmianowy (nie tylko 3/4-brygadowy)</li>
          <li itemprop="featureList">Konfiguracja godzin i nazw zmian</li>
          <li itemprop="featureList">Wyłączanie dni (np. niedziele, święta)</li>
          <li itemprop="featureList">Zarządzanie urlopami pracowników</li>
          <li itemprop="featureList">Stanowiska i pary pracowników</li>
          <li itemprop="featureList">Drukowanie i eksport grafiku do PDF</li>
        </ul>
        <p><strong>Cena od 89 PLN/mies.</strong> — plan Starter z 7-dniowym trialem</p>
      </article>

      <!-- Equipment Manager -->
      <article class="product-card" itemscope itemtype="https://schema.org/SoftwareApplication">
        <meta itemprop="applicationCategory" content="BusinessApplication" />
        <meta itemprop="operatingSystem" content="Web" />
        <h3 itemprop="name">Equipment Manager — kontrola przeglądów sprzętu i maszyn</h3>
        <p itemprop="description">Ewidencja sprzętu z terminami przeglądów, kalibracji i inspekcji. System powiadomień push w przeglądarce gdy zbliża się termin przeglądu.</p>
        <ul>
          <li itemprop="featureList">Śledzenie terminów przeglądów technicznych i kalibracji</li>
          <li itemprop="featureList">Powiadomienia push w przeglądarce o zbliżających się przeglądach</li>
          <li itemprop="featureList">Kategorie i typy kontroli</li>
          <li itemprop="featureList">Parametry i dane narzędzi / maszyn</li>
          <li itemprop="featureList">Eksport i import danych (CSV)</li>
          <li itemprop="featureList">Filtrowanie i sortowanie bazy sprzętu</li>
        </ul>
        <p><strong>Cena od 59 PLN/mies.</strong> — plan Starter z 7-dniowym trialem</p>
      </article>

      <!-- CertTrack -->
      <article class="product-card" itemscope itemtype="https://schema.org/SoftwareApplication">
        <meta itemprop="applicationCategory" content="BusinessApplication" />
        <meta itemprop="operatingSystem" content="Web" />
        <h3 itemprop="name">CertTrack — ewidencja certyfikatów i uprawnień pracowników</h3>
        <p itemprop="description">Baza certyfikatów i uprawnień pracowników. Automatyczne powiadomienia o zbliżającym się wygaśnięciu certyfikatu lub uprawnienia. Raporty PDF do celów audytowych.</p>
        <ul>
          <li itemprop="featureList">Baza certyfikatów, uprawnień i szkoleń pracowników</li>
          <li itemprop="featureList">Automatyczne powiadomienia o wygasaniu certyfikatów</li>
          <li itemprop="featureList">Raporty i eksport PDF</li>
          <li itemprop="featureList">Import pracowników z pliku CSV</li>
          <li itemprop="featureList">Kategorie dokumentów i uprawnień</li>
          <li itemprop="featureList">Wielu użytkowników z dostępem do bazy</li>
        </ul>
        <p><strong>Cena od 79 PLN/mies.</strong> — plan Starter z 7-dniowym trialem</p>
      </article>

    </div>
  </section>

  <!-- ═══ FUNKCJE ════════════════════════════════════════════════════════ -->
  <section id="funkcje" aria-labelledby="features-heading">
    <h2 id="features-heading">Dlaczego OneHost? Kluczowe funkcje platformy</h2>
    <p>Narzędzia stworzone z myślą o polskich firmach — w 100% po polsku, bez zbędnej konfiguracji.</p>

    <ul>
      <li><strong>Izolacja danych (multi-tenant)</strong> — każde konto ma w 100% oddzielone dane. Żadna inna firma nie ma dostępu do Twoich informacji.</li>
      <li><strong>Wielu użytkowników</strong> — zaproś kierowników i pracowników z różnymi rolami. Wszyscy współdzielą dane firmy w ramach jednego konta.</li>
      <li><strong>Wiele profili danych</strong> — różne oddziały, różne grafiki — każdy kierownik może mieć własny profil danych w każdej aplikacji.</li>
      <li><strong>Bezpieczeństwo</strong> — szyfrowane połączenia HTTPS, uwierzytelnianie JWT, rate limiting, zabezpieczone API.</li>
      <li><strong>Powiadomienia push w przeglądarce</strong> — alerty o zbliżających się przeglądach sprzętu i wygasających certyfikatach pracowników.</li>
      <li><strong>Działa wszędzie</strong> — responsywny design: komputer, tablet, telefon. Bez instalacji, działa bezpośrednio w przeglądarce.</li>
      <li><strong>W 100% po polsku</strong> — cała platforma i wsparcie techniczne w języku polskim.</li>
      <li><strong>Szybki start</strong> — załóż konto, wybierz produkty, importuj dane z CSV. Bez konsultantów i długich wdrożeń.</li>
      <li><strong>7-dniowy free trial</strong> — przetestuj na planie Starter bez karty płatniczej.</li>
    </ul>
  </section>

  <!-- ═══ CENNIK ════════════════════════════════════════════════════════ -->
  <section id="cennik" aria-labelledby="pricing-heading">
    <h2 id="pricing-heading">Cennik OneHost — przejrzyste plany dla firm</h2>
    <p>Każdy produkt ma indywidualną cenę. Możesz kupić 1, 2 lub wszystkie 3 produkty — pakiet 3 narzędzi daje rabat 20%. Płatność roczna to dodatkowe ~20% rabatu.</p>

    <h3>Plan Starter — 7 dni za darmo (bez wymaganej karty)</h3>
    <table>
      <thead>
        <tr><th>Produkt</th><th>Cena miesięczna</th><th>Cena roczna</th><th>Limit</th></tr>
      </thead>
      <tbody>
        <tr><td>ShiftPlanner (grafiki pracy)</td><td>89 PLN / mies.</td><td>854 PLN / rok</td><td>Do 25 pracowników, 1 profil, 3 użytkowników</td></tr>
        <tr><td>Equipment Manager (przeglądy sprzętu)</td><td>59 PLN / mies.</td><td>566 PLN / rok</td><td>Do 25 elementów, 1 profil, 3 użytkowników</td></tr>
        <tr><td>CertTrack (certyfikaty)</td><td>79 PLN / mies.</td><td>758 PLN / rok</td><td>Do 25 pracowników, 1 profil, 3 użytkowników</td></tr>
      </tbody>
    </table>

    <h3>Plan Business (najpopularniejszy)</h3>
    <table>
      <thead>
        <tr><th>Produkt</th><th>Cena miesięczna</th><th>Cena roczna</th><th>Limit</th></tr>
      </thead>
      <tbody>
        <tr><td>ShiftPlanner</td><td>249 PLN / mies.</td><td>2390 PLN / rok</td><td>Do 100 pracowników, 3 profile, 10 użytkowników</td></tr>
        <tr><td>Equipment Manager</td><td>169 PLN / mies.</td><td>1622 PLN / rok</td><td>Do 100 elementów, 3 profile, 10 użytkowników</td></tr>
        <tr><td>CertTrack</td><td>199 PLN / mies.</td><td>1910 PLN / rok</td><td>Do 100 pracowników, 3 profile, 10 użytkowników</td></tr>
      </tbody>
    </table>

    <h3>Plan Enterprise</h3>
    <table>
      <thead>
        <tr><th>Produkt</th><th>Cena miesięczna</th><th>Cena roczna</th><th>Limit</th></tr>
      </thead>
      <tbody>
        <tr><td>ShiftPlanner</td><td>499 PLN / mies.</td><td>4790 PLN / rok</td><td>Do 500 pracowników, 10 profili, bez limitu użytkowników</td></tr>
        <tr><td>Equipment Manager</td><td>349 PLN / mies.</td><td>3350 PLN / rok</td><td>Do 500 elementów, 10 profili, bez limitu użytkowników</td></tr>
        <tr><td>CertTrack</td><td>399 PLN / mies.</td><td>3830 PLN / rok</td><td>Do 500 pracowników, 10 profili, bez limitu użytkowników</td></tr>
      </tbody>
    </table>

    <p><a href="/register" class="cta-primary">Wypróbuj 7 dni za darmo →</a></p>
  </section>

  <!-- ═══ FAQ ════════════════════════════════════════════════════════════ -->
  <section id="faq" aria-labelledby="faq-heading">
    <h2 id="faq-heading">Często zadawane pytania (FAQ)</h2>

    <dl>
      <div class="faq-item">
        <dt>Czym jest OneHost?</dt>
        <dd>OneHost to platforma łącząca trzy narzędzia dla firm: ShiftPlanner (grafiki pracy i system zmianowy), Equipment Manager (przeglądy sprzętu i maszyn) i CertTrack (certyfikaty i uprawnienia pracowników). Wszystkie płatności i zarządzanie kontem odbywają się w jednym panelu.</dd>
      </div>
      <div class="faq-item">
        <dt>Czy mogę wypróbować za darmo?</dt>
        <dd>Tak — plan Starter oferuje 7-dniowy darmowy okres próbny bez wymaganej karty płatniczej. Po zakończeniu trialu możesz samodzielnie uruchomić płatną subskrypcję.</dd>
      </div>
      <div class="faq-item">
        <dt>Ile kosztuje OneHost?</dt>
        <dd>Każdy produkt ma indywidualną cenę zależną od planu. Na planie Starter: ShiftPlanner — 89 PLN/mies., CertTrack — 79 PLN/mies., Equipment Manager — 59 PLN/mies. Możesz kupić 1, 2 lub 3 produkty. Pakiet 3 produktów daje rabat 20%, a płatność roczna dodatkowe ~20% rabatu.</dd>
      </div>
      <div class="faq-item">
        <dt>Czy dane mojej firmy są bezpieczne?</dt>
        <dd>Tak. Każda firma ma całkowicie oddzielone dane (architektura multi-tenant). Stosujemy szyfrowane połączenia HTTPS, uwierzytelnianie JWT i rate limiting.</dd>
      </div>
      <div class="faq-item">
        <dt>Jak działa system wielu użytkowników?</dt>
        <dd>Admin firmy może zapraszać kolejnych użytkowników (np. kierowników, managerów) — wszyscy współdzielą dane firmy. Każdy użytkownik ma własne konto i hasło.</dd>
      </div>
      <div class="faq-item">
        <dt>Czym jest profil danych?</dt>
        <dd>Profil to oddzielna baza danych w ramach jednej firmy — np. dla różnych oddziałów lub działów. Na planie Starter masz 1 profil na aplikację, Business — 3 profile, Enterprise — 10 profili.</dd>
      </div>
      <div class="faq-item">
        <dt>Jak zacząć?</dt>
        <dd>Załóż konto na sklep.onehost.site, wybierz plan Starter z 7-dniowym trialem. Dane możesz zaimportować z pliku CSV. Cały proces zajmuje kilka minut bez konsultantów.</dd>
      </div>
    </dl>
  </section>

  <!-- ═══ CTA ════════════════════════════════════════════════════════════ -->
  <section>
    <h2>Gotowy na porządek w firmie?</h2>
    <p>Załóż konto i wypróbuj plan Starter przez 7 dni za darmo. Bez karty płatniczej.</p>
    <a href="/register" class="cta-primary">Załóż konto — 7 dni za darmo →</a>
    <a href="mailto:Admin@onehost.site" class="cta-secondary">Napisz do nas</a>
  </section>

</main>

<footer role="contentinfo">
  <p>
    <strong><a href="${BASE_URL}/">OneHost</a></strong> — platforma do zarządzania firmą: grafiki pracy, przeglądy sprzętu, certyfikaty pracowników.
  </p>
  <nav aria-label="Nawigacja stopki">
    <strong>Produkty:</strong>
    <a href="/#produkty">ShiftPlanner — grafiki pracy</a> ·
    <a href="/#produkty">Equipment Manager — przeglądy sprzętu</a> ·
    <a href="/#produkty">CertTrack — certyfikaty pracowników</a>
  </nav>
  <nav>
    <a href="/guide">Poradnik</a> ·
    <a href="/terms">Regulamin</a> ·
    <a href="/privacy">Polityka prywatności</a> ·
    <a href="/login">Logowanie</a> ·
    <a href="/register">Rejestracja</a> ·
    <a href="mailto:Admin@onehost.site">Kontakt: Admin@onehost.site</a>
  </nav>
  <p>&copy; ${new Date().getFullYear()} OneHost. Wszelkie prawa zastrzeżone.</p>
</footer>

</body>
</html>`;

// ── Guide page (/guide) ─────────────────────────────────────────────────────
const GUIDE = `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Poradnik OneHost — jak korzystać z ShiftPlanner, Equipment Manager i CertTrack</title>
  <meta name="description" content="Instrukcja obsługi platformy OneHost: jak ustawić grafiki pracy w ShiftPlanner, zarządzać przeglądami sprzętu w Equipment Manager i certyfikatami w CertTrack." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${BASE_URL}/guide" />
  <meta property="og:title" content="Poradnik OneHost — instrukcja obsługi platformy" />
  <meta property="og:description" content="Dowiedz się jak skonfigurować ShiftPlanner, Equipment Manager i CertTrack krok po kroku." />
  <meta property="og:url" content="${BASE_URL}/guide" />
  <meta property="og:site_name" content="OneHost" />
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 0 1rem; color: #1e293b; line-height: 1.7; }
    nav { display: flex; gap: 1.5rem; padding: 1rem 0; border-bottom: 1px solid #e2e8f0; }
    nav a { color: #475569; text-decoration: none; }
    h1 { font-size: 2rem; font-weight: 800; margin: 2rem 0 1rem; }
    h2 { font-size: 1.5rem; font-weight: 700; margin: 2.5rem 0 0.75rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem; }
    h3 { font-size: 1.15rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
    footer { border-top: 1px solid #e2e8f0; padding: 2rem 0; margin-top: 3rem; font-size: 0.85rem; color: #64748b; }
  </style>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": "Poradnik OneHost",
    "url": "${BASE_URL}/guide",
    "description": "Instrukcja obsługi platformy OneHost: ShiftPlanner, Equipment Manager, CertTrack.",
    "isPartOf": { "@type": "WebSite", "name": "OneHost", "url": "${BASE_URL}" }
  }
  </script>
</head>
<body>
<nav>
  <a href="/"><strong>OneHost</strong></a>
  <a href="/#produkty">Produkty</a>
  <a href="/#cennik">Cennik</a>
  <a href="/guide">Poradnik</a>
  <a href="/login">Logowanie</a>
  <a href="/register">Rejestracja</a>
</nav>
<main>
  <h1>Poradnik OneHost — instrukcja obsługi platformy</h1>
  <p>Dowiedz się, jak szybko skonfigurować i korzystać z każdego narzędzia OneHost: ShiftPlanner do planowania grafiku pracy, Equipment Manager do zarządzania przeglądami sprzętu i CertTrack do ewidencji certyfikatów pracowników.</p>

  <h2>Pierwsze kroki — zakładanie konta</h2>
  <ol>
    <li>Wejdź na <a href="/register">sklep.onehost.site/register</a> i utwórz konto firmowe.</li>
    <li>Wybierz plan Starter — 7 dni za darmo, bez karty płatniczej.</li>
    <li>Wybierz produkty: ShiftPlanner, Equipment Manager i/lub CertTrack.</li>
    <li>Potwierdź adres e-mail i zaloguj się do panelu.</li>
  </ol>

  <h2>ShiftPlanner — planowanie grafiku pracy</h2>
  <h3>Jak skonfigurować system zmian?</h3>
  <p>ShiftPlanner wspiera dowolny układ zmian: standardowe 8-godzinne, 2-zmianowy, 3-zmianowy, 4-brygadowy (praca ciągła), 12-godzinny, weekendowy oraz całkowicie własny. W ustawieniach definiujesz nazwy zmian, godziny i kolory.</p>

  <h3>Dodawanie pracowników i przypisywanie do zmian</h3>
  <p>Przejdź do sekcji „Pracownicy", dodaj listę lub zaimportuj z CSV. Następnie w widoku kalendarza lub tygodniowego planisty przypisuj zmiany. Możesz definiować pary pracowników i stanowiska.</p>

  <h3>Zarządzanie urlopami</h3>
  <p>W sekcji „Urlopy" zaznaczasz dni wolne dla każdego pracownika. System automatycznie uwzględnia je przy planowaniu grafiku.</p>

  <h3>Eksport grafiku do PDF</h3>
  <p>Kliknij „Drukuj / Eksport PDF" — możesz wydrukować lub pobrać gotowy grafik pracy jako plik PDF.</p>

  <h2>Equipment Manager — zarządzanie przeglądami sprzętu</h2>
  <h3>Dodawanie sprzętu i maszyn</h3>
  <p>W sekcji „Baza danych" dodaj każde urządzenie: nazwę, numer seryjny, kategorię, daty przeglądów i kalibracji. Możesz importować dane z CSV.</p>

  <h3>Powiadomienia push o terminach</h3>
  <p>Włącz powiadomienia push w przeglądarce — system wyśle alert gdy zbliża się termin przeglądu lub kalibracji. Działa na komputerze i telefonie.</p>

  <h2>CertTrack — ewidencja certyfikatów i uprawnień</h2>
  <h3>Import pracowników i certyfikatów</h3>
  <p>Zaimportuj listę pracowników z CSV, następnie dodawaj certyfikaty, uprawnienia SEP, badania lekarskie i szkolenia. Każdy certyfikat ma datę wydania i datę wygaśnięcia.</p>

  <h3>Automatyczne powiadomienia o wygasaniu</h3>
  <p>System automatycznie przypomni o certyfikatach wygasających w ciągu 30, 14 i 7 dni. Możesz generować raporty PDF dla audytów.</p>

  <h2>Zarządzanie kontem i subskrypcją</h2>
  <p>W panelu administratora dodajesz użytkowników, zarządzasz profilami danych i subskrypcjami. Możesz zmienić plan lub dokupić nowe produkty w dowolnym momencie.</p>
</main>
<footer>
  <a href="/">OneHost</a> · <a href="/privacy">Polityka prywatności</a> · <a href="/terms">Regulamin</a> · <a href="mailto:Admin@onehost.site">Kontakt</a>
  <p>&copy; ${new Date().getFullYear()} OneHost. Wszelkie prawa zastrzeżone.</p>
</footer>
</body>
</html>`;

// ── Export map path → HTML ──────────────────────────────────────────────────
export const PRERENDERED = {
  '/':       LANDING,
  '/guide':  GUIDE,
};
