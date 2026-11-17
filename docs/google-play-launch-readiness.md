# Pregătire pentru lansarea comercială

Stare: pregătire în cod, **nu aprobare de publicare**. Sursa juridică RO/EN rămâne
src/privacy-content.js, iar datele operatorului sunt centralizate în
src/privacy-settings.js. Nu copiați date personale în alte fișiere.

## Model Android implementat, cu servicii comerciale dezactivate implicit

- Trial de 15 zile, fără card, pornit de server la activarea validă prin Google Sign-In. Include toate funcțiile și apartamente nelimitate.
- După expirare, consultarea apartamentelor și rezervărilor și exportul rămân disponibile. Crearea, modificarea, ștergerea și restaurarea care înlocuiește datele sunt operațiuni de scriere.
- PREMIUM este o cumpărare unică, fără consum sau abonament. Prețul pentru România se configurează la 99 RON în Play Console, iar aplicația afișează prețul localizat primit de la Google Play.
- PREMIUM cumpărat și OWNER autorizat de server au acces complet fără reclame. Bannerul este permis doar în trialul verificat și numai dacă UMP permite cererea de reclame.
- Versiunea Android 1.0.31 folosește modul de consultare și export după expirare. Modelul BASIC cu limita de trei apartamente aparține versiunii web existente.

## Migrare și criterii de acceptare

| Caz | Regulă propusă sau decizie necesară |
| --- | --- |
| OWNER, cumpărători, drepturi administrative existente | Păstrați dreptul verificat și datele. Confirmați tratamentul eventualelor drepturi administrative temporare. |
| Trial server activ sau expirat | Păstrați începutul și expirarea. Același cont pe alt dispozitiv sau după reinstalare trebuie să primească aceeași stare, atât timp cât dovada de eligibilitate există. |
| BASIC anterior sau istoric exclusiv local | Prima autentificare validă solicită serverului activarea conturilor eligibile fără trial server. Istoricul local nu acordă drepturi. |
| Istoric de trial eliminat | Retenția de șase luni și lipsa unui identificator permanent nu permit o garanție împotriva unui trial nou după eliminarea dovezii. După curățarea istoricului, serverul poate considera din nou contul eligibil, conform regulii aprobate. |
| Fără autentificare, fără rețea sau dovadă expirată | Consultarea și exportul rămân disponibile. Editarea necesită drept verificat. Pentru achiziții, dovada offline este valabilă maximum șapte zile în aceeași sesiune de pornire a telefonului. |

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
și retragerea consimțământului. Codul Android cere un trial verificat și permisiunea UMP pentru reclame. Verificați pe dispozitiv oprirea bannerului la expirare, schimbarea contului sau achiziție, inclusiv în timpul încărcării. Inventariați datele SDK înainte de activare.

În Firebase verificați providerul Google, certificatele distribuției Play
pentru package ID-ul existent și identificarea OWNER autorizată de server.
În Google Play verificați revocarea rambursărilor online și verificați fereastra
offline implementată de șapte zile. Evaluați necesitatea RTDN sau Voided Purchases în funcție de rezultatele reverificării online. Declarați
numai fluxurile, datele SDK și furnizorii din buildul efectiv. Validați temeiurile,
interesul legitim, retenția și transferurile cu dovezi concrete, apoi obțineți
aprobarea operatorului pentru textele RO/EN. Avertismentul rămâne până atunci.

Surse oficiale

