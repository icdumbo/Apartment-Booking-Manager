# Configurare gratuită: Firebase Auth Spark + Cloudflare Workers/D1

Administrarea cadourilor permanente/temporare prin D1, fără panou sau endpoint nou:
[Procedura PREMIUM GIFT](gift-licenses.md). Nu modificați Production fără aprobare.

**Stare:** implementat și testat local, nepublicat. Nu s-au creat resurse cloud, nu s-a activat facturarea și nu s-a construit APK. Android rămâne 1.0.10/versionCode 11. Instrucțiunile de publicare sunt pentru o etapă ulterioară, după aprobare.

## Ce rămâne și ce se schimbă

Rămân proiectul Firebase `apartment-booking-manage-2d218`, Google Sign-In, configurația Android/OAuth, `src/access.js`, confirmarea trialului, `src/secure-access.js`, verificatorul Android, Android Keystore și formatul RSA al dovezilor. Nu se schimbă UID-urile sau datele locale.

`backend/index.js` este acum un Worker, nu o Firebase Function. Adaptorul D1 înlocuiește Firestore. Regulile din `license-handler.js`/`trial-handler.js` și semnarea din `proof.js` sunt reutilizate. Pachetele Firebase Admin/Functions și configurația de deploy Firebase au fost eliminate. Nu sunt necesare Blaze, Firestore, Secret Manager Google, R2, un domeniu cumpărat sau servicii cu facturare.

## Pregătire, fără publicarea serviciului

1. **Firebase:** păstrează planul Spark și Google în Authentication → Sign-in method. Nu activa Identity Platform/Blaze pentru acest backend. Verifică proiectul, package ID-ul și amprentele existente; nu resemna aplicația. Înregistrează ulterior separat certificatul Play app-signing dacă aplicația ajunge în Play.
2. **Cloudflare:** creează/conectează un cont gratuit și verifică adresa de e-mail. În Workers & Pages selectează Workers **Free**; nu activa Workers Paid și nu introduce un card. D1 este disponibil pe Free. Nu crea un Worker public în această etapă.
3. **Local:** instalează Node 22+ și dependențele, apoi rulează verificările fără autentificare cloud:

   ```sh
   npm ci --prefix backend
   npm run check --prefix backend
   ```

   Comanda generează doar un bundle `--dry-run` și folosește un runtime Workers/D1 local cu identități fictive. Nu face deploy și nu transmite o cheie reală.
4. **D1:** când pregătești contul Cloudflare, creează o bază numită `apartment-booking-access` din dashboard → Storage & databases → D1, sau ulterior prin `npx wrangler d1 create apartment-booking-access` din `backend/`. Crearea unei baze nu publică un endpoint. Copiază UUID-ul rezultat în `backend/wrangler.jsonc`, înlocuind UUID-ul zero. ID-ul bazei nu este un secret. Contul Cloudflare se selectează prin login-ul Wrangler, nu printr-un token pus în repository.
5. **Cheia dovezilor:** dacă există deja o cheie legitimă pentru dovezi, reutilizeaz-o; nu o înlocui prin mutarea backendului. Altfel pregătește o cheie RSA 3072+ PKCS8 PEM într-un director privat în afara repository-ului, pe un calculator de încredere. Aceasta este cheia pentru dovezile backendului, **nu certificatul APK**. Nu trimite cheia în chat, GitHub sau APK. Păstrează backup privat. Exportă separat cheia publică SPKI DER/base64, destinată verificatorului Android. Nu roti cheia după emiterea unor drepturi permanente fără un plan de suport pentru dovezile vechi.
6. **Configurări server necesare:**

   | Nume | Unde și ce reprezintă |
   | --- | --- |
   | `ACCESS_PRIVATE_KEY` | Worker secret, cheia privată PKCS8 PEM pentru dovezi |
   | `OWNER_SUBJECT` | Worker secret, UID-ul Firebase al singurului proprietar, verificat administrativ; poate lipsi dacă nu se acordă încă dreptul proprietarului |
   | `FIREBASE_API_KEY` | Worker secret/configurație protejată pentru Firebase Auth REST `accounts:lookup`; cheia API a proiectului, fără service-account JSON |
   | `DB` | D1 binding către baza creată |
   | `NEW_TRIALS_ENABLED` | Variabilă text `false` implicit; devine `true` numai după reconciliere și verificări |

   Cheia API Firebase nu este cheia privată a unei licențe și nu acordă privilegii; cererea Auth conține în plus ID tokenul autentificat. Folosește o cheie cu acces la API-ul Firebase Authentication/Identity Toolkit. O cheie limitată numai la pachetul Android sau la referrere de browser poate refuza cereri din Worker. Dacă trebuie o cheie server separată, configureaz-o în proiectul existent și limiteaz-o la API-ul necesar; nu activa billing. Nu sunt necesare credențiale administrative Google pentru verificarea implementată.

