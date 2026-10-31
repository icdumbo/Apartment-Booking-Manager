# Regresia Meniu / OWNER din APK 1.0.21

## Cauza confirmată în codul APK-ului

`assets/native-bridge.js` din APK-ul livrat întoarce sincron `{ remove: async ... }`
pentru `Capacitor.addListener`. `mountCommerce` apela `.catch()` direct pe acest
obiect la înregistrarea `BookingBilling.purchasesChanged`. Rezultatul este
`TypeError: ...addListener(...).catch is not a function`.

Excepția oprea evaluarea `app.js` înainte de atribuirea handlerului `open-menu`
și înainte de `androidAuth.initialize()`. Handlerii celorlalte secțiuni erau deja
instalați. Sesiunea Firebase și dovada nativă de acces nu mai erau încărcate;
serviciul afișa fallback-ul BASIC și avertizarea despre istoricul local de trial.
Acea avertizare nu demonstrează că secretul OWNER lipsește pe server.

Corecția acceptă atât obiectul sincron al bridge-ului Android, cât și promisiunea
wrapperului web. Absența/eșecul ascultătorului opțional Billing nu întrerupe
inițializarea. Achizițiile, restaurarea drepturilor și verificarea criptografică
nu sunt modificate. Nu există migrare, schimbare de schemă backup, resetare de
trial, acordare locală de PREMIUM sau modificare a versiunii Android.

## Fluxul OWNER și limitele auditului real

Google Credential Manager → Firebase Auth → ID token Firebase → `/access`
`action: verify` → verificarea Google, proiectului și revocării → comparație UID
cu secretul server `OWNER_SUBJECT` → dovadă RSA `OWNER_GRANT`, fără expirare →
verificare Android a semnăturii, proiectului, package ID, UID și nonce.

OWNER are prioritate față de istoricul trialului. Numai același UID Firebase
autentificat primește acest drept. Alt cont, inclusiv al familiei, nu îl moștenește.
Mesajul despre trial nu trebuie rezolvat prin ștergerea istoricului sau pornirea
unui trial nou. Blocarea/revocarea contului rămâne aplicabilă inclusiv OWNER.

În auditul din 31.10.2026, accesul administrativ Cloudflare disponibil local a
primit HTTP 403. Nu s-au putut confirma existența sau valoarea secretului
`OWNER_SUBJECT` în producție. Nu s-a modificat/deployat Worker-ul și nu s-au
citit drepturile contului real din telefon. Nu declarăm accesul OWNER real
restabilit doar pe baza testelor cu identități fictive.

## Verificarea manuală, fără divulgarea secretelor

1. În Firebase Console, selectează proiectul `apartment-booking-manage-2d218`.
   În Authentication → Users identifică propriul cont Google și copiază UID-ul
   numai local. Nu crea alt cont și nu șterge utilizatorul existent.
2. În Authentication → Sign-in method verifică furnizorul Google. În setările
   aplicației Android verifică package ID `ro.icdapps.apartmentbookingmanager`,
   certificatul original SHA-1/SHA-256 și clientul OAuth web folosit de
   `default_web_client_id`. Nu înlocui cheia Android sau proiectul Firebase.
3. În Cloudflare Dashboard → Workers & Pages → Worker-ul existent
   `apartment-booking-access` → Settings → Variables and Secrets, verifică
   `OWNER_SUBJECT`. Dacă lipsește sau este incorect, administratorul setează
   acest singur secret la UID-ul propriu din pasul 1 și salvează configurația
   Worker-ului existent. Valorile secretelor nu pot fi recitite din dashboard;
   verificarea identității se face ulterior prin autorizarea reală. Nu introduce
   UID-ul/e-mailul în Git, în backup sau în conversație.
4. Verifică existența bindingului D1 `DB`, a cheii server Firebase
   (`FIREBASE_API_KEY` sau aliasul compatibil `FIREBASE_WEB_API_KEY`) și a
   `ACCESS_PRIVATE_KEY`. Cele două aliasuri Firebase, dacă există simultan,
   trebuie să coincidă. Nu genera alte chei și nu înlocui cheia de semnare a
   dovezilor: cheia publică Android existentă trebuie să îi corespundă.
   Păstrează `NEW_TRIALS_ENABLED=false`; nu activa Billing sau AdMob.
5. După aprobarea unui APK ulterior, instalează-l ca actualizare, fără
   dezinstalare sau ștergerea datelor. Verifică Meniu, conectarea cu același cont
   Google și rezultatul online `PREMIUM permanent`, apoi Statistici/Rapoarte.
   Un cont obișnuit fără achiziție/gift/trial valid trebuie să rămână BASIC.
   Testează apoi offline OWNER deja verificat și reconectarea la internet.
6. Dacă încă eșuează: 401/403 de la `/access` indică autentificare/origine/politică;
   503 indică indisponibilitate/configurare (Google, D1, chei). O dovadă validă
   BASIC pentru contul dorit cere verificarea UID-ului și a secretului OWNER;
   nu justifică activarea locală a PREMIUM. Notează doar codul erorii și starea
   afișată. Nu copia tokenuri, dovezi, parole sau răspunsuri de autentificare
   în loguri/GitHub/conversație.

Referințe oficiale: [Firebase Google Sign-In Android](https://firebase.google.com/docs/auth/android/google-signin),
[Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

## Verificări automate relevante

- `tests/commerce-initialization.test.js`: handle sincron, Promise, respingere,
  excepție sincronă. Testul sincron eșua înaintea corecției cu eroarea de mai sus.
- `checks/native-auth.spec.mjs`: bridge Android sincron în BASIC neautentificat,
  cont obișnuit și OWNER; Meniu din fiecare secțiune, RO/EN, acces login/backup,
  încărcare dovadă, statistici/rapoarte OWNER, păstrarea datelor și trialului.
  Acestea sunt teste ale interfeței cu bridge/proof fictiv, nu autentificări reale.
- `tests/secure-trial.test.js`: dovadă RSA verificată, OWNER exclusiv inclusiv cu
  istoric blocat, cont obișnuit și payload falsificat refuzate, trialuri nemodificate.
- Testele existente native-auth/access/backup/owners verifică separarea drepturilor,
  datele complete, fotografiile, rollback-ul și compatibilitatea backupurilor.

Confirmarea pe Fold și cu serviciile reale rămâne obligatorie după buildul ulterior.
