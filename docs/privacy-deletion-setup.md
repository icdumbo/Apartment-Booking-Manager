# Confidențialitate, solicitări de ștergere și backup Android

Stadiu: implementare sigură, **nepublicată și incompletă operațional**. Nu s-au
modificat servicii, conturi, trialuri, achiziții sau date reale. Nu există APK/AAB
nou. Politica și paginile web sunt proiecte; nu se furnizează URL-uri de producție.

## Ce este implementat

- `src/privacy-content.js`: aceeași politică RO/EN în aplicație și pe web, bazată
  pe fluxurile reale. Operatorul, contactul, temeiurile/transferurile și retenția
  sunt marcate neconfirmate, nu inventate. `privacy-settings.js` conține numai
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

1. Identitatea reală a operatorului și contactul public pentru confidențialitate.
2. Politica de retenție pentru UID, trialuri, licențe, tranzacții, tokenuri criptate
   și jurnalul cererilor; scopul și justificarea oricărei păstrări anti-abuz.
   Nu este stabilit un termen fiscal sau un termen de procesare neverificat.
3. Jurisdicția, temeiurile, destinatarii și condițiile transferurilor internaționale.
4. Alegerea comercială pentru backupul automat al datelor de afaceri. Recomandarea
   comunicată proprietarului este excluderea cloud și D2D, cu JSON manual păstrat.
   **Până la răspuns, această alegere nu este presupusă.**
5. Hostingul public, domeniul HTTPS, OAuth web și domeniile Firebase autorizate.
   Operatorul trebuie să verifice și declarațiile Data Safety după configurare.

## Configurări externe, doar după aprobare

1. Publică paginile împreună cu modulele/CSS relative necesare pe hostingul HTTPS
   aprobat, fără login pentru citire. Verifică accesul direct la ambele pagini,
   în RO/EN, și setările de securitate ale hostingului. Nu folosi un link GitHub
   către sursă drept politică publicată. Actualizează Console numai după verificare.
2. Configurează clientul OAuth web în proiectul Firebase existent și autorizează
   domeniul real. Completează numai valorile publice în `privacy-settings.js`:
   `webClientId`, `firebaseApiKey`, `deletionEndpoint` (HTTPS, `/account-deletion`).
   Cheia API web nu este credential administrativ; restricțiile sale trebuie să
   permită Identity Toolkit de pe domeniul aprobat. Nu copia secrete server în web.
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
| Apartamente/rezervări/întreținere/ciorne/limbă | WebView localStorage în `app_webview` | Eligibile în continuare, până la alegerea proprietarului |
| Fotografii | IndexedDB `apartment-booking-manager:photos`, în WebView | Eligibile în continuare; formatul JSON manual nu se schimbă |
| Import temporar fotografii | IndexedDB `apartment-booking-manager:backup-stage` | Același spațiu WebView; alegerea finală privind excluderea completă rămâne deschisă |
| Firebase Auth, preferințe SDK, dovadă criptată `abm-verified-access` | `shared_prefs`, fișiere/baze native | Excluse; nu sunt incluse în whitelist |
| Cookies, Web Data, session storage și cache WebView | Căile explicite din XML, inclusiv Network și jurnale SQLite | Excluse |
| Cheie Android Keystore | Stocare hardware/sistem | Nu este exportată/restaurată de aplicație |
| Fișier temporar import Android | `getCacheDir()/abm-backup-import` | Cache exclus de sistem, nu inclus în whitelist |
| Export manual JSON/Excel/PDF | URI ales prin document provider | Independent de Auto Backup; rămâne sub controlul utilizatorului |

`allowBackup=true` rămâne până la confirmare. XML-ul legacy se aplică API 24–30,
iar `dataExtractionRules` are secțiuni explicite cloud și device-transfer pentru
API 31+. Whitelist-ul este doar `root/app_webview`, cu excluderi de autentificare;
niciun fișier nativ/prefs/token nu devine implicit eligibil. Nu se execută curățare,
migrare sau restaurare la update. O copie JSON nu include identitatea/entitlementul;
după reinstalare este necesară autentificare și verificare server pentru drepturi.
Comportamentul efectiv al transportului OEM necesită un build și dispozitive de
test aprobate separat; nu se declanșează backup cloud pe telefonul utilizatorului.

Referințe: https://developer.android.com/identity/data/autobackup și
https://support.google.com/googleplay/android-developer/answer/13327111

## Verificări și limite

Testele folosesc numai UID-uri, conturi, receipts și baze fictive. Acoperă
confirmarea, identitatea schimbată, auth vechi/invalid, UID străin, CORS, limite de
corp, idempotența, lipsa confirmării false, SQL D1 real local, policy RO/EN,
public web fără login, GIS/Firebase simulate, BASIC offline și backup JSON.
XML-ul este verificat static și prin `processDebugResources`, fără APK/AAB.
Aceste teste nu probează un deployment real, un domeniu public, retenția juridică,
ștergerea Firebase/Cloudflare sau un transport Auto Backup real.
