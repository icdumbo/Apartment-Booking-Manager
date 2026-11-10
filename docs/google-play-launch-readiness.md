# Pregătire pentru lansarea comercială

Stare: pregătire în cod, **nu aprobare de publicare**. Sursa juridică RO/EN rămâne
src/privacy-content.js, iar datele operatorului sunt centralizate în
src/privacy-settings.js. Nu copiați date personale în alte fișiere.

## Model țintă aprobat, încă inactiv

- Trial de 15 zile, fără card, pornit de server la activarea validă prin Google Sign-In. Include toate funcțiile și apartamente nelimitate.
- După expirare, consultarea apartamentelor și rezervărilor și exportul rămân disponibile. Crearea, modificarea, ștergerea și restaurarea care înlocuiește datele sunt operațiuni de scriere.
- PREMIUM este o cumpărare unică, fără consum sau abonament. Prețul pentru România se configurează la 99 RON în Play Console, iar aplicația afișează prețul localizat primit de la Google Play.
- PREMIUM cumpărat și OWNER autorizat de server au acces complet fără reclame. Bannerul este permis doar în trialul verificat și numai dacă UMP permite cererea de reclame.
- Codul actual încă aplică BASIC și limita de trei apartamente. Nu activați noul model înainte de implementarea și testarea regulilor de mai jos.

## Migrare și criterii de acceptare

| Caz | Regulă propusă sau decizie necesară |
| --- | --- |
| OWNER, cumpărători, drepturi administrative existente | Păstrați dreptul verificat și datele. Confirmați tratamentul eventualelor drepturi administrative temporare. |
| Trial server activ sau expirat | Păstrați începutul și expirarea. Același cont pe alt dispozitiv sau după reinstalare trebuie să primească aceeași stare, atât timp cât dovada de eligibilitate există. |
| BASIC anterior sau istoric exclusiv local | Operatorul trebuie să decidă dacă utilizatorii fără trial server sunt eligibili și cum se tratează istoricul anonim. O valoare locală editabilă nu poate acorda drepturi. |
| Istoric de trial eliminat | Retenția de șase luni și lipsa unui identificator permanent nu permit o garanție împotriva unui trial nou după eliminarea dovezii. Confirmați dacă limita cunoscută rămâne acceptată sau stabiliți o alternativă proporțională înainte de schimbarea retenției. |
| Fără autentificare, fără rețea sau dovadă expirată | Stabiliți accesul înainte de prima activare și politica offline pentru un drept deja verificat. Consultarea și exportul datelor existente trebuie să rămână disponibile. |

Controlați scrierile la salvare, inclusiv din editoare deja deschise, încasări,
întreținere, fotografii și import. Păstrați separat ștergerea locală explicită
necesară controlului datelor. Verificați cu o copie fictivă care include
12 apartamente, fotografii și rezervări, cu restart, expirare, cumpărare,
calendar pornind la data de 1 și exporturi Excel/PDF și JSON. Testul pe telefon
cu date reale necesită acord separat și nu implică resetare sau dezinstalare.

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
- Paginile RO/EN sunt deja publice pe GitHub Pages cu avertismentul de document în pregătire. Confirmați textele finale și verificați din nou cele patru URL-uri înainte de Play Console.

Confirmat: datele de afaceri/fotografiile rămân locale, fără sincronizare pe
server; backupul manual JSON nu este criptat; copiile exportate sunt controlate
de utilizator/furnizorul ales. Ștergerea contului online nu șterge datele locale
sau contul Google. Istoricul trialului are maximum șase luni calendaristice de
la început; această limită nu se extinde automat la toate celelalte categorii.
Curățarea efectivă remote trebuie verificată înainte de a promite respectarea
termenului în producție. Repetarea după eliminarea istoricului sau recrearea contului fusese acceptată pentru modelul anterior. Pentru modelul nou, decizia rămâne de confirmat, fără a introduce identificatori permanenți sau fingerprinting.

## Ștergerea contului

Urmați [procedura manuală](manual-account-deletion.md). Proprietarul verifică
identitatea, tratează individual PREMIUM și OWNER și răspunde prin e-mail.
Testați primirea și soluționarea cu un cont fictiv. Confirmați recuperarea
achiziției după schimbarea UID-ului înainte de a șterge un cont cumpărător.
Nu transferați achiziții între UID-uri prin bypass.

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
6. Verificați procedura manuală, inclusiv identitatea, erorile parțiale și păstrarea datelor locale.
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

## AdMob și verificări de lansare

În AdMob adăugați aplicația cu package ID-ul existent, creați o unitate Banner
și configurați mesajul european în Privacy & messaging. Folosiți ID-urile
emise pentru aplicație și banner, test devices în buildurile de test și
verificați la fiecare lansare rezultatul UMP, opțiunile de confidențialitate
și retragerea consimțământului. Integrarea actuală cere reclame la inițializarea
panoului fără a verifica starea comercială și poate consulta consimțământul
cache-uit după o eroare de actualizare. Înainte de activare, implementați
condiția trial verificat plus consimțământ aplicabil, opriți bannerul la
expirare, schimbare de cont sau achiziție și verificați cursa cu încărcarea.
Nu activați AdMob până la aceste verificări și inventarierea datelor SDK.

În Firebase verificați providerul Google, certificatele distribuției Play
pentru package ID-ul existent și identificarea OWNER autorizată de server.
În Google Play verificați revocarea rambursărilor online și decideți fereastra
offline și mecanismul RTDN sau Voided Purchases înainte de lansare. Declarați
numai fluxurile, datele SDK și furnizorii din buildul efectiv. Validați temeiurile,
interesul legitim, retenția și transferurile cu dovezi concrete, apoi obțineți
aprobarea operatorului pentru textele RO/EN. Avertismentul rămâne până atunci.

Surse oficiale

- [Produse cu achiziție unică în Google Play](https://support.google.com/googleplay/android-developer/answer/16430488?hl=en)
- [Google Play Billing](https://developer.android.com/google/play/billing/integrate)
- [AdMob UMP pentru Android](https://developers.google.com/admob/android/privacy)
- [Datele utilizatorilor și Data Safety](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
