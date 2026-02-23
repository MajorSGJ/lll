import React from 'react';
import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';

export default function PrivacyPage() {
  useSEO({
    title: 'Polityka Prywatności | OneHost',
    description: 'Polityka prywatności platformy OneHost. Dowiedz się, jak chronimy Twoje dane osobowe i informacje o Twojej firmie.',
    ogUrl: 'https://sklep.onehost.site/privacy'
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">OH</div>
            <span className="text-xl font-bold text-slate-800">OneHost</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/terms" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Regulamin</Link>
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">← Strona główna</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Polityka Prywatności OneHost</h1>
        <p className="text-sm text-slate-400 mb-8">Ostatnia aktualizacja: 21 lutego 2026 r.</p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm text-slate-600">

          {/* §1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§1. Administrator danych osobowych</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Administratorem danych osobowych jest OneHost, platforma SaaS dostępna pod adresem <strong>sklep.onehost.site</strong>.</li>
              <li>Kontakt z Administratorem: <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>.</li>
              <li>Administrator przetwarza dane osobowe zgodnie z Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 z dnia 27 kwietnia 2016 r. (RODO) oraz polskimi przepisami o ochronie danych osobowych.</li>
            </ol>
          </section>

          {/* §2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§2. Zakres zbieranych danych</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                W ramach rejestracji i korzystania z Platformy zbierane są następujące dane:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Dane rejestracyjne:</strong> nazwa firmy, imię i nazwisko, adres e-mail, hasło (przechowywane w formie zahaszowanej)</li>
                  <li><strong>Dane rozliczeniowe:</strong> identyfikator klienta Stripe, identyfikator subskrypcji (dane karty płatniczej nie są przechowywane przez OneHost — obsługuje je Stripe Inc.)</li>
                  <li><strong>Dane techniczne:</strong> adres IP, typ i wersja przeglądarki, system operacyjny, daty i godziny logowania</li>
                  <li><strong>Dane użytkowe:</strong> dane wprowadzane przez Użytkowników do aplikacji (dane pracowników, sprzętu, certyfikatów itp.)</li>
                </ul>
              </li>
              <li>Administrator nie zbiera danych wrażliwych (szczególnych kategorii danych osobowych w rozumieniu art. 9 RODO).</li>
            </ol>
          </section>

          {/* §3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§3. Cele i podstawy prawne przetwarzania</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Dane osobowe przetwarzane są w następujących celach:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Wykonanie umowy</strong> (art. 6 ust. 1 lit. b RODO) — świadczenie usług Platformy, zarządzanie Kontem, obsługa płatności</li>
                  <li><strong>Prawnie uzasadniony interes Administratora</strong> (art. 6 ust. 1 lit. f RODO) — zapewnienie bezpieczeństwa Platformy, zapobieganie nadużyciom, analiza i diagnostyka techniczna, komunikacja z Użytkownikami</li>
                  <li><strong>Obowiązek prawny</strong> (art. 6 ust. 1 lit. c RODO) — wypełnienie obowiązków podatkowych i rachunkowych</li>
                  <li><strong>Zgoda</strong> (art. 6 ust. 1 lit. a RODO) — wysyłka powiadomień e-mail o nowościach, zmianach cen, ogłoszeniach (zgoda może być w każdej chwili wycofana)</li>
                </ul>
              </li>
            </ol>
          </section>

          {/* §4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§4. Odbiorcy danych</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Dane osobowe mogą być przekazywane następującym podmiotom:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Stripe Inc.</strong> — operator płatności online, z siedzibą w USA (certyfikacja Data Privacy Framework), w celu obsługi transakcji płatniczych. <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">Polityka Prywatności Stripe</a>.</li>
                  <li><strong>Dostawcy usług hostingowych</strong> — w zakresie niezbędnym do przechowywania danych i utrzymania infrastruktury serwerowej</li>
                  <li><strong>Dostawcy usług e-mail (SMTP)</strong> — w zakresie niezbędnym do przesyłania wiadomości e-mail (weryfikacja konta, powiadomienia)</li>
                </ul>
              </li>
              <li>Administrator nie sprzedaje ani nie udostępnia danych osobowych stronom trzecim w celach marketingowych.</li>
              <li>W przypadku przekazywania danych do państw trzecich (poza EOG), Administrator zapewnia odpowiedni poziom ochrony danych zgodnie z rozdziałem V RODO (np. standardowe klauzule umowne, decyzja o adekwatności).</li>
            </ol>
          </section>

          {/* §5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§5. Pliki cookies i localStorage</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Platforma wykorzystuje mechanizm <strong>localStorage</strong> przeglądarki do przechowywania tokenu uwierzytelniającego (JWT) oraz preferencji interfejsu (np. zgoda na cookies, motyw kolorystyczny).</li>
              <li>Platforma może wykorzystywać pliki cookies sesyjne niezbędne do prawidłowego działania usługi.</li>
              <li>Platforma <strong>nie wykorzystuje</strong> cookies śledzących ani reklamowych. Nie korzystamy z Google Analytics ani podobnych narzędzi analityki stron trzecich.</li>
              <li>Użytkownik może zarządzać ustawieniami cookies w swojej przeglądarce. Wyłączenie obsługi localStorage/cookies może uniemożliwić korzystanie z Platformy.</li>
            </ol>
          </section>

          {/* §6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§6. Okres przechowywania danych</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Dane Konta:</strong> przechowywane przez cały okres trwania subskrypcji oraz <strong>30 dni</strong> po jej zakończeniu / anulowaniu.</li>
              <li><strong>Dane rozliczeniowe:</strong> przechowywane przez okres wymagany przepisami prawa podatkowego (co do zasady 5 lat od końca roku obrachunkowego).</li>
              <li><strong>Dane techniczne (logi):</strong> przechowywane do 12 miesięcy w celach bezpieczeństwa i diagnostyki.</li>
              <li>Po upływie okresów przechowywania dane są trwale usuwane lub anonimizowane.</li>
            </ol>
          </section>

          {/* §7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§7. Prawa Użytkowników</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Zgodnie z RODO, Użytkownikowi przysługują następujące prawa:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Prawo dostępu</strong> (art. 15 RODO) — prawo do uzyskania informacji o przetwarzaniu danych i otrzymania ich kopii</li>
                  <li><strong>Prawo do sprostowania</strong> (art. 16 RODO) — prawo do poprawienia nieprawidłowych lub niekompletnych danych</li>
                  <li><strong>Prawo do usunięcia</strong> (art. 17 RODO, „prawo do bycia zapomnianym") — prawo do żądania usunięcia danych, gdy nie są one dalej niezbędne</li>
                  <li><strong>Prawo do ograniczenia przetwarzania</strong> (art. 18 RODO) — prawo do żądania ograniczenia przetwarzania w określonych sytuacjach</li>
                  <li><strong>Prawo do przenoszenia danych</strong> (art. 20 RODO) — prawo do otrzymania danych w ustrukturyzowanym formacie (eksport danych jest dostępny w każdej aplikacji)</li>
                  <li><strong>Prawo do sprzeciwu</strong> (art. 21 RODO) — prawo do wniesienia sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym interesie</li>
                  <li><strong>Prawo do cofnięcia zgody</strong> — w dowolnym momencie, bez wpływu na zgodność z prawem przetwarzania dokonanego przed cofnięciem</li>
                </ul>
              </li>
              <li>W celu realizacji powyższych praw prosimy o kontakt: <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>. Żądania będą rozpatrywane w ciągu <strong>30 dni</strong>.</li>
              <li>Użytkownik ma prawo wniesienia skargi do Prezesa Urzędu Ochrony Danych Osobowych (PUODO), ul. Stawki 2, 00-193 Warszawa, <a href="https://uodo.gov.pl" target="_blank" rel="noopener noreferrer" className="text-teal-600 underline">uodo.gov.pl</a>.</li>
            </ol>
          </section>

          {/* §8 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§8. Bezpieczeństwo danych</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Administrator stosuje odpowiednie środki techniczne i organizacyjne w celu ochrony danych osobowych, w tym:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Szyfrowanie połączeń (HTTPS/TLS)</li>
                  <li>Hashowanie haseł algorytmem bcrypt</li>
                  <li>Izolacja danych poszczególnych firm (multi-tenant architecture)</li>
                  <li>Ograniczenie częstotliwości zapytań (rate limiting)</li>
                  <li>Nagłówki bezpieczeństwa HTTP (HSTS, Permissions-Policy)</li>
                  <li>Uwierzytelnianie tokenami JWT z określonym czasem ważności</li>
                </ul>
              </li>
              <li>Pomimo stosowania powyższych zabezpieczeń, Administrator nie może zagwarantować absolutnego bezpieczeństwa danych przesyłanych drogą elektroniczną.</li>
            </ol>
          </section>

          {/* §9 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§9. Powiadomienia e-mail</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Platforma wysyła wiadomości e-mail w następujących przypadkach:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Weryfikacja adresu e-mail po rejestracji</li>
                  <li>Powiadomienia o zmianach w subskrypcji lub cenach</li>
                  <li>Powiadomienia o zbliżających się terminach wygaśnięcia certyfikatów (CertTrack)</li>
                  <li>Ogłoszenia administratora (komunikaty systemowe, aktualizacje)</li>
                </ul>
              </li>
              <li>Użytkownik może zarządzać preferencjami powiadomień e-mail w ustawieniach Platformy.</li>
              <li>Wiadomości związane z bezpieczeństwem Konta (np. weryfikacja e-mail, zmiany dotyczące płatności) nie mogą być wyłączone.</li>
            </ol>
          </section>

          {/* §10 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§10. Zmiany Polityki Prywatności</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Administrator zastrzega sobie prawo do zmiany niniejszej Polityki Prywatności.</li>
              <li>O istotnych zmianach Użytkownicy zostaną poinformowani drogą e-mail lub za pośrednictwem powiadomienia w Platformie.</li>
              <li>Aktualna wersja Polityki Prywatności jest zawsze dostępna pod adresem <Link to="/privacy" className="text-teal-600 underline">sklep.onehost.site/privacy</Link>.</li>
              <li>Polityka Prywatności wchodzi w życie z dniem 21 lutego 2026 r.</li>
            </ol>
          </section>

          <section className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-500">
              Kontakt z Administratorem danych: <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>
            </p>
            <p className="text-slate-400 mt-2">
              Zobacz też: <Link to="/terms" className="text-teal-600 underline">Regulamin świadczenia usług</Link>
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} OneHost. Wszelkie prawa zastrzeżone.</p>
          <div className="mt-2 text-xs text-slate-500 flex justify-center gap-4">
            <Link to="/terms" className="hover:text-slate-300 transition-colors">Regulamin</Link>
            <Link to="/privacy" className="hover:text-slate-300 transition-colors">Polityka prywatności</Link>
            <a href="mailto:Admin@onehost.site" className="hover:text-slate-300 transition-colors">Admin@onehost.site</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
