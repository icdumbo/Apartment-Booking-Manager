# BUSINESS UI — ramură de evaluare

Bază stabilă / punct de revenire: `84317b27fc2106c1e0406f4cfe36ff5f3c1fc425`.
Aceasta include exporturile Întreținere `84317b2`, meniul compact `f8414a2` și
corecțiile anterioare. Lucrul este izolat în `codex/business-ui-redesign`.
Nu se modifică `main` sau `codex/basic-premium-foundation` și nu se face merge.

Imaginile oferite sunt referințe estetice, nu contracte funcționale. Nu s-au
adăugat căutare, camere/persoane/etaj, sincronizare, taburi inexistente, date
fictive în aplicație sau controale fără implementare. Funcțiile reale au prioritate.

## Limita schimbării

Singurul fișier al aplicației modificat este `src/styles.css`. Stratul BUSINESS
este la final, cu paleta centralizată în `--business-*`. Suprafețele antracit au
contrast ridicat, controalele folosesc argintiu și contururi discrete, iar
accentele aurii reflectă doar vizibilitatea controalelor existente TRIAL/PREMIUM.
CSS-ul nu poate acorda licențe și nu modifică verificările sau handler-ele.

Nu sunt schimbate fonturile sau dimensiunile calendarului, pozițiile, spațierile,
coordonatele, sticky, numărul de zile, jumătățile de zi, derularea, handover sau
paleta stabilă a rezervărilor. Gridul rămâne foarte deschis pentru zilele libere;
data curentă păstrează evidențierea funcțională existentă.

Tematizarea acoperă calendarul, apartamentele/fotografiile, formularele, statistici,
rapoarte, încasări, întreținere, backup/restaurare, meniul compact, contul și
ecranele de intrare/autentificare. RO/EN și toate controalele rămân disponibile.
La lățimi de tabletă/Fold desfăcut, filtrele statisticilor folosesc trei coloane
pentru a oferi loc selecțiilor lungi; nu sunt eliminate filtre sau opțiuni.
PDF/Excel păstrează stilul lor imprimabil și generatorii originali; tema de ecran
nu se propagă în fișierele exportate.

## Verificări

- CI blochează orice diferență față de bază în sursele funcționale, HTML,
  Android, backend, dependențe sau configurația Capacitor.
- `checks/business-ui.spec.mjs` încarcă CSS-ul real din commitul de bază și
  compară coordonatele, dimensiunile și fonturile calendarului, inclusiv barele,
  header-ele, etichetele și handover, la 344/430/840/1440 px. Culorile barelor și
  stilul de status sunt comparate separat.
- Se păstrează testele funcționale existente și se verifică din nou contrastul
  (minimum 4,5:1 pentru textele testate), focusul, erorile, cele trei stări de
  acces, RO/EN, overflow și navigarea offline. Singura aserțiune vizuală existentă
  actualizată este culoarea fundalului: alb → antracit, conform noului obiectiv.
- Pregătirea testului existent de backup fixează timpul și folosește un istoric
  expirat cu `lastSeen` egal cu timpul testului. Astfel actualizarea normală
  anti-rollback nu concurează cu verificarea izolării restaurării. Comparația
  exactă a întregului istoric și toate aserțiunile originale sunt păstrate.
- Capturile `BUSINESS-*` sunt ale aplicației reale cu date fictive, într-un browser
  izolat. Nu sunt randări AI sau imagini înlocuind controalele aplicației.
- Sunt rulate testele existente pentru proprietari/filtre, CRUD, rapoarte/exporturi,
  întreținere/exporturi, backup/rollback, meniul compact și simulările native.

Verificările din browser nu confirmă o autentificare Firebase/OWNER reală și nu
înlocuiesc verificarea fizică pe Fold 7/S24 Ultra. Nu se construiește APK și nu
se publică în Google Play. Revenirea presupune folosirea în continuare a branch-ului
stabil neschimbat; nu există migrare de date de inversat.
