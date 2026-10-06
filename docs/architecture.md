# Arhitectură și verificare — v0.1

## Model

Starea conține `version: 1`, `apartments` și `bookings`. Apartament: `id`, `name`, `address`, `city`. Rezervare: `id`, `apartmentId`, `guest`, `phone`, `checkIn`, `checkOut`. ID-urile pentru datele introduse sunt UUID-uri; datele sunt șiruri calendaristice ISO, iar calculele folosesc zile UTC pentru a evita erorile de ora de vară. Ziua curentă provine din fusul local al dispozitivului.

Regula de conflict este `sameApartment && a.checkIn < b.checkOut && b.checkIn < a.checkOut`. Modificarea exclude propria rezervare din verificare. Poziționarea la jumătate de zi nu modifică numărul nopților.

Separarea între domeniu, persistență, randare și coordonare permite adăugarea unor module de raportare sau plăți. O viitoare migrare de schemă trebuie să păstreze datele existente, iar un backend trebuie să verifice suprapunerile într-o tranzacție. Adapterul actual are metodele `load()` și `save(state)`; unul la distanță va necesita tratarea operațiilor asincrone și a conflictelor între utilizatori.

## Verificări automate

`npm test`: 10 teste pentru intervale consecutive în ambele direcții, suprapuneri parțiale/incluse/identice, apartamente diferite, modificarea rezervării, câmpuri invalide, geometrie la jumătate de zi, tăiere la marginile perioadei, salvare și reîncărcare (inclusiv stare goală), date corupte și eroare de stocare.

## Verificare manuală recomandată

1. La prima pornire, primul apartament are două bare care se întâlnesc la mijlocul aceleiași zile.
2. Adaugă un apartament; modifică numele și adresa.
3. Adaugă o rezervare care începe la check-out-ul alteia: salvarea trebuie să fie permisă.
4. Încearcă o rezervare suprapusă: apare eroarea și formularul rămâne deschis.
5. Modifică o rezervare fără schimbarea datelor: nu trebuie să fie considerată conflict cu ea însăși.
6. Reîncarcă pagina: datele trebuie să rămână.
7. Anulează dialogul de ștergere inclusiv prin Escape; datele rămân.
8. Șterge un apartament cu rezervări și verifică avertizarea explicită și eliminarea rezervărilor asociate.
9. Verifică navigarea, 14/30 zile, derularea și formularele la lățime de telefon.

Browserul cloud al sesiunii de implementare a blocat accesul la serverul local (`ERR_BLOCKED_BY_CLIENT`); verificarea vizuală în browser nu a putut fi efectuată în acea sesiune. Testele automate acoperă domeniul și persistența, nu interacțiunile DOM.
