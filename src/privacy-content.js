import {privacySettings as settings} from './privacy-settings.js';
import {isPrivacyPublicationReady,privacyConfigurationIssues} from './privacy-settings.js';
export const privacyCopy={
 "ro": {
  "supportLabel": "Suport și confidențialitate: ",
  "deletionSupportLabel": "Suport pentru solicitările de ștergere a contului: ",
  "title": "Politica de confidențialitate",
  "deletion": "Solicită ștergerea contului",
  "eraseLocal": "Șterge separat datele locale",
  "eraseLocalConfirm": "Ștergi apartamentele, rezervările și celelalte date de lucru din această instalare? Fotografiile nereferențiate se curăță la o pornire sigură, după închiderea celorlalte ferestre. Copiile exportate rămân la tine.",
  "close": "Închide",
  "draft": "DOCUMENT ÎN PREGĂTIRE — informațiile obligatorii și aprobarea publicării nu sunt încă complete.",
  "scope": "Pentru a solicita ștergerea contului Apartment Booking Manager și a datelor online asociate, deschide mesajul pregătit și trimite-l la suport. Completează în mesaj adresa contului folosit în aplicație. Suportul verifică manual identitatea înainte de procesare și solicită numai informațiile necesare. Nu trimite parole, tokenuri, documente de identitate sau backupuri prin acest formular. Rezervările, apartamentele, fotografiile și copiile locale rămân pe dispozitiv sau la furnizorul ales. Achizițiile Google Play nu sunt revocate, anulate sau rambursate automat. Evidențele tranzacțiilor necesare potrivit legii se tratează separat. Conturile cu achiziții, drepturi OWNER sau restricții necesită verificare individuală. Dacă anumite date trebuie păstrate, suportul explică ce date rămân și temeiul păstrării.",
  "sendRequestEmail": "Trimite solicitarea prin e-mail",
  "invalidAccountEmail": "Introdu o adresă de e-mail validă pentru contul Google.",
  "requestAccountEmail": "Adresa de e-mail a contului Google",
  "requestTemplateLabel": "Mesajul pe care îl vei completa în aplicația de e-mail",
  "requestTemplate": "Solicit ștergerea contului meu Apartment Booking Manager și a datelor online asociate.\r\nAdresa contului folosit în aplicație: [completează aici]",
  "openEmail": "Deschide mesajul către suport",
  "emailNotice": "Dacă nu se deschide aplicația de e-mail, copiază mesajul și trimite-l la adresa de mai sus. Mesajul nu este trimis automat și trimiterea lui nu confirmă ștergerea.",
  "localEraseError": "Datele locale nu au putut fi șterse.",
  "sections": [
   [
    "Aplicație și operator",
    "Apartment Booking Manager, sub brandul {brand}, gestionează apartamente și rezervări. Operator de date, persoană fizică: {operator}. Brandul nu reprezintă o persoană juridică separată. Contact pentru confidențialitate și solicitări: {contact}."
   ],
   [
    "Datele de afaceri de pe dispozitiv",
    "Numele și adresele apartamentelor, proprietarii, fotografiile, numele și telefonul oaspeților, rezervările, notele, sumele, monedele, încasările, întreținerea și ciornele sunt salvate local în browser sau, pe Android, în WebView (localStorage și IndexedDB). Aplicația nu le sincronizează cu propriul server și nu le trimite pentru acordarea licenței. Proprietarul sau administratorul care introduce datele oaspeților stabilește scopul și temeiul prelucrării lor și răspunde de informare, minimizare, securitate și soluționarea drepturilor oaspeților. Operatorul aplicației răspunde separat pentru prelucrările online pe care le controlează."
   ],
   [
    "Google și Firebase Authentication",
    "BASIC poate fi folosit fără cont Google. Dacă alegi autentificarea, Google și Firebase procesează credențiale, identificatori și datele furnizate de identitatea Google; acestea pot include adresa de e-mail și profilul. Firebase generează UID-ul contului și procesează informații tehnice, inclusiv IP și user-agent, pentru autentificare și prevenirea abuzului. Parola Google nu este solicitată de aplicație. Tokenurile nu trebuie trimise prin e-mail sau în conversații de suport. Conform documentației Google, Firebase Authentication procesează date în SUA. IP-urile jurnalizate sunt păstrate câteva săptămâni; celelalte informații de autentificare, până la inițierea ștergerii utilizatorului, apoi sunt eliminate din sistemele active și backupuri în maximum 180 de zile. Acestea sunt termenele furnizorului, nu un termen de soluționare promis de operator."
   ],
   [
    "Cloudflare, licențe și trialuri",
    "Aplicația trimite către backendul Cloudflare un token Firebase de autentificare pentru verificarea identității. Backendul de licențiere folosește UID-ul Firebase, datele trialului, starea licenței și restricții de securitate. Evidențele de achiziție includ produsul, hash-ul tokenului și tokenul criptat, acolo unde există o achiziție înregistrată. Înregistrările istorice ale solicitărilor, dacă există, pot conține UID, referință, dată, limbă și stare. Cererile noi sunt primite prin e-mail și gestionate manual. Drepturile OWNER sunt acordate server-side unei identități autorizate. Baza locală de rezervări și fotografiile nu sunt trimise pentru licențiere. Furnizorii pot procesa metadate tehnice de rețea conform propriilor reguli."
   ],
   [
    "Achiziții Google Play",
    "Cumpărarea Google Play este dezactivată în configurația implicită a aplicației. Aplicația nu solicită numărul cardului și nu procesează direct plăți cu cardul. Tokenurile de achiziție păstrate de sistemul de licențiere sunt criptate. Drepturile de achiziție Google Play și datele de afaceri locale sunt distincte; ștergerea contului aplicației nu anulează sau rambursează automat o achiziție. Google aplică propriile condiții datelor procesate în serviciile sale de plată."
   ],
   [
    "Reclame și consimțământ",
    "Reclamele AdMob sunt dezactivate în configurația implicită, iar SDK-ul publicitar este exclus din buildul implicit. Nu declarăm reclame livrate sau consimțământ publicitar colectat în această configurație."
   ],
   [
    "Backup JSON și exporturi",
    "Backupul manual conține datele de afaceri și fotografiile, dar nu sesiunile Google, eligibilitatea trialului sau drepturile PREMIUM/OWNER. Fișierul JSON nu este criptat de aplicație: protejează-l și locația aleasă. Android poate permite alegerea unui furnizor cloud; transferul ales este gestionat de acel furnizor. Exporturile Excel/PDF pot conține date personale și financiare. Restaurarea necesită validare și confirmare explicită și păstrează mecanismul de rollback."
   ],
   [
    "Backupul automat Android",
    "{backup} Cache-ul licenței, preferințele de autentificare și cookie-urile sunt excluse prin regulile aplicației; Android Keystore nu este transferat. Regulile nu șterg datele existente și nu schimbă formatul backupului JSON."
   ],
   [
    "Scopuri, destinatari și temeiuri juridice",
    "Datele sunt utilizate pentru gestionarea locală, autentificare, verificarea accesului, securitate și soluționarea solicitărilor. Furnizorii implicați în fluxurile relevante sunt Google/Firebase, Cloudflare și furnizorul de fișiere ales de utilizator. Mesajele trimise la contactul public sunt prelucrate în serviciul de e-mail folosit pentru suport. {processing}"
   ],
   [
    "Păstrarea datelor",
    "Datele de afaceri rămân pe dispozitiv până la ștergerea prin funcțiile disponibile ori ștergerea datelor aplicației/dezinstalare. Copiile exportate sunt sub controlul utilizatorului și al furnizorului ales. Limita aprobată pentru istoricul trialului este de maximum șase luni calendaristice de la început, în UTC. Curățarea automată nu este activată în configurația verificată; nu afirmăm că a fost verificată ștergerea efectivă în producție. Nu păstrăm un indicator permanent separat al folosirii trialului. {retention}"
   ],
   [
    "Solicitarea ștergerii și drepturile tale",
    "Pentru acces, rectificare, ștergere, restricționare, portabilitate sau opoziție, în condițiile GDPR, contactează operatorul la {contact}. Pentru ștergere, precizează că soliciți eliminarea contului aplicației și a datelor online asociate. Suportul primește solicitările prin e-mail și verifică identitatea înainte de procesare. Dacă legea sau o altă excepție aplicabilă impune păstrarea unor date, se păstrează numai evidențele necesare și se comunică motivul. Evidențele tranzacțiilor Google Play sunt tratate separat de datele personale eligibile pentru ștergere. Nu trimite parole, tokenuri sau backupuri. Verificarea identității trebuie limitată la informațiile necesare. Datele locale și copiile exportate nu sunt șterse de această solicitare. Un mesaj trimis sau o referință nu înseamnă ștergere finalizată. Cazurile cu achiziții, OWNER sau restricții nu sunt declarate soluționate automat; motivele și datele păstrate trebuie explicate individual. GDPR impune informarea privind măsurile luate fără întârziere nejustificată, în principiu într-o lună; o prelungire justificată de cel mult două luni suplimentare se comunică motivat în prima lună. Acesta este termenul legal de răspuns, nu o promisiune de ștergere tehnică a tuturor copiilor în aceeași perioadă. Te poți adresa autorității de supraveghere competente."
   ],
   [
    "Securitate și modificări",
    "Conexiunile de autentificare și licențiere folosesc HTTPS. Dovezile de acces sunt semnate, iar cache-ul nativ de acces este criptat cu Android Keystore. Backupul JSON manual nu este criptat de aplicație. Aceste măsuri nu înlocuiesc securitatea dispozitivului. Versiune document: 6 noiembrie 2026."
   ],
   [
    "Transferuri internaționale",
    "Google documentează procesarea Firebase Authentication în SUA. Termenii Firebase Data Processing and Security Terms, secțiunea 10, prevăd soluții de transfer, inclusiv Data Privacy Framework pentru entitățile certificate acoperite și clauze contractuale standard, în condițiile de aplicabilitate prevăzute acolo. Cloudflare Customer DPA, secțiunea 6, descrie procesarea internațională, DPF și SCC pentru transferurile relevante. Poți solicita informații despre garanțiile aplicabile transferurilor prin adresa de contact. Surse oficiale: https://firebase.google.com/terms/data-processing-terms și https://www.cloudflare.com/cloudflare-customer-dpa/. Pentru e-mailul de suport se aplică regulile serviciului Google folosit, inclusiv politica https://policies.google.com/privacy; nu presupunem că acordul Firebase acoperă căsuța de e-mail."
   ]
  ]
 },
 "en": {
  "supportLabel": "Support and privacy contact: ",
  "deletionSupportLabel": "Support for account deletion requests: ",
  "title": "Privacy policy",
  "deletion": "Request account deletion",
  "eraseLocal": "Delete local data separately",
  "eraseLocalConfirm": "Delete apartments, reservations and other business data in this installation? Unreferenced photos are removed at a safe startup after other windows close. Exported copies remain under your control.",
  "close": "Close",
  "draft": "DRAFT — required information and publication approval are not yet complete.",
  "scope": "To request deletion of your Apartment Booking Manager account and associated online data, open the prepared message and send it to support. Enter the email address of the account you use in the app in the message. Support checks your identity manually before processing and asks only for necessary information. Do not send passwords, tokens, identity documents or backups through this form. Reservations, apartments, photos and local copies stay on the device or with the provider you chose. Google Play purchases are not automatically revoked, cancelled or refunded. Transaction records required by law are handled separately. Accounts with purchases, OWNER access or restrictions require individual review. If some data must be retained, support explains what remains and the basis for retention.",
  "sendRequestEmail": "Send request by email",
  "invalidAccountEmail": "Enter a valid email address for your Google account.",
  "requestAccountEmail": "Google account email address",
  "requestTemplateLabel": "Message to complete in your email application",
  "requestTemplate": "I request deletion of my Apartment Booking Manager account and associated online data.\r\nEmail address of the account used in the app: [fill in here]",
  "openEmail": "Open email to support",
  "emailNotice": "If your email application does not open, copy the message and send it to the address above. The message is not sent automatically and sending it does not confirm deletion.",
  "localEraseError": "Local data could not be deleted.",
  "sections": [
   [
    "App and controller",
    "Apartment Booking Manager, under the {brand} brand, manages apartments and reservations. Individual data controller: {operator}. The brand is not a separate legal entity. Privacy and request contact: {contact}."
   ],
   [
    "Business data on your device",
    "Apartment names and addresses, owners, photos, guest names and phone numbers, reservations, notes, amounts, currencies, receipts, maintenance and drafts are stored locally in browser storage or, on Android, in WebView localStorage and IndexedDB. The app does not synchronize them with its own server or send them for licensing. The owner or manager entering guest data determines its purpose and legal basis and is responsible for notice, minimization, security and handling guest rights. The app controller is separately responsible for the online processing it controls."
   ],
   [
    "Google and Firebase Authentication",
    "BASIC works without a Google account. If you choose sign-in, Google and Firebase process credentials, identifiers and information supplied by your Google identity, which may include email and profile information. Firebase generates an account UID and processes technical information, including IP and user-agent, for authentication and abuse prevention. The app does not request your Google password. Never email tokens or include them in support chats. Google documents US processing for Firebase Authentication. Logged IP addresses are retained for a few weeks; other authentication information remains until user deletion is initiated, then is removed from live and backup systems within 180 days. These are provider periods, not a completion deadline promised by the controller."
   ],
   [
    "Cloudflare, licenses and trials",
    "The app sends a Firebase authentication token to the Cloudflare backend to verify identity. The licensing backend uses the Firebase UID, trial dates, license status and security restrictions. Purchase records include the product, token hash and encrypted token where a purchase is recorded. Historical request records, where present, can contain a UID, reference, date, language and status. New requests are received by email and handled manually. OWNER rights are granted server-side to an authorized identity. The local reservation database and photos are not sent for licensing. Providers may process network metadata under their own rules."
   ],
   [
    "Google Play purchases",
    "Google Play purchasing is disabled in the default app configuration. The app does not request card numbers or directly process card payments. Purchase tokens retained by the licensing system are encrypted. Google Play purchase rights and local business data are distinct; deleting the app account does not automatically cancel or refund a purchase. Google applies its own terms to data processed in its payment services."
   ],
   [
    "Advertising and consent",
    "AdMob ads are disabled in the default configuration and the advertising SDK is excluded from the default build. No ad delivery or advertising consent collection is claimed in this configuration."
   ],
   [
    "JSON backup and exports",
    "Manual backups contain business data and photos, but not Google sessions, trial eligibility or PREMIUM/OWNER access. The app does not encrypt the JSON file: protect the file and chosen location. Android may let you choose a cloud document provider; your chosen transfer is handled by that provider. Excel/PDF exports may contain personal and financial data. Restoration requires validation and explicit confirmation and retains rollback protection."
   ],
   [
    "Android automatic backup",
    "{backup} License-cache and authentication preferences and cookies are excluded by app rules; Android Keystore is not transferred. The rules do not delete existing data or change manual JSON backup format."
   ],
   [
    "Purposes, recipients and legal bases",
    "Data is used for local management, authentication, access verification, security and handling requests. Providers involved in relevant flows are Google/Firebase, Cloudflare and the document provider chosen by the user. Messages sent to the public contact are processed in the email service used for support. {processing}"
   ],
   [
    "Data retention",
    "Business data remains on the device until deletion through available features or clearing app data/uninstalling. Exported copies are controlled by the user and the chosen provider. The approved trial-history limit is at most six calendar months from trial start, in UTC. Automatic cleanup is not enabled in the checked configuration; actual production deletion is not claimed as verified. We do not keep a separate permanent trial-use marker. {retention}"
   ],
   [
    "Deletion requests and your rights",
    "For access, rectification, erasure, restriction, portability or objection, where applicable under GDPR, contact the controller at {contact}. For deletion, specify that you request removal of your app account and associated online data. Support handles requests by email and verifies identity before processing. Where retention is required by law or another applicable exception, only necessary records are retained and the reason is communicated. Google Play transaction records are handled separately from personal data eligible for deletion. Do not send passwords, tokens or backups. Identity verification must be limited to necessary information. Local data and exported copies are not erased by this request. Sending a message or receiving a reference is not completed deletion. Purchase, OWNER or restricted-account cases are not described as automatically resolved; retained data and reasons must be explained individually. GDPR requires information on action taken without undue delay and normally within one month; a justified extension of up to two further months must be explained within the first month. This is a legal response deadline, not a promise to technically erase all copies within that period. You may complain to the competent supervisory authority."
   ],
   [
    "Security and changes",
    "Authentication and licensing connections use HTTPS. Access proofs are signed and the native access cache is encrypted with Android Keystore. Manual JSON backups are not encrypted by the app. These safeguards do not replace device security. Document version: 6 November 2026."
   ],
   [
    "International transfers",
    "Google documents US processing for Firebase Authentication. Section 10 of the Firebase Data Processing and Security Terms provides transfer solutions, including the Data Privacy Framework for covered certified entities and standard contractual clauses under the conditions stated there. Section 6 of the Cloudflare Customer DPA describes international processing, DPF and SCCs for relevant transfers. You can ask about the safeguards applicable to transfers using the contact address. Official sources: https://firebase.google.com/terms/data-processing-terms and https://www.cloudflare.com/cloudflare-customer-dpa/. Support email is subject to the Google service rules, including https://policies.google.com/privacy; the Firebase agreement is not assumed to cover the mailbox."
   ]
  ]
 }
};
export function policySections(language,configuration=settings){
 const ro=language==='ro',lang=ro?'ro':'en',copy=privacyCopy[lang];
 const pending=ro?'NECONFIRMAT — necesită confirmarea proprietarului':'UNCONFIRMED — requires owner confirmation';
 const value=input=>typeof input==='string'&&input.trim()?input:pending;
 const operator=typeof configuration.operator==='string'&&configuration.operator.trim()?configuration.operator:(ro?'Persoană fizică titulară a contului Google Play Console; nume legal ':'Individual holder of the Google Play Console account; legal name ')+pending;
 const backup=configuration.automaticBackup==='excluded'?(ro?'Backupul cloud și transferul automat al datelor aplicației sunt excluse; folosește backupul JSON manual.':'Cloud backup and automatic transfer of app data are excluded; use manual JSON backup.'):(ro?'Datele de afaceri pot rămâne eligibile pentru backupul Android, în funcție de sistem și de setările utilizatorului. Alegerea finală privind excluderea lor necesită confirmare.':'Business data may remain eligible for Android backup, depending on system and user settings. The final decision to exclude it requires confirmation.');
 return copy.sections.map(([title,body])=>[title,body.replace('{brand}',()=>value(configuration.brand)).replace('{operator}',()=>operator).replace('{contact}',()=>value(configuration.contact)).replace('{retention}',()=>value(configuration.retentionPolicy?.[lang])).replace('{processing}',()=>value(configuration.processingPolicy?.[lang])).replace('{backup}',()=>backup)]);
}
export function renderPolicy(root,language){const copy=privacyCopy[language==='ro'?'ro':'en'];root.replaceChildren();const warning=document.createElement('p');warning.textContent=copy.draft;warning.setAttribute('role','note');if(!isPrivacyPublicationReady())root.append(warning);for(const [title,body] of policySections(language)){const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=body;section.append(h,p);root.append(section);}renderSupportContact(root,language); }

export function renderSupportContact(root,language,deletion=false){
 if(privacyConfigurationIssues().includes('contact'))return;
 const copy=privacyCopy[language==='ro'?'ro':'en'],p=document.createElement('p'),link=document.createElement('a');
 p.dataset.privacyContact='true';p.append(document.createTextNode(deletion?copy.deletionSupportLabel:copy.supportLabel));
 link.href='mailto:'+settings.contact;link.textContent=settings.contact;link.style.cssText='color:var(--business-silver);overflow-wrap:anywhere';p.append(link);root.append(p);
}
