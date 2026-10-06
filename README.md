# Apartment Booking Manager

Prima versiune funcțională pentru gestionarea rezervărilor mai multor apartamente. Interfața este în română.

## Pornire și testare

Necesită Python 3 pentru serverul local. Nu sunt necesare instalarea de pachete sau un build.

1. Descarcă repository-ul (Code → Download ZIP) și dezarhivează-l sau folosește `git clone https://github.com/icdumbo/Apartment-Booking-Manager.git`.
2. Deschide un terminal în folderul proiectului.
3. Rulează `python -m http.server 8080` (pe unele sisteme: `python3 -m http.server 8080`; pe Windows poți folosi `py -m http.server 8080`).
4. Deschide http://localhost:8080 în browser. Nu deschide direct `index.html` prin `file://`, deoarece aplicația folosește module JavaScript.

Cu Node.js 20+ instalat, rulează `npm test` pentru testele automate. `npm install` nu este necesar.

## Funcții

- Timeline de 14 sau 30 zile, navigare înainte/înapoi și revenire la astăzi.
- Apartamente individuale, fără grupare pe localitate; numele și adresa rămân vizibile la derularea orizontală.
- Zile libere verzi, rezervări portocalii și ziua curentă evidențiată.
- Adăugare/modificare/ștergere apartamente și rezervări. Selectarea barei deschide detaliile; selectarea unei celule completează apartamentul și data pentru o rezervare nouă.
- Client, telefon, check-in și check-out, cu validări și prevenirea suprapunerilor.
- Confirmare înainte de ștergere. Ștergerea apartamentului elimină și rezervările asociate, cu numărul acestora afișat în confirmare.
- Trei apartamente și patru rezervări fictive, inițializate o singură dată la prima deschidere. Două rezervări consecutive la primul apartament demonstrează schimbarea clienților în aceeași zi.
- Salvare locală automată după fiecare modificare validă.

## Regula intervalelor

O rezervare ocupă intervalul `[check-in, check-out)` pentru verificarea suprapunerilor. Check-out-ul unei rezervări poate coincide cu check-in-ul următoarei. Check-out trebuie să fie strict ulterior check-in-ului; o rezervare de zero nopți nu este permisă.

Vizual, fiecare bară începe la mijlocul zilei de check-in și se termină la mijlocul zilei de check-out. Prima jumătate a zilei de schimb aparține clientului care pleacă; a doua jumătate celui care sosește. Acesta este un model vizual, nu o gestionare a orelor efective de sosire/plecare.

## Persistență și limite

Datele sunt păstrate în `localStorage`, cheia `apartment-booking-manager:v1`, separat de orice alt proiect. Sunt specifice browserului și originii (protocol, adresă, port). Nu există sincronizare între dispozitive, autentificare sau backup/export în această etapă. Ștergerea datelor browserului le elimină. Evită folosirea în producție cu date reale înainte de adăugarea unui backup și a controlului accesului. Nu folosi simultan mai multe file pentru editare: nu există controlul concurenței între file.

La eșecul salvării, modificarea nu este aplicată în memorie. Datele incompatibile sau corupte nu sunt suprascrise automat, iar editarea este blocată cu un mesaj vizibil.

## Arhitectură

JavaScript ES modules, HTML și CSS responsive, fără framework sau dependențe runtime.

- `src/domain.js`: validări, intervale, date și geometria barelor.
- `src/storage.js`: adapter de persistență și validarea stării versionate.
- `src/demo.js`: date fictive relative la ziua primei porniri.
- `src/timeline.js`: randarea calendarului folosind elemente DOM și text sigur.
- `src/app.js`: formulare, acțiuni și coordonarea stării.
- `src/styles.css`: layout desktop/mobil și stiluri.
- `tests/domain.test.js`: teste de regresie.
- `docs/architecture.md`: extensii viitoare și verificări.

Pentru o bază de date, adapterul local poate fi înlocuit cu unul asincron, adaptând coordonarea încărcării/salvării. Backend-ul va trebui să impună și el regulile de suprapunere, atomic, pentru editarea simultană. Prețuri, plăți, statusuri, filtre, statistici, PDF/Excel și PWA nu sunt implementate în această etapă.

Toată dezvoltarea se face exclusiv în `icdumbo/Apartment-Booking-Manager`.
