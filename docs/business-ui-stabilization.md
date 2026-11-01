# Stabilizarea designului BUSINESS aprobat

Punct de pornire: `3364c8617a3d814419a2f263030c2e98629797d9`, branch
`codex/business-ui-redesign`. Designul existent rămâne aprobat și nu este refăcut.
`main` și `codex/basic-premium-foundation` nu se modifică.

## Auditul rulărilor istorice GitHub Actions

- `94ca66d`, run `41286432420`, job `124788562025`: patru aserțiuni de paletă
  citeau culori intermediare din tranziția CSS de 150 ms după schimbarea foii
  de stil. Geometria trecea deja. Al cincilea eșec încerca să verifice focusul
  pe primul `input` din formular, care era pickerul de fotografie ascuns.
- `c145443`, run `41287008626`, job `124790240311`: două verificări de contrast
  citeau butonul principal în tranziție imediat după reactivarea CSS-ului;
  verificarea focusului țintea încă inputul ascuns. Testul de restaurare compara
  exact un istoric cu `lastSeen: 0`, în timp ce inițializarea normală anti-rollback
  îl actualiza la timpul curent. Aceasta nu era o modificare produsă de restaurare.
- Aceste cauze sunt corectate deja în `3364c86`, cu run `41287503808` reușit:
  se așteaptă culoarea finală (egalitate exactă și contrast minimum 4,5:1), se
  navighează din tastatură în câmpul vizibil `name`, iar testul backup folosește
  timp fix și istoric expirat consistent. Comparația exactă a întregului istoric
  și verificările restaurării/fotografiilor sunt păstrate. Rulările vechi rămân
  rezultate istorice; nu sunt șterse și nu sunt făcute artificial verzi.

## Ajustări strict vizuale

Numele rezervărilor pe telefon au 12,5 px/700, respectiv 12 px/650 în barele
foarte scurte, păstrând fontul condensat existent acolo și textul complet în
detalii/tooltip. Contrastul textului pe pastel este mărit discret. Nu se schimbă
barele, lățimea zilelor, coordonatele, culorile rezervărilor, jumătățile de zi,
suprapunerile, statusurile sau operațiile calendarului.

Textele secundare ale temei folosesc un gri puțin mai deschis. Sub 1100 px,
documentul rezervă 96 px plus safe-area pentru bara fixă inferioară. Scroll padding
și scroll margin pentru controalele panourilor facilitează accesul la finalul
paginilor; nu sunt aplicate marginile celulelor timeline-ului. Desktopul păstrează
navigarea laterală. Paleta de fundal, structura paginilor și meniul compact rămân.

Sursa aplicației modificată este doar CSS-ul. Codul funcțional, backendul,
autentificarea, schemele, backupul, exporturile și configurația Android rămân
identice cu baza stabilă `84317b2`, lucru verificat și de gate-ul CI existent.

## Verificări de comportament

Testul nou `checks/business-stability.spec.mjs` folosește contexte izolate și
date fictive, nu numai capturi: 8 apartamente, 32 rezervări și 28 cheltuieli.
Pe Fold pliat/depliat, S24 Ultra și desktop derulează până la ultimul element,
măsoară că acesta este deasupra navigării și execută comenzile reale: deschidere
apartament, rezervare din apartamente/încasări, afișare valori statistice,
descărcare Excel, editare/anulare întreținere și deschidere backup. Datele sunt
comparate integral înainte/după; RON rămâne separat de EUR.

Numele scurte sunt verificate RO/EN și deschid detaliile cu numele integral.
Comparația exactă cu geometria de bază a calendarului rămâne; doar fontul/boxul
textului guest este separat, fiind ajustarea cerută explicit acum. Dimensiunile
și pozițiile barelor/zilelor, statusurile, handover și fonturile celorlalte
elemente rămân în comparația exactă. Suita existentă pentru CRUD, filtre,
fotografii, exporturi, backup/rollback, offline și drepturi se păstrează integral.

Browserul verifică executarea aplicației și contractele native simulate, nu o
conectare reală Google/Firebase sau o achiziție Google Play. Telefonul fizic,
providerii Android pentru fotografii/fișiere, barele de sistem, scalarea nativă
a textului și autorizarea OWNER reală necesită verificare ulterioară într-un APK
aprobat separat. Nu se construiește APK în această etapă și nu se modifică chei.
