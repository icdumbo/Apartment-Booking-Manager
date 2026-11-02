# Confidențialitate, solicitări de ștergere și backup Android

Stadiu: implementare sigură, **nepublicată și incompletă operațional**. Nu s-au
modificat servicii, conturi, trialuri, achiziții sau date reale. Nu există APK/AAB
nou. Politica și paginile web sunt proiecte; nu se furnizează URL-uri de producție.

## Ce este implementat

- `src/privacy-content.js`: aceeași politică RO/EN în aplicație și pe web, bazată
  pe fluxurile reale. Numele operatorului, temeiurile/transferurile și retenția
  sunt marcate neconfirmate, nu inventate. Adresa oficială de suport este confirmată și centralizată. `privacy-settings.js` conține numai
  configurări publice, implicit nule. Reclamele și cumpărarea sunt descrise ca
  dezactivate în configurația livrată.
- Acces permanent la Confidențialitate în Meniu, fără cont; solicitarea ștergerii
  apare numai autentificat. Nu schimbă ordinea celor șapte funcții sau licențierea.
- `src/legal/privacy.html` și `delete-account.html`: resurse publicabile fără
  autentificare pentru citire și fără instalarea aplicației. Formularul web devine
  utilizabil numai după configurare; Google GIS + Firebase Auth REST furnizează
  identitatea, cu token în memorie, nu în URL/localStorage.
- `/account-deletion`: numai înregistrare/status, nu ștergere. Reutilizează
  verificatorul Firebase existent (semnătură, proiect, provider, revocare). La
  cerere impune `auth_time` recent de maximum 5 minute și confirmare explicită.
  Nu acceptă UID de la client. Originea web este permisă numai pentru această
  rută; CORS și codul rutelor de licențiere rămân nemodificate.
- D1: un singur jurnal de cerere per UID, cu referință generată de server,
  dată, limbă și `pending_review`. Retry-ul este idempotent, inclusiv dacă insertul
  reușește și răspunsul eșuează. Se poate verifica din nou starea cu același cont.
  Confirmarea înseamnă **cerere înregistrată, nu cont șters**. Nu există stare
  automată `completed`, executor Firebase, revocare Play sau ștergere D1 existentă.

## Informații obligatorii de confirmat înainte de publicare

### Un singur loc de completare: `src/privacy-settings.js`

Nu se copiază numele, e-mailul sau perioadele în fișierele RO/EN. Randarea web și
cea din aplicație folosesc aceeași configurație și același conținut.

| Câmp | Ce trebuie completat / verificat |
| --- | --- |
| `controllerType` | `individual`, deja confirmat; nu se introduce domiciliul |
| `operator` | Numele legal real al titularului Play, încă necompletat |
| `contact` | Adresa oficială de suport/confidențialitate confirmată, definită o singură dată în acest fișier |
| `retentionPolicy.ro`, `.en` | Aceleași perioade și excepții aprobate, în cele două limbi; nu o singură frază RO în politica EN |
| `processingPolicy.ro`, `.en` | Rolurile/temeiurile și condițiile transferurilor menționate în proiectul politicii, confirmate de operator |
| `publicBaseUrl` | Directorul HTTPS real cu paginile, fără credențiale, query sau fragment; cale terminată cu `/` |
| `publicationApproved` | Rămâne `false` până la aprobarea întregului conținut și verificarea paginilor pe hosting |
| `deletionEndpoint` | Endpointul HTTPS real `/account-deletion`, fără token în URL |
| `deletionBackendVerified` | Rămâne `false` până la verificarea backendului real; nu activează variabila server |
| `webClientId`, `firebaseApiKey` | Configurație publică pentru autentificarea web; fără chei administrative |
| `automaticBackup` | `excluded`, alegere deja aprobată și implementată; nu se schimbă aici |

`privacyConfigurationIssues()` enumeră câmpurile obligatorii lipsă/invalide.
`publicLegalUrls()` derivă cele patru URL-uri RO/EN pentru politică și ștergere
dintr-o singură adresă de bază. Aceste funcții verifică configurația/formatul,
**nu dovedesc că hostingul există sau că operatorul a făcut verificarea externă**.
Nu se furnizează un URL real până la publicarea și verificarea efectivă.

`isPrivacyPublicationReady()` verifică toate câmpurile și aprobarea explicită.
`isDeletionBackendReady()` adaugă verificarea backendului și endpointului; aceasta
este folosită și în aplicația Android. `isDeletionWebReady()` adaugă OAuth web.
În configurația comisă toate rămân false, iar pe server
`DELETION_REQUESTS_ENABLED=false` rămâne neschimbat. Nu există formular activ sau
reautentificare pentru cerere în aplicație dacă backendul nu a fost confirmat.

