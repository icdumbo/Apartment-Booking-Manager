# Confidențialitate — confirmări rămase la 6 noiembrie 2026

Document de lucru, nu politică aprobată pentru publicare. Politica RO/EN este
menținută numai în src/privacy-content.js, cu identitatea/contactul/brandul în
src/privacy-settings.js. Nu se activează servicii și nu se schimbă retenția reală.

## Confirmat de operator

Brandul, numele persoanei fizice și contactul sunt acum în configurația centrală.
Brandul nu este prezentat drept societate. Nu se introduce adresa de domiciliu.
Istoricul trialului: maximum șase luni calendaristice de la început, în UTC.
Curățarea remote rămâne neverificată/neactivată în această etapă.

## Retenție: fapt tehnic versus decizie de politică

| Categorie | Ce rezultă din implementare/documentația verificată | Ce lipsește |
| --- | --- | --- |
| Date locale și copii exportate | Datele de afaceri și fotografiile rămân pe dispozitiv; utilizatorul controlează ștergerea și copiile. Ștergerea online nu le elimină. | Nu se inventează o retenție server pentru date care nu sunt încărcate. |
| Trial | Data-limită este calculată la șase luni calendaristice; curățare în loturi indexate. | Verificarea/activarea efectivă remote, separat. |
| Firebase Authentication | Contul nu are o expirare pentru inactivitate în cod. Procesorul de ștergere este dezactivat. | Durata menținerii conturilor inactive de către operator și procedura reală de ștergere. |
| Licențe și achiziții | UID, produs, hash și token criptat sunt folosite pentru verificare/restaurare. Nu există expirare automată a acestor înregistrări; revocarea schimbă starea, nu șterge dovada. | Criteriul de păstrare pe durata dreptului și perioada justificată după revocare/închiderea contului. Nu se atribuie automat șase luni. |
| Restricții de securitate | identity_policy nu are TTL; restricțiile blochează ștergerea automată. | Criterii și termen de revizuire/eliminare, cu justificare distinctă de trial. |
| Cereri și încercări de ștergere | Rămân până la procesare; eșecurile sunt reluabile, cazurile blocate nu expiră automat. | Termen de soluționare și retenție pentru solicitări blocate/eșuate. |
| Confirmări de finalizare | Referință aleatorie și date de finalizare/expirare; TTL-ul este obligatoriu, fără valoare implicită. | Numărul aprobat de zile. Intervalul tehnic permis 1–365 și cele 30 de zile fictive din teste nu reprezintă o decizie juridică. |
| Date tehnice ale furnizorilor | Se aplică regulile serviciilor folosite, separat de tabelele aplicației. | Contractele/setările efective și retenția copiilor/exporturilor D1 administrate de operator. |

Firebase documentează păstrarea IP-urilor jurnalizate câteva săptămâni, a celorlalte
date de autentificare până la inițierea ștergerii și eliminarea ulterioară din
sistemele active/backupuri în maximum 180 de zile. Aceasta nu dovedește că
operatorul a procesat o solicitare sau că D1 este curățat în același termen.

Fișiere relevante: backend/trial-retention.js, migrations/0005–0007,
backend/play-repository.js, backend/play-purchases.js, backend/deletion-executor.js,
backend/firebase-deletion.js. Nu există test pe cont real în această etapă.

## Temeiuri: opțiuni de confirmat, nu declarații aprobate

Codul dovedește scopul tehnic, nu stabilește singur temeiul juridic. Pentru
publicare trebuie confirmat de operator dacă serviciile de cont, trial, licență
și restaurare sunt necesare executării contractului/cererii utilizatorului
(art. 6(1)(b) GDPR). Pentru securitate și prevenirea fraudei, art. 6(1)(f)
poate fi o opțiune numai după documentarea necesității, proporționalității și
evaluării intereselor/drepturilor persoanelor. Acceptarea termenilor trialului
nu este automat consimțământ GDPR pentru orice prelucrare.

Nu se declară art. 6(1)(c), o obligație fiscală sau un termen fiscal fără
identificarea obligației aplicabile. Nu se declară consimțământ publicitar
colectat cât timp AdMob/UMP sunt dezactivate. Criteriile de retenție pot fi
folosite unde un termen fix nu poate fi stabilit, dar trebuie să fie concrete,
aprobate și respectate efectiv; o formulare vagă nu repară lipsa curățării.

## Furnizori și transferuri

Firebase Authentication este documentat ca serviciu cu procesare în SUA; nu
se poate promite stocare exclusiv în UE. Google/Firebase și Cloudflare publică
DPA-uri și mecanisme de transfer; nu este confirmat aici ce acorduri/entități și
garanții se aplică conturilor operatorului. Nu deducem localizarea D1 din numele
bazei sau din lipsa unui indiciu de regiune. Google Sign-In, serviciul de
autentificare, plățile Play și metadatele de serviciu trebuie evaluate în rolurile
lor respective; nu descriem automat toți furnizorii ca simplii împuterniciți.

Operatorul trebuie să confirme acordurile aplicabile Google/Firebase și
Cloudflare, rolurile/entitățile contractuale și mecanismul efectiv de transfer
(de exemplu clauze contractuale standard, dacă sunt aplicabile). Nu se cere
trimiterea credențialelor sau a documentelor cu secrete în conversație.

## Publicare și deciziile necesare

publicationApproved rămâne false; retentionPolicy și processingPolicy rămân
necompletate până la confirmare. URL-ul public nu este inventat. Configurația
administrativă GitHub Pages (Source/Branch/Folder) trebuie verificată înaintea
oricărei schimbări; un preview nu este un document public pentru Play Console.

Confirmați separat: politica pentru categoriile non-trial din tabel; numărul
de zile pentru confirmări; temeiurile și evaluarea interesului legitim, unde
este folosit; acordurile/garanțiile transferurilor; Source/Branch/Folder din
GitHub Pages. Aprobarea unui termen nu îl implementează automat în backend.

## Surse oficiale consultate la 6 noiembrie 2026

- GDPR, art. 5, 6 și 13: https://eur-lex.europa.eu/eli/reg/2016/679
- Temeiuri juridice: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en
- Firebase, retenție și locații: https://firebase.google.com/support/privacy
- Cloudflare DPA: https://www.cloudflare.com/cloudflare-customer-dpa/
- Cloudflare SCC: https://www.cloudflare.com/cloudflare-customer-scc/