- [Produse cu achiziție unică în Google Play](https://support.google.com/googleplay/android-developer/answer/16430488?hl=en)
- [Google Play Billing](https://developer.android.com/google/play/billing/integrate)
- [AdMob UMP pentru Android](https://developers.google.com/admob/android/privacy)
- [Datele utilizatorilor și Data Safety](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)

## Verificări juridice rămase pentru versiunea Android de lansare

- **Inventar și Data Safety.** Separă datele de lucru exclusiv locale și exporturile inițiate de utilizator de datele online. Firebase Auth procesează identitatea Google, UID-ul și metadatele de autentificare. Cloudflare verifică tokenul Firebase și gestionează starea licenței și a trialului. Play verifică tranzacțiile atunci când Billing este activ, iar solicitările sunt gestionate în căsuța de suport. Firebase Analytics este amânat și se exclude din inventarul SDK și din Data Safety pentru lansarea inițială. Declarațiile trebuie să acopere colectarea efectivă prin Firebase Auth, Billing și AdMob conform configurației finale. AdMob și Billing sunt dezactivate implicit. Verifică SDK-urile, evenimentele automate și explicite, parametrii, identificatorii tehnici, destinatarii și traficul buildului real, inclusiv înainte de consimțământ, la refuz și după retragere. Nu trata lipsa UID-ului din evenimente ca anonimizare.
- **Retenție.** Verifică aplicarea efectivă a retenției istoricului trialului și documentează criteriile pentru licențe, tranzacții, restricții, corespondență și dovezi de ștergere. Termenele Firebase sunt ale furnizorului și nu stabilesc termenul de soluționare al operatorului.
- **Temeiuri și transferuri.** Confirmă necesitatea prelucrării pentru contract, temeiul legal pentru soluționarea drepturilor, evaluarea interesului legitim pentru securitate și cerințele de consimțământ pentru AdMob. Confirmă serviciile, entitățile contractante și garanțiile de transfer efectiv aplicabile pentru Google/Firebase, Cloudflare și căsuța de suport. Nu extinde termenii Firebase asupra tuturor serviciilor Google.
- **Ștergere.** Testează cu un cont fictiv, de la primirea e-mailului până la verificarea identității, eliminarea înregistrărilor eligibile din Firebase și D1 și răspunsul operatorului. Verifică tratamentul cumpărătorilor PREMIUM și al conturilor OWNER.
- **Publicare.** După validarea configurației reale, aliniază documentele cu Data Safety și aprobă textele ca operator. Păstrează avertismentul DRAFT și blocarea generatorului de release până la îndeplinirea condițiilor. Publicarea de preview nu este o aprobare a documentelor.

Surse oficiale

- [Cerințele Google Play privind datele utilizatorilor](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Cerințele Google Play pentru ștergerea contului](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

## Pregătirea publicării din baza BUSINESS aprobată

Referința funcțională este APK-ul 1.0.31, cod 32, din `7e605a4`.
Baza tehnică `affaec7` păstrează actualizarea OAuth Firebase și verificările CI.

1. În **Play Console → Monetize with Play → Products → One-time products**, verifică dacă există produsul PREMIUM. Dacă lipsește, configurează o opțiune Buy neconsumabilă, la 99 RON pentru România. Folosește ID-ul real în `play_premium_product_id` și `PLAY_PRODUCT_ID`. Pentru pachetul comercial, `play_billing_enabled` se activează după configurarea verificării serverului. Verifică cheia de upload, certificatul de distribuție și conturile de test din **Settings → License testing**.
2. În **AdMob → Apps**, confirmă ID-ul aplicației și al unității Banner. Pregătește mesajul european în **Privacy & messaging**. Opțiunile existente de build sunt `abmAdsEnabled`, `abmAdMobAppId` și `abmAdMobBannerId`. Verifică UMP la acceptare, refuz și retragere, plus absența reclamelor în modul de consultare și pentru PREMIUM și OWNER.
3. Trialul Android durează 15 zile și folosește Google Sign-In și un drept emis de server. După expirare se păstrează datele, consultarea și exportul, conform comportamentului din 1.0.31. Activarea de producție a `NEW_TRIALS_ENABLED` rămâne o decizie separată. În testare, verifică autentificarea cu certificatul Play, un cont nou și unul cu trial expirat. Confirmă și restaurarea achiziției pentru același cont.
4. Android și GitHub Pages preiau textele RO/EN din aceeași revizie. Înaintea aprobării finale, confirmă inventarul de date din buildul efectiv, temeiurile, retenția, transferurile aplicabile și procesarea unei solicitări fictive de ștergere. Firebase Analytics este amânat pentru o versiune ulterioară. Aprobările din `src/privacy-settings.js` și URL-ul de bază sunt necesare pentru generarea ediției finale. Verifică cele patru URL-uri publice și afișarea în Android.
5. În **Play Console → App content**, completează declarațiile de reclame, Data Safety, URL-ul de ștergere, informațiile de acces pentru evaluatori, publicul țintă și clasificarea conținutului. Adaugă URL-ul politicii aprobate în câmpul dedicat. În **Testing**, verifică eligibilitatea pentru producție și cerința de testare închisă afișată contului.

## Probe comerciale izolate

Probele automate folosesc conturi, tokenuri, răspunsuri Play și date locale fictive. Ele verifică trialul, expirarea în timpul editării, restaurarea și revocarea achiziției și condiția trial plus consimțământ a bannerului.

Pentru proba reală cu servicii de test sunt necesare un produs PREMIUM disponibil testerilor autorizați, conturi din lista License testing și un endpoint de licențiere separat, conectat la Firebase și D1 de test. Folosește numai instrumentele de plată de test oferite de Google Play. Pentru reclame folosește unitățile oficiale de test Google și dispozitive de test UMP. Confirmă starea de test înaintea fiecărei probe.

- [Testarea Google Play Billing](https://developer.android.com/google/play/billing/test)
- [Reclame AdMob de test](https://developers.google.com/admob/android/test-ads)