Politica poate fi citită fără autentificare și când formularele sunt dezactivate.
Legăturile dintre pagini și URL-ul la schimbarea limbii păstrează RO/EN. Avertizarea
de proiect dispare numai când informațiile și aprobarea sunt complete; aceasta nu
este o certificare juridică sau o dovadă a executării ștergerii.

1. Numele legal al operatorului persoană fizică titulară a contului Google Play și contactul public pentru confidențialitate. Tipul operatorului și contactul de suport sunt confirmate; numele legal rămâne necompletat. Nu se introduce adresa de domiciliu.
2. Politica de retenție pentru UID, trialuri, licențe, tranzacții, tokenuri criptate
   și jurnalul cererilor; scopul și justificarea oricărei păstrări anti-abuz.
   Nu este stabilit un termen fiscal sau un termen de procesare neverificat.
3. Jurisdicția, temeiurile, destinatarii și condițiile transferurilor internaționale.
4. Alegerea pentru backupul automat este **aprobată de proprietar la 2 noiembrie 2026**: excludere completă cloud și D2D, cu JSON manual și toate datele existente păstrate.
5. Hostingul public, domeniul HTTPS, OAuth web și domeniile Firebase autorizate.
   Operatorul trebuie să verifice și declarațiile Data Safety după configurare.

## Configurări externe, doar după aprobare

1. Publică paginile împreună cu modulele/CSS relative necesare pe hostingul HTTPS
   aprobat, fără login pentru citire. Verifică accesul direct la ambele pagini,
   în RO/EN, și setările de securitate ale hostingului. Nu folosi un link GitHub
   către sursă drept politică publicată. Actualizează Console numai după verificare.
2. Configurează clientul OAuth web în proiectul Firebase existent și autorizează
   domeniul real. Completează numai valorile publice în `privacy-settings.js`:
   `webClientId`, `firebaseApiKey`, `deletionEndpoint` (HTTPS, `/account-deletion`). `publicationApproved` rămâne false până la completarea și aprobarea operatorului, contactului și retenției; formularul web verifică și aceste condiții.
   Cheia API web nu este credential administrativ; restricțiile sale trebuie să
   permită Identity Toolkit de pe domeniul aprobat. Nu copia secrete server în web.
   Completează și `publicBaseUrl`, textele RO/EN de retenție și prelucrare din
   tabelul de mai sus. După teste reale controlate setează explicit
   `deletionBackendVerified`; completarea credențialelor publice singură nu activează
   formularul. Serverul are în continuare propriul comutator independent.
3. Revizuiește și aplică `0003_deletion_requests.sql` exclusiv bazei D1 corecte,
   prin procesul aprobat. Migrarea adaugă numai tabela de cereri și nu modifică
   istoricul existent. Nu executa schema pe producție în această etapă.
4. Deploymentul ulterior folosește noul entrypoint `privacy-worker.js`, care
   deleagă neschimbat `/access` și `/purchase`. Sunt reutilizate DB și configurația
   Firebase server existente; nu sunt necesare credențiale administrative pentru
   simpla înregistrare a unei cereri. Configurează `DELETION_WEB_ORIGIN` cu originea
   HTTPS exactă, fără slash final/wildcard. `DELETION_REQUESTS_ENABLED` rămâne
   `false` în Git și devine `true` numai după validarea procedurii și a retenției.
   Nu schimba `NEW_TRIALS_ENABLED`, OWNER, Billing, AdMob sau cheile existente.
5. Definește un responsabil și un proces administrativ care verifică UID-ul și
   referința cererii, datele Firebase/Cloudflare implicate, achizițiile și datele
   de păstrat justificat. Confirmă explicit ce se șterge și ce rămâne. Nu executa
   încă ștergeri Firebase și nu elimina triggerele de retenție a trialurilor.

## De ce ștergerea completă este intenționat neimplementată

Nu există încă o politică aprobată pentru retenție sau identificare după
ștergerea/recrearea identității Firebase. Ștergerea doar din Firebase ar putea
rupe recuperarea achiziției legate de UID și ar permite o identitate nouă pentru
trial. Ștergerea doar din D1 ar lăsa contul Firebase existent. O operațiune parțială
nu trebuie etichetată drept finalizată.

Înainte de orice executor este necesar un plan de pași reluabili, audit minimal,
confirmări ale furnizorilor și recuperarea erorilor parțiale. Datele antifraudă
reținute trebuie minimizate și explicate; nu presupunem nici retenție nelimitată,
nici ștergere totală a dovezilor tranzacțiilor. Politica actuală nu autorizează
resetarea trialului sau transferul/revocarea arbitrară a achizițiilor Play.

## Inventarul Android și regulile implementate