## Numai după aprobare: configurarea și verificarea endpointului

7. Autentifică Wrangler în propriul cont: din `backend/`, `npx wrangler login`. Nu trimite tokenuri de acces în chat. Revizuiește configurația și aplică schema D1 **doar bazei corecte**:

   ```sh
   npx wrangler d1 migrations apply apartment-booking-access --remote
   ```

   Schema are cheie unică pe cont, constrângere exactă de 15 zile și triggere care împiedică modificarea/ștergerea trialului. Nu expune D1 prin API-uri administrative. Nu șterge tombstone-urile trialurilor și nu înlocui baza cu una goală.
8. Configurează secretele prin Cloudflare **encrypted secrets**, nu variabile text publice, fișiere comise sau argumente CLI vizibile. `npx wrangler secret put ACCESS_PRIVATE_KEY`, `... OWNER_SUBJECT` și `... FIREBASE_API_KEY` acceptă valorile prin intrarea securizată a administratorului; cheia privată rămâne între calculatorul tău și Cloudflare. Aceste operații pot crea/configura un Worker, deci nu le executa înainte de aprobarea publicării. Nu modifica certificatul Android.
9. Reconciliază trialurile locale existente înainte de `NEW_TRIALS_ENABLED=true`. Pentru conturi deja folosite introdu, prin administrarea D1, fie o înregistrare `used` cu data inițială stabilită și `expires_at=started_at+1296000000`, fie una `blocked` fără date. UID-ul este numai parametrul administrativ, nu o identitate hardcodată în SQL-ul din Git. Nu autoriza o perioadă nouă pe baza datelor editabile trimise de client. Un trial anonim șters anterior nu poate fi reconstruit sigur. Migrarea trebuie să aibă loc înainte de prima înregistrare; triggerele interzic rescrierea celor existente.
10. Configurația are `workers_dev:false` și `preview_urls:false`, fără rute, pentru a preveni o adresă publică accidentală. După aprobare configurează în mod deliberat adresa gratuită `workers.dev` (`workers_dev:true`), secretele și baza, apoi publică prin `npx wrangler deploy`. Nu este necesar un domeniu plătit. Endpointul este `https://<nume>.<subdomeniu>.workers.dev/access`; acțiunile `verify` și `startTrial` păstrează contractul Android existent. Nu există endpoint de acordare a licențelor sau panou admin.
11. Rulează întâi teste restrânse cu un cont de test, fără a activa global trialurile. Verifică Auth REST `validSince`, conturi dezactivate/revocate, semnături/audiență/proiect greșite, activări concurente, repetiție după reinstalare, expirare, owner-only, erori de cote și CPU. Absența datelor necesare verificării produce refuz, nu activare. Observă CPU atât la pornire rece, cât și cu cheile cache-uite; testele locale nu demonstrează respectarea bugetului Free pe infrastructura publică.
12. Numai după aceste verificări, configurează URL-ul real în `src/native-auth.js` și **doar cheia publică** în Android `access_public_key_spki`. Ambele sunt încă neconfigurate în această etapă. Testarea pe telefon necesită un build ulterior aprobat separat. Nu construi APK acum.

