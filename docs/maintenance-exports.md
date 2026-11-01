# Exporturi Întreținere

Export Excel și Export PDF sunt disponibile în Întreținere pentru acces TRIAL sau
PREMIUM verificat prin mecanismul existent. Generatorii și acțiunea de export
reverifică drepturile. BASIC nu afișează butoanele. Transportul este `saveExport`
existent: download offline în browser și selectorul nativ Android pentru PDF/XLSX.
Nu se modifică date, ciorne, backupuri, autentificare sau licențe.

## Selecția și sumele

Ambele exporturi includ **cheltuielile și lucrările salvate**, indiferent de fila
curentă. Reviziile, care nu au sume, și ciornele nu intră în acest raport.
Se aplică filtrele curente de proprietar, apartament și perioadă. Categoria
cheltuielilor se aplică atunci când este vizibilă în fila Cheltuieli; nu rămâne
un filtru ascuns la exportul din altă filă. Apartamentele fără proprietar pot fi
selectate separat. Apartamentele șterse cu istoric păstrat apar în situația generală
ca indisponibile; nu sunt atribuite automat unui proprietar.

Perioada este inclusivă și urmează selecția existentă: data cheltuielii, respectiv
data programată a lucrării. Antetul indică filtrele. În total intră cheltuielile
și costurile reale ale lucrărilor **netransformate** în cheltuieli. Dacă o lucrare
are o cheltuială legată, costul se numără doar prin cheltuială, la data acesteia.
Nu este reintrodus prin lucrare dacă data/categoria cheltuielii nu trece filtrul.
Ambele înregistrări rămân vizibile când trec propriile filtre. Coloana „Inclus în
total” și explicația din export fac explicită această separare.

Estimările sunt centralizate separat, fără a fi adunate la costurile reale.
Sumele lipsă rămân nespecificate, distincte de zero; lucrările fără cost real sunt
numărate separat. Totalurile pe apartament, pe proprietar și generale sunt
calculate în unități minore întregi, separat pentru fiecare monedă, cu refuz la
depășirea preciziei sigure. Excel refuză și valori monetare cu peste 15 cifre
semnificative în unități minore, pentru a evita rotunjirea silențioasă a banilor.

## Formate

- Excel: patru foi — detalii, pe apartamente, pe proprietari, total general.
  Antete fixate, filtre, sume numerice și monedă separată. Textele lungi continuă
  pe rânduri suplimentare; sumele nu se repetă pe continuări. Textul utilizatorului
  este literal, inclusiv valori care încep cu `=`; nu devine formulă.
- PDF: A4 landscape, font Unicode local, antet informativ pe fiecare pagină,
  tabele, totaluri separate pe monedă și numere de pagină. Rândurile lungi sunt
  împărțite pe pagini cu antet de tabel repetat, fără tăiere sau micșorarea fontului.
- Rapoarte rezervări: textele UI și exporturile folosesc „1 rezervare”,
  „0/2 rezervări” și echivalentele EN. Numerele și calculele nu sunt modificate.

## Verificări

`tests/maintenance-export.test.js` verifică accesul, filtrele, monedele, conversia
lucrărilor, sume lipsă/zero, totalurile, proprietari multipli/fără proprietar,
rezultate goale, texte lungi și gramatica rapoartelor. Datele sunt fictive.
`checks/verify-maintenance-exports.py` citește independent PDF-urile cu pypdf/
pdfplumber și Excelurile cu openpyxl, verificând totaluri, separarea proprietarilor,
integritatea textului și limitele paginilor. PDF-urile sunt și randate pentru QA vizual.
`checks/maintenance-export.spec.mjs` verifică descărcări UI offline RO/EN, filtre,
accesul BASIC, mesaje native de salvare/anulare/eșec și gramatica în interfață.
Testele native folosesc un bridge fictiv; selectorul Android real trebuie verificat
pe telefon într-o etapă ulterioară, după un build aprobat separat.
