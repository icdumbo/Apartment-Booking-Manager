# Pregătire GitHub Pages — adăugare juridică fără înlocuirea aplicației

## Aprobarea metodei — fără autorizație de publicare acum

Operatorul a aprobat metoda limitată la cele patru HTML în main, fără merge BUSINESS.
A cerut explicit să nu se publice încă. Aprobarea conținutului final și o instrucțiune
ulterioară de publicare rămân necesare înaintea oricărei modificări main.
Vezi legal-final-review.md pentru deciziile și limitele rămase.

## Configurația confirmată și sursa actuală

Operatorul a confirmat Source: Deploy from a branch; Branch: main; Folder: /(root); HTTPS activ. Nu se schimbă aceste setări.

La verificare, main este la 14d1c1da18ebd57c2c9699f9e44f881d74b94847, arbore 11f45c39eb92d8b39752057d775146d0c9d21878. Conține .nojekyll, index.html și modulele/CSS din src/ (app.js, domain.js, storage.js, timeline.js, i18n.js, date-format.js, month-navigation.js, demo-migration.js și demo.js). Este aplicația web anterioară, nu redesignul BUSINESS. Datele sunt în localStorage, cheia apartment-booking-manager:v1; nu sunt fișiere din repository. Nu există un director legal/ în această sursă.

