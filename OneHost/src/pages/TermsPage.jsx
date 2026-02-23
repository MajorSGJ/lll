import React from 'react';
import { Link } from 'react-router-dom';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">OH</div>
            <span className="text-xl font-bold text-slate-800">OneHost</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Polityka prywatności</Link>
            <Link to="/" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">← Strona główna</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Regulamin świadczenia usług OneHost</h1>
        <p className="text-sm text-slate-400 mb-8">Ostatnia aktualizacja: 21 lutego 2026 r.</p>

        <div className="prose prose-slate max-w-none space-y-8 text-sm text-slate-600">

          {/* §1 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§1. Definicje</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li><strong>Usługodawca</strong> — OneHost, platforma SaaS dostępna pod adresem <strong>sklep.onehost.site</strong>, kontakt: <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>.</li>
              <li><strong>Usługobiorca / Użytkownik</strong> — osoba fizyczna prowadząca działalność gospodarczą, osoba prawna lub jednostka organizacyjna, która zawarła umowę o świadczenie usług drogą elektroniczną z Usługodawcą poprzez rejestrację na Platformie.</li>
              <li><strong>Platforma</strong> — serwis internetowy OneHost wraz z podstronami i aplikacjami: ShiftPlanner, Equipment Manager, CertTrack.</li>
              <li><strong>Konto</strong> — indywidualne konto Użytkownika chronione adresem e-mail (loginem) i hasłem, umożliwiające korzystanie z Platformy.</li>
              <li><strong>Konto Firmowe (Tenant)</strong> — wspólna przestrzeń danych firmy, do której mogą być zaproszeni dodatkowi Użytkownicy.</li>
              <li><strong>Trial (Okres Próbny)</strong> — bezpłatny 7-dniowy okres próbny dostępny wyłącznie w planie Starter, wymagający podania danych karty płatniczej w systemie Stripe.</li>
              <li><strong>Plan</strong> — pakiet funkcjonalności (Starter, Business, Enterprise) wykupywany w cyklu miesięcznym lub rocznym.</li>
              <li><strong>Profil Danych</strong> — oddzielna baza danych / zestaw danych w ramach jednego Konta Firmowego, przypisana do konkretnej aplikacji. Limit profili jest liczony osobno dla każdej aplikacji.</li>
              <li><strong>Produkt / Aplikacja</strong> — jedna z trzech aplikacji: ShiftPlanner, Equipment Manager, CertTrack.</li>
              <li><strong>Subskrypcja</strong> — okres świadczenia usług na podstawie wykupionego Planu, odnawiany automatycznie, jeśli nie zostanie anulowany przez Użytkownika.</li>
            </ol>
          </section>

          {/* §2 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§2. Postanowienia ogólne</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Niniejszy Regulamin określa zasady korzystania z Platformy OneHost i stanowi umowę pomiędzy Usługodawcą a Usługobiorcą.</li>
              <li>Korzystanie z Platformy jest równoznaczne z akceptacją niniejszego Regulaminu oraz <Link to="/privacy" className="text-teal-600 underline">Polityki Prywatności</Link>, która stanowi integralną część Regulaminu.</li>
              <li>Usługodawca świadczy usługi drogą elektroniczną 24 godziny na dobę, 7 dni w tygodniu, z zastrzeżeniem przerw technicznych, serwisowych i modernizacyjnych.</li>
              <li>Platforma jest przeznaczona wyłącznie dla podmiotów prowadzących działalność gospodarczą (B2B). Użytkownik oświadcza, że korzysta z Platformy w związku z prowadzoną działalnością zawodową lub gospodarczą.</li>
              <li>Usługodawca zastrzega sobie prawo do wprowadzania zmian w funkcjonalnościach Platformy, w tym dodawania nowych funkcji oraz modyfikacji istniejących, bez uprzedniego powiadomienia, o ile nie wpływa to istotnie na zakres świadczonych usług.</li>
              <li>Wymagania techniczne: przeglądarka internetowa z obsługą JavaScript (Chrome, Firefox, Edge, Safari w aktualnych wersjach), połączenie z Internetem.</li>
            </ol>
          </section>

          {/* §3 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§3. Rejestracja i Konto</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Rejestracja wymaga podania: nazwy firmy, imienia i nazwiska osoby rejestrującej, adresu e-mail oraz hasła (minimum 6 znaków).</li>
              <li>Użytkownik zobowiązuje się do podania prawdziwych i aktualnych danych. Usługodawca nie ponosi odpowiedzialności za skutki podania nieprawdziwych danych.</li>
              <li>Po rejestracji na podany adres e-mail wysyłany jest link weryfikacyjny. Weryfikacja adresu e-mail jest zalecaną częścią procesu rejestracji.</li>
              <li>Właściciel Konta Firmowego (administrator) może zapraszać dodatkowych Użytkowników. Zaproszeni Użytkownicy logują się własnymi danymi, ale współdzielą dane firmowe w ramach jednego Konta Firmowego.</li>
              <li>Użytkownik odpowiada za poufność swoich danych logowania. Wszelkie działania wykonane z użyciem Konta Użytkownika uważa się za dokonane przez tego Użytkownika.</li>
              <li>Usługodawca zastrzega sobie prawo do zawieszenia lub usunięcia Kont, które naruszają postanowienia niniejszego Regulaminu lub obowiązujące prawo.</li>
            </ol>
          </section>

          {/* §4 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§4. Okres Próbny (Trial)</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Bezpłatny okres próbny trwa <strong>7 dni kalendarzowych</strong> i jest dostępny wyłącznie przy pierwszej rejestracji w planie Starter.</li>
              <li>Rozpoczęcie okresu próbnego wymaga podania danych karty płatniczej w systemie Stripe. Dane karty są przetwarzane wyłącznie przez Stripe Inc. — Usługodawca nie przechowuje ani nie ma dostępu do pełnych danych karty.</li>
              <li>Po upływie 7 dni karta zostaje automatycznie obciążona kwotą odpowiadającą wybranemu planowi i wybranym produktom, chyba że Użytkownik anuluje subskrypcję przed upływem okresu próbnego.</li>
              <li>Użytkownik może anulować subskrypcję w dowolnym momencie trwania okresu próbnego bez ponoszenia jakichkolwiek kosztów.</li>
              <li>Okres próbny może być wykorzystany jednokrotnie na jeden adres e-mail / jedno Konto Firmowe.</li>
              <li>W trakcie okresu próbnego Użytkownik ma pełny dostęp do wszystkich funkcjonalności wybranego planu.</li>
            </ol>
          </section>

          {/* §5 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§5. Plany, ceny i płatności</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Platforma oferuje trzy plany: <strong>Starter</strong>, <strong>Business</strong> i <strong>Enterprise</strong>, różniące się limitami pracowników, przypisań użytkowników do profilu i profili danych.</li>
              <li>Każdy produkt (ShiftPlanner, Equipment Manager, CertTrack) ma indywidualną cenę zależną od wybranego planu. Aktualne ceny są widoczne na stronie głównej Platformy w sekcji „Cennik".</li>
              <li>
                Orientacyjne ceny miesięczne za jeden produkt (mogą ulec zmianie):
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>ShiftPlanner: Starter 89 PLN, Business 249 PLN, Enterprise 499 PLN</li>
                  <li>Equipment Manager: Starter 59 PLN, Business 169 PLN, Enterprise 349 PLN</li>
                  <li>CertTrack: Starter 79 PLN, Business 199 PLN, Enterprise 399 PLN</li>
                </ul>
              </li>
              <li>Przy zakupie pakietu wszystkich trzech produktów obowiązuje rabat <strong>20%</strong> od łącznej kwoty.</li>
              <li>Przy wyborze rozliczenia rocznego obowiązuje zniżka ok. <strong>20%</strong> w porównaniu do płatności miesięcznej.</li>
              <li>Wszystkie podane ceny są cenami brutto w PLN.</li>
              <li>Płatności obsługiwane są przez <strong>Stripe Inc.</strong> Usługodawca nie przechowuje danych kart płatniczych.</li>
              <li>Subskrypcja odnawia się automatycznie na koniec każdego okresu rozliczeniowego (miesiąc lub rok). Anulowanie jest możliwe w panelu rozliczeniowym w Platformie.</li>
              <li>Usługodawca zastrzega sobie prawo do zmiany cen. O zmianach Użytkownicy zostaną poinformowani z co najmniej 30-dniowym wyprzedzeniem drogą e-mail lub poprzez powiadomienie na Platformie. Nowe ceny obowiązują od następnego okresu rozliczeniowego.</li>
              <li>W przypadku nieudanej płatności Usługodawca podejmie próby ponownego obciążenia karty. W razie niepowodzenia dostęp do Platformy może zostać zawieszony do czasu uregulowania należności.</li>
            </ol>
          </section>

          {/* §6 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§6. Limity planów</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                Każdy plan definiuje limity:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li><strong>Starter:</strong> do 25 pracowników, do 3 przypisań użytkowników do profilu, 1 profil danych na aplikację</li>
                  <li><strong>Business:</strong> do 100 pracowników, do 10 przypisań użytkowników do profilu, 3 profile danych na aplikację</li>
                  <li><strong>Enterprise:</strong> do 500 pracowników, bez limitu przypisań użytkowników do profilu, 10 profili danych na aplikację</li>
                </ul>
              </li>
              <li>Limit profili danych jest naliczany <strong>osobno na każdą aplikację</strong>. Na planie Starter z 1 profilem Użytkownik może mieć po jednym profilu dla ShiftPlanner, Equipment Manager i CertTrack (łącznie 3 profile).</li>
              <li>Po przekroczeniu limitu pracowników, przypisań użytkowników do profilu lub profili, dodawanie kolejnych jest blokowane do czasu zmiany planu na wyższy.</li>
              <li>Usługodawca zastrzega sobie prawo do modyfikacji limitów w ramach planów, z zachowaniem co najmniej 30-dniowego powiadomienia Użytkowników.</li>
            </ol>
          </section>

          {/* §7 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§7. Produkty i funkcjonalności</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>
                <strong>ShiftPlanner</strong> — aplikacja do planowania grafików zmianowych:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Dowolne systemy zmianowe (2-zmianowy, 3-zmianowy, 4-brygadowy, 12h, własne konfiguracje)</li>
                  <li>Konfiguracja godzin i nazw zmian</li>
                  <li>Wyłączanie dni z planowania (niedziele, święta, dowolne dni tygodnia)</li>
                  <li>Zarządzanie urlopami z detekcją konfliktów</li>
                  <li>Stanowiska i pary pracowników</li>
                  <li>Drukowanie i eksport do PDF (przez przeglądarkę) oraz CSV</li>
                  <li>Wiele profili danych (oddziały, działy)</li>
                </ul>
              </li>
              <li>
                <strong>Equipment Manager</strong> — aplikacja do zarządzania przeglądami sprzętu:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Ewidencja sprzętu z terminami przeglądów, kalibracji i inspekcji</li>
                  <li>Powiadomienia w przeglądarce (Web Notifications API — wymagana otwarta karta przeglądarki)</li>
                  <li>Kategorie sprzętu i typy kontroli (konfigurowalne)</li>
                  <li>Parametry narzędzi z szablonami</li>
                  <li>Eksport / import danych (format JSON)</li>
                  <li>Filtrowanie i sortowanie po wielu kryteriach</li>
                </ul>
              </li>
              <li>
                <strong>CertTrack</strong> — aplikacja do ewidencji certyfikatów i uprawnień:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>Baza danych certyfikatów, uprawnień i szkoleń pracowników</li>
                  <li>Automatyczne powiadomienia e-mail o zbliżających się terminach wygaśnięcia</li>
                  <li>Raporty PDF pracowników (generowane na serwerze)</li>
                  <li>Import danych z plików CSV</li>
                  <li>Konfigurowalne kategorie dokumentów</li>
                  <li>System ról (admin, manager, viewer)</li>
                </ul>
              </li>
              <li>Usługodawca zastrzega sobie prawo do modyfikacji, rozszerzania lub ograniczania funkcjonalności Produktów. Istotne zmiany będą komunikowane Użytkownikom.</li>
              <li>Powiadomienia push w Equipment Manager wykorzystują Web Notifications API przeglądarki i działają wyłącznie, gdy aplikacja jest otwarta w karcie przeglądarki. Nie są to powiadomienia typu push w rozumieniu mobilnych systemów operacyjnych.</li>
            </ol>
          </section>

          {/* §8 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§8. Ochrona danych i bezpieczeństwo</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Dane każdej firmy (Konta Firmowego) są w pełni odizolowane od danych innych firm — architektura multi-tenant z separacją na poziomie bazy danych.</li>
              <li>Połączenia z Platformą są szyfrowane protokołem HTTPS/TLS.</li>
              <li>Uwierzytelnianie Użytkowników odbywa się za pomocą tokenów JWT (JSON Web Token).</li>
              <li>Hasła Użytkowników są przechowywane w formie zahaszowanej algorytmem bcrypt i nie są przechowywane w postaci jawnej.</li>
              <li>Usługodawca stosuje ograniczenie częstotliwości zapytań (rate limiting) w celu ochrony przed atakami typu brute-force.</li>
              <li>Szczegółowe informacje o przetwarzaniu danych osobowych znajdują się w <Link to="/privacy" className="text-teal-600 underline">Polityce Prywatności</Link>.</li>
              <li>Usługodawca dokłada wszelkich starań w celu zabezpieczenia danych, jednak nie gwarantuje całkowitego bezpieczeństwa transmisji danych w sieci Internet.</li>
            </ol>
          </section>

          {/* §9 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§9. Prawa i obowiązki Użytkownika</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Użytkownik zobowiązuje się do korzystania z Platformy zgodnie z obowiązującym prawem i niniejszym Regulaminem.</li>
              <li>Użytkownik nie może: podejmować prób nieautoryzowanego dostępu do danych innych Użytkowników, ingerować w działanie Platformy, automatycznie pobierać danych (scraping), ani udostępniać swojego Konta osobom trzecim.</li>
              <li>Użytkownik jest odpowiedzialny za prawdziwość, kompletność i aktualność danych wprowadzanych do Platformy.</li>
              <li>Użytkownik powinien regularnie tworzyć kopie zapasowe swoich danych (eksport dostępny w każdej aplikacji).</li>
              <li>Użytkownik zobowiązuje się do niezwłocznego powiadomienia Usługodawcy o każdym przypadku nieautoryzowanego dostępu do Konta.</li>
            </ol>
          </section>

          {/* §10 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§10. Odpowiedzialność Usługodawcy</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Usługodawca dokłada wszelkich starań, aby Platforma działała bez zakłóceń i była dostępna 24/7, jednak <strong>nie gwarantuje nieprzerwanej dostępności</strong> (SLA nie jest oferowane).</li>
              <li>Usługodawca nie ponosi odpowiedzialności za:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>szkody wynikające z niewłaściwego korzystania z Platformy przez Użytkownika;</li>
                  <li>utratę danych spowodowaną okolicznościami niezależnymi od Usługodawcy (np. awarie sprzętowe, ataki hakerskie, siła wyższa);</li>
                  <li>przerwy w dostępie wynikające z planowanych prac konserwacyjnych, awarii infrastruktury lub dostawców usług hostingowych;</li>
                  <li>decyzje biznesowe Użytkownika podjęte na podstawie danych z Platformy;</li>
                  <li>skutki podania przez Użytkownika nieprawdziwych lub nieaktualnych danych.</li>
                </ul>
              </li>
              <li>Całkowita odpowiedzialność Usługodawcy wobec Użytkownika z jakiegokolwiek tytułu jest ograniczona do kwoty opłat uiszczonych przez Użytkownika w ciągu ostatnich 3 miesięcy.</li>
              <li>Usługodawca nie ponosi odpowiedzialności za utracone korzyści (lucrum cessans).</li>
            </ol>
          </section>

          {/* §11 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§11. Rozwiązanie umowy i anulowanie subskrypcji</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Użytkownik może anulować subskrypcję w dowolnym momencie za pośrednictwem panelu rozliczeniowego w Platformie lub portalu Stripe.</li>
              <li>Po anulowaniu subskrypcji dostęp do Platformy trwa do końca opłaconego okresu rozliczeniowego. Po jego upływie Konto zostaje dezaktywowane. Brak zwrotu opłat za rozpoczęty okres.</li>
              <li>Usługodawca może rozwiązać umowę ze skutkiem natychmiastowym w przypadku istotnego naruszenia Regulaminu przez Użytkownika, w szczególności:
                <ul className="list-disc pl-6 mt-1 space-y-1">
                  <li>próby nieautoryzowanego dostępu do danych innych Użytkowników;</li>
                  <li>wykorzystywania Platformy do celów niezgodnych z prawem;</li>
                  <li>działań zagrażających bezpieczeństwu Platformy.</li>
                </ul>
              </li>
              <li>Po rozwiązaniu umowy dane Użytkownika będą przechowywane przez okres <strong>30 dni</strong>, w trakcie których Użytkownik może zwrócić się o ich eksport. Po upływie tego okresu dane mogą zostać trwale usunięte.</li>
              <li>Użytkownik może w dowolnym momencie zażądać usunięcia swoich danych, kontaktując się pod adresem <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>.</li>
            </ol>
          </section>

          {/* §12 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§12. Własność intelektualna</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Platforma OneHost, jej kod źródłowy, interfejs graficzny, logo i dokumentacja stanowią własność intelektualną Usługodawcy i są chronione prawem autorskim.</li>
              <li>Użytkownik nabywa prawo do korzystania z Platformy wyłącznie w zakresie określonym niniejszym Regulaminem, na czas trwania subskrypcji.</li>
              <li>Dane wprowadzone przez Użytkownika do Platformy pozostają własnością Użytkownika.</li>
            </ol>
          </section>

          {/* §13 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§13. Reklamacje</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Reklamacje dotyczące funkcjonowania Platformy należy zgłaszać na adres: <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>.</li>
              <li>Reklamacja powinna zawierać: opis problemu, datę wystąpienia, adres e-mail Użytkownika oraz oczekiwany sposób rozwiązania.</li>
              <li>Usługodawca rozpatrzy reklamację w terminie <strong>14 dni roboczych</strong> od jej otrzymania i poinformuje Użytkownika o wyniku drogą e-mail.</li>
            </ol>
          </section>

          {/* §14 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§14. Postanowienia końcowe</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Usługodawca zastrzega sobie prawo do zmiany niniejszego Regulaminu. O istotnych zmianach Użytkownicy zostaną poinformowani drogą e-mail lub poprzez powiadomienie na Platformie z co najmniej 14-dniowym wyprzedzeniem.</li>
              <li>Dalsze korzystanie z Platformy po wejściu w życie zmian Regulaminu jest równoznaczne z ich akceptacją.</li>
              <li>W sprawach nieuregulowanych niniejszym Regulaminem zastosowanie mają przepisy prawa polskiego, w szczególności Kodeksu cywilnego i ustawy o świadczeniu usług drogą elektroniczną.</li>
              <li>Wszelkie spory wynikające z niniejszego Regulaminu będą rozstrzygane przez sąd właściwy dla siedziby Usługodawcy.</li>
              <li>Jeżeli jakiekolwiek postanowienie Regulaminu okaże się nieważne lub nieskuteczne, nie wpływa to na ważność pozostałych postanowień.</li>
              <li>Regulamin wchodzi w życie z dniem 21 lutego 2026 r.</li>
            </ol>
          </section>

          {/* §15 */}
          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-3">§15. Powierzenie danych osobowych (DPA)</h2>
            <ol className="list-decimal pl-6 space-y-2">
              <li>Użytkownik powierza Usługodawcy dane osobowe niezbędne do świadczenia usług oferowanych w ramach Platformy.</li>
              <li>Usługodawca przetwarza dane osobowe wyłącznie w zakresie określonym w niniejszym Regulaminie oraz w <Link to="/privacy" className="text-teal-600 underline">Polityce Prywatności</Link>, zgodnie z obowiązującymi przepisami prawa, w tym Rozporządzeniem Parlamentu Europejskiego i Rady (UE) 2016/679 (RODO).</li>
              <li>Usługodawca zobowiązuje się wdrożyć odpowiednie środki techniczne i organizacyjne w celu zapewnienia bezpieczeństwa danych osobowych.</li>
              <li>Dane Użytkownika nie będą udostępniane osobom trzecim, poza sytuacjami wymaganymi przez prawo lub przez systemy płatności (np. Stripe), zgodnie z <Link to="/privacy" className="text-teal-600 underline">Polityką Prywatności</Link>.</li>
              <li>Użytkownik ma prawo do żądania kopii, modyfikacji lub usunięcia danych osobowych w każdym czasie, kontaktując się pod adresem <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>.</li>
            </ol>
          </section>

          <section className="mt-12 pt-8 border-t border-slate-200">
            <p className="text-slate-500">
              Kontakt z Usługodawcą: <a href="mailto:Admin@onehost.site" className="text-teal-600 underline">Admin@onehost.site</a>
            </p>
            <p className="text-slate-400 mt-2">
              Zobacz też: <Link to="/privacy" className="text-teal-600 underline">Polityka Prywatności</Link>
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