| Date | Loc relevant | Tratament |
| --- | --- | --- |
| Apartamente/rezervări/întreținere/ciorne/limbă | WebView localStorage în `app_webview` | Excluse din backupul automat, păstrate local |
| Fotografii | IndexedDB `apartment-booking-manager:photos`, în WebView | Excluse automat; formatul JSON manual nu se schimbă |
| Import temporar fotografii | IndexedDB `apartment-booking-manager:backup-stage` | Exclus, împreună cu întregul spațiu WebView |
| Firebase Auth, preferințe SDK, dovadă criptată `abm-verified-access` | `shared_prefs`, fișiere/baze native | Excluse; nu sunt incluse în whitelist |
| Cookies, Web Data, session storage și cache WebView | Căile explicite din XML, inclusiv Network și jurnale SQLite | Excluse |
| Cheie Android Keystore | Stocare hardware/sistem | Nu este exportată/restaurată de aplicație |
| Fișier temporar import Android | `getCacheDir()/abm-backup-import` | Cache exclus de sistem, nu inclus în whitelist |
| Export manual JSON/Excel/PDF | URI ales prin document provider | Independent de Auto Backup; rămâne sub controlul utilizatorului |

`allowBackup=false` aplică alegerea aprobată. XML-ul legacy acoperă API 24–30, iar
`dataExtractionRules` exclude explicit toate cele nouă domenii în ambele secțiuni
cloud și device-transfer pe API 31+. Aceasta protejează și împotriva transporturilor
OEM care ignoră doar atributul allowBackup. Nu se execută curățare, migrare sau
restaurare la update. Nu se șterg copii existente la furnizor și nu se promit
comportamente OEM neverificate; utilizatorul gestionează copiile anterioare.
Backupul JSON manual rămâne soluția de transfer al datelor. Autentificarea și
verificarea server rămân necesare pentru drepturi pe o instalare nouă.
Testarea efectivă a transportului necesită build/dispozitive aprobate separat;
nu se declanșează backup cloud pe telefonul utilizatorului.

Referințe: https://developer.android.com/identity/data/autobackup și
https://support.google.com/googleplay/android-developer/answer/13327111

## Verificări și limite

Pentru hosting static nu este necesară publicarea întregii aplicații sau a
repository-ului. Păstrează structura relativă: un director `legal/` cu
`privacy.html`, `delete-account.html` și `public.js`, iar în directorul său părinte
`privacy-content.js`, `privacy-settings.js`, `account-deletion.js` și `styles.css`.
Nu copia `.git`, backendul, configurații private, date locale sau arhive de semnare.
Directorul `legal/` al hostingului aprobat corespunde lui `publicBaseUrl`.
Verifică accesul anonim direct la ambele pagini, în ambele limbi, legăturile,
URL-urile canonice și mesajul de indisponibilitate înainte de orice activare.

Testele folosesc numai UID-uri, conturi, receipts și baze fictive. Acoperă
confirmarea, identitatea schimbată, auth vechi/invalid, UID străin, CORS, limite de
corp, idempotența, lipsa confirmării false, SQL D1 real local, policy RO/EN,
public web fără login, GIS/Firebase simulate, BASIC offline și backup JSON.
XML-ul este verificat static și prin `processDebugResources`, fără APK/AAB.
Aceste teste nu probează un deployment real, un domeniu public, retenția juridică,
ștergerea Firebase/Cloudflare sau un transport Auto Backup real.

## Contact oficial și verificare HTTPS — 2 noiembrie 2026

Adresa oficială confirmată este definită numai în `privacySettings.contact`.
Politica RO/EN o folosește în text și într-un link mailto. Același renderer este
folosit în pagina/ecranul solicitării de ștergere, inclusiv când înregistrarea
cererilor este dezactivată. Linkul deschide clientul de e-mail ales de utilizator;
nu trimite automat mesaje și nu confirmă înregistrarea sau executarea unei ștergeri.
Adresa nu este utilizată pentru autorizarea OWNER.

Verificări HTTP GET anonime, fără publicare sau modificări de hosting:

- Adresa documentată a aplicației, https://icdumbo.github.io/Apartment-Booking-Manager/ : HTTP 200.
- Sub aceeași adresă, `src/legal/privacy.html?lang=ro`, `?lang=en` și
  `src/legal/delete-account.html?lang=ro`, `?lang=en`: HTTP 404.
- Variantele `legal/privacy.html` și `legal/delete-account.html`, în ambele
  limbi: HTTP 404.

Acesta nu este un URL de politică/ștergere funcțional. `publicBaseUrl` rămâne
necompletat; nu am presupus că un alt domeniu neconfirmat există. Nu se modifică
sursa/deploymentul GitHub Pages pentru a publica implicit branch-ul BUSINESS.
Structura de hosting descrisă mai sus este pregătită pentru o etapă aprobată
separat, după completarea numelui legal, retenției, cadrului prelucrării și URL-urilor.

`publicationApproved`, `deletionBackendVerified` și comutatorul server
`DELETION_REQUESTS_ENABLED` rămân false. Confirmarea unui contact public nu
activează solicitări, trialuri, achiziții, reclame sau publicarea paginilor.
