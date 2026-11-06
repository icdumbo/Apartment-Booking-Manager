# Pregătire comercială și juridică — 5 noiembrie 2026

Stare: pregătire în cod, **nu aprobare de publicare**. Sursa juridică RO/EN rămâne
src/privacy-content.js, iar datele operatorului sunt centralizate în
src/privacy-settings.js. Nu copiați date personale în alte fișiere.

## Model confirmat și prezentare RO/EN

| RO | EN |
| --- | --- |
| BASIC gratuit: maximum 3 apartamente administrabile, fără autentificare obligatorie. | Free BASIC: up to 3 managed apartments, no mandatory sign-in. |
| Trial PREMIUM de 15 zile, fără card, activat voluntar prin Google Sign-In după confirmarea termenilor. | A voluntary 15-day PREMIUM trial without a card, activated through Google Sign-In after confirming the terms. |
| La expirare revii la BASIC; datele existente sunt păstrate. | On expiry you return to BASIC; existing data is retained. |
| PREMIUM: achiziție unică, fără abonament, apartamente nelimitate și acces la toate funcțiile. | PREMIUM: a one-time purchase, no subscription, unlimited apartments and access to all features. |
| Preț de lansare aprobat: 99 RON în Google Play Console. Prețul final localizat este cel afișat de Google Play. | Approved launch price: RON 99 in Google Play Console. The final localized price is supplied by Google Play. |
| OWNER: PREMIUM permanent gratuit exclusiv pentru identitatea autorizată pe server. | OWNER: permanently free PREMIUM exclusively for the server-authorized identity. |
| Reclame banner discrete în modelul existent, inclusiv în PREMIUM; integrarea rămâne dezactivată până la configurare și consimțământ. | Discreet banner ads remain part of the existing model, including PREMIUM; integration stays disabled pending configuration and consent. |

Nu prezentați trialul ca pornind automat, achiziția ca abonament, PREMIUM ca
versiune fără reclame sau protecția trialului ca permanentă. Nu înlocuiți
prețul Play cu un preț local fix. Nu afișați cumpărarea ca disponibilă cât timp
produsul/configurația reală lipsesc.

## Informații încă obligatorii, care trebuie confirmate de operator

- Numele legal și brandul sunt confirmate și completate în configurația centrală
  la 6 noiembrie 2026. Nu se introduce domiciliul în cod. Contactul confirmat rămâne
  support.apartmentbookingmanager@gmail.com, definit în configurația centrală.
- Retenția separată pentru contul/UID-ul Firebase, licențe, dovezi de achiziție
  (hash-uri/tokenuri criptate), restricții de securitate, cereri de ștergere,
  încercări eșuate și confirmări de finalizare. Nu există aici termene aprobate.
- Justificarea fiecărei păstrări după ștergere, temeiurile/rolurile prelucrării,
  configurările regionale și aranjamentele de transfer internațional confirmate
  din serviciile și acordurile efectiv folosite. Nu presupuneți stocarea exclusiv în UE.
- URL-urile publice HTTPS ale politicii și solicitării de ștergere RO/EN, care
  trebuie publicate și verificate separat. Nu sunt declarate online în această etapă.

Confirmat: datele de afaceri/fotografiile rămân locale, fără sincronizare pe
server; backupul manual JSON nu este criptat; copiile exportate sunt controlate
de utilizator/furnizorul ales. Ștergerea contului online nu șterge datele locale
sau contul Google. Istoricul trialului are maximum șase luni calendaristice de
la început; această limită nu se extinde automat la toate celelalte categorii.
Curățarea efectivă remote trebuie verificată înainte de a promite respectarea
termenului în producție. Repetarea după eliminarea istoricului sau recrearea
contului este acceptată, fără identificatori permanenți/fingerprinting.

## Ștergere: pregătită pentru teste, încă blocantă pentru lansare

