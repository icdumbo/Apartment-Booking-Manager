# Android BASIC — test personal

Capacitor 8.5.2, application ID `ro.icdapps.apartmentbookingmanager`, nume `Apartment Booking Manager`. Android 7+ (API 24), target/compile API 36, Java 21, Node 22+. Nu există Google Play, reclame sau servicii de plăți.

## Fișiere offline și date

`npm run build:web` copiază exact `index.html` și `src/` în `www/`; `npm run android:sync` le include în assets Android. Nu există `server.url`, CDN sau descărcare a aplicației din GitHub Pages. Originea locală rămâne `https://localhost`, iar `localStorage` și cheia existentă de date sunt păstrate. Închiderea/redeschiderea păstrează datele. APK-ul și browserul web au spații de stocare separate: datele browserului nu sunt migrate și nu sunt resetate.

Nu dezinstala aplicația și nu folosi Clear data pentru actualizare: acestea șterg stocarea Android. Actualizările necesită același package ID și aceeași cheie de semnare. Folosește exclusiv cheia privată stabilă din backup-ul BASIC 1.0.2, conform instrucțiunilor de mai jos. Nu încărca chei în Git. Compatibilitatea de update cu aceeași semnătură începe de la versiunea 1.0.2.

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

Cu cheia privată restaurată, APK: `android/app/build/outputs/apk/debug/app-debug.apk`. Fără cheie se generează numai `app-debug-unsigned.apk`, care trebuie semnat conform pașilor de mai jos.

## Generare GitHub Actions

Actions → Android debug APK → Run workflow → main. După succes, descarcă artifactele `Apartment-Booking-Manager-unsigned-candidate` și `Android-SDK-apksigner`, dezarhivează și semnează candidatul cu cheia privată stabilă, conform pașilor de mai jos. Instalează doar APK-ul semnat rezultat. Workflowul rulează și la schimbările relevante din main, fără publicare într-un magazin. Prima instalare necesită permisiunea Android pentru instalare din sursa aleasă.

## Verificare pe telefon

1. Instalează APK-ul, apoi activează modul avion înainte de prima deschidere.
2. Verifică pornirea goală, timeline, selector luni/ani și Astăzi.
3. Adaugă un apartament și o rezervare fictivă; verifică suprapunerile și predarea în aceeași zi.
4. Închide complet aplicația, redeschide în modul avion și verifică păstrarea datelor.
5. Verifică și editarea/ștergerea cu confirmare, tastatura și rotirea telefonului.

Buildul reușit și verificarea assets nu înlocuiesc testarea pe telefon. Versiunea web BASIC continuă să fie publicată din rădăcina main, fără modificări UI sau de logică pentru Android.

## Corecții BASIC 1.0.1

Selectorul afișează numai lunile, cu chenar pe luna următoare. Datele introduse/afișate folosesc DD/MM/YYYY; stocarea internă rămâne ISO. Instalările noi pornesc goale. Migrarea unică verifică ID-urile și câmpurile originale demo, inclusiv coerența datelor dintre rezervările originale; păstrează datele modificate/ambigue și apartamentele cu rezervări reale. Nu folosește clear().

Cheia temporară a primului build CI nu a fost păstrată. APK-ul 1.0.1 nu poate fi prezentat ca actualizare garantat compatibilă cu primul. Nu dezinstala și nu șterge datele aplicației vechi pentru instalare; migrarea Android pe acea instalare necesită cheia originală sau o cale de transfer aprobată separat.

## BASIC 1.0.2 — stable private test signing

This APK establishes a stable BASIC test signing identity. The package ID and local origin are unchanged. The public SHA-256 fingerprint is in `android/basic-test-certificate.sha256`. The private JKS and signing properties are never committed. A private backup named `Apartment-Booking-Manager-BASIC-signing-backup.zip` contains the existing `.android-signing/` directory. Restore it at the repository root before future builds. Do not generate a replacement key.

Local Gradle debug builds load `.android-signing/signing.properties` and reuse that key. When the key is missing, Gradle creates an **unsigned candidate**, never a randomly signed installable APK. GitHub Actions likewise produces `Apartment-Booking-Manager-unsigned-candidate` and an official Android SDK `apksigner.jar`. Download both artifacts, extract them and sign privately:

```sh
python scripts/sign-apk.py --apksigner-jar /path/to/apksigner.jar /path/to/app-debug-unsigned.apk /path/to/Apartment-Booking-Manager-debug.apk
```

The script verifies the resulting APK against the committed certificate fingerprint. Keep the private backup confidential. Use increasing versionCode values and the same key, package ID and local origin for every subsequent update. Installing an update preserves local data; do not uninstall or clear storage.

**Compatibility boundary:** the first two APKs used lost, different ephemeral CI keys. This stable-key APK cannot update those older installations. Same-key update compatibility begins with 1.0.2; there is no claim of having migrated Android data from the old APK. Do not uninstall an old installation containing real data without a separately agreed transfer plan.

The 30-day and 12-month layouts now resize using CSS container widths. The application remains fully bundled and offline. Browser viewport tests do not replace a physical Fold/Android installation test.

## BASIC 1.0.3

versionCode 4, versionName 1.0.3. Phone-only refinement and centralized RO/EN translations. The private signing key and certificate are reused from 1.0.2; no new signing key is generated. Package ID, local origin and booking-storage key remain unchanged. Language preference uses its own local key and survives same-key updates. CI still produces an unsigned candidate; the delivered APK is privately signed using the existing backup with `scripts/sign-apk.py`. No GitHub Secrets action is required for this private signing workflow. Do not install the unsigned CI candidate.

## BASIC 1.0.4

Phone-only timeline refinement: 15 visible day widths with native horizontal scrolling, 110–130px pinned apartment column and pinned month/day header. versionCode 5; same private signing key, package ID, local origin and stored data as 1.0.3.
