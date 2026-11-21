import {privacySettings as settings,isPrivacyPublicationReady,privacyConfigurationIssues} from './privacy-settings.js';
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
    "scope": "Poți solicita ștergerea contului și a datelor online asociate din Meniu → Cont și acces → Solicită ștergerea contului, din pagina publică dedicată sau direct la: {contact}.\n\nIndică adresa Google asociată contului și faptul că soliciți ștergerea contului Apartment Booking Manager. Formularul pregătește un mesaj; trebuie să îl trimiți din aplicația de e-mail sau din webmail. Trimiterea nu produce ștergere automată și nu confirmă finalizarea ei.\n\nOperatorul verifică titularul, de regulă prin controlul adresei Google asociate. Dacă aceasta nu poate fi folosită, se stabilește o alternativă sigură și proporțională. Nu sunt solicitate parole, tokenuri sau copii ale documentelor de identitate.\n\nDupă verificare, operatorul procesează manual ștergerea datelor online eligibile și comunică rezultatul prin e-mail. Dacă rămân date în baza unei excepții aplicabile, sunt explicate categoriile, motivul și criteriul de păstrare. O operațiune parțială nu este prezentată ca ștergere finalizată.\n\nProcedura se aplică inclusiv conturilor PREMIUM și OWNER. Verificările suplimentare nu constituie, singure, motiv de refuz.\n\nȘtergerea contului online nu șterge contul Google, apartamentele, rezervările, fotografiile sau backupurile locale. Gestionarea acestora rămâne o operațiune separată a utilizatorului.\n\nÎn condițiile GDPR, poți solicita accesul, rectificarea, ștergerea, restricționarea și portabilitatea datelor și te poți opune prelucrărilor întemeiate pe interes legitim. Dacă o prelucrare se bazează pe consimțământ, acesta poate fi retras fără afectarea legalității prelucrării anterioare.\n\nOperatorul răspunde fără întârziere nejustificată, în principiu în cel mult o lună. Obiectivul operațional este de maximum 30 de zile, fără depășirea termenului legal. O prelungire permisă de GDPR se comunică motivat în prima lună.\n\nPoți depune plângere la ANSPDCP, în România, sau la autoritatea de supraveghere competentă și poți utiliza căile judiciare disponibile.\n\nSuport și cereri de ștergere. Datele necesare soluționării sunt păstrate până la închiderea cererii. La închidere sunt eliminate informațiile și copiile devenite inutile. Pot rămâne numai evidențe minimale necesare unei obligații legale identificate sau unui litigiu concret, cu motivul, temeiul și data ori evenimentul de revizuire documentate. La încetarea necesității sunt eliminate. Această gestionare este manuală.",
    "sendRequestEmail": "Trimite solicitarea prin e-mail",
    "invalidAccountEmail": "Introdu o adresă de e-mail validă pentru contul Google.",
    "requestAccountEmail": "Adresa de e-mail a contului Google",
    "requestTemplateLabel": "Mesajul pe care îl vei completa în aplicația de e-mail",
    "requestTemplate": "Solicit ștergerea contului meu Apartment Booking Manager și a datelor online asociate.\r\nAdresa contului folosit în aplicație: [completează aici]",
    "openEmail": "Trimite solicitarea prin e-mail",
    "emailNotice": "Dacă nu se deschide aplicația de e-mail, copiază mesajul și trimite-l la adresa de mai sus. Mesajul nu este trimis automat și trimiterea lui nu confirmă ștergerea.",
    "localEraseError": "Datele locale nu au putut fi șterse.",
    "sections": [
      [
        "Operatorul și contactul",
        "Apartment Booking Manager este o aplicație pentru administrarea apartamentelor și rezervărilor, oferită sub brandul {brand}.\n\nOperatorul datelor personale prelucrate pentru cont, autentificare, licențiere și suport este {operator}, persoană fizică. {brand} este un brand, nu o persoană juridică separată.\n\nPentru întrebări privind confidențialitatea și exercitarea drepturilor: {contact}.\n\nVersiune: 21 noiembrie 2026."
      ],
      [
        "Datele păstrate pe dispozitiv",
        "Aplicația păstrează local datele introduse pentru administrarea activității: apartamente, adrese, proprietari, fotografii, informații despre oaspeți, inclusiv nume și telefon atunci când sunt completate, rezervări, note, încasări, cheltuieli, întreținere și ciorne.\n\nAceste date nu sunt sincronizate automat cu serverele aplicației și nu sunt trimise către Firebase sau Cloudflare pentru verificarea licenței.\n\nStocarea locală nu reprezintă sincronizare între dispozitive. În aceeași instalare, datele locale nu sunt separate automat în baze distincte pentru fiecare cont Google. Deconectarea sau schimbarea contului nu șterge datele locale. Protejează dispozitivul dacă este utilizat și de alte persoane.\n\nProprietarul sau administratorul care introduce datele oaspeților stabilește scopurile și temeiul propriei prelucrări. Acestuia îi revine responsabilitatea de a informa oaspeții, de a introduce numai date necesare și de a gestiona solicitările privind evidențele sale. Operatorul aplicației răspunde separat pentru prelucrările online descrise în această politică."
      ],
      [
        "Google Sign-In și Firebase Authentication",
        "Autentificarea Google identifică utilizatorul pentru verificarea drepturilor de acces. Activarea trialului necesită autentificare și confirmare explicită, după informarea privind durata de 15 zile, fără card bancar. Disponibilitatea activării este stabilită de serviciul de licențiere.\n\nGoogle și Firebase pot prelucra adresa de e-mail, numele și informațiile de profil furnizate de contul Google, identificatorii contului și informații tehnice necesare autentificării și securității, precum adresa IP și user-agent. Firebase atribuie contului un identificator UID și gestionează tokenurile de autentificare.\n\nAplicația nu solicită parola Google prin formularele sale și nu o transmite operatorului prin suport.\n\nDatele existente pot fi consultate și exportate fără autentificare. Refuzul autentificării împiedică identificarea contului și acordarea serviciilor care necesită verificarea drepturilor online."
      ],
      [
        "Cloudflare și verificarea accesului",
        "Backendul de licențiere utilizează Cloudflare Workers și D1. Primește un token Firebase pentru verificarea identității și poate păstra:\n\n• UID-ul Firebase;\n• începutul și expirarea trialului și starea eligibilității;\n• sursa și starea licenței;\n• restricții de securitate și informații necesare invalidării accesului;\n• pentru achizițiile înregistrate: identificatorul produsului, hash-ul tokenului de achiziție, tokenul criptat și starea verificării;\n• eventuale evidențe istorice ale solicitărilor, cu referință, dată, limbă și stare.\n\nAccesul OWNER este autorizat pe server pentru identitatea desemnată. Nu este acordat prin conținutul unui backup sau prin simpla modificare a datelor locale.\n\nApartamentele, rezervările, datele oaspeților și fotografiile nu sunt trimise pentru licențiere. Furnizorii infrastructurii pot prelucra metadate tehnice necesare furnizării și protejării serviciilor.\n\nDeciziile automate ale sistemului privesc verificarea tehnică a drepturilor de acces. Dacă o verificare pare incorectă, utilizatorul poate solicita examinarea situației prin adresa de suport."
      ],
      [
        "Google Play Billing, reclame și Analytics",
        "În versiunea comercială v1.0.32 verificată, cumpărarea prin Google Play și reclamele AdMob sunt dezactivate. SDK-ul AdMob este exclus din buildul implicit.\n\nIntegrarea pregătită pentru Google Play Billing folosește o achiziție unică PREMIUM, fără abonament. Când cumpărarea este disponibilă, Google Play afișează prețul aplicabil și procesează plata. Aplicația nu solicită numărul cardului. Validarea și restaurarea drepturilor utilizează informațiile achiziției și contul autentificat.\n\nȘtergerea contului aplicației nu anulează și nu rambursează automat achiziția Google Play. Pentru conturile cu achiziții se verifică separat datele eligibile pentru ștergere, evidențele tranzacției și consecințele asupra recuperării accesului. Recuperarea după ștergerea și recrearea contului aplicației nu este prezentată ca funcție deja verificată.\n\nFirebase Analytics nu este activ și nu este inclus în configurația aprobată pentru lansarea inițială. Această politică nu declară colectarea de evenimente Analytics.\n\nActivarea reclamelor sau a altor colectări noi necesită actualizarea politicii și a declarațiilor Google Play pentru configurația efectivă, precum și respectarea condițiilor de consimțământ aplicabile."
      ],
      [
        "Backupuri și exporturi",
        "Backupurile JSON și exporturile Excel/PDF sunt create la cererea utilizatorului și pot conține date personale și financiare. Backupul poate include fotografii.\n\nAplicația nu criptează fișierul JSON. Protecția foilor Excel nu reprezintă criptarea fișierului. Utilizatorul trebuie să protejeze fișierele și locurile unde le păstrează.\n\nAlegerea unui furnizor cloud în selectorul de fișiere poate transfera documentul către acel furnizor, conform opțiunii utilizatorului și condițiilor serviciului respectiv. Aceasta nu reprezintă sincronizare automată realizată de aplicație.\n\nBackupurile manuale nu conțin sesiunea Google și nu acordă drepturi PREMIUM sau OWNER.\n\nRegulile Android ale aplicației exclud backupul cloud și transferul automat al datelor aplicației. Fișierele exportate separat nu sunt șterse prin aceste reguli."
      ],
      [
        "Scopuri și temeiuri juridice",
        "{processing}"
      ],
      [
        "Destinatari și transferuri internaționale",
        "Furnizorii implicați sunt Google/Firebase pentru autentificare, Cloudflare pentru backend și serviciul Google de e-mail pentru suport. Google Play intervine în procesarea achizițiilor atunci când cumpărarea este disponibilă.\n\nPaginile publice sunt găzduite prin GitHub Pages. GitHub poate prelucra date tehnice de conexiune conform propriei politici. Furnizorul de documente ales de utilizator poate primi fișierele pe care acesta decide să le salveze acolo.\n\nGoogle documentează prelucrarea Firebase Authentication în Statele Unite. Cloudflare și ceilalți furnizori pot utiliza infrastructură și subcontractanți din afara Spațiului Economic European.\n\nTermenii Firebase și acordul Cloudflare privind prelucrarea datelor descriu mecanisme pentru transferuri internaționale, inclusiv decizii de adecvare și clauze contractuale standard, în condițiile aplicabile serviciului, entității și transferului respectiv. Acordul Firebase nu este considerat automat aplicabil serviciului de e-mail de suport.\n\nInformații oficiale:\nhttps://firebase.google.com/support/privacy\nhttps://firebase.google.com/terms/data-processing-terms\nhttps://www.cloudflare.com/cloudflare-customer-dpa/\nhttps://policies.google.com/privacy\nhttps://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement\n\nPoți solicita informații despre garanțiile aplicabile prin adresa de contact."
      ],
      [
        "Păstrarea datelor",
        "{retention}"
      ],
      [
        "Solicitarea ștergerii contului",
        "Poți solicita ștergerea contului și a datelor online asociate din Meniu → Cont și acces → Solicită ștergerea contului, din pagina publică dedicată sau direct la: {contact}.\n\nIndică adresa Google asociată contului și faptul că soliciți ștergerea contului Apartment Booking Manager. Formularul pregătește un mesaj; trebuie să îl trimiți din aplicația de e-mail sau din webmail. Trimiterea nu produce ștergere automată și nu confirmă finalizarea ei.\n\nOperatorul verifică titularul, de regulă prin controlul adresei Google asociate. Dacă aceasta nu poate fi folosită, se stabilește o alternativă sigură și proporțională. Nu sunt solicitate parole, tokenuri sau copii ale documentelor de identitate.\n\nDupă verificare, operatorul procesează manual ștergerea datelor online eligibile și comunică rezultatul prin e-mail. Dacă rămân date în baza unei excepții aplicabile, sunt explicate categoriile, motivul și criteriul de păstrare. O operațiune parțială nu este prezentată ca ștergere finalizată.\n\nProcedura se aplică inclusiv conturilor PREMIUM și OWNER. Verificările suplimentare nu constituie, singure, motiv de refuz.\n\nȘtergerea contului online nu șterge contul Google, apartamentele, rezervările, fotografiile sau backupurile locale. Gestionarea acestora rămâne o operațiune separată a utilizatorului."
      ],
      [
        "Drepturile tale",
        "În condițiile GDPR, poți solicita accesul, rectificarea, ștergerea, restricționarea și portabilitatea datelor și te poți opune prelucrărilor întemeiate pe interes legitim. Dacă o prelucrare se bazează pe consimțământ, acesta poate fi retras fără afectarea legalității prelucrării anterioare.\n\nOperatorul răspunde fără întârziere nejustificată, în principiu în cel mult o lună. Obiectivul operațional este de maximum 30 de zile, fără depășirea termenului legal. O prelungire permisă de GDPR se comunică motivat în prima lună.\n\nPoți depune plângere la ANSPDCP, în România, sau la autoritatea de supraveghere competentă și poți utiliza căile judiciare disponibile."
      ],
      [
        "Securitate și actualizări",
        "Autentificarea și licențierea folosesc HTTPS. Dovezile de acces sunt semnate, iar cache-ul nativ al licenței este criptat folosind Android Keystore.\n\nAceste măsuri nu înlocuiesc securitatea dispozitivului și protejarea exporturilor. Politica va fi actualizată când se schimbă prelucrările efective, cu indicarea datei versiunii."
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
    "scope": "You can request deletion of your account and associated online data through Menu → Account and access → Request account deletion, the dedicated public page or directly at: {contact}.\n\nIdentify the Google email address associated with your account and state that you request deletion of your Apartment Booking Manager account. The form prepares a message; you must send it through your email application or webmail. Sending it does not automatically delete the account or confirm completion.\n\nThe controller verifies the account holder, normally through control of the associated Google email address. If it cannot be used, a secure and proportionate alternative is established. Passwords, tokens and copies of identity documents are not requested.\n\nAfter verification, the controller manually processes deletion of eligible online data and communicates the outcome by email. If information remains under an applicable exception, the categories, reason and retention criterion are explained. Partial processing is not presented as completed deletion.\n\nThe procedure also applies to PREMIUM and OWNER accounts. Additional checks alone do not constitute grounds for refusal.\n\nDeleting the online account does not delete the Google account or local apartments, reservations, photographs or backups. Managing these remains a separate user operation.\n\nSubject to GDPR conditions, you may request access, rectification, erasure, restriction and portability, and object to processing based on legitimate interests. Where processing relies on consent, consent may be withdrawn without affecting the lawfulness of earlier processing.\n\nThe controller responds without undue delay and normally within one month. The operational target is a maximum of 30 days without exceeding the legal deadline. Any extension permitted by GDPR will be explained within the first month.\n\nYou may complain to ANSPDCP in Romania or another competent supervisory authority and use available judicial remedies.\n\nSupport and deletion requests. Information needed to resolve a request is retained until closure. Unnecessary information and copies are removed when the case closes. Only minimal evidence necessary for an identified legal obligation or a specific dispute may remain, with the reason, legal basis and review date or event documented. It is deleted when no longer necessary. This is a manual procedure.",
    "sendRequestEmail": "Send request by email",
    "invalidAccountEmail": "Enter a valid email address for your Google account.",
    "requestAccountEmail": "Google account email address",
    "requestTemplateLabel": "Message to complete in your email application",
    "requestTemplate": "I request deletion of my Apartment Booking Manager account and associated online data.\r\nEmail address of the account used in the app: [fill in here]",
    "openEmail": "Send request by email",
    "emailNotice": "If your email application does not open, copy the message and send it to the address above. The message is not sent automatically and sending it does not confirm deletion.",
    "localEraseError": "Local data could not be deleted.",
    "sections": [
      [
        "Controller and contact",
        "Apartment Booking Manager is an application for managing apartments and reservations, provided under the {brand} brand.\n\nThe controller responsible for personal data processed for accounts, authentication, licensing and support is {operator}, an individual. {brand} is a brand, not a separate legal entity.\n\nFor privacy questions and requests to exercise your rights: {contact}.\n\nVersion: 21 November 2026."
      ],
      [
        "Data stored on your device",
        "The app stores business information locally: apartments, addresses, owners, photographs, guest information, including names and telephone numbers where entered, reservations, notes, receipts, expenses, maintenance records and drafts.\n\nThis information is not automatically synchronized with the app’s servers and is not sent to Firebase or Cloudflare for license verification.\n\nLocal storage does not provide synchronization between devices. Within the same installation, local data is not automatically separated into distinct databases for each Google account. Signing out or changing accounts does not erase local data. Protect the device if other people also use it.\n\nThe owner or manager entering guest information determines the purposes and legal basis of their processing. They are responsible for informing guests, entering only necessary data and handling requests concerning their records. The app controller is separately responsible for the online processing described in this policy."
      ],
      [
        "Google Sign-In and Firebase Authentication",
        "Google authentication identifies the user for verification of access rights. Trial activation requires authentication and explicit confirmation after information about its 15-day duration, without a bank card. Availability of activation is determined by the licensing service.\n\nGoogle and Firebase may process the email address, name and profile information supplied by the Google account, account identifiers and technical information needed for authentication and security, such as IP addresses and user-agent information. Firebase assigns an account UID and manages authentication tokens.\n\nThe app does not request your Google password through its forms or send it to the controller through support.\n\nExisting data can be viewed and exported without signing in. Declining authentication prevents account identification and provision of services requiring online access verification."
      ],
      [
        "Cloudflare and access verification",
        "The licensing backend uses Cloudflare Workers and D1. It receives a Firebase token to verify identity and may retain:\n\n• Firebase UID;\n• trial start and expiry dates and eligibility status;\n• license source and status;\n• security restrictions and information needed to invalidate access;\n• for recorded purchases: product identifier, purchase-token hash, encrypted token and verification status;\n• historical request records, where present, including reference, date, language and status.\n\nOWNER access is authorized on the server for the designated identity. It is not granted by backup contents or merely by changing local data.\n\nApartment, reservation and guest information and photographs are not transmitted for licensing. Infrastructure providers may process technical metadata needed to provide and protect their services.\n\nAutomated system decisions concern technical verification of access rights. If a verification appears incorrect, the user may request review through the support address."
      ],
      [
        "Google Play Billing, advertising and Analytics",
        "Google Play purchasing and AdMob advertising are disabled in the reviewed commercial version, v1.0.32. The AdMob SDK is excluded from the default build.\n\nThe prepared Google Play Billing integration uses a one-time PREMIUM purchase without a subscription. When purchasing is available, Google Play displays the applicable price and processes payment. The app does not request card numbers. Purchase verification and restoration use purchase information and the authenticated account.\n\nDeleting the app account does not automatically cancel or refund a Google Play purchase. For accounts with purchases, data eligible for deletion, transaction records and consequences for access recovery are reviewed separately. Recovery after deleting and recreating the app account is not presented as an already verified feature.\n\nFirebase Analytics is not active and is not included in the approved initial-release configuration. This policy does not declare collection of Analytics events.\n\nEnabling advertising or other new collection requires an updated policy and Google Play declarations reflecting the actual configuration, together with compliance with applicable consent requirements."
      ],
      [
        "Backups and exports",
        "JSON backups and Excel/PDF exports are created at the user’s request and may contain personal and financial information. Backups may include photographs.\n\nThe app does not encrypt JSON files. Excel worksheet protection is not file encryption. Users must protect files and their storage locations.\n\nChoosing a cloud provider in the file selector may transfer a document to that provider according to the user’s choice and that service’s terms. This is not automatic synchronization performed by the app.\n\nManual backups do not contain the Google session or grant PREMIUM or OWNER rights.\n\nThe app’s Android rules exclude cloud backup and automatic transfer of app data. Separately exported files are not erased by these rules."
      ],
      [
        "Purposes and legal bases",
        "{processing}"
      ],
      [
        "Recipients and international transfers",
        "Providers involved are Google/Firebase for authentication, Cloudflare for the backend and the Google email service for support. Google Play participates in processing purchases when purchasing is available.\n\nPublic pages are hosted through GitHub Pages. GitHub may process technical connection information under its own policy. A document provider selected by the user may receive files the user chooses to store there.\n\nGoogle documents that Firebase Authentication processes data in the United States. Cloudflare and other providers may use infrastructure and subprocessors outside the European Economic Area.\n\nThe Firebase terms and Cloudflare’s data processing agreement describe international-transfer mechanisms, including adequacy decisions and standard contractual clauses, subject to the conditions applicable to the service, entity and transfer. The Firebase agreement is not automatically treated as covering the support email service.\n\nOfficial information:\nhttps://firebase.google.com/support/privacy\nhttps://firebase.google.com/terms/data-processing-terms\nhttps://www.cloudflare.com/cloudflare-customer-dpa/\nhttps://policies.google.com/privacy\nhttps://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement\n\nYou may request information about applicable safeguards through the contact address."
      ],
      [
        "Retention",
        "{retention}"
      ],
      [
        "Requesting account deletion",
        "You can request deletion of your account and associated online data through Menu → Account and access → Request account deletion, the dedicated public page or directly at: {contact}.\n\nIdentify the Google email address associated with your account and state that you request deletion of your Apartment Booking Manager account. The form prepares a message; you must send it through your email application or webmail. Sending it does not automatically delete the account or confirm completion.\n\nThe controller verifies the account holder, normally through control of the associated Google email address. If it cannot be used, a secure and proportionate alternative is established. Passwords, tokens and copies of identity documents are not requested.\n\nAfter verification, the controller manually processes deletion of eligible online data and communicates the outcome by email. If information remains under an applicable exception, the categories, reason and retention criterion are explained. Partial processing is not presented as completed deletion.\n\nThe procedure also applies to PREMIUM and OWNER accounts. Additional checks alone do not constitute grounds for refusal.\n\nDeleting the online account does not delete the Google account or local apartments, reservations, photographs or backups. Managing these remains a separate user operation."
      ],
      [
        "Your rights",
        "Subject to GDPR conditions, you may request access, rectification, erasure, restriction and portability, and object to processing based on legitimate interests. Where processing relies on consent, consent may be withdrawn without affecting the lawfulness of earlier processing.\n\nThe controller responds without undue delay and normally within one month. The operational target is a maximum of 30 days without exceeding the legal deadline. Any extension permitted by GDPR will be explained within the first month.\n\nYou may complain to ANSPDCP in Romania or another competent supervisory authority and use available judicial remedies."
      ],
      [
        "Security and updates",
        "Authentication and licensing use HTTPS. Access proofs are signed, and the native license cache is encrypted using Android Keystore.\n\nThese safeguards do not replace device security or protection of exports. The policy will be updated when actual processing changes, with the version date displayed."
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
 return copy.sections.map(([title,body])=>{
  return [title,body.replaceAll('{brand}',()=>value(configuration.brand)).replaceAll('{operator}',()=>operator).replaceAll('{contact}',()=>value(configuration.contact)).replace('{retention}',()=>value(configuration.retentionPolicy?.[lang])).replace('{processing}',()=>value(configuration.processingPolicy?.[lang])).replace('{backup}',()=>backup)];
 });
}
export function renderPolicy(root,language){const copy=privacyCopy[language==='ro'?'ro':'en'];root.replaceChildren();const warning=document.createElement('p');warning.textContent=copy.draft;warning.setAttribute('role','note');if(!isPrivacyPublicationReady())root.append(warning);for(const [title,body] of policySections(language)){const section=document.createElement('section'),h=document.createElement('h3'),p=document.createElement('p');h.textContent=title;p.textContent=body;p.style.whiteSpace='pre-line';section.append(h,p);root.append(section);}renderSupportContact(root,language); }

export function renderSupportContact(root,language,deletion=false){
 if(privacyConfigurationIssues().includes('contact'))return;
 const copy=privacyCopy[language==='ro'?'ro':'en'],p=document.createElement('p'),link=document.createElement('a');
 p.dataset.privacyContact='true';p.append(document.createTextNode(deletion?copy.deletionSupportLabel:copy.supportLabel));
 link.href='mailto:'+settings.contact;link.textContent=settings.contact;link.style.cssText='color:var(--business-silver);overflow-wrap:anywhere';p.append(link);root.append(p);
}