## Verificare și limite reale

- Tokenul este verificat RS256 folosind exclusiv certificatele publice Google din URL-ul fix documentat de Firebase. Se validează emitentul, proiectul/audiența, expirarea, `iat`, `auth_time`, subiectul și furnizorul Google. Cheile publice sunt cache-uite conform Cache-Control/Age; un `kid` necunoscut nu provoacă fetch-uri nelimitate. Nicio cheie nu este preluată dintr-un URL declarat în token.
- Fiecare verificare online face și Firebase Auth REST `accounts:lookup`, compară UID-ul, `validSince` cu `auth_time` și starea contului, apoi politica D1 de blocare/revocare. Nu se cache-uiesc răspunsurile de revocare. Erorile de autentificare sunt 401; erorile Google/D1/cote/configurare sunt 503, astfel încât să nu fie confundate cu o revocare confirmată.
- CORS acceptă doar `https://localhost`, dar **nu este autentificare**. Lipsa headerului Origin nu ocolește verificarea Firebase. Nu se loghează tokenuri, dovezi, chei sau datele rezervărilor. Corpul este limitat efectiv la 2 KiB; redirecturile către alte servicii nu sunt urmate.
- Timpul trialului este server-side; D1 batch este atomic și `ON CONFLICT DO NOTHING` păstrează primul termen. Contul Firebase stabil regăsește aceeași evidență după reinstalare. Un alt cont/UID nou sau ștergerea administrativă a întregii baze necesită politici suplimentare; nu promitem identificarea unei persoane între toate conturile sale.
- Android Keystore și politica offline sunt neschimbate: trialul temporar necesită reconectare după repornirea telefonului; aceeași pornire folosește elapsedRealtime, independent de data telefonului. Drepturile permanente verificate pot rămâne offline fără termen; revocarea nu poate fi aflată offline. Schimbarea telefonului/restaurarea licenței nu restaurează rezervările locale.
- Licențele cumpărate sunt doar citite din evidențe server de încredere. Nu introduce manual achiziții fictive în mediul real. Google Play Billing, verificarea tokenurilor de achiziție, restaurarea și actualizările de rambursare rămân etape separate.

## Gratuit, cu cote

Verificat în documentația oficială la 22.10.2026: contul gratuit Cloudflare pentru Workers nu cere card; Workers/D1 sunt disponibile pe Free. Workers Free: 100.000 cereri/zi și 10 ms CPU/cerere. D1 Free: 5 milioane rânduri citite/zi, 100.000 scrise/zi, 5 GB total, maximum 500 MB/bază. Cotele sunt comune contului/produsului. La depășire, cererile pot eșua; **nu se trece automat la un plan plătit prin codul aplicației**. Nu șterge trialuri pentru a elibera spațiu. Verificările periodice consumă cote chiar fără activări noi. Runtime-ul local nu reproduce limita CPU Free.

Firebase Google Sign-In rămâne pe Spark; se aplică limitele Firebase Auth existente. Identity Platform are cote diferite, inclusiv limita Spark de 3.000 utilizatori activi/zi dacă este activat; nu îl activa pentru această adaptare. Nu folosim autentificare telefonică, Functions, Firestore sau Cloud Storage.

Înainte de publicare, stabilește protecții anti-abuz și urmărește cotele. Endpointurile autentificate pot fi totuși abuzate de conturi valide. Nu este implementat un serviciu cu SLA sau trafic nelimitat. Nu este necesar să plătești pentru a păstra siguranța: la indisponibilitate se refuză activări noi, BASIC continuă offline și dovezile locale valide sunt păstrate conform politicii.

