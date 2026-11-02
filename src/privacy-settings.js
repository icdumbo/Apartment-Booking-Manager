// Public information only. Never put credentials, tokens or private keys here.
// Publication remains blocked until these owner-supplied details are approved.
export const privacySettings=Object.freeze({
 controllerType:'individual',
 operator:null, // Legal name; never add a home address.
 contact:'support.apartmentbookingmanager@gmail.com', // Confirmed public support/privacy contact; single source.
 retentionPolicy:{ro:null,en:null}, // Approved periods, purposes and retention exceptions.
 processingPolicy:{ro:null,en:null}, // Approved legal roles/bases and international-transfer arrangements.
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
 for(const field of ['retentionPolicy','processingPolicy'])for(const language of ['ro','en'])if(!text(config[field]?.[language]))issues.push(field+'.'+language);
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
