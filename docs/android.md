# Android BASIC — test personal

Capacitor 8.5.2, application ID `ro.icdapps.apartmentbookingmanager`, nume `Apartment Booking Manager`. Android 7+ (API 24), target/compile API 36, Java 21, Node 22+. Nu există Google Play, reclame sau servicii de plăți.

## Fișiere offline și date

`npm run build:web` copiază exact `index.html` și `src/` în `www/`; `npm run android:sync` le include în assets Android. Nu există `server.url`, CDN sau descărcare a aplicației din GitHub Pages. Originea locală rămâne `https://localhost`, iar `localStorage` și cheia existentă de date sunt păstrate. Închiderea/redeschiderea păstrează datele. APK-ul și browserul web au spații de stocare separate: datele browserului nu sunt migrate și nu sunt resetate.

Nu dezinstala aplicația și nu folosi Clear data pentru actualizare: acestea șterg stocarea Android. Actualizările necesită același package ID și aceeași cheie de semnare. Păstrează cheia debug de pe calculator (`~/.android/debug.keystore`); cheia unui runner CI nou poate fi diferită, deci nu presupune că APK-urile generate independent pot fi instalate ca actualizare peste primul APK. Nu încărca chei în Git.

## Generare pe calculator

Instalează Node 22+, Android Studio 2025.2.1 sau mai nou, SDK Platform 36 și Build Tools necesare, folosind SDK Manager. Folosește JDK 21/Java instalat de Android Studio. Acceptă licențele SDK în interfața Android Studio.

Din rădăcina repository-ului:

```sh
npm ci
npm test
npm run android:sync
npm run android:open
```

În Android Studio: așteaptă Gradle Sync, apoi Build → Generate App Bundles or APKs → Generate APKs (sau Build APK(s), în funcție de versiunea IDE). Varianta este `debug`.

Alternativ, după configurarea SDK/JDK:

```sh
cd android
./gradlew assembleDebug
# Windows PowerShell:
.\gradlew.bat assembleDebug
```

APK: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Generare GitHub Actions

Actions → Android debug APK → Run workflow → main. După succes, descarcă artifactul `Apartment-Booking-Manager-debug`, dezarhivează și instalează `app-debug.apk`. Workflowul rulează și la schimbările relevante din main, fără publicare într-un magazin. Prima instalare necesită permisiunea Android pentru instalare din sursa aleasă.

## Verificare pe telefon

1. Instalează APK-ul, apoi activează modul avion înainte de prima deschidere.
2. Verifică timeline, selector luni/ani, Astăzi și detalii demo.
3. Adaugă un apartament și o rezervare fictivă; verifică suprapunerile și predarea în aceeași zi.
4. Închide complet aplicația, redeschide în modul avion și verifică păstrarea datelor.
5. Verifică și editarea/ștergerea cu confirmare, tastatura și rotirea telefonului.

Buildul reușit și verificarea assets nu înlocuiesc testarea pe telefon. Versiunea web BASIC continuă să fie publicată din rădăcina main, fără modificări UI sau de logică pentru Android.
