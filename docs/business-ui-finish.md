# Finisaje BUSINESS: selectoare și paletă calendar

Punct de plecare: `cdb995defd10440e3bc28da62c14d96a0d6be415`.
Sursa aplicației modificată în acest finisaj este exclusiv `src/styles.css`.

Selectoarele din Rapoarte, Statistici, Încasări și Întreținere aveau coloane
fracționare care puteau deveni mai înguste decât textele selectate. Grila folosește
acum coloane de minimum 260 px, limitate de spațiul disponibil; câmpurile trec pe
rânduri separate când nu încap. Selectoarele native păstrează opțiunile și
evenimentele, au font de 16 px, minimum 44 px înălțime și rezervă 40 px în dreapta
pentru săgeată. Nu se modifică traducerile sau logica filtrelor.

Calendarul folosește suprafețe gri neutre și text deschis, cu un accent verde
discret la baza celulelor și în legendă. Data curentă are fundal albastru închis
și cifră albastră deschisă. Culorile barelor rezervărilor și statusurile rămân
identice. Nu se schimbă dimensiuni, fonturi ale calendarului, poziții, sticky,
scroll, intervale sau operații de rezervare.

`checks/business-finish.spec.mjs` rulează aplicația reală offline, în RO/EN,
la 344, 360, 430, 840 și 1440 px. Măsoară toate textele opțiunilor față de lățimea
efectivă disponibilă, separat de săgeată, în cele patru secțiuni; schimbă și
restabilește selecții prin evenimente native. Verifică minimum 4,5:1 pentru
textele calendarului, indicatorul liber, data curentă, încadrarea numelor scurte
și deschiderea detaliilor. Compară datele persistente înainte/după.
Capturile `BUSINESS-finish-*.png` sunt produse de browserul care execută aplicația,
cu date fictive, nu machete și nu capturi ale datelor private de pe telefon.
Testele existente de geometrie, culori ale rezervărilor și funcționalitate sunt
păstrate integral.

Înaintea buildului s-a verificat read-only telefonul conectat: versiunea instalată
1.0.23/code 24, certificatul original și SHA-256 identic cu APK-ul livrat anterior.
Actualizarea planificată este 1.0.24/code 25, cu aceeași cheie privată, păstrată
exclusiv local. Nu se modifică alte setări Android, date, backend sau reguli
comerciale. Instalarea și inspecția vizuală nativă a noului APK rămân utilizatorului;
în această etapă nu se instalează și nu se șterge nimic de pe telefon.
