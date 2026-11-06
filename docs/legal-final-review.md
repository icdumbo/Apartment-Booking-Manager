> Actualizare: recomandările au fost scoase din sursa publică și păstrate în internal-privacy-recommendations.json. Cele patru HTML folosesc numai situația actuală, procedura manuală prin suport și precizările de validare juridică. Această notă înlocuiește descrierile istorice de mai jos despre includerea planului în pagini.

# Revizuirea documentelor juridice înainte de publicare

## Autorizație primită

Metoda este aprobată: numai cele patru fișiere HTML juridice în main, fără merge
BUSINESS și fără modificarea aplicației. Publicarea NU este autorizată acum;
instrucțiunea curentă cere oprirea înaintea oricărei modificări main.
Nu se schimbă Pages, Workerul, Firebase, Billing sau datele utilizatorilor.

## Ce este pregătit

Sursa unică RO/EN rămâne src/privacy-content.js, cu identitatea centralizată
în src/privacy-settings.js. Cele două secțiuni suplimentare disting planul de
retenție de implementarea curentă și explică temeiurile pentru confirmare.
Exportul static include și aceste informații în paginile de ștergere.
Textele nu transformă refuzurile/erorile în confirmări de ștergere.

Schema recomandată a fost integrată conform instrucțiunii: 24 luni pentru conturi
BASIC eligibile inactive, notificare cu 30 zile înainte; drepturile active pe
durata lor; tokenuri revocate 90 zile și apoi dovezi minime maximum 12 luni de la
revocare; revizuire de securitate la 30 zile și dovezi 90 zile după închiderea
incidentului; escaladarea cererilor eșuate după 7 zile și date tehnice 30 zile
după soluționare; confirmări minimale 30 zile. Acestea nu sunt termene statutare.
Nu se cere din nou furnizarea numelui/brandului/contactului sau alegerea metodei
Pages. Politica trialului de maximum șase luni rămâne neschimbată.

## Decizii esențiale rămase

1. Validarea încadrării juridice propuse: art. 6(1)(b) pentru serviciile de cont/
   trial/licență/restaurare strict necesare; art. 6(1)(f) pentru securitate și
   dovezi minime pentru contestații, după evaluarea interesului legitim.
   Soluționarea drepturilor GDPR este obligație legală, nu o funcție opțională
   condiționată de activarea butonului.
2. Confirmarea entității titulare a conturilor furnizorilor, a termenilor/DPA
   aplicabili și a acoperirii transferurilor Google/Firebase și Cloudflare.
   Documentele publice oferă mecanisme, dar nu dovedesc singure situația
   contractuală a contului. Nu se solicită secrete sau documente confidențiale.
3. Confirmarea urmăririi și soluționării manuale a solicitărilor primite prin
   contactul public, cu procedura de escaladare propusă. Un formular
   dezactivat nu suspendă drepturile GDPR. Trebuie rezolvate cazurile blocate
   (inclusiv achiziții/OWNER/restricții) înainte de a promite ștergere pentru toți.

### Evaluare de interes legitim — schiță pentru validare

- Scop: protejarea conturilor, a drepturilor de acces și gestionarea contestațiilor.
- Necesitate: serverul trebuie să distingă identitatea autorizată și dovezile
  verificate; indicatorii locali editabili nu oferă această protecție. Fiecare
  câmp/păstrare trebuie limitat la scopul său; nu se justifică o urmărire generală.
- Impact și garanții: nu se încarcă rezervările/fotografiile locale pentru
  licențiere; tokenurile achizițiilor sunt criptate; nu se adaugă fingerprinting
  sau indicator permanent al trialului. Datele locale rămân în BASIC.
- Riscuri de tratat: blocare eronată, păstrare excesivă, contestație nesoluționată,
  imposibilitatea ștergerii unui cont cu achiziții. Revizuirile și termenele
  recomandate nu sunt încă implementate; schița nu reprezintă evaluare finală
  favorabilă sau o excepție de la minimizarea datelor.

## Blocaje tehnice, nu informații care pot fi rezolvate prin simplă aprobare

Nu există încă măsurarea inactivității/notificarea și curățarea non-trial
corespunzătoare întregului plan. Configurația, serviciile și backendul nu au fost
modificate aici. Procesarea reală de ștergere rămâne dezactivată/neconfirmată;
recuperarea achiziției după schimbarea UID-ului nu este rezolvată.

retentionPolicy/processingPolicy aprobate și publicationApproved rămân
necompletate/false. Generatorul --release refuză atât datele lipsă, cât și
marcajele explicite de plan neimplementat. Aprobarea metodei de publicare nu
înlătură aceste blocaje și nu autorizează publicarea unui draft.

## Verificare

17 teste locale relevante trecute: politica comună, aceeași schemă RO/EN, export
static, legături HTTP locale, păstrarea porților de siguranță și prevenirea unei
publicări declarate finalizate doar prin completarea configurației. Cele patru
HTML sunt numai în build/legal-pages-preview; main nu este modificat.

Surse: https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/legal-grounds-processing-data_en
https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en
https://firebase.google.com/terms/data-processing-terms
https://www.cloudflare.com/cloudflare-customer-dpa/