Actualizarea fișierelor în main declanșează publicarea Pages din rădăcină. Workflow-ul android-debug.yml din main are filtre pentru src/**, android/**, index.html și alte fișiere de build; o schimbare exclusiv în legal/** nu corespunde filtrelor. Nu se modifică workflow-ul și nu se cere executarea lui. Fișierele sursă și configurația au fost citite; nu pretindem o verificare HTTP a versiunii live din instrumentele indisponibile.

## De ce nu copiem src/legal direct în main

HTML-ul existent folosește public.js și module din directorul părinte: privacy-content.js, privacy-settings.js, account-deletion.js, plus styles.css. Main are alt styles.css și nu are modulele juridice BUSINESS. Copierea dependențelor în src/ ar amesteca versiuni ale aplicației și ar corespunde filtrelor buildului APK. Nu facem aceasta.

scripts/prepare-legal-pages.mjs reutilizează direct privacyCopy și policySections, fără a menține o politică paralelă. Emite numai patru fișiere HTML în legal/, cu text complet și CSS inclus, fără scripturi, formulare, resurse externe, acces la localStorage sau IndexedDB. Legăturile sunt relative. Pagina de ștergere rămâne informativă și explică indisponibilitatea fluxului; nu simulează cereri sau ștergeri. Integrarea web interactivă verificată necesită o etapă separată, nu este înlocuită tacit de acest export.

## Previzualizare locală — NU se publică

Din rădăcina BUSINESS:

    node scripts/prepare-legal-pages.mjs --preview

Rezultat: build/legal-pages-preview/legal/ cu privacy-ro.html, privacy-en.html, delete-account-ro.html și delete-account-en.html. manifest.json include SHA-256 pentru fiecare fișier. Directorul build/ este ignorat de Git. Paginile au avertizarea de document în pregătire și noindex/nofollow; nu se încarcă în main sau în Play Console.

Verificările locale HTTP folosesc un server temporar pe 127.0.0.1 și confirmă 200 pentru toate cele patru pagini/legături. Testul de browser verifică lățimi 320, 390, 840 și 1440 px și păstrarea exactă a datelor locale fictive. Lipsa scripturilor face conținutul independent de activarea JavaScript; nu se transmite nicio cerere către Firebase sau Worker.

## Blocaje înainte de generarea versiunii publicabile

Retenția efectivă și temeiurile identificate sunt documentate în RO/EN. Evaluarea interesului legitim este marcată explicit ca necesitând validare juridică; aplicabilitatea exactă a acordurilor de transfer nu este declarată verificată. Adresa publică din configurația pentru aplicație și aprobarea publicării rămân necompletate/false. Recomandările de retenție sunt numai în documentația internă și nu sunt exportate. Simpla completare a metadatelor nu aprobă evaluarea juridică. Ștergerea pentru conturi cu achiziții și serviciile reale rămân probleme separate înainte de lansarea Google Play.

    node scripts/prepare-legal-pages.mjs --release

Comanda este pregătită, dar refuză configurația actuală fără să genereze pachetul release. Nu publică nimic nici dacă validarea va trece. Pe viitor, metadatele/legăturile aplicației care folosesc publicLegalUrls pentru vechile URL-uri dinamice trebuie aliniate separat dacă vor indica aceste URL-uri statice; nu modificăm configurația aplicației existente în această etapă.

## URL-uri propuse, nepublicate

- https://icdumbo.github.io/Apartment-Booking-Manager/legal/privacy-ro.html
- https://icdumbo.github.io/Apartment-Booking-Manager/legal/privacy-en.html
- https://icdumbo.github.io/Apartment-Booking-Manager/legal/delete-account-ro.html
- https://icdumbo.github.io/Apartment-Booking-Manager/legal/delete-account-en.html

## Procedura exactă, numai după aprobare separată

1. Finalizarea și aprobarea conținutului juridic; generarea --release pe BUSINESS și verificarea celor patru pagini fără marcaje neconfirmate. Semnăturile SHA-256 din manifest identifică exact rezultatul revizuit. Nu se publică preview-ul.
2. Citirea HEAD main în acel moment și verificarea sursei Pages. Dacă main a avansat, se păstrează noua versiune; nu se revine la snapshotul notat aici. Verificarea absenței unor pagini legal existente; un conflict necesită revizuire, nu suprascriere.
3. Pregătirea unei schimbări limitate la cele patru fișiere generate legal/*.html, pe baza acelui HEAD main. Nu se face merge/cherry-pick al branch-ului BUSINESS și nu se copiază src/, index.html, Android, backendul sau configurațiile. Nu se schimbă CNAME ori .nojekyll.
4. Verificarea diferenței înainte de orice scriere în main: numai cele patru fișiere adăugate; fiecare blob existent din main trebuie să aibă același SHA în arborele propus. Dacă apare altă modificare, se oprește operațiunea. Solicitarea aprobării explicite pentru această schimbare concretă înainte de actualizarea main. În această etapă nu se creează branch sau PR și nu se modifică main.
5. După aprobarea scrierii în main, o singură actualizare cu verificarea HEAD așteptat. Publicarea Pages este automată la actualizarea main; nu există o a doua etapă manuală de activare și nu trebuie surprins operatorul printr-un push înainte de aprobare. Dacă se folosește un PR, merge-ul se face numai după aprobare separată.
6. Verificarea rulării Pages și GET HTTPS anonim 200 pentru toate cele patru URL-uri, inclusiv textul, linkurile și mobilul. Un rezultat local sau un preview nu confirmă publicarea.
7. Verificarea că index.html și toate fișierele aplicației sunt neschimbate și că aplicația web publicată continuă să funcționeze. Publicarea fișierelor statice nu cere dezinstalare, schimbare de origine sau ștergerea datelor browserului.

Recuperare: dacă va fi necesară după publicarea aprobată, se pregătește și aprobă o corecție numai pentru fișierele legal adăugate. Nu se resetează main și nu se ating datele browserului. Nu se promite că o ștergere a paginilor elimină instantaneu cache-urile publice.

## Rezultate în această etapă

16 teste locale relevante au trecut, inclusiv HTTP local și validarea sursei comune RO/EN. --release a refuzat corect publicarea neaprobată. Pornirea Playwright local este blocată de spawn EPERM; verificarea vizuală este inclusă în CI și nu se declară trecută înainte de rezultat. Nicio modificare main, backend, setări Pages sau producție; niciun APK/AAB generat.
