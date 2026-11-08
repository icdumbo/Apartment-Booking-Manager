> **Procedură istorică.** Fluxul automat a fost retras. Pentru configurarea curentă, vezi [Solicitări de ștergere prin suport](manual-account-deletion.md). Nu folosi pașii istorici pentru activare.

# Mediu izolat pentru verificarea ștergerii contului

Configurația generată este locală, în backend/build/deletion-stage, ignorată de Git. Nu conține credențiale de serviciu. Workerul de test acceptă numai ruta /account-deletion, un proiect Firebase cu prefix abm-delete-test-, originea exactă a site-ului de test și propriul D1. Nu expune acces, trial nou sau achiziții. Configurația de producție păstrează proiectul Firebase implicit.

## Pregătire manuală, după aprobarea separată a operațiunilor cloud

1. În Firebase Console creează un proiect **nou** cu ID care începe cu abm-delete-test-. Adaugă o aplicație Web în acel proiect. În Authentication → Sign-in method activează Google pentru proiectul de test, iar la Authorized domains adaugă hostname-ul HTTPS de test, de exemplu abm-delete-test-echipa.example.org. În Google Cloud → Credentials confirmă clientul OAuth de tip Web și originea JavaScript exactă. Dacă folosești un ecran OAuth de tip Testing, adaugă numai identitățile de test. Notează API key Web și OAuth client ID din proiectul de test. Acestea nu înlocuiesc secretul de serviciu.
2. În IAM din proiectul de test creează un cont de serviciu dedicat. Acordă numai permisiunile firebaseauth.users.get și firebaseauth.users.delete în acel proiect. Confirmă că Identity Toolkit API este disponibil. Păstrează JSON-ul privat în afara repository-ului. Nu acorda contului de serviciu roluri în proiectul de producție.
3. În contul Cloudflare folosit pentru test creează o bază D1 **nouă și goală** numită abm-deletion-test-d1 și rezervă numele abm-deletion-test pentru Worker. Notează ID-ul contului Cloudflare, UUID-ul bazei și adresa workers.dev destinată Workerului. Folosește, dacă este disponibil, un cont Cloudflare separat și permisiuni limitate la resursele de test. Nu crea legături către baze existente.

## Generarea configurației fără rețea

Din rădăcina repository-ului, completează aceste variabile în PowerShell cu valorile tale de test. Valorile de exemplu sunt substituenți.

    $env:ABM_TEST_FIREBASE_PROJECT = '<ID Firebase abm-delete-test-…>'
    $env:ABM_TEST_CLOUDFLARE_ACCOUNT = '<ID cont Cloudflare test>'
    $env:ABM_TEST_D1_ID = '<UUID D1 nou>'
    $env:ABM_TEST_WEB_ORIGIN = 'https://abm-delete-test-echipa.example.org'
    $env:ABM_TEST_WORKER_ORIGIN = 'https://abm-deletion-test.<subdomeniu-test>.workers.dev'
    $env:ABM_TEST_FIREBASE_WEB_KEY = '<cheia Web Firebase de test>'
    $env:ABM_TEST_GOOGLE_WEB_CLIENT = '<ID OAuth Web de test>'
    node scripts/prepare-deletion-staging.mjs

Compară numele, UUID-ul, contul Cloudflare și bindingul DB din backend/build/deletion-stage/wrangler.json cu baza nouă. Generatorul refuză proiectul, UUID-ul D1 și originea Pages de producție. El nu poate dovedi local cine deține un UUID arbitrar, deci verifică-l în Dashboard înainte de orice comandă remote.

## Migrare și testare live, numai după aprobare

Din folderul backend, pentru repetiție locală:

    npx wrangler d1 migrations apply DB --local --config build/deletion-stage/wrangler.json --persist-to build/deletion-stage/d1-local

În etapa live aprobată, întâi listează migrările pe baza de test, confirmă exact 0001–0007 și aplică-le cu același fișier explicit:

    npx wrangler d1 migrations list DB --remote --config build/deletion-stage/wrangler.json
    npx wrangler d1 migrations apply DB --remote --config build/deletion-stage/wrangler.json
    npx wrangler d1 migrations list DB --remote --config build/deletion-stage/wrangler.json

Configurează pentru Workerul de test secretele FIREBASE_API_KEY și DELETION_FIREBASE_SERVICE_ACCOUNT_JSON. Setează OWNER_SUBJECT la UID-ul unui cont fictiv rezervat pentru testul protecției, diferit de conturile pe care intenționezi să le ștergi. Publică separat folderul backend/build/deletion-stage/web doar pe originea HTTPS de test, cu acces limitat testerilor, în etapa aprobată. Deschide /legal/delete-account.html?lang=ro sau ?lang=en. Formularul folosește componentele existente. Configurația juridică de release este independentă de această copie de test.

Verifică întâi că cererile sunt refuzate cu flagurile inițiale. Pentru recepție se activează separat, numai pe Workerul de test, DELETION_REQUESTS_ENABLED. Verifică autentificarea recentă, respingerea unui token cu proiect diferit, schimbarea limbii, confirmarea explicită și răspunsul pending_review. Pentru execuția de probă mai sunt necesare DELETION_EXECUTION_ENABLED, DELETION_BACKEND_VERIFIED, DELETION_RETENTION_APPROVED și DELETION_MAINTENANCE_VERIFIED plus DELETION_RECEIPT_TTL_DAYS ales explicit pentru datele fictive. Triggerul se configurează separat după aprobare; generatorul nu îl adaugă. Menține trialurile noi și retenția programată oprite în această configurație. Oprește triggerul și flagurile la sfârșitul probei.

Testează un cont obișnuit, un trial activ introdus ca fixture D1 și un caz cu eroare D1 după ștergerea Firebase. Pentru cazurile protejate folosește UID-uri fictive distincte cu OWNER_SUBJECT, identity_policy și o înregistrare sintetică play_purchases. Nu iniția o plată și nu folosi tokenuri Play reale. Confirmă că procesele refuză ștergerea acestor conturi înainte de apelul Firebase. În scenariul eligibil, confirmarea devine pozitivă numai după curățare. Rezervările, apartamentele, fotografiile și backupurile rămân independente de flux.

## Recuperarea PREMIUM

Restaurarea existentă verifică achiziția Play, identificatorul de cont derivat din UID, înregistrarea serverului și dovada semnată. Este testată pentru reinstalare cu același UID. După ștergerea Firebase și recrearea contului, un UID nou nu poate recupera automat achiziția veche. Nu există aici un mecanism verificat de re-asociere. Conturile cumpărătorilor rămân blocate pentru ștergere, fără revocarea produsului sau modificarea drepturilor. O procedură viitoare trebuie să confirme titularul și achiziția cu Play, să gestioneze re-asocierea fără expunerea tokenului și să prevină revendicarea dublă. Verificarea acesteia este o condiție înainte de activarea ștergerii pentru cumpărători.

Surse oficiale: https://firebase.google.com/docs/auth/web/google-signin și https://developers.cloudflare.com/d1/reference/migrations/.
