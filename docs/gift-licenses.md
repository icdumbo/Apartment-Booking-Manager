# PREMIUM GIFT: administrare manuală prin D1

## Implementare existentă și autorizare

Schema `0001_access.sql` și Worker-ul recunosc deja `ADMIN_GIFT`, permanent sau
temporar. Nu sunt necesare migrare, deployment sau modificări APK per beneficiar.
Worker-ul verifică tokenul Firebase înainte de citirea licențelor; Android verifică
dovada RSA. UID-ul trimis unilateral de client nu acordă acces.

OWNER rămâne exclusiv configurat prin `OWNER_SUBJECT`, cu prioritate față de D1.
Nu introduceți `OWNER_GRANT` în baza de date. Păstrați `NEW_TRIALS_ENABLED=false`.

Operațiile D1 se execută numai de proprietarul/administratorul autorizat în
Cloudflare, cu MFA și permisiuni limitate la resursele necesare. Nu distribuiți
sesiunea sau tokenurile Cloudflare beneficiarilor. Nu există endpoint public de
acordare/revocare. `gift-admin-contract.js` rămâne un contract pentru o eventuală
interfață viitoare; procedura de mai jos folosește autorizarea administratorului
Cloudflare, nu pretinde că acel contract este un endpoint activ.

**Identitatea beneficiarului trebuie verificată înainte de orice acordare:**
Firebase Console → proiectul `apartment-booking-manage-2d218` → Authentication →
Users → contul existent, activ, cu provider Google. Confirmați persoana dorită și
folosiți câmpul **User UID**, nu e-mailul, numele, Google ID sau un UID neverificat
furnizat de client. Helperul validează formatul, nu verifică existența contului în
Firebase; verificarea administrativă în consolă este obligatorie. La utilizare,
Worker-ul verifică autentificarea reală și identitatea asociată tokenului.

## Comenzi PowerShell, din folderul `backend`

Folosiți Node.js/Wrangler existente și autentificarea Cloudflare a administratorului.
Generatorul este **offline**: creează numai un fișier SQL local, fără solicitări
Cloudflare/Firebase. Nu suprascrie fișiere existente; folosiți un nume nou la repetare.
SQL-ul conține UID: păstrați-l privat, nu îl partajați sau comiteți. Fișierele locale
`backend/gift-*.sql` sunt ignorate de Git. Pe Windows folosiți un folder accesibil
numai administratorului; modul POSIX `0600` nu înlocuiește permisiunile Windows.

Comenzile Wrangler cu `--remote` operează pe baza Production
`apartment-booking-licenses`. **Acordarea/revocarea se execută numai după aprobarea
explicită a proprietarului pentru beneficiarul respectiv.** Nu reaplicați migrarea.

### 1. Verificare read-only

```powershell
$uid = Read-Host 'Firebase User UID verificat in consola proiectului'
node scripts/gift-sql.mjs check --uid "$uid" --out gift-check.sql
if ($LASTEXITCODE -eq 0) { npx.cmd wrangler d1 execute apartment-booking-licenses --remote --file gift-check.sql }
```

SELECT-ul arată doar cadoul acestui UID. Niciun rezultat înseamnă că nu există un
cadou, nu că lipsește contul Firebase. Rezultatul este pentru verificare locală;
nu trimiteți în conversație identitatea sau secretele.

### 2. Acordare permanentă, după aprobare

```powershell
node scripts/gift-sql.mjs grant --uid "$uid" --permanent --out gift-grant.sql
if ($LASTEXITCODE -eq 0) { npx.cmd wrangler d1 execute apartment-booking-licenses --remote --file gift-grant.sql }
```

Verificați rezultatul: `source=ADMIN_GIFT`, `status=active`, `permanent=1`,
`expires_at=NULL`. Upsertul atomic este limitat la `(subject, ADMIN_GIFT)`;
repetarea nu dublează licența. Reacordarea unui cadou revocat îl reactivează explicit.

### Alternativ: cadou temporar, după aprobare

```powershell
$expiry = Read-Host 'Expirare UTC: YYYY-MM-DDTHH:mm:ssZ'
node scripts/gift-sql.mjs grant --uid "$uid" --expires-at "$expiry" --out gift-temporary.sql
if ($LASTEXITCODE -eq 0) { npx.cmd wrangler d1 execute apartment-booking-licenses --remote --file gift-temporary.sql }
```

Expirarea este exclusivă și se stochează în milisecunde Unix; rezultatul trebuie să
arate `permanent=0` și termenul corect. Datele invalide/trecute sunt refuzate local.
SQL verifică și timpul D1: dacă termenul trece înainte de aplicare, nu acordă dreptul;
SELECT poate arăta vechiul rând sau niciun rând. Verificați obligatoriu rezultatul.
O nouă acordare poate schimba durata unui cadou; nu există prelungire automată.

### 3. Revocare, după aprobare

```powershell
node scripts/gift-sql.mjs revoke --uid "$uid" --out gift-revoke.sql
if ($LASTEXITCODE -eq 0) { npx.cmd wrangler d1 execute apartment-booking-licenses --remote --file gift-revoke.sql }
```

Rezultatul trebuie să arate `status=revoked`. Rândul se păstrează; dacă nu exista,
nu se creează nimic. Revocarea repetată este sigură. Achizițiile, OWNER și trialurile
nu sunt modificate. Pentru o verificare ulterioară repetați pasul 1 cu un fișier nou.

## Verificare pe telefon și limite reale

APK 1.0.11 sau ulterior: beneficiarul se conectează prin Google cu contul verificat.
Cu internet, aplicația verifică accesul la conectare/revenire și periodic, aproximativ
la un minut. DevTools poate afișa doar rezultatul nesensibil:

```js
Capacitor.Plugins.BookingAccess.getAccess()
  .then(({state, premiumSource}) => console.log({state, premiumSource}));
```

Cadou activ: `PREMIUM / ADMIN_GIFT`. După revocare și verificare online reușită:
BASIC sau un alt drept legitim existent (achiziție ori trial încă valabil).
OWNER rămâne `PREMIUM / OWNER_GRANT`, indiferent de propriul rând cadou.
Schimbarea accesului nu șterge apartamente, rezervări sau plăți.

**Revocarea nu este instantanee offline.** O dovadă permanentă verificată rămâne
utilizabilă offline fără termen, conform politicii existente. Revocarea se află numai
la o verificare online reușită; erorile de rețea/503 păstrează dovada validă. Cadourile
temporare expiră prin timpul monoton; după reboot cer reconectare pentru verificarea
timpului. Nu promiteți revocare imediată pe un telefon offline.

Nu există o limită comercială de beneficiari, dar se aplică cotele Cloudflare Free.
Implementarea și testele locale nu acordă licențe reale. După fiecare operație
administrativă păstrați privat aprobarea și rezultatul verificării, fără tokenuri.
