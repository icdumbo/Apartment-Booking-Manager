// Public information only. Never put credentials, tokens or private keys here.
// Publication remains blocked until these owner-supplied details are approved.
export const privacySettings=Object.freeze({
 controllerType:'individual',
 brand:'ICD Apps', // Confirmed public brand; not a separate legal entity.
 operator:'Crăciun Ionuț Liviu', // Confirmed individual controller; no home address.
 contact:'support.apartmentbookingmanager@gmail.com', // Confirmed public support/privacy contact; single source.
 retentionPolicy:{"ro":"Conturile Firebase nu au o expirare automată pentru inactivitate în implementarea actuală. Dovezile drepturilor active sunt păstrate pentru verificare și restaurare. Evidențele achizițiilor revocate (inclusiv hash-uri și tokenuri criptate), restricțiile de securitate și cererile eșuate nu au în prezent ștergere periodică în aplicație. Nu declarăm un termen automat activ pentru confirmările de ștergere. Păstrarea mesajelor de suport depinde de gestionarea manuală a căsuței de e-mail; aplicația nu le expiră. Necesitatea și justificarea păstrării datelor trebuie examinate la soluționarea unei cereri. Nu prezentăm această lipsă de expirare drept o justificare pentru păstrare nelimitată și nu atribuim tuturor datelor limita trialului. Termenele proprii furnizorului Firebase sunt descrise separat în secțiunea de autentificare.","en":"Firebase accounts do not automatically expire for inactivity in the current implementation. Active entitlement evidence is retained for verification and restoration. Revoked purchase records (including hashes and encrypted tokens), security restrictions and failed requests currently have no periodic deletion in the app. No active automatic expiry is claimed for deletion receipts. Support-message retention depends on manual mailbox handling; the app does not expire these messages. The necessity and justification for retaining data must be examined when handling a request. Lack of automatic expiry is not presented as justification for indefinite retention, and the trial limit is not assigned to all data. Firebase provider periods are described separately in the authentication section."}, // Actual current handling; no future cleanup promises.
 processingPolicy:{"ro":"Art. 6(1)(b) GDPR este temeiul pentru datele strict necesare autentificării și furnizării contului, trialului, licenței și restaurării solicitate. Art. 6(1)(c), coroborat cu art. 12–22, privește soluționarea drepturilor GDPR. Pentru securitate, prevenirea fraudei și dovezi minimale pentru contestații, art. 6(1)(f) este temeiul analizat: VALIDARE JURIDICĂ NECESARĂ pentru evaluarea scopului legitim, necesității și echilibrului cu drepturile persoanelor; evaluarea nu este prezentată ca aprobată. Acceptarea termenilor trialului nu este consimțământ GDPR general. Nu declarăm consimțământ publicitar colectat și nu invocăm obligații fiscale neidentificate. Pentru datele oaspeților exclusiv locale, utilizatorul stabilește temeiul propriei prelucrări.","en":"GDPR Article 6(1)(b) is the basis for data strictly necessary for requested authentication, account, trial, licensing and restoration. Article 6(1)(c), read with Articles 12–22, applies to handling GDPR rights. For security, fraud prevention and minimal dispute evidence, Article 6(1)(f) is the basis under assessment: LEGAL VALIDATION REQUIRED for the legitimate-purpose, necessity and rights-balancing assessment; it is not presented as approved. Acceptance of trial terms is not blanket GDPR consent. No advertising consent collection or unidentified tax obligation is claimed. Users determine their own legal basis for guest data kept exclusively locally."}, // Legal-basis disclosure; legitimate-interest assessment is not approved.
 publicBaseUrl:null, // HTTPS directory containing privacy.html and delete-account.html.
 publicationApproved:false,
 automaticBackup:'excluded',
 webClientId:null,firebaseApiKey:null,deletionEndpoint:null,
 deletionBackendVerified:false // Only after real backend checks; never enables the server flag.
});
const text=value=>typeof value==='string'&&value.trim().length>0;
function secureUrl(value){try{if(!text(value))return null;const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash?url:null;}catch{return null;}}
export function privacyConfigurationIssues(config=privacySettings){
 const issues=[];
 if(!text(config.operator))issues.push('operator');
 if(!text(config.contact)||!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(config.contact))issues.push('contact');
 for(const field of ['retentionPolicy','processingPolicy'])for(const language of ['ro','en'])if(!text(config[field]?.[language])||(field==='processingPolicy'&&/VALIDARE JURIDICĂ NECESARĂ|LEGAL VALIDATION REQUIRED/.test(config[field][language])))issues.push(field+'.'+language);
 const base=secureUrl(config.publicBaseUrl);if(!base||!base.pathname.endsWith('/'))issues.push('publicBaseUrl');
 if(config.publicationApproved!==true)issues.push('publicationApproved');
 return issues;
}
export function isPrivacyPublicationReady(config=privacySettings){return privacyConfigurationIssues(config).length===0;}
export function publicLegalUrls(config=privacySettings){
 const base=secureUrl(config.publicBaseUrl);if(!base||!base.pathname.endsWith('/'))return null;
 return Object.fromEntries(['privacy','deletion'].map(page=>[page,Object.fromEntries(['ro','en'].map(language=>{const url=new URL(page==='privacy'?'privacy.html':'delete-account.html',base);url.searchParams.set('lang',language);return [language,url.href];}))]));
}
export function isDeletionBackendReady(config=privacySettings){
 const endpoint=secureUrl(config.deletionEndpoint);
 return isPrivacyPublicationReady(config)&&config.deletionBackendVerified===true&&Boolean(endpoint&&endpoint.pathname==='/account-deletion');
}
export function isDeletionWebReady(config=privacySettings){return isDeletionBackendReady(config)&&text(config.webClientId)&&text(config.firebaseApiKey);}
