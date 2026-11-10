# Solicitări de ștergere prin suport

Calea din aplicație este Meniu → Cont și acces → Solicită ștergerea contului. Pagina publică oferă aceeași instrucțiune fără autentificare. Linkul mailto deschide un mesaj netrimis către adresa din src/privacy-settings.js. În versiunea web BUSINESS, utilizatorul poate completa adresa în formular înainte de a deschide clientul de e-mail. În Android și pe pagina juridică statică, utilizatorul o completează în mesaj. Dacă nu are un client de e-mail configurat, poate copia textul și folosi webmail. Interfața nu trimite, înregistrează sau confirmă automat o solicitare.

Endpointul /account-deletion răspunde 410 în codul Workerului și nu accesează D1 sau Firebase. Vechiul entry point de staging este retras, iar schedulerul de producție păstrează numai retenția trialurilor. Codul istoric de procesare rămâne accesibil testelor locale. Niciun flag vechi nu îl poate activa prin entry point-urile curente. Starea unui Worker instalat anterior trebuie verificată separat după un deployment aprobat.

## Procedură internă confirmată de proprietar

Proprietarul aplicației este singura persoană care primește, verifică și gestionează solicitările prin adresa oficială de suport. Fluxul este manual și se aplică titularilor de cont BASIC, PREMIUM și OWNER. Primirea și procesarea trebuie încă verificate cu o solicitare fictivă.

1. **Primește și înregistrează.** Notează într-un registru cu acces restrâns referința, data primirii, starea și termenul de răspuns. Confirmă primirea fără a dezvălui dacă adresa indicată are cont. Ținta operațională este de maximum 30 de zile, fără depășirea termenului legal dacă acesta expiră mai devreme. În temeiul art. 12, comunică măsurile fără întârziere nejustificată și în cel mult o lună. Dacă este necesară prelungirea cu până la două luni suplimentare, informează solicitantul în prima lună și explică motivul.
2. **Verifică titularul.** Folosește de regulă adresa Google asociată contului, verificată printr-un canal de confirmare controlat de titular și, dacă există îndoieli rezonabile, cere numai date suplimentare proporționale. Adresa introdusă în mesaj nu dovedește identitatea. Dacă mesajul vine de la altă adresă sau titularul nu mai are acces la cont, escaladează pentru o metodă alternativă aprobată. Nu cere parole, tokenuri, copii ale documentelor de identitate sau backupuri.
3. **Inventariază datele online.** După verificare, identifică UID-ul în Firebase și înregistrările asociate în D1, inclusiv licență, trial, restricții și eventuale solicitări istorice. Datele contului și licenței se păstrează cât timp contul este activ, sub rezerva termenelor și excepțiilor aplicabile. Pentru o solicitare validată, șterge manual datele eligibile conform procedurii administrative aprobate. Păstrează doar datele pentru care există o justificare documentată, cu termen sau criteriu de revizuire. Datele și backupurile locale rămân în afara operațiunii.
4. **Escaladează cazurile speciale.** Pentru PREMIUM cumpărat, separă datele de cont de evidențele tranzacțiilor. Nu revoca achiziția Play. Recuperarea dreptului după schimbarea UID-ului rămâne neconfirmată și necesită o soluție aprobată. Pentru OWNER și conturile cu restricții, cere revizuire individuală înainte de operațiuni administrative. Categoria contului nu constituie singură motiv de refuz. Escaladarea nu suspendă termenul de răspuns.
5. **Verifică și răspunde.** Confirmă separat rezultatul în Firebase și D1. În caz de eroare parțială, înregistrează pasul rămas, reia numai acel pas și informează solicitantul despre stadiu. La final, răspunde prin e-mail și comunică măsurile, datele păstrate și motivele. Dacă refuzi total sau parțial, comunică motivul și căile de plângere și de atac. Verifică dacă art. 17 alin. (2) sau art. 19 impune notificări suplimentare.