Fluxul existent cere confirmare explicită și reautentificarea aceluiași cont,
verifică UID-ul/recent-auth pe server și confirmă doar înregistrarea cererii.
Procesorul verifică Firebase, confirmă absența contului și curăță datele D1
eligibile; erorile rămân reluabile. Datele locale nu sunt accesate de procesor.
Testele controlate folosesc numai SQL local și răspunsuri Google/Firebase fictive;
nu reprezintă dovada ștergerii unui cont real sau a verificării configurației remote.

Blocaje reale: conturile cu achiziții sunt excluse până la rezolvarea recuperării
securizate după schimbarea UID-ului. Conturile OWNER/cu restricții necesită
rezolvare administrativă. Nu publicați cu promisiunea ștergerii pentru toți
utilizatorii până când toate cazurile au o procedură verificată. Nu ștergeți
drepturile Google Play și nu transferați achiziții către alt UID prin bypass.
Politica Play cere o cale în aplicație și o resursă web pentru solicitare.

## Ordinea configurării manuale — fără activare în această etapă

1. Completați și aprobați câmpurile juridice de mai sus; publicați și verificați
   separat cele patru pagini anonime RO/EN. Datele și declarațiile trebuie să
   reflecte furnizorii/SDK-urile activate efectiv.
2. În Play Console configurați aplicația pentru package ID-ul existent. Creați
   un singur produs one-time/non-consumable cu o opțiune de cumpărare permanentă,
   fără abonament, închiriere sau cantități multiple. Alegeți ID-ul real și setați
   prețul de lansare România la 99 RON; verificați taxe, țări și prețuri localizate.
   Nu publicați/activați produsul sau plățile fără etapa aprobată de testare.
3. Configurați accesul minim la Google Play Developer API pentru contul de serviciu
   backend. Credențialele și cheia de criptare se păstrează exclusiv în secretele
   serverului; ID-ul real trebuie să coincidă în Play, backend și configurația Android.
   Nicio valoare secretă nu se cere în conversație sau în GitHub.
4. Pregătiți testarea internă și license testers într-un mediu separat de producție.
   Verificați cumpărare, anulare, pending → purchased, acknowledgement, achiziție
   deja deținută, reinstalare/alt telefon cu același cont, cont diferit și
   refund cu revocare. O rambursare fără revocare nu dovedește retragerea accesului.
   Refundurile/revocările sunt aflate la următoarea verificare online; RTDN nu este
   configurat, iar accesul permanent deja verificat poate continua offline.
5. Verificați Google/Firebase/OAuth și certificatele distribuției Play; verificați
   OWNER exclusiv prin identitatea serverului. Nu schimbați semnarea actuală aici.
6. Verificați ștergerea într-un mediu controlat, inclusiv erorile parțiale și
   păstrarea datelor locale în BASIC, apoi obțineți aprobare separată pentru activare.
7. Completați în Play Console Data Safety, Account deletion, politica HTTPS,
   declarația de reclame, clasificarea conținutului, accesul pentru review și
   cerințele de testare afișate contului. Verificați declarațiile pentru SDK-urile
   efectiv incluse. AdMob/UMP necesită configurare și testarea consimțământului
   înainte de activarea reclamelor, separat de această etapă.

Niciun deploy, migrare remote, achiziție, activare comercială sau APK/AAB nu este
executat în această pregătire. Cerințele de producție se verifică din nou înainte
de lansare; un test automat nu dovedește configurarea Console sau a telefonului.

## Referințe oficiale verificate

- https://developer.android.com/google/play/billing/integrate
- https://developer.android.com/google/play/billing/security
- https://developers.google.com/android-publisher/api-ref/rest/v3/purchases.products
- https://support.google.com/googleplay/android-developer/answer/13327111

## Rezultate automate în această etapă

43 de teste relevante au trecut local: achiziții/restaurare, anulare/pending,
refuzul dovezilor false, acknowledgement/reluare, revocare la răspuns definitiv,
trial server-side și fluxul de ștergere cu SQL în memorie. Pentru ștergere s-a
folosit ABM_LOCAL_SQLITE=1, nu D1 remote; Google/Firebase sunt simulate exclusiv
la granița API pentru testare, fără tranzacții reale. Aceste rezultate nu confirmă
Google Play Console, backendul real sau comportamentul telefonului fizic.