Referințe oficiale:
- https://developers.cloudflare.com/labs/workers
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/d1/platform/pricing/
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/reference/faq/
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/docs/auth/admin/verify-id-tokens
- https://firebase.google.com/docs/reference/rest/auth

## Integrare Android: stare și condiții înainte de testarea pe telefon

D1 și migrarea au fost confirmate de administrator ca finalizate. Worker-ul a fost publicat de administrator; aceste operații nu trebuie repetate pentru integrarea clientului. Starea remote a secretelor și funcționarea Firebase reală nu sunt demonstrate de testele locale.

Worker-ul acceptă acum `FIREBASE_API_KEY` (numele configurat de administrator). `FIREBASE_WEB_API_KEY` rămâne alias pentru instalările anterioare. Dacă ambele au valori diferite, răspunde 503 fără emiterea dovezii. Nu este necesară redenumirea secretului existent. Corecția sursei necesită un deployment ulterior aprobat; commitul nu schimbă Worker-ul deja publicat.

Nu s-au furnizat încă URL-ul HTTPS real cu `/access` și cheia publică SPKI DER/Base64 a perechii server. `LICENSE_ENDPOINT` rămâne null în `src/native-auth.js`, iar `access_public_key_spki` rămâne gol în `android/app/src/main/res/values/access_config.xml`. Sunt valori publice, însă nu trebuie inventate. Cheia privată rămâne exclusiv secret server; proprietarul se configurează numai prin `OWNER_SUBJECT`, după verificarea administrativă a contului.

Ordinea obligatorie pentru o etapă ulterioară:
1. Furnizarea URL-ului exact și a cheii publice; confirmarea adresei HTTPS accesibile.
2. Deployment aprobat al corecției numelui secretului; `NEW_TRIALS_ENABLED=false`.
3. Verificare live: 401 fără token, refuz token invalid, `verify` cu token Google/Firebase real al unui cont fără drepturi produce o dovadă BASIC validată cu cheia publică. Nu se transmite tokenul în chat și nu se creează licențe de test reale.
4. Configurarea celor două valori publice în client și build de test aprobat separat, semnat compatibil; Android stabil 1.0.10 nu se înlocuiește în această etapă.
5. Pe telefon: BASIC fără cont în mod avion, Google Sign-In, verificare BASIC online, logout/schimbare cont fără moștenirea drepturilor, păstrarea tuturor datelor. Activarea trialului se testează abia după reconcilierea eligibilității conturilor vechi și autorizarea explicită a înscrierilor.
6. Trialul valid trebuie să expire după 15 zile fără resetare la reinstalare sau schimbarea ceasului; după reboot temporarele cer reconectare. OWNER se verifică separat exclusiv pentru contul configurat pe server. Drepturile permanente verificate sunt utilizabile offline fără termen, dar revocarea se află numai online.

Achiziția unică, validarea Google Play și restaurarea cumpărăturilor nu sunt implementate. Nu se prezintă sursa `GOOGLE_PLAY_PURCHASE` ca flux comercial funcțional doar pentru că rezolvarea și verificarea dovezilor există.

### Configurație publică Android completată

Endpointul furnizat de administrator este `https://apartment-booking-access.ionutliviucraciun1982.workers.dev/access`. Cheia publică RSA 3072 din `access-public-spki-base64.txt` a fost configurată în resursa `access_public_key_spki`; endpointul este configurat în `src/native-auth.js`. Acestea înlocuiesc blocajul de configurare descris mai sus. Cheia privată nu a fost furnizată sau stocată în repository.

Validarea formatului cheii nu demonstrează că secretul privat din Worker îi corespunde: este necesară o dovadă reală semnată, verificată cu această cheie. Nu s-au construit APK-uri, nu s-a publicat Worker-ul și nu s-au activat trialuri în această etapă. Rămân obligatorii deploymentul aprobat al corecției `FIREBASE_API_KEY`, verificarea Firebase live și buildul/testarea Android aprobate separat. Versiunea stabilă 1.0.10 rămâne intactă.