## Decizii pentru politica RO/EN

| Cerință | Confirmă operatorul | Verifică juristul |
| --- | --- | --- |
| Art. 6, 13 și 14 | Inventarul pe versiunea de lansare, scopurile, sursele, destinatarii, datele obligatorii și efectul necomunicării. Confirmă dacă există decizii exclusiv automate cu efect semnificativ. | Temeiul pe fiecare scop, necesitatea contractuală, interesul legitim și obligațiile de informare pentru date provenite de la Google sau din alte surse. Verifică dacă se aplică obligații privind DPO, consimțământul și deciziile automate. |
| Art. 12 și 17 | Proprietarul este unicul responsabil confirmat. Verifică metoda alternativă, accesul administrativ, retenția pe categorii și testul cu cont fictiv. | Criteriile de retenție și excepțiile de la ștergere, inclusiv tranzacții, securitate și tratamentul cazurilor speciale. |
| Art. 44–49 | Furnizorii și entitățile contractante efective, serviciile și regiunile configurate, termenii acceptați pentru Google/Firebase, Cloudflare și e-mailul de suport. | Mecanismul aplicabil fiecărui transfer, acoperirea DPF sau SCC unde este cazul și cum se poate obține o copie a garanțiilor. Documentația publică nu confirmă contractele proiectului. |
| Google Play | Numele din listare, configurația buildului trimis, declarația Data Safety și testarea căii din aplicație și a paginii publice fără autentificare. | Consecvența dintre declarații, documentele finale și procesul efectiv de soluționare. |

Referințe oficiale

- [GDPR, Regulamentul (UE) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng)
- [Google Play, datele utilizatorilor și politica de confidențialitate](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Google Play, ștergerea contului](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)

## Înainte de aprobarea finală

1. Verifică accesul proprietarului la căsuța de suport configurată. Trimite manual o solicitare fictivă din aplicație și una de pe pagina web. Confirmă că sosesc cu adresa, subiectul și textul așteptate și că sunt urmărite până la soluționare. Nu folosi date reale în test. Nu marca formularul ca verificat în producție până la acest test.
2. Aprobă procedura pentru verificarea titularului cu minimum de date, inclusiv modul de soluționare a cazurilor în care adresa expeditorului diferă de cea a contului. Adresa din mesaj singură nu autorizează ștergerea. Solicitarea nu revocă Google Play și nu atinge datele locale sau backupurile. Verifică separat cumpărătorii, contul OWNER și conturile cu restricții. Pentru cumpărători, verifică o cale sigură de recuperare după schimbarea UID-ului înainte de ștergere. Evidențele tranzacțiilor se păstrează numai conform temeiului și duratei aplicabile, cu răspuns individual.
3. Aprobă textele RO/EN, temeiurile, retenția pe categorii și garanțiile de transfer aplicabile. Confirmă procedura operațională manuală, inclusiv ștergerea efectivă și comunicarea excepțiilor. Un link de e-mail nu dovedește că ștergerea este executată.
4. După aprobarea retragerii Workerului vechi, verifică HTTP 410 pentru ruta și preflightul vechi. Confirmă că /access și /purchase funcționează conform configurației și că triggerul de ștergere vechi, dacă a fost configurat separat, nu mai rulează.
5. După aprobarea publicării, completează publicBaseUrl și porțile juridice, generează release și înlocuiește numai cele patru documente publice din /legal/ cu versiunea aprobată. Documentele cu avertisment sunt deja publicate. Workflow-ul are nevoie de o declanșare explicită și de sursa aprobată. Verifică HTTP 200 prin HTTPS fără autentificare pentru toate cele patru pagini și testează primirea solicitărilor. URL-urile de ștergere propuse sunt /legal/delete-account-ro.html și /legal/delete-account-en.html; politicile folosesc /legal/privacy-ro.html și /legal/privacy-en.html.

Referință: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
