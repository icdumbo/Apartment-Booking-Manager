# Solicitări de ștergere prin suport

Calea din aplicație este Meniu → Cont și acces → Solicită ștergerea contului. Pagina publică oferă aceeași instrucțiune fără autentificare. Linkul mailto deschide un mesaj netrimis către adresa din src/privacy-settings.js. Utilizatorul completează adresa contului în aplicația de e-mail. Dacă nu are un client de e-mail configurat, poate copia textul și folosi webmail. Interfața nu trimite, înregistrează sau confirmă automat o solicitare.

Endpointul /account-deletion răspunde 410 în codul Workerului și nu accesează D1 sau Firebase. Vechiul entry point de staging este retras, iar schedulerul de producție păstrează numai retenția trialurilor. Codul istoric de procesare rămâne accesibil testelor locale. Niciun flag vechi nu îl poate activa prin entry point-urile curente. Starea unui Worker instalat anterior trebuie verificată separat după un deployment aprobat.

## Înainte de publicare

1. Confirmă accesul la căsuța de suport configurată și persoana responsabilă de soluționare. Trimite manual o solicitare fictivă din aplicație și una de pe pagina web. Confirmă că sosesc cu adresa, subiectul și textul așteptate și că sunt urmărite până la soluționare. Nu folosi date reale în test. Nu marca formularul ca verificat în producție până la acest test.
2. Aprobă procedura pentru verificarea titularului cu minimum de date, inclusiv modul de soluționare a cazurilor în care adresa expeditorului diferă de cea a contului. Adresa din mesaj singură nu autorizează ștergerea. Solicitarea nu revocă Google Play și nu atinge datele locale sau backupurile. Verifică separat cumpărătorii, contul OWNER și conturile cu restricții. Pentru cumpărători, verifică o cale sigură de recuperare după schimbarea UID-ului înainte de ștergere. Evidențele tranzacțiilor se păstrează numai conform temeiului și duratei aplicabile, cu răspuns individual.
3. Aprobă textele RO/EN, temeiurile, retenția pe categorii și garanțiile de transfer aplicabile. Confirmă procedura operațională manuală, inclusiv ștergerea efectivă și comunicarea excepțiilor. Un link de e-mail nu dovedește că ștergerea este executată.
4. După aprobarea retragerii Workerului vechi, verifică HTTP 410 pentru ruta și preflightul vechi. Confirmă că /access și /purchase funcționează conform configurației și că triggerul de ștergere vechi, dacă a fost configurat separat, nu mai rulează.
5. După aprobarea publicării, completează publicBaseUrl și porțile juridice, generează release și include numai cele patru fișiere din /legal/ în workflow-ul Pages. Workflow-ul are nevoie de o declanșare explicită și de sursa aprobată. Verifică HTTP 200 prin HTTPS fără autentificare pentru toate cele patru pagini și testează primirea solicitărilor. URL-urile de ștergere propuse sunt /legal/delete-account-ro.html și /legal/delete-account-en.html; politicile folosesc /legal/privacy-ro.html și /legal/privacy-en.html.

Referință: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
